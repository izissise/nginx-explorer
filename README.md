# js-explorer
File explorer in javascript, file come from nginx autoindex

Nginx configuration should look
      server_name  host;

      location / {
         root /var/www/files/; //where you put the app.
         index index.html index.htm;
      }

      location /downloads {
          root /; // /downloads is where the files are.
          autoindex on;
          autoindex_format json;
          autoindex_exact_size off;
      }
  }

You need npm and bower, run:
npm install -g bower

Install build deps:
npm install

Build:
gulp
