<p align="center">
  <img src="logo.svg" alt="nginx-explorer" width="260"/>
</p>

<p align="center">
  A minimal, zero-dependency file manager powered entirely by Nginx.
</p>

<p align="center">
  <a href="https://github.com/izissise/nginx-explorer/actions/workflows/test.yml"><img alt="Tests" src="https://github.com/izissise/nginx-explorer/actions/workflows/test.yml/badge.svg"/></a>
  <a href="LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-yellow.svg"/></a>
  <a href="https://github.com/izissise/nginx-explorer/commits/master"><img alt="Last commit" src="https://img.shields.io/github/last-commit/izissise/nginx-explorer"/></a>
  <a href="https://github.com/izissise/nginx-explorer/stargazers"><img alt="GitHub stars" src="https://img.shields.io/github/stars/izissise/nginx-explorer?style=social"/></a>
  <img alt="Backend" src="https://img.shields.io/badge/backend-nginx-009639?logo=nginx&logoColor=white"/>
  <img alt="Frontend" src="https://img.shields.io/badge/frontend-vanilla%20JS-f7df1e?logo=javascript&logoColor=black"/>
</p>

---

![screenshot](https://github.com/user-attachments/assets/1cc7fcb0-d7f3-46ad-ab87-209bbc8aa8e4)

## Why nginx-explorer?

Most self-hosted file managers require a Python, Node, or PHP backend. nginx-explorer needs **only Nginx**. The entire application is one `.js` file, one `.css` file, and an Nginx config — no build step, no `npm install`, no app server.

- **No backend code** — Nginx handles file serving, auth, and routing
- **No JavaScript dependencies** — vanilla JS, runs in any browser
- **LAN auto-login** — local network clients get access without credentials
- **Multi-user with per-path ACL** — each user can be scoped to different directory trees
- **Chunked uploads** — reliably transfer large files without timeouts
- **Smart media mode** — auto-detects photo galleries and TV episode directories and sorts accordingly
- **Brute-force protection** — login rate-limited to 1 request/minute per IP via `limit_req`
- **Hardened container** — runs with `--cap-drop=ALL`, read-only mounts, and a tmpfs temp dir

## Quick start

Serve the current directory on port 8080:

```bash
git clone https://github.com/izissise/nginx-explorer.git
nginx-explorer/ngxp.sh download_icons
nginx-explorer/ngxp.sh servethis
```

Requires: Docker or Podman.

## Docker / Podman deployment

`ngxp.sh servethis` is a convenience wrapper. For a permanent or customised deployment, use the container directly.
Add `--userns=keep-id` when using **Podman** to map the container UID to your host user.

```bash
NGXP=/path/to/nginx-explorer   # repo checkout
FILES=/path/to/your/files
UPLOADS=/path/to/upload/destination

docker run --rm -it \
  --user="$(id -u):$(id -g)" \
  --cap-drop=ALL \
  --tmpfs=/tmp:rw,noexec,nosuid,size=70m \
  -p 8080:8080 \
  -v "$FILES:/home/user/downloads:ro" \
  -v "$UPLOADS:/home/user/uploads:rw" \
  -v "$NGXP/docker_nginx.conf:/etc/nginx/nginx.conf:ro" \
  -v "$NGXP/nginx-explorer.conf:/etc/nginx/conf.d/default.conf:ro" \
  -v "$NGXP/icons:/var/www/ngxp/icons:ro" \
  -v "$NGXP/main.js:/var/www/ngxp/main.js:ro" \
  -v "$NGXP/main.css:/var/www/ngxp/main.css:ro" \
  -v "$NGXP/basic.htpasswd:/opt/ngxp/basic.htpasswd:ro" \
  -v "$NGXP/accessuri.map:/opt/ngxp/accessuri.map:ro" \
  nginx
```

### Volume map

| Container path                   | Purpose                                 | Writable? |
|----------------------------------|-----------------------------------------|-----------|
| `/home/user/downloads`           | Files served for listing and download   | No        |
| `/home/user/uploads`             | Destination for uploaded chunks         | **Yes**   |
| `/var/www/ngxp/`                 | JS, CSS, icons (app assets)             | No        |
| `/opt/ngxp/basic.htpasswd`       | User credentials                        | No        |
| `/opt/ngxp/accessuri.map`        | User → paths mapping                    | No        |
| `/etc/nginx/nginx.conf`          | Base Nginx config (`docker_nginx.conf`) | No        |
| `/etc/nginx/conf.d/default.conf` | nginx-explorer Nginx config             | No        |

The `--tmpfs=/tmp` mount is required — Nginx uses `/tmp` for upload buffering and its own internals. Without it the container will fail to start under `--cap-drop=ALL`.

## How it works

Nginx's built-in `autoindex` generates the directory listing HTML. nginx-explorer injects itself into that HTML via `sub_filter`, replacing the `<html>` tag with a `<script>` tag that bootstraps the JS UI. No server-side templating, no dynamic code path — the same standard Nginx that serves static files powers the entire application.

Authentication is handled entirely through Nginx maps:

1. A `POST /___ngxp/login` endpoint validates HTTP Basic Auth credentials (bcrypt-5, rate-limited to 1 req/min per IP)
2. On success, Nginx sets a cookie containing `user|secret|allowed_paths`
3. Subsequent requests are validated by matching the cookie's secret against `accessuri.map` using regex maps — no session store, no database

## Scripts (`ngxp.sh`)

`ngxp.sh` is the single entry point for all local operations:

| Command                                                   | Description                                                                                                                                                                                         |
|-----------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `download_icons`                                          | Downloads the KDE Breeze icon pack (32×32 SVGs) into `icons/`. Run once before first use. Skips if already present.                                                                                 |
| `servethis`                                               | Adds a `lan_anon` user with access to `/`, then starts an Nginx container serving `$PWD` on port 8080. LAN clients browse without a login prompt.                                                   |
| `dev`                                                     | Starts a dev server with several pre-created test users (`root`, `sub`, `upload`, `xx`) and mounts `~/Downloads`. Useful for iterating on the UI.                                                   |
| `user_add <htpasswd> <accessmap> <user> <pass> <path...>` | Atomically creates or replaces a user in both `basic.htpasswd` (bcrypt-5 hash) and `accessuri.map` (random 128-char hex secret). Accepts multiple paths.                                            |
| `upload_fixup <upload_dir>`                               | Scans `upload_dir` for chunk metadata files (identified by the `#ngxpupload_meta` magic prefix), validates chunk sizes, concatenates them into the original file, and removes the temporary chunks. |
| `test`                                                    | Downloads BATS and its assertion libraries on first run, then runs all `test/*.bats` integration test files in parallel Nginx containers.                                                            |

## Configuration

### Adding users

```bash
./ngxp.sh user_add basic.htpasswd accessuri.map <username> <password> <path> [<path2> ...]
```

Example — a user with access to two separate directory trees:

```bash
./ngxp.sh user_add basic.htpasswd accessuri.map alice secret123 /photos /documents
```

### accessuri.map

Each line maps a username to its secret token and allowed paths:

```
alice alice|<secret>|/photos|/documents;
```

The secret is generated automatically by `user_add`. Users cannot forge cookies without knowing it. You can grant a user access to multiple disjoint trees by listing multiple paths.

### Default paths

| Path                       | Default                    |
|----------------------------|----------------------------|
| Files (listing/download)   | `/home/user/downloads`     |
| Upload destination         | `/home/user/uploads/`      |
| App files (JS, CSS, icons) | `/var/www/ngxp/`           |
| User access map            | `/opt/ngxp/accessuri.map`  |
| Passwords file             | `/opt/ngxp/basic.htpasswd` |

## LAN vs WAN access

Clients on RFC-1918 ranges (`192.168.x.x`, `10.x.x.x`) and loopback are classified as `lan_anon` by Nginx's `geo` block; all other clients are classified as `wan_anon`. These are treated as regular usernames looked up in `accessuri.map`.

**If `lan_anon` or `wan_anon` are not present in `accessuri.map`, anonymous access is blocked by default** — the path check fails and Nginx returns 401. The `servethis` command automatically adds `lan_anon` with access to `/`. For a fully private setup (login required from everywhere), simply don't add either entry.

## Uploads

Files are uploaded in 256 MB chunks and stored as temporary files. To reassemble them into the original file, run:

```bash
./ngxp.sh upload_fixup /path/to/uploads/
```

A metadata file (prefixed `#ngxpupload_meta`) is created alongside the chunks, recording the original filename, chunk count, sizes, and file numbers needed for reconstruction. The upload endpoint can be removed entirely from `nginx-explorer.conf` to disable uploads.

## Development

```bash
./ngxp.sh dev          # Start dev server (mounts ~/Downloads, port 8080)
./ngxp.sh test         # Run integration tests (BATS + Docker/Podman)
```

Run a single test file:

```bash
./test/bats/bin/bats test/auth.bats
```

Run a single test by name:

```bash
./test/bats/bin/bats test/auth.bats --filter "login success"
```

Frontend unit tests (QUnit) are available at `http://localhost:8080/___ngxp/qunit.html` when the dev server is running.

## Embedding in an existing Nginx setup

Copy the relevant `location` blocks from `nginx-explorer.conf` into your server config. The `___ngxp` prefix is reserved for all app routes to avoid colliding with directory names. If you have a directory literally named `___ngxp`, it will not be listable.

## Blog posts

Three in-depth posts covering how nginx-explorer works internally:

- [Nginx Explorer — File Listing](https://blog.izissise.net/posts/ngxp-listing/) — Build a file-sharing interface using Nginx's `autoindex` and `sub_filter` for CSS/JS injection.
- [Nginx Explorer — Cookie Authentication](https://blog.izissise.net/posts/ngxp-cookie-auth/) — Implement per-user, per-path cookie authentication using only Nginx `map` directives.
- [Nginx Explorer — Upload](https://blog.izissise.net/posts/ngxp-upload/) — Enable large file uploads via chunked JS uploads and server-side Bash reassembly.

## License

[MIT](LICENSE)
