# nginx-explorer

Minimal web interface to download/upload files.
Using nginx as a backend.

Features:
- list files
- download files
- upload file
- basic auth
- per uri access (multi tree)
- fast html table
- media
- auto sort
- unit tests

see [nginx-explorer.conf](https://github.com/izissise/nginx-explorer/blob/master/nginx-explorer.conf)

![example](https://raw.github.com/izissise/nginx-explorer/master/images/example.png "Example")

```bash
git clone https://github.com/izissise/nginx-explorer.git
nginx-explorer/ngxp.sh download_icons
nginx-explorer/ngxp.sh servethis
```

# Upload

Uploaded files arrive chunked,
you can concatenate them back with `./ngxp.sh upload_fixup`
