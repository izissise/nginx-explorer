#!/usr/bin/env bats
bats_require_minimum_version 1.5.0

driver=docker
if command -v podman &>/dev/null; then
    driver=podman
fi

setup_file() {
    export TEST_DIR
    TEST_DIR=$( cd "${BATS_TEST_FILENAME%/*}" >/dev/null 2>&1 && pwd )
    ROOT_DIR=${TEST_DIR}/../

    mkdir -p "${TEST_DIR}"/test_runtime/{uploads_rl,download_rl}

    cat > "${TEST_DIR}/test_runtime/nginx_rate_limit.conf" <<EOF
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
        --name="bats_nginx_explorer_test_server_rate_limit" \
        -d \
        --user="$(id -u):$(id -g)" \
        --userns=keep-id --cap-drop=ALL \
        --tmpfs=/tmp:rw,noexec,nosuid,size=70m \
        --expose=8080 -p 8086:8080 \
        -v "${TEST_DIR}/test_runtime/download_rl:/home/user/downloads:ro" \
        -v "${TEST_DIR}/test_runtime/uploads_rl:/home/user/uploads:rw" \
        -v "${TEST_DIR}/test_runtime/nginx_rate_limit.conf:/etc/nginx/nginx.conf:ro" \
        -v "${ROOT_DIR}:/var/www/ngxp:ro" \
        -v "${ROOT_DIR}/nginx-explorer.conf:/etc/nginx/conf.d/default.conf:ro" \
        -v "/dev/null:/opt/ngxp/basic.htpasswd:ro" \
        -v "/dev/null:/opt/ngxp/accessuri.map:ro" \
        nginx
}

teardown_file() {
    "$driver" stop "bats_nginx_explorer_test_server_rate_limit"
    "$driver" logs "bats_nginx_explorer_test_server_rate_limit" &> "${TEST_DIR}/test_runtime/nginx_rate_limit.log"
    "$driver" rm "bats_nginx_explorer_test_server_rate_limit"

    rm -rf \
        "${TEST_DIR}/test_runtime/nginx_rate_limit.conf" \
        "${TEST_DIR}/test_runtime/nginx_rate_limit.log" \
        "${TEST_DIR}"/test_runtime/{uploads_rl,download_rl}
}

setup() {
    load 'test_helper/bats-support/load'
    load 'test_helper/bats-assert/load'
}

