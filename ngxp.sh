#!/usr/bin/env bash

set -eu

CWD=$(cd "${0%/*}" && pwd)

test() {
    local bats_version="1.11.1"
    local bats_support_version="0.3.0"
    local bats_assert_version="2.1.0"
    mkdir -p "$CWD"/test/bats/{bats-assert,bats-support}
    if [ ! -f "$CWD"/test/bats/bin/bats ]; then
        curl -f -s -L "https://github.com/bats-core/bats-assert/archive/v${bats_support_version}.tar.gz" -o - \
            | tar --strip-components=1 -C "${CWD}/test/bats/bats-support" -xzf -
        curl -f -s -L "https://github.com/bats-core/bats-assert/archive/v${bats_assert_version}.tar.gz" -o - \
            | tar --strip-components=1 -C "${CWD}/test/bats/bats-assert" -xzf -
        curl -f -s -L "https://github.com/bats-core/bats-core/archive/v${bats_version}.tar.gz" -o - \
            | tar --strip-components=1 -C "${CWD}/test/bats" -xzf -
    fi

    "$CWD"/test/bats/bin/bats --jobs 30 test/*.bats
}

download_icons() {
    breeze_icon_version=6.7.0
    if [ ! -d "${CWD}/icons" ]; then
        echo 'Downloading icons'
        mkdir "${CWD}/icons"
        curl -f -s -L "https://github.com/KDE/breeze-icons/archive/v${breeze_icon_version}.tar.gz" -o - \
            | tar -C "${CWD}/icons" -xzf - "breeze-icons-${breeze_icon_version}/icons/mimetypes/32" "breeze-icons-${breeze_icon_version}/icons/places/32" --strip-components=4
        mv "${CWD}/icons/folder-cloud.svg" "${CWD}/icons/folder.svg"
    else
        echo "Icons already downloaded at ${CWD}/icons"
    fi
}

dev() {
    user_add basic.htpasswd accessuri.map root pass /
    user_add basic.htpasswd accessuri.map sub pass /sub /sub
    user_add basic.htpasswd accessuri.map upload pass /___ngxp/upload /uploads
    user_add basic.htpasswd accessuri.map xx pass /sub /___ngxp/upload

    driver=docker
    if command -v podman &>/dev/null; then
        driver=podman
    fi
    "$driver" run \
        --rm -it --log-driver=none \
        --user="$(id -u):$(id -g)" \
        --userns=keep-id --cap-drop=ALL \
        --tmpfs=/tmp:rw,noexec,nosuid,size=70m \
        --expose=8080 -p 8080:8080 \
        -v "$HOME/Downloads:/home/user/downloads:ro" \
        -v "$HOME/Downloads/receive:/home/user/downloads/uploads:ro" \
        -v "$HOME/Downloads/receive:/home/user/uploads:rw" \
        -v "${CWD}/docker_nginx.conf:/etc/nginx/nginx.conf:ro" \
        -v "${CWD}/icons:/var/www/ngxp/icons:ro" \
        -v "${CWD}/nginx-explorer.conf:/etc/nginx/conf.d/default.conf:ro" \
        -v "${CWD}/basic.htpasswd:/opt/ngxp/basic.htpasswd:ro" \
        -v "${CWD}/accessuri.map:/opt/ngxp/accessuri.map:ro" \
        -v "${CWD}/main.css:/var/www/ngxp/main.css:ro" \
        -v "${CWD}/main.js:/var/www/ngxp/main.js:ro" \
        -v "${CWD}/test/qunit.html:/var/www/ngxp/qunit.html:ro" \
        -v "${CWD}/test/table.js:/var/www/ngxp/table.js:ro" \
        -v "${CWD}/test/upload.js:/var/www/ngxp/upload.js:ro" \
        nginx
        # nginx nginx-debug -g 'daemon off;' #     error_log /var/log/nginx/error.log debug;
}

servethis() {
    user_add "${CWD}"/basic.htpasswd "${CWD}"/accessuri.map lan_anon "" /

    driver=docker
    if command -v podman &>/dev/null; then
        driver=podman
    fi
    "$driver" run \
        --rm -it --log-driver=none \
        --user="$(id -u):$(id -g)" \
        --userns=keep-id --cap-drop=ALL \
        --tmpfs=/tmp:rw,noexec,nosuid,size=70m \
        --expose=8080 -p 8080:8080 \
        -v "$PWD:/home/user/downloads:ro" \
        -v "$PWD:/home/user/uploads:rw" \
        -v "${CWD}/docker_nginx.conf:/etc/nginx/nginx.conf:ro" \
        -v "${CWD}/icons:/var/www/ngxp/icons:ro" \
        -v "${CWD}/main.js:/var/www/ngxp/main.js:ro" \
        -v "${CWD}/main.css:/var/www/ngxp/main.css:ro" \
        -v "${CWD}/nginx-explorer.conf:/etc/nginx/conf.d/default.conf:ro" \
        -v "${CWD}/basic.htpasswd:/opt/ngxp/basic.htpasswd:ro" \
        -v "${CWD}/accessuri.map:/opt/ngxp/accessuri.map:ro" \
        nginx
}

upload_fixup() {
    if [ ! $# -eq 1 ]; then
        printf '%s\n' "$0 ${FUNCNAME[0]} upload_path"
        exit 1
    fi
    find "$1" -type f | while read -r h; do
        if [ ! -f "$h" ]; then continue; fi                                                # file still exist
        read -r -n 16 head < "$h" || true                                                  # read first 16 bytes
        if [ "$head" != "#ngxpupload_meta" ]; then continue; fi                            # if marker value
        IFS='/' read -r name chk_cnt chk_sz chk_lsz < <(
            jq -Rr 'fromjson? | [(.name | sub("/";"_";"g")), (.chunk_cnt|tonumber), (.chunk_size|tonumber), (.chunk_last_size|tonumber)] | join("/")' "$h"
        ) # extract json
        eval "chk_fileno=( $( jq -Rr --arg d "$1" 'fromjson? | .chunk_fileno[] | select(test("^[0-9]*$")) | "\($d)\(.)" | @sh' "$h" ) )"
        # shellcheck disable=SC2154 # from eval
        stats=$(stat -c '%n %s' "$h" "${chk_fileno[@]}" | sort | uniq -f1 -c)
        stats=${stats% [0-9]*}
        stats=${stats// }
        stats=${stats//$'\n'}
        expected="$(( chk_cnt - ( chk_lsz > 0 ) ))${chk_fileno[0]}${chk_sz}"
        if (( chk_lsz > 0 )); then
            expected+="1${chk_fileno[-1]}${chk_lsz}"
        fi
        [ "$stats" = "${expected}1${h}" ] || { echo "$h meta invalid" >&2; break; }
        cat "${chk_fileno[@]}" > "$name"
        rm -f "$h" "${chk_fileno[@]}"
    done
}

user_add() {
    if [ $# -lt 5 ]; then
        printf '%s\n' "$0 ${FUNCNAME[0]} passwdfile accessfile username passsword accessuri..."
        exit 1
    fi
    local \
        passwdfile=$1 \
        accessfile=$2 \
        user=$3 \
        pass=$4 \
        access_val
    shift 4 # $@ path accesses

    passhash=$(openssl passwd -5 "$pass")
    secret=$(openssl rand -hex 64)

    touch "$passwdfile" "$accessfile"
    sed -i "/^${user}:/d" "$passwdfile"
    # basicauth line
    printf '%s:%s\n' "$user" "$passhash" >> "$passwdfile"


    sed -i "/^${user} /d" "$accessfile"
    # accessuri lines
    {
        local IFS='|';
        access_val=$*
    }
    printf '%s %s|%s|%s;\n' "$user" "$user" "$secret" "$access_val" >> "$accessfile"
}

if [ $# -eq 0 ]; then
    compgen -A function | while read -r i; do
        printf '%s\n' "$0 $i ..."
    done
    exit 0
fi

"$@"
