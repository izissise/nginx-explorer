#!/usr/bin/env bats
bats_require_minimum_version 1.5.0

# Upload protocol.
#
# The JS client (main.js upload_ngxp_file) splits a file larger than the
# `upload-max-size` advertised in the html header into chunks, POSTs them one
# by one to /___ngxp/upload/ (each one must fit under nginx
# `client_max_body_size`), then POSTs a `#ngxpupload_meta` file listing the
# chunk file numbers. `ngxp.sh upload_fixup` reassembles them server side.
#
# These tests drive the server with curl the way the client does, and feed
# upload_fixup both well formed and broken chunk sets (what a buggy client
# produced: one oversized chunk followed by empty ones).

driver=docker
if command -v podman &>/dev/null; then
    driver=podman
fi

setup_file() {
    export TEST_DIR ROOT_DIR
    TEST_DIR=$( cd "${BATS_TEST_FILENAME%/*}" >/dev/null 2>&1 && pwd )
    ROOT_DIR=${TEST_DIR}/../

    mkdir -p "${TEST_DIR}"/test_runtime/{uploads_up,download_up}
    rm -f "${TEST_DIR}"/test_runtime/{basic_up.htpasswd,accessuri_up.map}
    touch "${TEST_DIR}"/test_runtime/{basic_up.htpasswd,accessuri_up.map}

    "${ROOT_DIR}"/ngxp.sh user_add \
        "${TEST_DIR}"/test_runtime/{basic_up.htpasswd,accessuri_up.map} upload uploadtestpass /___ngxp/upload/

    cat > "${TEST_DIR}/test_runtime/nginx_up.conf" <<EOF
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
        --name="bats_nginx_explorer_test_server_upload" \
        -d \
        --user="$(id -u):$(id -g)" \
        --userns=keep-id --cap-drop=ALL \
        --tmpfs=/tmp:rw,noexec,nosuid,size=70m \
        --expose=8080 -p 8089:8080 \
        -v "${TEST_DIR}/test_runtime/download_up:/home/user/downloads:ro" \
        -v "${TEST_DIR}/test_runtime/uploads_up:/home/user/uploads:rw" \
        -v "${TEST_DIR}/test_runtime/nginx_up.conf:/etc/nginx/nginx.conf:ro" \
        -v "${ROOT_DIR}:/var/www/ngxp:ro" \
        -v "${ROOT_DIR}/nginx-explorer.conf:/etc/nginx/conf.d/default.conf:ro" \
        -v "${TEST_DIR}/test_runtime/basic_up.htpasswd:/opt/ngxp/basic.htpasswd:ro" \
        -v "${TEST_DIR}/test_runtime/accessuri_up.map:/opt/ngxp/accessuri.map:ro" \
        nginx

    for _ in $(seq 50); do # wait for nginx to accept connections
        curl -s -o /dev/null http://127.0.0.1:8089/___ngxp/upload/ && break
        sleep 0.2
    done
}

teardown_file() {
    "$driver" stop "bats_nginx_explorer_test_server_upload"
    "$driver" logs "bats_nginx_explorer_test_server_upload" &> "${TEST_DIR}/test_runtime/nginx_up.log"
    "$driver" rm "bats_nginx_explorer_test_server_upload"

    # remove test outputs (comment this out to see why a test failed)
    rm -rf \
        "${TEST_DIR}/test_runtime/nginx_up.conf" \
        "${TEST_DIR}"/test_runtime/{basic_up.htpasswd,accessuri_up.map} \
        "${TEST_DIR}/test_runtime/nginx_up.log" \
        "${TEST_DIR}"/test_runtime/{uploads_up,download_up}
}

setup() {
    load 'bats/bats-support/load'
    load 'bats/bats-assert/load'
}

# --- helpers --------------------------------------------------------------

login_cookie() { # user password -> "ngxp=..."
    curl -sf -o /dev/null -X POST --cookie-jar - -H "authorization: Basic $(echo -n "$1:$2" | base64)" http://127.0.0.1:8089/___ngxp/login | grep ngxp | sed 's/.*\sngxp\s*/ngxp=/'
}

