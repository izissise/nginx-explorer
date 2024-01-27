var styles = `
/* Reset */
html, body, div, span, applet, object, iframe,
h1, h2, h3, h4, h5, h6, p, blockquote, pre,
a, abbr, acronym, address, big, cite, code,
del, dfn, em, img, ins, kbd, q, s, samp,
small, strike, strong, sub, sup, tt, var,
b, u, i, center,
dl, dt, dd, ol, ul, li,
fieldset, form, label, legend,
table, caption, tbody, tfoot, thead, tr, th, td,
article, aside, canvas, details, embed,
figure, figcaption, footer, header, hgroup,
menu, nav, output, ruby, section, summary,
time, mark, audio, video {
        margin: 0;
        padding: 0;
        border: 0;
        font-size: 100%;
        font: inherit;
        vertical-align: baseline;
}
/* HTML5 display-role reset for older browsers */
article, aside, details, figcaption, figure,
footer, header, hgroup, menu, nav, section {
        display: block;
}
body {
        line-height: 1;
}
ol, ul {
        list-style: none;
}
blockquote, q {
        quotes: none;
}
blockquote:before, blockquote:after,
q:before, q:after {
        content: '';
        content: none;
}
table {
        border-collapse: collapse;
        border-spacing: 0;
}

/* Background */
body {
  background: repeating-linear-gradient(
    -45deg,
    #f6ba52,
    #f6ba52 20px,
    #ffd180 20px,
    #ffd180 30px
  );
}
.hide {
    display: none;
}
/* Table */
table, .form, form {
    background-color: rgba(255, 255, 255, 0.9);
    max-width: 100%;
    border-spacing: 0;
    margin: 10px 0;
    border: 1px solid #ddd;
    border-collapse: separate;
    -webkit-box-shadow: 0 0 4px rgba(0, 0, 0, .1);
    -moz-box-shadow: 0 0 4px rgba(0, 0, 0, .1);
    box-shadow: 0 0 4px rgba(0, 0, 0, .1)
    display: block;
    margin-left: auto;
    margin-right: auto;
    width: 83.33333%;
}
table td,
table th {
    line-height: 18px;
    vertical-align: middle;
    text-align: left;
    border-top: 1px solid #ddd
}
table th {
    font-weight: 700;
    padding: 8px;
    background: #eee;
    background: -webkit-gradient(linear, left top, left bottom, from(#f6f6f6), to(#eee));
    background: -moz-linear-gradient(top, #f6f6f6, #eee);
    text-shadow: 0 1px 0 #fff;
}
th:nth-child(2), th:nth-child(3) {
  width: 20%;
  text-align: center;
}
td:nth-child(2), td:nth-child(3) {
  background-color: rgba(246, 2a6, 246, 0.9);
  text-align: center;
}
tbody tr:nth-child(odd) {
  background-color: rgba(246, 246, 246, 0.9);
}
table tbody:first-child tr:first-child td,
table tbody:first-child tr:first-child th,
table thead:first-child tr td,
table thead:first-child tr th,
table thead:first-child tr:first-child th {
    border-top: 0
}
table tbody+tbody {
    border-top: 2px solid #ddd
}

th[role=colheader]:not(.no-sort) {
    cursor: pointer;
}

th[role=colheader]:not(.no-sort):after {
    content: '';
    float: right;
    margin-top: 7px;
    border-width: 0 4px 4px;
    border-style: solid;
    border-color: #404040 transparent;
    visibility: hidden;
    opacity: 0;
    -moz-user-select: none;
    -ms-user-select: none;
    -webkit-user-select: none;
    user-select: none;
}

th[data-sortway=ascending]:not(.no-sort):after {
    border-bottom: none;
    border-width: 4px 4px 0;
}

th[data-sortway]:not(.no-sort):after {
    visibility: visible;
    opacity: 0.4;
}

th[role=colheader]:not(.no-sort):hover:after {
    visibility: visible;
    opacity: 1;
}

a, a:visited {
  color: #2281d0;
  text-decoration: none;
}

.fileicon {
  margin-right: 10px;
  vertical-align: middle;
}

/* Menu */
input {
    margin: 2px;
}
#menu {
    position: absolute;
    margin-top: 3px;
    margin-left: 17px;
}
`

