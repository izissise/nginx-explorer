# nginx-explorer
File explorer in javascript, web based
using nginx for directory listing

Support upload and basic auth

Icons must be downloaded see `dev.sh`

You can remove the upload and basic auth from the nginx conf and it will automatically disable it client side.

![example](https://raw.github.com/izissise/nginx-explorer/master/images/example.png "Example")


## Quick launch with docker
```
./dev.sh
```
Go to 127.0.0.1:8080 with you browser.


## Upload fixup command

Uploaded files might arrive chunked, the following command will concatenate the chunks into filename.

It should be ran into the upload directory

```
find ./ -type f | while read -r i; do if [ ! -f "$i" ]; then continue; fi && read -r -n 12 head < "$i" && if [ "$head" != "#upload_meta" ]; then continue; fi && name="$(grep -v "#" "$i" | jq -r ".name")" && find ./ -type f -size "$(grep -v "#" "$i" | jq -r ".chunk_size | @sh")"c -or -size "$(grep -v "#" "$i" | jq -r ".chunk_last_size | @sh")"c | while read -r j; do if (( 10#${i##*/} < 10#${j##*/} )); then echo "$j"; fi; done | sort -n | head -n "$(grep -v "#" "$i" | jq -r ".chunk_cnt | @sh")" | while read -r f; do cat "$f" >> "$name" && rm -f "$f"; done && rm -f "$i"; done
```