post_blob() { # cookie file -> file number, same request as main.js upload_raw()
    curl -sf -o - --cookie "$1" \
        -H 'Content-Type: application/octet-stream' \
        -H 'Content-Disposition: attachment; filename="blob"' \
        --data-binary @"$2" -X POST http://127.0.0.1:8089/___ngxp/upload/
}

meta_file() { # name size chunk_cnt chunk_size chunk_last_size fileno... -> same content as main.js up_meta_info()
    local name=$1 size=$2 cnt=$3 csz=$4 clsz=$5
    shift 5
    printf '#ngxpupload_meta\n'
    jq -nc \
        --arg name "$name" --argjson size "$size" \
        --argjson cnt "$cnt" --argjson csz "$csz" --argjson clsz "$clsz" \
        --args '{ name: $name, size: $size, type: "application/octet-stream", chunk_cnt: $cnt, chunk_size: $csz, chunk_last_size: $clsz, chunk_fileno: $ARGS.positional, uploader: "upload" }' "$@"
    printf '# Fixup command\n# see ngxp.sh upload_fixup\n'
}

conf_client_max_body_size() { # -> bytes, as set in nginx-explorer.conf
    local max unit
    read -r max unit < <(sed -nE 's/.*client_max_body_size +([0-9]+)([kKmMgG]?);.*/\1 \2/p' "${ROOT_DIR}/nginx-explorer.conf")
    case "$unit" in
        k|K) max=$((max * 1024)) ;;
        m|M) max=$((max * 1024 * 1024)) ;;
        g|G) max=$((max * 1024 * 1024 * 1024)) ;;
    esac
    echo "$max"
}

conf_upload_max_size() { # -> bytes, as advertised to the JS client in the html header
    sed -nE "s/.*upload-max-size='([0-9]+)'.*/\1/p" "${ROOT_DIR}/nginx-explorer.conf"
}

# --- tests ----------------------------------------------------------------

@test "config: advertised upload-max-size is client_max_body_size minus 20 MiB" {
    # The client chunks at upload-max-size, nginx rejects bodies above
    # client_max_body_size. Nginx cannot compute one from the other, so the html
    # header hardcodes the cap minus a 20 MiB margin: this keeps the two in step.
    local adv max
    adv=$(conf_upload_max_size)
    max=$(conf_client_max_body_size)
    [ "$max" -gt 0 ]
    [ "$adv" -eq $(( max - 20 * 1024 * 1024 )) ]
}

@test "server: a body above client_max_body_size is rejected with 413" {
    # This is what the user sees when the client sends a chunk that is too
    # big: the client has to keep every chunk under the advertised limit.
    local cookie dir
    cookie=$(login_cookie upload uploadtestpass)
    dir="${TEST_DIR}/test_runtime/upload_toobig"
    rm -rf "$dir"; mkdir -p "$dir"
    truncate -s $(( $(conf_client_max_body_size) + 1 )) "$dir/toobig" # sparse file, cheap to create and to read

    run curl -s -o /dev/null -w "%{http_code}\n" --max-time 60 --cookie "${cookie}" \
        -H 'Content-Type: application/octet-stream' \
        -X POST -T "$dir/toobig" http://127.0.0.1:8089/___ngxp/upload/toobig
    assert_line '413'
    rm -rf "$dir"
}

