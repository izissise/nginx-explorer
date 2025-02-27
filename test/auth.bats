#!/usr/bin/env bats
bats_require_minimum_version 1.5.0

driver=docker
if command -v podman &>/dev/null; then
    driver=podman
fi

# https://regex101.com
# map ${user_cookie_accesses}\\${uri} $uri_access rex
# SHOULD MATCH
# /\/
# /nested\/nested/
# /___ngxp/upload/\/___ngxp/upload/
# /mpath/1|/mpath/3|/mpath/four\/mpath/1/
# /mpath/1|/mpath/3|/mpath/four\/mpath/3/
# /mpath/1|/mpath/3|/mpath/four\/mpath/four/ddd
# /abc|/a\/abc/
# /\/download1
# SHOULD NOT MATCH
# /nested\/nes
# /mpath/1|/mpath/3|/mpath/four\/mapth/1/file
# /abc|/a\/ab/
# /abc|/a\|/secreta\/secreta
# /abc|/a\/ab/no

setup_file() {
    export TEST_DIR
    TEST_DIR=$( cd "${BATS_TEST_FILENAME%/*}" >/dev/null 2>&1 && pwd )
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
    "${ROOT_DIR}"/ngxp.sh user_add \
        "${TEST_DIR}"/test_runtime/{basic.htpasswd,accessuri.map} mpath mpathtestpass /mpath/1 /mpath/3 /mpath/four
    "${ROOT_DIR}"/ngxp.sh user_add \
        "${TEST_DIR}"/test_runtime/{basic.htpasswd,accessuri.map} abc abctestpass /abc /a

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

    rm -rf \
        "${TEST_DIR}"/test_runtime/{basic.htpasswd,accessuri.map} \
        "${TEST_DIR}/test_runtime/nginx.conf" \
        "${TEST_DIR}/test_runtime/nginx.log" \
        "${TEST_DIR}"/test_runtime/{uploads,download}
}

setup() {
    load 'bats/bats-support/load'
    load 'bats/bats-assert/load'
}

