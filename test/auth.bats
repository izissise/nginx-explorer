driver=docker
if command -v podman &>/dev/null; then
    driver=podman
fi

setup_file() {
    export TEST_DIR=$( cd "${BATS_TEST_FILENAME%/*}" >/dev/null 2>&1 && pwd )
    ROOT_DIR=${TEST_DIR}/../

    mkdir -p "${TEST_DIR}"/test_runtime/{uploads,download}
    rm -f "${TEST_DIR}"/test_runtime/{basic.htpasswd,accessuri.map}
    touch "${TEST_DIR}"/test_runtime/{basic.htpasswd,accessuri.map}

    "${ROOT_DIR}"/ngxp.sh user_add \
        "${TEST_DIR}"/test_runtime/{basic.htpasswd,accessuri.map} root roottestpass /
    "${ROOT_DIR}"/ngxp.sh user_add \
        "${TEST_DIR}"/test_runtime/{basic.htpasswd,accessuri.map} nested nestedtestpass /nested
    "${ROOT_DIR}"/ngxp.sh user_add \
        "${TEST_DIR}"/test_runtime/{basic.htpasswd,accessuri.map} upload uploadtestpass /___ngxp/upload/

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
        --name="bats_nginx_explorer_test_server" \
        -d \
        --user="$(id -u):$(id -g)" \
        --userns=keep-id --cap-drop=ALL \
        --tmpfs=/tmp:rw,noexec,nosuid,size=70m \
        --expose=8080 -p 8085:8080 \
        -v "${TEST_DIR}/test_runtime/download:/home/user/downloads:ro" \
        -v "${TEST_DIR}/test_runtime/uploads:/home/user/uploads:rw" \
        -v "${TEST_DIR}/test_runtime/nginx.conf:/etc/nginx/nginx.conf:ro" \
        -v "${ROOT_DIR}:/var/www/ngxp:ro" \
        -v "${ROOT_DIR}/nginx-explorer.conf:/etc/nginx/conf.d/default.conf:ro" \
        -v "${TEST_DIR}/test_runtime/basic.htpasswd:/opt/ngxp/basic.htpasswd:ro" \
        -v "${TEST_DIR}/test_runtime/accessuri.map:/opt/ngxp/accessuri.map:ro" \
        nginx
}

teardown_file() {
    "$driver" stop "bats_nginx_explorer_test_server"
    "$driver" logs "bats_nginx_explorer_test_server" &> "${TEST_DIR}/test_runtime/nginx.log"
    "$driver" rm "bats_nginx_explorer_test_server"
}

setup() {
    load 'test_helper/bats-support/load'
    load 'test_helper/bats-assert/load'
}

