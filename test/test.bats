driver=docker
if command -v podman &>/dev/null; then
    driver=podman
fi

setup_file() {
    TEST_DIR="$( cd "${BATS_TEST_FILENAME%/*}" >/dev/null 2>&1 && pwd )"
    ROOT_DIR=${TEST_DIR}/../

    mkdir -p "${TEST_DIR}"/test_runtime/{uploads,download}

    touch "${TEST_DIR}/test_runtime"/basic.htpasswd
    htpasswd -D "${TEST_DIR}/test_runtime"/basic.htpasswd root
    htpasswd -b "${TEST_DIR}/test_runtime"/basic.htpasswd root pass
    htpasswd -D "${TEST_DIR}/test_runtime"/basic.htpasswd upload
    htpasswd -b "${TEST_DIR}/test_runtime"/basic.htpasswd upload pass

    cat > "${TEST_DIR}/test_runtime/nginx.conf" <<EOF
    worker_processes 1;
    error_log /var/log/nginx/error.log warn;
    pid /tmp/nginx.pid;
    events {
        worker_connections 1024;
    }
    http {
        proxy_temp_path /tmp/proxy_temp;
        client_body_temp_path /tmp/client_temp;
        fastcgi_temp_path /tmp/fastcgi_temp;
        uwsgi_temp_path /tmp/uwsgi_temp;
        scgi_temp_path /tmp/scgi_temp;

        include /etc/nginx/mime.types;
        default_type application/octet-stream;

        log_format main '\$remote_addr - \$remote_user [\$time_local] "\$request" '
                        '\$status \$body_bytes_sent "\$http_referer" '
                        '"\$http_user_agent" "\$http_x_forwarded_for"';
        access_log /var/log/nginx/access.log main;

        include /etc/nginx/conf.d/*.conf;
    }
EOF

    "$driver" run \
        --name="bats_nginx_exploer_test_server" \
        -d --log-driver=none \
        --user="$(id -u):$(id -g)" \
        --userns=keep-id --cap-drop=ALL \
        --tmpfs=/tmp:rw,noexec,nosuid,size=70m \
        --expose=8080 -p 8085:8080 \
        -v "${TEST_DIR}/test_runtime/download:/home/user/downloads:ro" \
        -v "${TEST_DIR}/test_runtime/uploads:/home/user/uploads:rw" \
        -v "${TEST_DIR}/test_runtime/nginx.conf:/etc/nginx/nginx.conf:ro" \
        -v "${ROOT_DIR}:/var/www/ngxp:ro" \
        -v "${ROOT_DIR}/nginx-explorer.conf:/etc/nginx/conf.d/default.conf:ro" \
        -v "${TEST_DIR}/test_runtime/basic.htpasswd:/basic_auth/basic.htpasswd:ro" \
        nginx
}

teardown_file() {
    "$driver" stop "bats_nginx_exploer_test_server"
    "$driver" rm "bats_nginx_exploer_test_server"
}

setup() {
    load 'test_helper/bats-support/load'
    load 'test_helper/bats-assert/load'
}

@test "responds 403 on GET  / without cookie" {
    run curl -s -o /dev/null -w "%{http_code}" http://localhost:8085/
    assert_output '403'
}
@test "responds 403 on GET  /___ngxp/login with correct creds" {
    run curl -s -o /dev/null -w "%{http_code}" -X GET -H "authorization: Basic $(echo -n root:pass | base64)" http://127.0.0.1:8085/___ngxp/login
    assert_output '403'
}
@test "responds 200 on POST /___ngxp/login with correct creds" {
    run curl -s -o /dev/null -w "%{http_code}" -X POST -H "authorization: Basic $(echo -n root:pass | base64)" http://127.0.0.1:8085/___ngxp/login
    assert_output '200'
}
@test "responds 403 on POST /___ngxp/login with wrong creds" {
    run curl -s -o /dev/null -w "%{http_code}" -X POST -H "authorization: Basic $(echo -n root: | base64)" http://127.0.0.1:8085/___ngxp/login
    assert_output '403'
}