@test "rate limit on too much login requests" {
    curl -s -o /dev/null -w "%{http_code}\n" -X POST -H "authorization: Basic $(echo -n wrong:wrong | base64)" http://127.0.0.1:8086/___ngxp/login \
        | curl -s -o /dev/null -w "%{http_code}\n" -X POST -H "authorization: Basic $(echo -n wrong:wrong | base64)" http://127.0.0.1:8086/___ngxp/login \
        | curl -s -o /dev/null -w "%{http_code}\n" -X POST -H "authorization: Basic $(echo -n wrong:wrong | base64)" http://127.0.0.1:8086/___ngxp/login \
        | curl -s -o /dev/null -w "%{http_code}\n" -X POST -H "authorization: Basic $(echo -n wrong:wrong | base64)" http://127.0.0.1:8086/___ngxp/login \
        | curl -s -o /dev/null -w "%{http_code}\n" -X POST -H "authorization: Basic $(echo -n wrong:wrong | base64)" http://127.0.0.1:8086/___ngxp/login \
        | curl -s -o /dev/null -w "%{http_code}\n" -X POST -H "authorization: Basic $(echo -n wrong:wrong | base64)" http://127.0.0.1:8086/___ngxp/login \
        | curl -s -o /dev/null -w "%{http_code}\n" -X POST -H "authorization: Basic $(echo -n wrong:wrong | base64)" http://127.0.0.1:8086/___ngxp/login \
        | curl -s -o /dev/null -w "%{http_code}\n" -X POST -H "authorization: Basic $(echo -n wrong:wrong | base64)" http://127.0.0.1:8086/___ngxp/login \
        | curl -s -o /dev/null -w "%{http_code}\n" -X POST -H "authorization: Basic $(echo -n wrong:wrong | base64)" http://127.0.0.1:8086/___ngxp/login \
        | curl -s -o /dev/null -w "%{http_code}\n" -X POST -H "authorization: Basic $(echo -n wrong:wrong | base64)" http://127.0.0.1:8086/___ngxp/login \
        | curl -s -o /dev/null -w "%{http_code}\n" -X POST -H "authorization: Basic $(echo -n wrong:wrong | base64)" http://127.0.0.1:8086/___ngxp/login \
        | curl -s -o /dev/null -w "%{http_code}\n" -X POST -H "authorization: Basic $(echo -n wrong:wrong | base64)" http://127.0.0.1:8086/___ngxp/login \
        | curl -s -o /dev/null -w "%{http_code}\n" -X POST -H "authorization: Basic $(echo -n wrong:wrong | base64)" http://127.0.0.1:8086/___ngxp/login \
        | curl -s -o /dev/null -w "%{http_code}\n" -X POST -H "authorization: Basic $(echo -n wrong:wrong | base64)" http://127.0.0.1:8086/___ngxp/login \
        | curl -s -o /dev/null -w "%{http_code}\n" -X POST -H "authorization: Basic $(echo -n wrong:wrong | base64)" http://127.0.0.1:8086/___ngxp/login \
        | curl -s -o /dev/null -w "%{http_code}\n" -X POST -H "authorization: Basic $(echo -n wrong:wrong | base64)" http://127.0.0.1:8086/___ngxp/login \
        | curl -s -o /dev/null -w "%{http_code}\n" -X POST -H "authorization: Basic $(echo -n wrong:wrong | base64)" http://127.0.0.1:8086/___ngxp/login \
        | curl -s -o /dev/null -w "%{http_code}\n" -X POST -H "authorization: Basic $(echo -n wrong:wrong | base64)" http://127.0.0.1:8086/___ngxp/login \
        | curl -s -o /dev/null -w "%{http_code}\n" -X POST -H "authorization: Basic $(echo -n wrong:wrong | base64)" http://127.0.0.1:8086/___ngxp/login \
        | curl -s -o /dev/null -w "%{http_code}\n" -X POST -H "authorization: Basic $(echo -n wrong:wrong | base64)" http://127.0.0.1:8086/___ngxp/login \
        | curl -s -o /dev/null -w "%{http_code}\n" -X POST -H "authorization: Basic $(echo -n wrong:wrong | base64)" http://127.0.0.1:8086/___ngxp/login \
        | curl -s -o /dev/null -w "%{http_code}\n" -X POST -H "authorization: Basic $(echo -n wrong:wrong | base64)" http://127.0.0.1:8086/___ngxp/login \
        | curl -s -o /dev/null -w "%{http_code}\n" -X POST -H "authorization: Basic $(echo -n wrong:wrong | base64)" http://127.0.0.1:8086/___ngxp/login \
        | curl -s -o /dev/null -w "%{http_code}\n" -X POST -H "authorization: Basic $(echo -n wrong:wrong | base64)" http://127.0.0.1:8086/___ngxp/login \
        | curl -s -o /dev/null -w "%{http_code}\n" -X POST -H "authorization: Basic $(echo -n wrong:wrong | base64)" http://127.0.0.1:8086/___ngxp/login \
        | curl -s -o /dev/null -w "%{http_code}\n" -X POST -H "authorization: Basic $(echo -n wrong:wrong | base64)" http://127.0.0.1:8086/___ngxp/login
    sc=$(curl -s -o /dev/null -w "%{http_code}\n" -X POST -H "authorization: Basic $(echo -n wrong:wrong | base64)" http://127.0.0.1:8086/___ngxp/login)
    assert [ "$sc" -eq '429' ]
}
