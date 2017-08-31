# nginx-explorer
File explorer in javascript, web based
using nginx for directory listing

![example](https://raw.github.com/izissise/nginx-explorer/master/art/example.png "Example")

Building/Using:
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

Quick launch with docker:
```
docker run --rm -it -p 80:80 -v directoryToServe:/home/user/downloads -v $(pwd)/www:/var/www/files -v $(pwd)/nginx.conf:/etc/nginx/conf.d/default.conf nginx
```
Go to 127.0.0.1 with you browser.
