# nginx-explorer

> A minimal, zero-dependency file manager powered entirely by Nginx.

![example](https://raw.github.com/izissise/nginx-explorer/master/images/example.png "Example")

[![Tests](https://github.com/izissise/nginx-explorer/actions/workflows/test.yml/badge.svg)](https://github.com/izissise/nginx-explorer/actions/workflows/test.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

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

Serve the current directory on port 8080 (LAN clients get anonymous access):

```bash
git clone https://github.com/izissise/nginx-explorer.git
nginx-explorer/ngxp.sh download_icons
nginx-explorer/ngxp.sh servethis
```

Requires: Docker or Podman.

## How it works

Nginx's built-in `autoindex` generates the directory listing HTML. nginx-explorer injects itself into that HTML via `sub_filter`, replacing the `<html>` tag with a `<script>` tag that bootstraps the JS UI. No server-side templating, no dynamic code path.

Authentication is handled entirely through Nginx maps:

1. A `POST /___ngxp/login` endpoint validates HTTP Basic Auth credentials (bcrypt-5, rate-limited)
2. On success, Nginx sets a cookie containing `user|secret|allowed_paths`
3. Subsequent requests are validated by matching the cookie against `accessuri.map` using regex maps

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

The secret is generated automatically by `user_add`. Users cannot forge cookies without knowing it.

### Default paths

| Path | Default |
|------|---------|
| Files (listing/download) | `/home/user/downloads` |
| Upload destination | `/home/user/uploads/` |
| App files (JS, CSS, icons) | `/var/www/ngxp/` |
| User access map | `/opt/ngxp/accessuri.map` |
| Passwords file | `/opt/ngxp/basic.htpasswd` |

### LAN vs WAN access

Clients on RFC-1918 ranges (`192.168.x.x`, `10.x.x.x`) and loopback are automatically classified as `lan_anon` and bypass login. WAN clients must authenticate. This is controlled by the `geo` block in `nginx-explorer.conf`.

## Uploads

Files are uploaded in 256 MB chunks and stored as temporary files. To reassemble them into the original file, run:

```bash
./ngxp.sh upload_fixup /path/to/uploads/
```

A metadata file (prefixed `#ngxpupload_meta`) is generated alongside the chunks, containing the original filename, chunk count, sizes, and file numbers needed for reconstruction.

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

## License

[MIT](LICENSE)
