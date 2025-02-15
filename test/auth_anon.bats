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

    mkdir -p "${TEST_DIR}"/test_runtime/{uploads_anon,download_anon}
    rm -f "${TEST_DIR}"/test_runtime/{basic_anon.htpasswd,accessuri_anon.map}
    touch "${TEST_DIR}"/test_runtime/{basic_anon.htpasswd,accessuri_anon.map}

    "${ROOT_DIR}"/ngxp.sh user_add \
        "${TEST_DIR}"/test_runtime/{basic_anon.htpasswd,accessuri_anon.map} lan_anon "" /
    "${ROOT_DIR}"/ngxp.sh user_add \
        "${TEST_DIR}"/test_runtime/{basic_anon.htpasswd,accessuri_anon.map} hack "toor" /noaccess

    cat > "${TEST_DIR}/test_runtime/nginx_anon.conf" <<EOF
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
        # error_log /dev/stderr debug;

        include /etc/nginx/conf.d/*.conf;
    }
EOF

    "$driver" run \
        --name="bats_nginx_explorer_test_server_anon" \
        -d \
        --user="$(id -u):$(id -g)" \
        --userns=keep-id --cap-drop=ALL \
        --tmpfs=/tmp:rw,noexec,nosuid,size=70m \
        --expose=8080 -p 8087:8080 \
        -v "${TEST_DIR}/test_runtime/download_anon:/home/user/downloads:ro" \
        -v "${TEST_DIR}/test_runtime/uploads_anon:/home/user/uploads:rw" \
        -v "${TEST_DIR}/test_runtime/nginx_anon.conf:/etc/nginx/nginx.conf:ro" \
        -v "${ROOT_DIR}:/var/www/ngxp:ro" \
        -v "${ROOT_DIR}/nginx-explorer.conf:/etc/nginx/conf.d/default.conf:ro" \
        -v "${TEST_DIR}/test_runtime/basic_anon.htpasswd:/opt/ngxp/basic.htpasswd:ro" \
        -v "${TEST_DIR}/test_runtime/accessuri_anon.map:/opt/ngxp/accessuri.map:ro" \
        nginx
}

teardown_file() {
    "$driver" stop "bats_nginx_explorer_test_server_anon"
    "$driver" logs "bats_nginx_explorer_test_server_anon" &> "${TEST_DIR}/test_runtime/nginx_anon.log"
    "$driver" rm "bats_nginx_explorer_test_server_anon"

    # remove test outputs (comment this out to see why a test failed)
    rm -rf \
        "${TEST_DIR}/test_runtime/nginx_anon.conf" \
        "${TEST_DIR}"/test_runtime/{basic_anon.htpasswd,accessuri_anon.map} \
        "${TEST_DIR}/test_runtime/nginx_anon.log" \
        "${TEST_DIR}"/test_runtime/{uploads_anon,download_anon}
}

setup() {
    load 'bats/bats-support/load'
    load 'bats/bats-assert/load'
}

@test "responds 200 on GET  /                with local_anon user for listing" {
    curl -f -s -w "%{http_code}\n" -o "${TEST_DIR}"/test_runtime/test_anon_listing1 -X GET http://127.0.0.1:8087/
    rm -f "${TEST_DIR}"/test_runtime/test_anon_listing1
}
@test "responds 401 on GET  /                with a logged in user that change their username in cookie" {
    local cookie;
    cookie=$(curl -sf -o /dev/null -X POST --cookie-jar - -H "authorization: Basic $(echo -n hack:toor | base64)" http://127.0.0.1:8087/___ngxp/login | grep ngxp | sed 's/.*\sngxp\s*/ngxp=/')

    cookie=$(echo "$cookie" | sed 's#hack#lan_anon#;s#:/noaccess#:/#')  # cookie transform
    run curl -s -o "${TEST_DIR}"/test_runtime/test_anon_listing2 -w "%{http_code}\n" --cookie "${cookie}" -X GET http://127.0.0.1:8087/
    assert_line '401'
    rm -f "${TEST_DIR}"/test_runtime/test_anon_listing2
}
@test "download file (simple)" {
    head -c 1048576 < /dev/urandom > "${TEST_DIR}"/test_runtime/download_anon/download_anon1
    curl -s -o "${TEST_DIR}"/test_runtime/test_anon_download1 -w "%{http_code}\n" -X GET http://127.0.0.1:8087/download_anon1
    cmp "${TEST_DIR}"/test_runtime/download_anon/download_anon1 "${TEST_DIR}"/test_runtime/test_anon_download1
    rm -f "${TEST_DIR}"/test_runtime/download_anon/download_anon1 "${TEST_DIR}"/test_runtime/test_anon_download1
}