@test "server: chunks sent the way the client does are reassembled by upload_fixup" {
    local cookie dir chunk fileno filenos=()
    cookie=$(login_cookie upload uploadtestpass)
    dir="${TEST_DIR}/test_runtime/upload_e2e"
    rm -rf "$dir"; mkdir -p "$dir"/{chunks,out}

    # 3.5 MiB with 1 MiB chunks -> 3 full chunks + 512 KiB, same arithmetic as upload_ngxp_file()
    head -c $(( 3 * 1048576 + 524288 )) < /dev/urandom > "$dir/original"
    split -b 1048576 -d -a 1 "$dir/original" "$dir/chunk."
    for chunk in "$dir"/chunk.?; do
        fileno=$(post_blob "$cookie" "$chunk")
        filenos+=("$fileno")
    done
    meta_file "my file.bin" $(( 3 * 1048576 + 524288 )) 4 1048576 524288 "${filenos[@]}" > "$dir/meta"
    filenos+=("$(post_blob "$cookie" "$dir/meta")")

    # move this upload out of the shared upload dir, tests run in parallel
    for fileno in "${filenos[@]}"; do
        mv "${TEST_DIR}/test_runtime/uploads_up/${fileno}" "$dir/chunks/"
    done

    cd "$dir/out" # upload_fixup writes the reassembled file in the current directory
    "${ROOT_DIR}"/ngxp.sh upload_fixup "$dir/chunks/"
    cmp "$dir/original" "$dir/out/my file.bin"
    [ -z "$(ls -A "$dir/chunks")" ] # chunks and meta are removed once reassembled
    cd "${TEST_DIR}"
    rm -rf "$dir"
}

@test "upload_fixup: rejects a chunk set with empty chunks, keeps it, and still processes the other uploads" {
    local dir
    dir="${TEST_DIR}/test_runtime/upload_fixup_empty"
    rm -rf "$dir"; mkdir -p "$dir"/{chunks,out}

    # upload A, well formed: 1000 bytes in 300 bytes chunks -> 300, 300, 300, 100
    head -c 1000 < /dev/urandom > "$dir/a.original"
    head -c 300 "$dir/a.original" > "$dir/chunks/0000000001"
    tail -c +301 "$dir/a.original" | head -c 300 > "$dir/chunks/0000000002"
    tail -c +601 "$dir/a.original" | head -c 300 > "$dir/chunks/0000000003"
    tail -c +901 "$dir/a.original" > "$dir/chunks/0000000004"
    meta_file a.bin 1000 4 300 100 0000000001 0000000002 0000000003 0000000004 > "$dir/chunks/0000000005"

    # upload B, what a broken client produced for the same kind of file: 300, 700, 0, 0
    head -c 1000 < /dev/urandom > "$dir/b.original"
    head -c 300 "$dir/b.original" > "$dir/chunks/0000000006"
    tail -c +301 "$dir/b.original" > "$dir/chunks/0000000007"
    : > "$dir/chunks/0000000008"
    : > "$dir/chunks/0000000009"
    meta_file b.bin 1000 4 300 100 0000000006 0000000007 0000000008 0000000009 > "$dir/chunks/0000000010"

    cd "$dir/out"
    run "${ROOT_DIR}"/ngxp.sh upload_fixup "$dir/chunks/"
    assert_failure                                      # the caller must know something went wrong
    assert_output --partial '0000000010 meta invalid'
    [ ! -e "$dir/out/b.bin" ]                           # nothing written out of the broken chunks
    for f in 0000000006 0000000007 0000000008 0000000009 0000000010; do
        [ -f "$dir/chunks/$f" ]                         # and they are left in place for inspection
    done
    cmp "$dir/a.original" "$dir/out/a.bin"              # the well formed upload is still reassembled
    cd "${TEST_DIR}"
    rm -rf "$dir"
}

@test "upload_fixup: rejects a chunk set with a missing chunk" {
    local dir
    dir="${TEST_DIR}/test_runtime/upload_fixup_missing"
    rm -rf "$dir"; mkdir -p "$dir"/{chunks,out}

    head -c 1000 < /dev/urandom > "$dir/c.original"
    head -c 300 "$dir/c.original" > "$dir/chunks/0000000001"
    tail -c +301 "$dir/c.original" | head -c 300 > "$dir/chunks/0000000002"
    tail -c +901 "$dir/c.original" > "$dir/chunks/0000000004" # 0000000003 never made it
    meta_file c.bin 1000 4 300 100 0000000001 0000000002 0000000003 0000000004 > "$dir/chunks/0000000005"

    cd "$dir/out"
    run "${ROOT_DIR}"/ngxp.sh upload_fixup "$dir/chunks/"
    assert_failure
    assert_output --partial '0000000005 meta invalid'
    [ ! -e "$dir/out/c.bin" ]
    cd "${TEST_DIR}"
    rm -rf "$dir"
}

