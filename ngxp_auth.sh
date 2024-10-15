#!/usr/bin/env bash

# this script help create basic auth and access file for nginx_explorer

set -eu

add() {
    if [ ! $# -eq 5 ]; then
        printf '%s\n' "$0 add passwdfile accessfile username passsword accessuri"
        exit 1
    fi

    passwdfile=$1
    accessfile=$2
    user=$3
    pass=$4
    accessuri=$5

    passhash=$(openssl passwd -5 "$pass")
    secret=$(openssl rand -hex 24)

    sed -i "/^${user}:/d" "$passwdfile"
    # basicauth line
    printf '%s:%s\n' "$user" "$passhash" >> "$passwdfile"


    sed -i "/^${user} /d" "$accessfile"
    # accessuri line
    printf '%s %s:%s:%s;\n' "$user" "$secret" "$user" "$accessuri" >> "$accessfile"
}

if [ $# -eq 0 ]; then
    compgen -A function | while read -r i; do
        printf '%s\n' "$0 $i ..."
    done
    exit 0
fi

"$@"