@test "responds 401 on GET  /                without cookie" {
    run curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8085/
    assert_line '401'
}
@test "responds 401 on GET  /                with a valid wrongly formatted cookie" {
    run curl -s -o /dev/null -w "%{http_code}\n" --cookie "ngxp=/:wddewnope:/:/" http://localhost:8085/
    assert_line '401'
}
@test "responds 401 on GET  /                with a valid user but wrong secret cookie lan_anon" {
    run curl -s -o /dev/null -w "%{http_code}\n" --cookie "ngxp=lan_anon:c01ee28a3dff1ccadfaa856b45bebff021adae93f3b74758:/" http://localhost:8085/
    assert_line '401'
}
@test "responds 401 on GET  /                with a valid user but wrong secret cookie" {
    run curl -s -o /dev/null -w "%{http_code}\n" --cookie "ngxp=root:c01ee28a3dff1ccadfaa856b45cebff021adae93f3b74758:/" http://localhost:8085/
    assert_line '401'
}
@test "responds 401 on GET  /                with regex pwn" {
    run curl -s -o /dev/null -w "%{http_code}\n" --cookie "ngxp=root:?" http://localhost:8085/
    assert_line '401'
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
@test "responds 401 on POST /___ngxp/login   with wrong creds" {
    run curl -s -o /dev/null -w "%{http_code}\n" --cookie-jar - -X POST -H "authorization: Basic $(echo -n root: | base64)" http://127.0.0.1:8085/___ngxp/login
    assert_line '401'
    refute_output 'ngxp' # cookie should not be set
}
@test "responds 401 on POST /___ngxp/login   with not set lan_anon" {
    run curl -s -o /dev/null -w "%{http_code}\n" --cookie-jar - -X POST -H "authorization: Basic $(echo -n lan_anon: | base64)" http://127.0.0.1:8085/___ngxp/login
    assert_line '401'
    refute_output 'ngxp' # cookie should not be set
}
@test "responds 401 on POST /___ngxp/login   with unknown user" {
    run curl -s -o /dev/null -w "%{http_code}\n" --cookie-jar - -X POST -H "authorization: Basic $(echo -n whoisthis:no | base64)" http://127.0.0.1:8085/___ngxp/login
    assert_line '401'
    refute_output 'ngxp' # cookie should not be set
}
@test "responds 401 on GET  /___ngxp/upload/ with nested user" {
    local cookie;
    cookie=$(curl -sf -o /dev/null -X POST --cookie-jar - -H "authorization: Basic $(echo -n nested:nestedtestpass | base64)" http://127.0.0.1:8085/___ngxp/login | grep ngxp | sed 's/.*\sngxp\s*/ngxp=/')
    run curl -s -o /dev/null -w "%{http_code}\n" --cookie "${cookie}" -X GET http://127.0.0.1:8085/___ngxp/upload/
    assert_line '401'
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
    rm -f "${TEST_DIR}"/test_runtime/test_listing1
}
@test "download file (simple)" {
    local cookie;
    cookie=$(curl -sf -o /dev/null -X POST --cookie-jar - -H "authorization: Basic $(echo -n root:roottestpass | base64)" http://127.0.0.1:8085/___ngxp/login | grep ngxp | sed 's/.*\sngxp\s*/ngxp=/')

    head -c 1048576 < /dev/urandom > "${TEST_DIR}"/test_runtime/download/download1
    curl -f -s -o "${TEST_DIR}"/test_runtime/test_download1 -w "%{http_code}\n" --cookie "${cookie}" -X GET http://127.0.0.1:8085/download1
    cmp "${TEST_DIR}"/test_runtime/download/download1 "${TEST_DIR}"/test_runtime/test_download1
    rm -f "${TEST_DIR}"/test_runtime/download/download1 "${TEST_DIR}"/test_runtime/test_download1
}
@test "download file (nested)" {
    local cookie;
    cookie=$(curl -sf -o /dev/null -X POST --cookie-jar - -H "authorization: Basic $(echo -n root:roottestpass | base64)" http://127.0.0.1:8085/___ngxp/login | grep ngxp | sed 's/.*\sngxp\s*/ngxp=/')

    mkdir -p "${TEST_DIR}"/test_runtime/download/nested
    head -c 1048576 < /dev/urandom > "${TEST_DIR}"/test_runtime/download/nested/download2
    curl -f -s -o "${TEST_DIR}"/test_runtime/test_download2 -w "%{http_code}\n" --cookie "${cookie}" -X GET http://127.0.0.1:8085/nested/download2
    cmp "${TEST_DIR}"/test_runtime/download/nested/download2 "${TEST_DIR}"/test_runtime/test_download2
    rm -f "${TEST_DIR}"/test_runtime/download/nested/download2 "${TEST_DIR}"/test_runtime/test_download2
}
@test "download at root with nested user fails" {
    local cookie;
    cookie=$(curl -sf -o /dev/null -X POST --cookie-jar - -H "authorization: Basic $(echo -n nested:nestedtestpass | base64)" http://127.0.0.1:8085/___ngxp/login | grep ngxp | sed 's/.*\sngxp\s*/ngxp=/')

    head -c 1048576 < /dev/urandom > "${TEST_DIR}"/test_runtime/download/download3
    run curl -s -o "${TEST_DIR}"/test_runtime/test_download3 -w "%{http_code}\n" --cookie "${cookie}" -X GET http://127.0.0.1:8085/download3
    assert_line '401'
    ( ! cmp "${TEST_DIR}"/test_runtime/download/download3 "${TEST_DIR}"/test_runtime/test_download3 )
    rm -f "${TEST_DIR}"/test_runtime/download/download3 "${TEST_DIR}"/test_runtime/test_download3
}
@test "download at root with nested user fails (transformed cookie)" {
    local cookie;
    cookie=$(curl -sf -o /dev/null -X POST --cookie-jar - -H "authorization: Basic $(echo -n nested:nestedtestpass | base64)" http://127.0.0.1:8085/___ngxp/login | grep ngxp | sed 's/.*\sngxp\s*/ngxp=/')

    cookie=${cookie/|\/nested/|\/} # cookie transform

    head -c 1048576 < /dev/urandom > "${TEST_DIR}"/test_runtime/download/download33
    run curl -s -o "${TEST_DIR}"/test_runtime/test_download33 -w "%{http_code}\n" --cookie "${cookie}" -X GET http://127.0.0.1:8085/download33
    assert_line '401'
    ( ! cmp "${TEST_DIR}"/test_runtime/download/download33 "${TEST_DIR}"/test_runtime/test_download33 )
    rm -f "${TEST_DIR}"/test_runtime/download/download33 "${TEST_DIR}"/test_runtime/test_download33
}
@test "download at nested with nested user ok" {
    local cookie;
    cookie=$(curl -sf -o /dev/null -X POST --cookie-jar - -H "authorization: Basic $(echo -n nested:nestedtestpass | base64)" http://127.0.0.1:8085/___ngxp/login | grep ngxp | sed 's/.*\sngxp\s*/ngxp=/')

    head -c 1048576 < /dev/urandom > "${TEST_DIR}"/test_runtime/download/nested/download4
    curl -s -o "${TEST_DIR}"/test_runtime/test_download4 -w "%{http_code}\n" --cookie "${cookie}" -X GET http://127.0.0.1:8085/nested/download4
    cmp "${TEST_DIR}"/test_runtime/download/nested/download4 "${TEST_DIR}"/test_runtime/test_download4
    rm -f "${TEST_DIR}"/test_runtime/download/nested/download4 "${TEST_DIR}"/test_runtime/test_download4
}
@test "upload with nested user fail" {
    local cookie;
    cookie=$(curl -sf -o /dev/null -X POST --cookie-jar - -H "authorization: Basic $(echo -n nested:nestedtestpass | base64)" http://127.0.0.1:8085/___ngxp/login | grep ngxp | sed 's/.*\sngxp\s*/ngxp=/')

    head -c 1048576 < /dev/urandom > "${TEST_DIR}"/test_runtime/test_upload1
    run curl -s -o /dev/null -w "%{http_code}\n" --cookie "${cookie}" -H 'Content-Type: application/octet-stream' -H 'Content-Disposition: attachment; filename="a"' --data-binary @"${TEST_DIR}"/test_runtime/test_upload1 -X POST http://127.0.0.1:8085/___ngxp/upload/
    assert_line '401'
    find "${TEST_DIR}"/test_runtime/uploads/ -type f | while read -r f; do
        ( ! cmp "${TEST_DIR}"/test_runtime/test_upload1 "$f" )
    done
    rm -f "${TEST_DIR}"/test_runtime/test_upload1
}
@test "upload with upload user ok" {
    local cookie sum;
    cookie=$(curl -sf -o /dev/null -X POST --cookie-jar - -H "authorization: Basic $(echo -n upload:uploadtestpass | base64)" http://127.0.0.1:8085/___ngxp/login | grep ngxp | sed 's/.*\sngxp\s*/ngxp=/')

    head -c 1048576 < /dev/urandom > "${TEST_DIR}"/test_runtime/test_upload2
    curl -f -s -o /dev/null -w "%{http_code}\n" --cookie "${cookie}" -H 'Content-Type: application/octet-stream' -H 'Content-Disposition: attachment; filename="b"' --data-binary @"${TEST_DIR}"/test_runtime/test_upload2 -X POST http://127.0.0.1:8085/___ngxp/upload/
    sum=$(md5sum "${TEST_DIR}"/test_runtime/test_upload2 | awk '{ print $1 }')
    md5sum "${TEST_DIR}"/test_runtime/uploads/* | awk '{ print $1 }' | grep "$sum"
    rm -f "${TEST_DIR}"/test_runtime/test_upload2
}
@test "upload returns file number" {
    local cookie fileno;
    cookie=$(curl -sf -o /dev/null -X POST --cookie-jar - -H "authorization: Basic $(echo -n upload:uploadtestpass | base64)" http://127.0.0.1:8085/___ngxp/login | grep ngxp | sed 's/.*\sngxp\s*/ngxp=/')

    head -c 1048576 < /dev/urandom > "${TEST_DIR}"/test_runtime/test_upload3
    fileno=$(curl -f -s -o - --cookie "${cookie}" -H 'Content-Type: application/octet-stream' -H 'Content-Disposition: attachment; filename="b"' --data-binary @"${TEST_DIR}"/test_runtime/test_upload3 -X POST http://127.0.0.1:8085/___ngxp/upload/)
    cmp "${TEST_DIR}"/test_runtime/test_upload3 "${TEST_DIR}"/test_runtime/uploads/"$fileno"
    rm -f "${TEST_DIR}"/test_runtime/test_upload3
}
@test "download at multiple path tree" {
    local cookie;
    cookie=$(curl -sf -o /dev/null -X POST --cookie-jar - -H "authorization: Basic $(echo -n mpath:mpathtestpass | base64)" http://127.0.0.1:8085/___ngxp/login | grep ngxp | sed 's/.*\sngxp\s*/ngxp=/')

    mkdir -p "${TEST_DIR}"/test_runtime/download/mpath/{1,2,3}

    head -c 512 < /dev/urandom > "${TEST_DIR}"/test_runtime/download/mpath/1/file
    head -c 512 < /dev/urandom > "${TEST_DIR}"/test_runtime/download/mpath/2/file
    head -c 512 < /dev/urandom > "${TEST_DIR}"/test_runtime/download/mpath/3/file
    head -c 512 < /dev/urandom > "${TEST_DIR}"/test_runtime/download/mpath/four
    head -c 512 < /dev/urandom > "${TEST_DIR}"/test_runtime/download/mpath/five

    run curl -s -o "${TEST_DIR}"/test_runtime/test_mpath1 -w "%{http_code}\n" --cookie "${cookie}" -X GET http://127.0.0.1:8085/mpath/1/file
    assert_line '200'
    run curl -s -o "${TEST_DIR}"/test_runtime/test_mpath2 -w "%{http_code}\n" --cookie "${cookie}" -X GET http://127.0.0.1:8085/mpath/2/file
    assert_line '401'
    run curl -s -o "${TEST_DIR}"/test_runtime/test_mpath3 -w "%{http_code}\n" --cookie "${cookie}" -X GET http://127.0.0.1:8085/mpath/3/file
    assert_line '200'
    run curl -s -o "${TEST_DIR}"/test_runtime/test_mpath4 -w "%{http_code}\n" --cookie "${cookie}" -X GET http://127.0.0.1:8085/mpath/four
    assert_line '200'
    run curl -s -o "${TEST_DIR}"/test_runtime/test_mpath5 -w "%{http_code}\n" --cookie "${cookie}" -X GET http://127.0.0.1:8085/mpath/five
    assert_line '401'

    cmp "${TEST_DIR}"/test_runtime/download/mpath/1/file "${TEST_DIR}"/test_runtime/test_mpath1
    ( ! cmp "${TEST_DIR}"/test_runtime/download/mpath/2/file "${TEST_DIR}"/test_runtime/test_mpath2 )
    cmp "${TEST_DIR}"/test_runtime/download/mpath/3/file "${TEST_DIR}"/test_runtime/test_mpath3
    cmp "${TEST_DIR}"/test_runtime/download/mpath/four "${TEST_DIR}"/test_runtime/test_mpath4
    ( ! cmp "${TEST_DIR}"/test_runtime/download/mpath/five "${TEST_DIR}"/test_runtime/test_mpath5 )

    rm -f \
        "${TEST_DIR}"/test_runtime/download/mpath/1/file "${TEST_DIR}"/test_runtime/test_mpath1 \
        "${TEST_DIR}"/test_runtime/download/mpath/2/file "${TEST_DIR}"/test_runtime/test_mpath2 \
        "${TEST_DIR}"/test_runtime/download/mpath/3/file "${TEST_DIR}"/test_runtime/test_mpath3 \
        "${TEST_DIR}"/test_runtime/download/mpath/four "${TEST_DIR}"/test_runtime/test_mpath4 \
        "${TEST_DIR}"/test_runtime/download/mpath/five "${TEST_DIR}"/test_runtime/test_mpath5
}
@test "check auth for path subset and expansion" {
    local cookie;
    cookie=$(curl -sf -o /dev/null -X POST --cookie-jar - -H "authorization: Basic $(echo -n abc:abctestpass | base64)" http://127.0.0.1:8085/___ngxp/login | grep ngxp | sed 's/.*\sngxp\s*/ngxp=/')

    mkdir -p "${TEST_DIR}"/test_runtime/download/{abc,ab,a}
    touch "${TEST_DIR}"/test_runtime/download/ab/no

    run curl -s -o /dev/null -w "%{http_code}\n" --cookie "${cookie}" -X GET http://127.0.0.1:8085/abc/
    assert_line '200'
    run curl -s -o /dev/null -w "%{http_code}\n" --cookie "${cookie}" -X GET http://127.0.0.1:8085/ab/
    assert_line '401'
    run curl -s -o /dev/null -w "%{http_code}\n" --cookie "${cookie}" -X GET http://127.0.0.1:8085/ab/no
    assert_line '401'
    run curl -s -o /dev/null -w "%{http_code}\n" --cookie "${cookie}" -X GET 'http://127.0.0.1:8085/ab\/no'
    assert_line '401'
    run curl -s -o /dev/null -w "%{http_code}\n" --cookie "${cookie}" -X GET http://127.0.0.1:8085/a/
    assert_line '200'

    rm -rf "${TEST_DIR}"/test_runtime/download/{abc,ab,a}
}
@test "cannot craft url to get access" {
    # in the access rex modifying the first part like so (spaces added for lisibility)
    # from: ^(|[^\x5c]*\|)([^\|]+)(\x5c|\|[^\x5c]*\x5c)\2((?<=\/)|$|\/).*$
    # to:   ^(|.*\|)      ([^\|]+)(\x5c|\|[^\x5c]*\x5c)\2((?<=\/)|$|\/).*$
    # give access to the secret because the attacker can control where the separator (\) will be

    local cookie;
    cookie=$(curl -sf -o /dev/null -X POST --cookie-jar - -H "authorization: Basic $(echo -n nested:nestedtestpass | base64)" http://127.0.0.1:8085/___ngxp/login | grep ngxp | sed 's/.*\sngxp\s*/ngxp=/')

    head -c 512 < /dev/urandom > "${TEST_DIR}"/test_runtime/download/secret1

    run curl -s -o /dev/null -w "%{http_code}\n" --cookie "${cookie}" -X GET 'http://127.0.0.1:8085/|/secret1\/secret1'
    assert_line '401'
}