# --- adversarial: the meta file is written by the uploader -----------------

# a complete upload of 2 chunks of 300 bytes + 100 bytes, meta named by the caller
small_upload() { # dir name first_fileno
    local dir=$1 name=$2 n=$3
    head -c 700 < /dev/urandom > "$dir/$n.original"
    head -c 300 "$dir/$n.original" > "$dir/chunks/$(printf '%010d' "$n")"
    tail -c +301 "$dir/$n.original" | head -c 300 > "$dir/chunks/$(printf '%010d' "$((n + 1))")"
    tail -c +601 "$dir/$n.original" > "$dir/chunks/$(printf '%010d' "$((n + 2))")"
    meta_file "$name" 700 3 300 100 "$(printf '%010d' "$n")" "$(printf '%010d' "$((n + 1))")" "$(printf '%010d' "$((n + 2))")" > "$dir/chunks/$(printf '%010d' "$((n + 3))")"
}

@test "upload_fixup: a name with directory parts stays in the output directory" {
    local dir
    dir="${TEST_DIR}/test_runtime/upload_fixup_name_dirs"
    rm -rf "$dir"; mkdir -p "$dir"/{chunks,out}
    small_upload "$dir" "../../escaped" 1

    cd "$dir/out"
    "${ROOT_DIR}"/ngxp.sh upload_fixup "$dir/chunks/"
    cmp "$dir/1.original" "$dir/out/.._.._escaped"
    [ ! -e "$dir/escaped" ]
    [ ! -e "${TEST_DIR}/test_runtime/escaped" ]
    [ ! -e "${TEST_DIR}/escaped" ]
    cd "${TEST_DIR}"
    rm -rf "$dir"
}

@test "upload_fixup: a name with shell special characters is used literally" {
    local dir name
    dir="${TEST_DIR}/test_runtime/upload_fixup_name_shell"
    rm -rf "$dir"; mkdir -p "$dir"/{chunks,out}
    name='-n $(touch injected) `touch injected` ; touch injected'
    small_upload "$dir" "$name" 1

    cd "$dir/out"
    "${ROOT_DIR}"/ngxp.sh upload_fixup "$dir/chunks/"
    cmp "$dir/1.original" "$dir/out/$name"
    [ ! -e "$dir/out/injected" ]
    [ "$(ls -A "$dir/out" | wc -l)" -eq 1 ]
    cd "${TEST_DIR}"
    rm -rf "$dir"
}

@test "upload_fixup: chunk list entries that are not file numbers are ignored, the upload is invalid" {
    local dir
    dir="${TEST_DIR}/test_runtime/upload_fixup_fileno"
    rm -rf "$dir"; mkdir -p "$dir"/{chunks,out,elsewhere}
    head -c 300 < /dev/urandom > "$dir/elsewhere/other"       # a file outside the upload directory
    head -c 300 < /dev/urandom > "$dir/chunks/0000000001"
    meta_file d.bin 600 2 300 0 0000000001 "../elsewhere/other" > "$dir/chunks/0000000002"
    meta_file e.bin 600 2 300 0 0000000001 "$dir/elsewhere/other" > "$dir/chunks/0000000003"

    cd "$dir/out"
    run "${ROOT_DIR}"/ngxp.sh upload_fixup "$dir/chunks/"
    assert_failure
    assert_output --partial '0000000002 meta invalid'
    assert_output --partial '0000000003 meta invalid'
    [ -z "$(ls -A "$dir/out")" ]                               # nothing written
    [ -f "$dir/chunks/0000000001" ]                            # nothing removed
    cd "${TEST_DIR}"
    rm -rf "$dir"
}

