#!/bin/bash

set -eu

here="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"

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


if [[ ! -d "${here}/icons" ]]; then
    breeze_icon_version=5.114.0
    echo 'Downloading icons'
    echo "https://github.com/KDE/breeze-icons/archive/v$breeze_icon_version.tar.gz" | while read -r dlu; do \curl -s -L "$dlu" -o /tmp/breeze-icons.tar.gz; done \
    && \mkdir -p "${here}/_icons" \
    && \tar -xf /tmp/breeze-icons.tar.gz -C "${here}/_icons" \
    && \mv "${here}/_icons/breeze-icons-$breeze_icon_version/icons/mimetypes/32" "${here}/icons" \
    && \mv "${here}/_icons/breeze-icons-$breeze_icon_version/icons/places/32/folder-download.svg" "${here}/icons"/folder.svg \
    && \rm -rf "${here}/_icons" \
    && \rm -f /tmp/breeze-icons.tar.gz
fi

touch basic.htpasswd accessuri.map
"${here}"/ngxp_auth.sh add \
    basic.htpasswd accessuri.map root pass /
"${here}"/ngxp_auth.sh add \
    basic.htpasswd accessuri.map sub pass /sub
"${here}"/ngxp_auth.sh add \
    basic.htpasswd accessuri.map upload pass /___ngxp/upload

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
    -v "${here}/basic.htpasswd:/basic_auth/basic.htpasswd:ro" \
    -v "${here}/accessuri.map:/basic_auth/accessuri.map:ro" \
    nginx
