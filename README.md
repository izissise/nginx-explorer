# nginx-explorer
File explorer in javascript, web based
using nginx for directory listing

![example](https://raw.github.com/izissise/nginx-explorer/master/art/example.png "Example")

## Build
```
git clone https://github.com/izissise/nginx-explorer.git
cd nginx-explorer
```

You need npm:
```
npm install -g bower
npm install
npm run build
```

## Quick launch with docker
```
docker run --rm -it -p 80:80 -v directoryToServe:/home/user/downloads -v .../nginx-explorer/www:/var/www/files -v .../nginx-explorer/nginx.conf:/etc/nginx/conf.d/default.conf nginx
```
Go on 127.0.0.1 with you browser.
