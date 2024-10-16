# nginx-explorer
File explorer in javascript, web based
using nginx for directory listing

Features:
- list files
- download files
- upload file
- basic auth
- per uri access
- media
- auto sort

Icons must be downloaded see `./ngxp.dev download_icons`

You can remove the upload or basic auth from the nginx conf and it will automatically disable it client side.

![example](https://raw.github.com/izissise/nginx-explorer/master/images/example.png "Example")


## Quick launch with docker
```
./ngxp.dev dev
```
Go to 127.0.0.1:8080 with you browser.


## Upload fixup command

Uploaded files arrive chunked,
you can concatenate back using `./ngxp.sh upload_fixup`