@test "upload_fixup: a meta file with the marker but broken content does not stop the run" {
    local dir
    dir="${TEST_DIR}/test_runtime/upload_fixup_broken_meta"
    rm -rf "$dir"; mkdir -p "$dir"/{chunks,out}
    printf '#ngxpupload_meta\nthis is not json\n' > "$dir/chunks/0000000001"
    printf '#ngxpupload_meta\n{"name":"f.bin","chunk_cnt":"x","chunk_size":300,"chunk_last_size":0,"chunk_fileno":[]}\n' > "$dir/chunks/0000000002"
    printf '#ngxpupload_meta\n{"chunk_cnt":1,"chunk_size":300,"chunk_last_size":0,"chunk_fileno":["0000000001"]}\n' > "$dir/chunks/0000000003" # no name
    printf '#ngxpupload_meta\n{"name":"..","chunk_cnt":1,"chunk_size":300,"chunk_last_size":0,"chunk_fileno":["0000000001"]}\n' > "$dir/chunks/0000000004"
    printf '#ngxpupload_meta\n{"name":"g.bin","chunk_cnt":0,"chunk_size":0,"chunk_last_size":0,"chunk_fileno":[]}\n' > "$dir/chunks/0000000005"
    small_upload "$dir" good.bin 6                             # a well formed one after them

    cd "$dir/out"
    run "${ROOT_DIR}"/ngxp.sh upload_fixup "$dir/chunks/"
    assert_failure
    for f in 0000000001 0000000002 0000000003 0000000004 0000000005; do
        assert_output --partial "$f meta invalid"
        [ -f "$dir/chunks/$f" ]
    done
    cmp "$dir/6.original" "$dir/out/good.bin"
    [ "$(ls -A "$dir/out" | wc -l)" -eq 1 ]
    cd "${TEST_DIR}"
    rm -rf "$dir"
}

@test "upload_fixup: the same name uploaded twice does not overwrite the first file" {
    local dir
    dir="${TEST_DIR}/test_runtime/upload_fixup_same_name"
    rm -rf "$dir"; mkdir -p "$dir"/{chunks,out}
    small_upload "$dir" same.bin 1
    small_upload "$dir" same.bin 5

    cd "$dir/out"
    "${ROOT_DIR}"/ngxp.sh upload_fixup "$dir/chunks/"
    cmp "$dir/1.original" "$dir/out/same.bin"
    cmp "$dir/5.original" "$dir/out/same.bin.0000000008"
    [ -z "$(ls -A "$dir/chunks")" ]
    cd "${TEST_DIR}"
    rm -rf "$dir"
}

@test "server: a chunk list pointing at another upload is only a problem for its own file" {
    # whoever can POST can write any meta file: it must not be able to make
    # upload_fixup touch files it does not list, and listed files are only
    # consumed when sizes match
    local cookie dir fileno
    cookie=$(login_cookie upload uploadtestpass)
    dir="${TEST_DIR}/test_runtime/upload_e2e_foreign"
    rm -rf "$dir"; mkdir -p "$dir"/{chunks,out}

    head -c 1000 < /dev/urandom > "$dir/victim"
    fileno=$(post_blob "$cookie" "$dir/victim")                 # some other user's chunk
    mv "${TEST_DIR}/test_runtime/uploads_up/${fileno}" "$dir/chunks/"
    meta_file grab.bin 1000 1 300 0 "$fileno" > "$dir/meta"     # claims it, with the wrong size
    mv "${TEST_DIR}/test_runtime/uploads_up/$(post_blob "$cookie" "$dir/meta")" "$dir/chunks/"

    cd "$dir/out"
    run "${ROOT_DIR}"/ngxp.sh upload_fixup "$dir/chunks/"
    assert_failure
    [ -z "$(ls -A "$dir/out")" ]
    cmp "$dir/victim" "$dir/chunks/${fileno}"                   # untouched
    cd "${TEST_DIR}"
    rm -rf "$dir"
}