@test "responds 403 on GET  /                without cookie" {
    run curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8085/
    assert_line '403'
}
@test "responds 403 on GET  /                with a valid wrongly formatted cookie" {
    run curl -s -o /dev/null -w "%{http_code}\n" --cookie "ngxp=/:wddewnope:/:/" http://localhost:8085/
    assert_line '403'
}
@test "responds 403 on GET  /                with a valid user but wrong secret cookie lan_anon" {
    run curl -s -o /dev/null -w "%{http_code}\n" --cookie "ngxp=lan_anon:c01ee28a3dff1ccadfaa856b45bebff021adae93f3b74758:/" http://localhost:8085/
    assert_line '403'
}
@test "responds 403 on GET  /                with a valid user but wrong secret cookie" {
    run curl -s -o /tmp/aaaa -w "%{http_code}\n" --cookie "ngxp=root:c01ee28a3dff1ccadfaa856b45cebff021adae93f3b74758:/" http://localhost:8085/
    assert_line '403'
}
@test "responds 403 on GET  /___ngxp/login   with correct creds" {
    run curl -s -o /dev/null -w "%{http_code}\n" --cookie-jar - -X GET -H "authorization: Basic $(echo -n root:roottestpass | base64)" http://127.0.0.1:8085/___ngxp/login
    assert_line '403'
    refute_output 'ngxp' # cookie should not be set
}
@test "responds 200 on POST /___ngxp/login   with correct creds" {
    run curl -s -o /dev/null -w "%{http_code}\n" --cookie-jar - -X POST -H "authorization: Basic $(echo -n root:roottestpass | base64)" http://127.0.0.1:8085/___ngxp/login
    assert_line '200'
    assert_output --partial 'ngxp' # cookie should be set
}
@test "responds 403 on POST /___ngxp/login   with wrong creds" {
    run curl -s -o /dev/null -w "%{http_code}\n" --cookie-jar - -X POST -H "authorization: Basic $(echo -n root: | base64)" http://127.0.0.1:8085/___ngxp/login
    assert_line '403'
    refute_output 'ngxp' # cookie should not be set
}
@test "responds 403 on POST /___ngxp/login   with not set lan_anon" {
    run curl -s -o /dev/null -w "%{http_code}\n" --cookie-jar - -X POST -H "authorization: Basic $(echo -n lan_anon: | base64)" http://127.0.0.1:8085/___ngxp/login
    assert_line '403'
    refute_output 'ngxp' # cookie should not be set
}
@test "responds 403 on POST /___ngxp/login   with unknown user" {
    run curl -s -o /dev/null -w "%{http_code}\n" --cookie-jar - -X POST -H "authorization: Basic $(echo -n whoisthis:no | base64)" http://127.0.0.1:8085/___ngxp/login
    assert_line '403'
    refute_output 'ngxp' # cookie should not be set
}
@test "responds 200 on GET  /___ngxp/upload/ with upload user" {
    local cookie;
    cookie=$(curl -sf -o /dev/null -X POST --cookie-jar - -H "authorization: Basic $(echo -n upload:uploadtestpass | base64)" http://127.0.0.1:8085/___ngxp/login | grep ngxp | sed 's/.*\sngxp\s*/ngxp=/')
    run curl -s -o /dev/null -w "%{http_code}\n" --cookie "${cookie}" -X GET http://127.0.0.1:8085/___ngxp/upload/
    assert_line '200'
}
@test "responds 200 on GET  /                with root user for listing" {
    local cookie;
    cookie=$(curl -sf -o /dev/null -X POST --cookie-jar - -H "authorization: Basic $(echo -n root:roottestpass | base64)" http://127.0.0.1:8085/___ngxp/login | grep ngxp | sed 's/.*\sngxp\s*/ngxp=/')

    curl -f -s -o "${TEST_DIR}"/test_runtime/test_listing1 --cookie "${cookie}" -X GET http://127.0.0.1:8085/
}
@test "download file (simple)" {
    local cookie;
    cookie=$(curl -sf -o /dev/null -X POST --cookie-jar - -H "authorization: Basic $(echo -n root:roottestpass | base64)" http://127.0.0.1:8085/___ngxp/login | grep ngxp | sed 's/.*\sngxp\s*/ngxp=/')

    head -c 1048576 < /dev/urandom > "${TEST_DIR}"/test_runtime/download/download1
    curl -f -s -o "${TEST_DIR}"/test_runtime/test_download1 -w "%{http_code}\n" --cookie "${cookie}" -X GET http://127.0.0.1:8085/download1
    cmp "${TEST_DIR}"/test_runtime/download/download1 "${TEST_DIR}"/test_runtime/test_download1
}
@test "download file (nested)" {
    local cookie;
    cookie=$(curl -sf -o /dev/null -X POST --cookie-jar - -H "authorization: Basic $(echo -n root:roottestpass | base64)" http://127.0.0.1:8085/___ngxp/login | grep ngxp | sed 's/.*\sngxp\s*/ngxp=/')

    mkdir -p "${TEST_DIR}"/test_runtime/download/nested
    head -c 1048576 < /dev/urandom > "${TEST_DIR}"/test_runtime/download/nested/download2
    curl -f -s -o "${TEST_DIR}"/test_runtime/test_download2 -w "%{http_code}\n" --cookie "${cookie}" -X GET http://127.0.0.1:8085/nested/download2
    cmp "${TEST_DIR}"/test_runtime/download/nested/download2 "${TEST_DIR}"/test_runtime/test_download2
}
@test "download at root with nested user fails" {
    local cookie;
    cookie=$(curl -sf -o /dev/null -X POST --cookie-jar - -H "authorization: Basic $(echo -n nested:nestedtestpass | base64)" http://127.0.0.1:8085/___ngxp/login | grep ngxp | sed 's/.*\sngxp\s*/ngxp=/')

    head -c 1048576 < /dev/urandom > "${TEST_DIR}"/test_runtime/download/download3
    run curl -s -o "${TEST_DIR}"/test_runtime/test_download3 -w "%{http_code}\n" --cookie "${cookie}" -X GET http://127.0.0.1:8085/download3
    assert_line '403'
    ! cmp "${TEST_DIR}"/test_runtime/download/nested/download3 "${TEST_DIR}"/test_runtime/test_download3
}
@test "download at root with nested user fails (transformed cookie)" {
    local cookie;
    cookie=$(curl -sf -o /dev/null -X POST --cookie-jar - -H "authorization: Basic $(echo -n nested:nestedtestpass | base64)" http://127.0.0.1:8085/___ngxp/login | grep ngxp | sed 's/.*\sngxp\s*/ngxp=/')

    cookie=$(echo "$cookie" | sed 's#:/nested#:/#')  # cookie transform

    head -c 1048576 < /dev/urandom > "${TEST_DIR}"/test_runtime/download/download33
    run curl -s -o "${TEST_DIR}"/test_runtime/test_download33 -w "%{http_code}\n" --cookie "${cookie}" -X GET http://127.0.0.1:8085/download3
    assert_line '403'
    ! cmp "${TEST_DIR}"/test_runtime/download/nested/download33 "${TEST_DIR}"/test_runtime/test_download33
}
@test "download at nested with nested user ok" {
    local cookie;
    cookie=$(curl -sf -o /dev/null -X POST --cookie-jar - -H "authorization: Basic $(echo -n nested:nestedtestpass | base64)" http://127.0.0.1:8085/___ngxp/login | grep ngxp | sed 's/.*\sngxp\s*/ngxp=/')

    head -c 1048576 < /dev/urandom > "${TEST_DIR}"/test_runtime/download/nested/download4
    curl -s -o "${TEST_DIR}"/test_runtime/test_download4 -w "%{http_code}\n" --cookie "${cookie}" -X GET http://127.0.0.1:8085/nested/download4
    cmp "${TEST_DIR}"/test_runtime/download/nested/download4 "${TEST_DIR}"/test_runtime/test_download4
}
@test "upload with nested user fail" {
    local cookie;
    cookie=$(curl -sf -o /dev/null -X POST --cookie-jar - -H "authorization: Basic $(echo -n nested:nestedtestpass | base64)" http://127.0.0.1:8085/___ngxp/login | grep ngxp | sed 's/.*\sngxp\s*/ngxp=/')

    head -c 1048576 < /dev/urandom > "${TEST_DIR}"/test_runtime/test_upload1
    run curl -s -o /dev/null -w "%{http_code}\n" --cookie "${cookie}" -H 'Content-Type: application/octet-stream' -H 'Content-Disposition: attachment; filename="a"' --data-binary @"${TEST_DIR}"/test_runtime/test_upload1 -X POST http://127.0.0.1:8085/___ngxp/upload/
    assert_line '403'
    find "${TEST_DIR}"/test_runtime/uploads/ -type f | while read -r f; do
        ! cmp "${TEST_DIR}"/test_runtime/test_upload1 "$f"
    done
}
@test "upload with upload user ok" {
    local cookie;
    cookie=$(curl -sf -o /dev/null -X POST --cookie-jar - -H "authorization: Basic $(echo -n upload:uploadtestpass | base64)" http://127.0.0.1:8085/___ngxp/login | grep ngxp | sed 's/.*\sngxp\s*/ngxp=/')

    head -c 1048576 < /dev/urandom > "${TEST_DIR}"/test_runtime/test_upload2
    curl -f -s -o /dev/null -w "%{http_code}\n" --cookie "${cookie}" -H 'Content-Type: application/octet-stream' -H 'Content-Disposition: attachment; filename="b"' --data-binary @"${TEST_DIR}"/test_runtime/test_upload2 -X POST http://127.0.0.1:8085/___ngxp/upload/
    sum=$(md5sum "${TEST_DIR}"/test_runtime/test_upload2 | awk '{ print $1 }')
    md5sum "${TEST_DIR}"/test_runtime/uploads/* | awk '{ print $1 }' | grep "$sum"
}
