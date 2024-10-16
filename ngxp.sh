#!/usr/bin/env bash

set -eu

here="$(cd "${0%/*}" && pwd)"

test() {
    "$here"/test/bats/bin/bats --jobs 24 test/*.bats
}

download_icons() {
    breeze_icon_version=5.114.0
    echo 'Downloading icons'
    echo "https://github.com/KDE/breeze-icons/archive/v$breeze_icon_version.tar.gz" | while read -r dlu; do curl -s -L "$dlu" -o /tmp/breeze-icons.tar.gz; done \
    && rm -rf "${here}/icons" \
    && mkdir -p "${here}/_icons" \
    && tar -xf /tmp/breeze-icons.tar.gz -C "${here}/_icons" \
    && mv "${here}/_icons/breeze-icons-$breeze_icon_version/icons/mimetypes/32" "${here}/icons" \
    && mv "${here}/_icons/breeze-icons-$breeze_icon_version/icons/places/32/folder-download.svg" "${here}/icons"/folder.svg \
    && rm -rf "${here}/_icons" \
    && rm -f /tmp/breeze-icons.tar.gz
}

dev() {
    cat > /tmp/nginx-explorer.conf <<EOF
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


    user_add basic.htpasswd accessuri.map root pass /
    user_add basic.htpasswd accessuri.map sub pass /sub
    user_add basic.htpasswd accessuri.map upload pass /___ngxp/upload

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
        -v "$HOME/Downloads/receive:/home/user/uploads:rw" \
        -v "/tmp/nginx-explorer.conf:/etc/nginx/nginx.conf:ro" \
        -v "${here}:/var/www/ngxp:ro" \
        -v "${here}/nginx-explorer.conf:/etc/nginx/conf.d/default.conf:ro" \
        -v "${here}/basic.htpasswd:/opt/ngxp/basic.htpasswd:ro" \
        -v "${here}/accessuri.map:/opt/ngxp/accessuri.map:ro" \
        nginx

}

upload_fixup() {
    if [ ! $# -eq 1 ]; then
        printf '%s\n' "$0 upload_fixup upload_path"
        exit 1
    fi
    upload_dir=$1
    find "$upload_dir" -type f | while read -r h; do
        if [ ! -f "$h" ]; then continue; fi                              # file still exist
        read -r -n 16 head < "$h"                                        # read first 16 bytes
        if [ "$head" != "#ngxpupload_meta" ]; then continue; fi          # if marker value
        name=$(grep -v "#" "$h" | jq -r ".name" | tr "/" "_")            # extract filename
        chk_sz=$(grep -v "#" "$h" | jq -r ".chunk_size | @sh")           # extract chunk size
        chk_last_sz=$(grep -v "#" "$h" | jq -r ".chunk_last_size | @sh") # extract last chunk size
        chk_cnt=$(grep -v "#" "$h" | jq -r ".chunk_cnt | @sh")           # extract chunk count
        find ./ -type f -size "$chk_sz"c -or -size "$chk_last_sz"c \
            | while read -r c; do
                if (( 10#${h##*/} < 10#${c##*/} )); then echo "$c"; fi;  # keep higher ids
            done \
            | sort -n | head -n "$chk_cnt" \
            | while read -r f; do
                cat "$f" >> "$name" # concatenate file
                rm -f "$f";         # remove chunk
            done
        rm -f "$h"; # remove header file
    done
}

user_add() {
    if [ ! $# -eq 5 ]; then
        printf '%s\n' "$0 user_add passwdfile accessfile username passsword accessuri"
        exit 1
    fi

    passwdfile=$1
    accessfile=$2
    user=$3
    pass=$4
    accessuri=$5

    passhash=$(openssl passwd -5 "$pass")
    secret=$(openssl rand -hex 24)

    touch "$passwdfile" "$accessfile"
    sed -i "/^${user}:/d" "$passwdfile"
    # basicauth line
    printf '%s:%s\n' "$user" "$passhash" >> "$passwdfile"


    sed -i "/^${user} /d" "$accessfile"
    # accessuri line
    printf '%s %s:%s:%s;\n' "$user" "$user" "$secret" "$accessuri" >> "$accessfile"
}

if [ $# -eq 0 ]; then
    compgen -A function | while read -r i; do
        printf '%s\n' "$0 $i ..."
    done
    exit 0
fi

"$@"