function el(tag, props, ch, attrs) {
    var n = Object.assign(document.createElement(tag), (props === undefined) ? {} : props);
    var child = (ch === undefined) ? [] : ch;
    n = child.reduce((e, c) => { e.appendChild(c); return e; }, n);
    var attributes = (attrs === undefined) ? {} : attrs;
    n = Object.entries(attributes).reduce((e, [k, v]) => { e.setAttribute(k, v); return e; }, n);
    return n;
}

function dom(select) {
    return document.querySelectorAll(select);
}

function onWindowLoad(callback) {
    if (window.addEventListener) {
        window.addEventListener('load', callback, false);
    } else {
        window.attachEvent('onload', callback);
    }
}

Number.prototype.padLeft = function(base, chr) {
    var len = (String(base || 10).length - String(this).length) + 1;
    return len > 0 ? new Array(len).join(chr || '0') + this : this;
};

String.prototype.format = function() {
    var args = arguments;
    return this.replace(/{([0-9]+)}/g, function(match, index) {
        return typeof args[index] == 'undefined' ? match : args[index];
    });
};

function humanFileSize(bytes, si) {
    var thresh = si ? 1000 : 1024;
    if (Math.abs(bytes) < thresh) {
        return bytes + ' B';
    }
    var units = si ? ['kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
        : ['KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];
    var u = -1;
    do {
        bytes /= thresh;
        ++u;
    } while (Math.abs(bytes) >= thresh && u < units.length - 1);
    return bytes.toFixed(1) + ' ' + units[u];
}

IconMap = {
    '7z': 'application-x-7z-compressed', 'aac': 'audio-x-generic', 'apk': 'android-package-archive', 'apng': 'image-png', 'atom': 'application-atom+xml', 'avi': 'audio-x-generic', 'bash': 'application-x-executable-script', 'bmp': 'image-bmp', 'c': 'text-x-csrc', 'cfg': 'text-x-generic', 'coffee': 'application-x-javascript', 'conf': 'text-x-generic', 'cpp': 'text-x-c++src', 'csh': 'application-x-executable-script', 'css': 'text-css', 'csv': 'text-csv', 'db': 'application-vnd.oasis.opendocument.database', 'deb': 'application-x-deb', 'desktop': 'application-x-desktop', 'doc': 'x-office-document', 'docx': 'x-office-document', 'eml': 'message-rfc822', 'epub': 'application-epub+zip', 'erb': 'application-x-ruby', 'ex': 'text-x-generic', 'exe': 'application-x-executable', 'fla': 'video-x-generic', 'flac': 'audio-x-flac', 'flv': 'video-x-generic', 'gif': 'image-gif', 'gml': 'text-xml', 'go': 'text-x-generic', 'gpx': 'text-xml', 'gz': 'application-x-gzip', 'h': 'text-x-chdr', 'hxx': 'text-x-c++hdr', 'hs': 'text-x-haskell', 'htm': 'text-html', 'html': 'text-html', 'ico': 'image-x-ico', 'ini': 'text-x-generic', 'iso': 'application-x-cd-image', 'jar': 'application-x-java-archive', 'java': 'application-x-java', 'jpeg': 'image-jpeg', 'jpg': 'image-jpeg', 'js': 'application-x-javascript', 'log': 'text-x-generic', 'lua': 'text-x-generic', 'm3u': 'audio-x-generic', 'markdown': 'text-x-generic', 'md': 'text-x-generic', 'mkv': 'video-x-matroska', 'mp3': 'audio-x-mpeg', 'mp4': 'video-mp4', 'odp': 'x-office-presentation', 'ods': 'x-office-spreadsheet', 'odt': 'x-office-document', 'ogg': 'audio-x-generic', 'otf': 'application-x-font-otf', 'pdf': 'application-pdf', 'pgp': 'application-pgp', 'php': 'application-x-php', 'pkg': 'package-x-generic', 'pl': 'application-x-perl', 'png': 'image-png', 'ppt': 'x-office-presentation', 'pptx': 'x-office-presentation', 'psd': 'image-x-psd', 'py': 'text-x-generic', 'pyc': 'application-x-python-bytecode', 'rar': 'application-x-rar', 'rb': 'application-x-ruby', 'rpm': 'application-x-rpm', 'rtf': 'text-rtf', 'sh': 'application-x-executable-script', 'svg': 'image-svg+xml-compressed', 'svgz': 'image-svg+xml-compressed', 'swf': 'application-x-shockwave-flash', 'tar': 'application-x-tar', 'text': 'text-x-generic', 'tiff': 'image-tiff', 'ttf': 'application-x-font-ttf', 'txt': 'text-x-generic', 'wav': 'audio-x-wav', 'webm': 'video-webm', 'wmv': 'video-x-wmv', 'xcf': 'image-x-xcf', 'xhtml': 'text-html', 'xls': 'x-office-spreadsheet', 'xlsx': 'x-office-spreadsheet', 'xml': 'text-xml', 'xpi': 'package-x-generic', 'xz': 'application-x-lzma-compressed-tar', 'zip': 'application-zip', 'zsh': 'application-x-executable-script', 'opml': 'text-xml',
};

function icontag(icon_base, icon) {
    return el('img', {
        height: 24,
        src: '{0}{1}.svg'.format(icon_base, icon.replace('/', '-')),
        alt: '',
    }, [], {
        'class': 'fileicon',
        'type': 'image/svg+xml',
        'onerror': "this.src=\'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==\'",
    });
}

function iconFor(icon_base, path) {
    var icon = 'application-octet-stream';
    if (path.endsWith('/')) {
        icon = 'folder';
    } else {
        var extension = path.slice(path.lastIndexOf('.') + 1);
        if (IconMap[extension] !== undefined) {
            icon = IconMap[extension];
        }
    }
    if (icon_base === null) {
        return el('div');
    }
    return icontag(icon_base, icon);
}

var format_name = (name, link, icon_base) => el('td', {}, [
    el('a', { href: link, ...(link.endsWith('/') ? {} : { download: name }) }, [
        iconFor(icon_base, link),
        el('span', { innerText: name }),
    ])
], { 'data-sort': link });
var format_size = (size) => el('td', {
    innerText: (size == 0) ? '-' : humanFileSize(size, false)
}, [], { 'data-sort': size });
var format_date = (date, now) => el('td', {
    innerText: (() => {
        var d = new Date(date);
        var dtime = d.getTime();
        if ((now - dtime) > (1000 * 60 * 60 * 24 * 2)) { // more than 2days in the past
            return [d.getHours().padLeft(),
            d.getMinutes().padLeft(),
            d.getSeconds().padLeft()].join(':') +
                ' ' +
                [d.getDate().padLeft(),
                (d.getMonth() + 1).padLeft(),
                d.getFullYear()].join('/');
        } else if ((now - dtime) > -(1000 * 60 * 60 * 12)) {
            if ((now - dtime) < (1000 * 60)) { // Less than 60seconds
                var seconds = Math.round((now - dtime) / (1000));
                var secondsStr = (seconds == 1) ? "second" : "seconds";
                return [seconds.toString(), secondsStr, "ago"].join(" ");
            } else if ((now - dtime) < (1000 * 60 * 60)) { // Less than 60minutes
                var minutes = Math.round((now - dtime) / (1000 * 60));
                var minutesStr = (minutes == 1) ? "minute" : "minutes";
                return [minutes.toString(), minutesStr, "ago"].join(" ");
            } else if ((now - dtime) < (1000 * 60 * 60 * 24)) { // Less than 24hours
                var hours = Math.round((now - dtime) / (1000 * 60 * 60));
                var hoursStr = (hours == 1) ? "hour" : "hours";
                return [hours.toString(), hoursStr, "ago"].join(" ");
            } else { // More than one day
                return "Yesterday" + ' ' + [d.getHours().padLeft(),
                d.getMinutes().padLeft(),
                d.getSeconds().padLeft()].join(':');
            }
        } else { // We are too far in the future don't display
            return '-';
        }
    })()
}, [], { 'data-sort': date });

function sort_table(theads, tbodies, column, descending) {
    var j = 0;
    for (j = 0; j < theads.length; j++) {
        Array.from(theads[j].children).map((el, idx) => {
            if (idx == column) {
                el.dataset.sortway = descending ? 'descending' : 'ascending';
            } else {
                delete el.dataset.sortway;
            }
        });
    }
    // https://github.com/tristen/tablesort/blob/master/src/tablesort.js
    for (j = 0; j < tbodies.length; j++) {
        var tbody = tbodies[j];
        if (tbody.rows.length == 0) {
            continue;
        }
        tbody.style.cursor = 'progress';
        var sorted = Array.from(tbody.rows).map((tr, idx) => {
            return {
                tr: tr,
                sortval: tr.cells[column].dataset.sort,
                idx: idx,
            };
        }).sort((a, b) => {
            var s = a.sortval.localeCompare(b.sortval, undefined, { 'numeric': true });
            if (s === 0) {
                return descending ? b.idx - a.idx : a.idx - b.idx;
            }
            return s;
        }).map((e) => e.tr);
        if (descending) {
            sorted.reverse();
        }
        tbody.append(...sorted);
        tbody.style.cursor = 'default';
    }
}

onWindowLoad(setup_files);

var icon_base = null;

function setup_files() {
    // TODO htaccess recurse
    var now = new Date().getTime();
    var scripts = dom('script');
    icon_base = scripts[scripts.length - 1].attributes['icons'].value;

    var body = dom('body')[0];
    var entries = dom('pre')[0].innerHTML.split('\n').filter((l) => l.length > 0 && l != '<a href="../">../</a>').map((entry) => {
        entry = entry.split('</a>');
        var link = entry[0].split('">');
        // var nginx_name = unescape(link[1]); // ignore it is truncated
        var link = decodeURIComponent(link[0].substr(9)); // <a href="
        var name = link;
        entry = entry[1].trim().split(/\s+/);
        var date = new Date(entry[0] + ' ' + entry[1]).getTime();;
        var size = (entry[2] == '-') ? 0 : parseInt(entry[2]);
        return [name, link, size, date];
    }).map((data) => el('tr', {}, [
        format_name(data[0], data[1], icon_base),
        format_size(data[2]),
        format_date(data[3], now),
    ]));
    var table = el('table', { border: 1, cellpadding: 1, cellspacing: 1 }, [
        el('thead', { id: 'fthead' }, ['Filename', 'Size', 'Date'].map((f, idx) => el('th', {
            role: 'colheader',
            innerText: f
        }, [], {
            'onclick': "sort_table(dom('#fthead'), dom('#ftbody'), {0}, this.dataset.sortway == 'ascending')".format(idx),
        }))),
        el('tbody', { id: 'ftbody' }, entries, { 'item_count': entries.length }),
    ]);


    while (body.hasChildNodes()) { body.removeChild(body.lastChild); }
    body.appendChild(table);

    sort_table(dom('#fthead'), dom('#ftbody'), 2, true); // default sort by date

    var wgetcode = el('div', { id: 'wget_code' }, [
        el('code', { innerText: "wget -r -c -nH --no-parent --reject 'index.html*' '{0}'".format(document.location) })
    ], { 'class': 'form hide' });
    body.insertBefore(wgetcode, body.firstChild);

    var styleSheet = document.createElement("style")
    styleSheet.innerText = styles
    document.head.appendChild(styleSheet)

    // TODO gallery mode for image, auto gallery mode if more than 80% images
    // TODO play in broswer for videos
}


/* Menu */

onWindowLoad(setup_page);
onWindowLoad(setup_menu);

function setup_page() {
    var scripts = dom('script');
    var name = scripts[scripts.length - 1].attributes['name'].value;
    var favicon = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQBAMAAADt3eJSAAAAMFBMVEU0OkArMjhobHEoPUPFEBIuO0L+AAC2FBZ2JyuNICOfGx7xAwTjCAlCNTvVDA1aLzQ3COjMAAAAVUlEQVQI12NgwAaCDSA0888GCItjn0szWGBJTVoGSCjWs8TleQCQYV95evdxkFT8Kpe0PLDi5WfKd4LUsN5zS1sKFolt8bwAZrCaGqNYJAgFDEpQAAAzmxafI4vZWwAAAABJRU5ErkJggg=='; // scripts[scripts.length - 1].attributes['favicon'].value;
    document.title = '{0} {1}'.format(name, document.location.pathname);
    document.head.appendChild(el('link', { rel: 'shortcut icon', href: favicon, size: '16x16', type: 'image/ico' }));
}

function setup_menu() {
    var body = dom('body')[0];
    var logform = el('div', { id: 'menu' }, [
        el('input', { type: 'button', value: "💾" }, [], { 'onclick': 'menu_toggle(event, "wget_code");' }),
        el('input', { type: 'button', value: "🔐" }, [], { 'class': 'hide', 'onclick': 'menu_toggle(event, "auth_form");' }),
        el('input', { type: 'button', value: "📤" }, [], { 'class': 'hide', 'onclick': 'menu_toggle(event, "upload_form");' }),
    ]);
    body.insertBefore(logform, body.firstChild);
}

function menu_has_auth(loggedin) {
    var menu = dom('#menu')[0];
    if (loggedin) {
        menu.children[1].onclick = auth_logout;
        menu.children[1].value = '🚪';
    }
    menu.children[1].classList.remove('hide');
}
function menu_has_upload(disable) {
    var menu = dom('#menu')[0];
    menu.children[2].classList.remove('hide');
    menu.children[2].disabled = disable;
}

function menu_toggle(_ev, id) {
    var togglediv = dom('#' + id)[0];
    if (togglediv.classList.contains('hide')) {
        togglediv.classList.remove('hide');
    } else {
        togglediv.classList.add('hide');
    }
}

/* AUTH */

var g_authorization_header = localStorage.getItem('authorization_header');

onWindowLoad(setup_auth_html);

function setup_auth_html() { // called if auth is needed
    var body = dom('body')[0];
    var logform = el('form', { id: 'auth_form' }, [
        el('input', { name: 'username', type: 'text', placeholder: 'Username' }),
        el('input', { name: 'password', type: 'password', placeholder: 'Password' }),
        el('input', { type: 'submit', value: 'Sign In' }),
    ], { 'class': 'form hide', 'onsubmit': 'auth_sign_in(event);' });
    body.insertBefore(logform, body.firstChild);
    if (g_authorization_header !== null && g_authorization_header !== undefined) {
        menu_has_auth(true);
    }
}

function auth_sign_in(ev) {
    ev.preventDefault();
    var password_el = ev.target.children[1];
    var user_el = ev.target.children[0];
    var user = user_el.value;
    var password = password_el.value;
    g_authorization_header = 'Basic ' + window.btoa(user + ":" + password);
    localStorage.setItem('authorization_header', g_authorization_header);
    // Reload page
    document.location.reload();
}

function auth_logout(ev) {
    ev.preventDefault();
    console.log('logout');
    g_authorization_header = null;
    localStorage.removeItem('authorization_header');
    // Reload page
    document.location.reload();
}


/* UPLOAD */
onWindowLoad(setup_upload);

var upload_func = null;
var upload_endpoint = null;

function setup_upload() {
    // Feature detection for required features
    if (!(!!((typeof (File) !== 'undefined') && (typeof (Blob) !== 'undefined') && (typeof (FileList) !== 'undefined') && (Blob.prototype.webkitSlice || Blob.prototype.mozSlice || Blob.prototype.slice)))) {
        console.error('Browser does not support chunked uploading');
        return;
    }
    var scripts = dom('script');
    upload_endpoint = scripts[scripts.length - 1].attributes['upload'].value;
    if (upload_endpoint === null || upload_endpoint === undefined) {
        return;
    }

    // check server is able to receive uploads
    var headers = new Headers();
    if (g_authorization_header !== undefined && g_authorization_header !== null) {
        headers.append('Authorization', g_authorization_header);
    }
    return fetch(upload_endpoint, {
        credentials: 'omit', // prevent display of default pop-up
        headers: headers,
    }).then(function(response) {
        if (!response.ok) {
            if (response.status == 411) {
                console.warn("Chunked upload not supported client side, defaulting to raw upload");
                return upload_raw;
            } else if (response.status == 404) {
                console.info("Server doesn't support upload");
            } else if (response.status == 403 || response.status == 401) {
                console.warn("Upload need auth");
                menu_has_auth(false);
                menu_has_upload(true);
                return null;
            } else {
                console.error(response);
            }
            return null;
        }
        return response.text().then((body) => (body.length < 20) ? upload_raw : null); // 200 <= status < 400 If it returns contents, probably server doesn't support upload
    }).then((func) => {
        // create ui
        upload_func = func;
        if (upload_func === null) {
            return;
        }
        menu_has_upload(false);
        var body = dom('body')[0];
        var updiv = el('div', { id: 'upload_form' }, [
            el('form', {}, [
                el('input', { name: 'File', type: 'file' }, [], { "multiple": "multiple" }),
                el('input', { type: 'button', value: 'Upload' }, [], { 'onclick': 'upload_start(event);' }),
            ], { 'class': 'form' }),
            el('table', { border: 1, cellpadding: 1, cellspacing: 1 }, [
                el('thead', { id: 'fthead' }, ['Filename', 'Progress'].map((f) => el('th', { innerText: f }))),
                el('tbody', { id: 'ftbody' }),
            ], { 'class': 'hide' }),
        ], { 'class': 'form hide' });
        body.insertBefore(updiv, body.firstChild);
    });
}

function upload_start(ev) {
    if (upload_func === null) {
        console.error("Handle upload func is null");
        return;
    }

    var up_progress = (progress, upprogress) => {
        upprogress.children[0].value = Math.floor(progress * 100);
    };
    var up_success = (responseText, upprogress) => {
        console.log('Success - server responded with:', responseText);
        upprogress.children[1].innerText = '\u2713';
    };
    var up_error = (errorText, upprogress) => {
        console.error('A server error occurred:', errorText); // Could retry at this stage depending on xhr.status
        upprogress.children[1].innerText = '\u274C';
    };

    var form = ev.target.parentNode;
    var table = form.parentNode.children[1];
    table.classList.remove("hide");
    var file = form.children[0];
    Array.from(file.files).forEach((f) => {
        var upprogress = el('span', {}, [
            el('progress', { max: 100, value: 0 }),
            el('span', { innerText: '◌' }),
        ]);
        var upentry = el('tr', {}, [
            el('td', {}, [
                icontag(icon_base, f.type),
                el('span', { innerText: f.name }),
            ]),
            el('td', {}, [upprogress]),
        ]);
        table.appendChild(upentry);

        // first upload meta file
        var meta = "uploadmeta_size='{0}' && uploadmeta_name='{1}' && printf -v uploadmeta_name '%b' \"${uploadmeta_name//\\%/\\\\x}\" && uploadmeta_type='{2}'".format(f.size, encodeURIComponent(f.name), f.type);
        meta += '\n# Fixup command\n# find ./ -type f | while read -r i; do if [ ! -f "$i" ]; then continue; fi && read -r -n 10 head < "$i" && if [ "$head" == "uploadmeta" ]; then source "$i" && find ./ -type f -size "$uploadmeta_size"c -exec mv {} "$uploadmeta_name" \\; ; fi; done\n';
        upload_func(upload_endpoint, '',
            Math.round(Math.pow(10, 17) * Math.random()), // generate random long number for SessionID
            meta, up_progress, (_resp, upprogress) => {
                // meta upload success, start real upload
                upprogress.children[1].innerText = '◌'; // reset indicator
                upload_func(upload_endpoint, '',
                    Math.round(Math.pow(10, 17) * Math.random()), // generate random long number for SessionID
                    f, up_progress, up_success, up_error, upprogress,
                );
            }, up_error, upprogress,
        );

    });
    form.reset();
}

function upload_raw(url, extraParams, sessionID, file, progress, success, error, cb_data) {
    aborting = false;
    xhr = new XMLHttpRequest();
    if (extraParams) {
        xhr.open('POST', url + (url.indexOf('?') > -1 ? '&' : '?') + extraParams, true);
    } else {
        xhr.open('POST', url, true);
    }
    var headers = {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': 'attachment; filename="{0}"'.format(encodeURIComponent(file.name)),
        'X-Content-Range': 'bytes 0-{0}/{1}'.format(file.size - 1, file.size),
        'X-Session-ID': sessionID,
    };
    if (g_authorization_header !== undefined) {
        headers['Authorization'] = g_authorization_header;
    }
    xhr = Object.entries(headers).reduce((xhr, [k, v]) => { xhr.setRequestHeader(k, v); return xhr; }, xhr);

    xhr.upload.addEventListener('progress', (e) => {
        if (aborting) { return; }
        progress(e.loaded / e.total, cb_data);
    });
    xhr.addEventListener('load', (ev) => {
        var xhr = ev.target;
        if (aborting) { return; }
        if (xhr.readyState >= 4) {
            if (xhr.status >= 200 && xhr.status <= 299) {
                progress(1, cb_data);
                success(xhr.responseText, cb_data);
            } else {
                try {
                    xhr.abort();
                } catch (err) { }
                error(xhr.responseText, cb_data);
            }
        }
    });

    xhr.addEventListener('error', (ev) => {
        var xhr = ev.target;
        if (aborting) { return; }
        try {
            xhr.abort();
        } catch (err) { }
        error(xhr.responseText, cb_data);
    });
    xhr.send(file);
    return {
        abort: () => {
            aborting = true;
            try {
                xhr.abort();
            } catch (err) { }
        },
    };
}
