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
    margin-inline: auto;
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
:root {
  accent-color: mediumvioletred;
}
.form, form {
    width: fit-content;
}
input {
    margin: 2px;
}
#menu {
    position: absolute;
    margin-top: 3px;
    margin-left: 10px;
}
input[type="button"]:disabled,
input[type="submit"]:disabled,
button:disabled,
button[disabled] {
    background: repeating-linear-gradient(
        45deg,
        #999999,
        #cccccc 3px,
        #666666 4px,
        #55557f 5px
    );
}
`

// TODO css fix flashing when loggedin

function onWindowLoad(callback) {
    if (window.addEventListener) {
        window.addEventListener('load', callback, false);
    } else {
        window.attachEvent('onload', callback);
    }
}

function dom(select) {
    return document.querySelectorAll(select);
}

// if file is a service worker
if (this.document) {
    var g_authorization_header = localStorage.getItem('authorization_header');
    var g_downloads_need_auth = false;
    var g_this_script = Array.from(dom('script')).filter((s) => s.hasAttribute('name'))[0];
    var g_icon_base = null;

    onWindowLoad(setup_menu);
    onWindowLoad(setup_auth_html);
    onWindowLoad(setup_files);
    onWindowLoad(setup_page);
    onWindowLoad(setup_upload);
    onWindowLoad(() => {
        var styleSheet = document.createElement("style")
        styleSheet.innerText = styles
        document.head.appendChild(styleSheet)
    });
}

function el(tag, props, ch, attrs) {
    var n = Object.assign(document.createElement(tag), (props === undefined) ? {} : props);
    var child = (ch === undefined) ? [] : ch;
    n = child.reduce((e, c) => { e.appendChild(c); return e; }, n);
    var attributes = (attrs === undefined) ? {} : attrs;
    n = Object.entries(attributes).reduce((e, [k, v]) => { e.setAttribute(k, v); return e; }, n);
    return n;
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
    '7z': 'application-x-7z-compressed', 'aac': 'audio-x-generic', 'apk': 'android-package-archive', 'apng': 'image-png', 'atom': 'application-atom+xml', 'avi': 'audio-x-generic', 'bash': 'application-x-executable-script', 'bmp': 'image-bmp', 'c': 'text-x-csrc', 'cfg': 'text-x-generic', 'coffee': 'application-x-javascript', 'conf': 'text-x-generic', 'cpp': 'text-x-c++src', 'csh': 'application-x-executable-script', 'css': 'text-css', 'csv': 'text-csv', 'db': 'application-vnd.oasis.opendocument.database', 'deb': 'application-x-deb', 'desktop': 'application-x-desktop', 'doc': 'x-office-document', 'docx': 'x-office-document', 'eml': 'message-rfc822', 'epub': 'application-epub+zip', 'erb': 'application-x-ruby', 'ex': 'text-x-generic', 'exe': 'application-x-executable', 'fla': 'video-x-generic', 'flac': 'audio-x-flac', 'flv': 'video-x-generic', 'gif': 'image-gif', 'gml': 'text-xml', 'go': 'text-x-generic', 'gpx': 'text-xml', 'gz': 'application-x-gzip', 'h': 'text-x-chdr', 'hxx': 'text-x-c++hdr', 'hs': 'text-x-haskell', 'htm': 'text-html', 'html': 'text-html', 'ico': 'image-x-ico', 'ini': 'text-x-generic', 'iso': 'application-x-cd-image', 'jar': 'application-x-java-archive', 'java': 'application-x-java', 'jpeg': 'image-jpeg', 'jpg': 'image-jpeg', 'js': 'application-x-javascript', 'log': 'text-x-generic', 'lua': 'text-x-generic', 'm3u': 'audio-x-generic', 'markdown': 'text-x-generic', 'md': 'text-x-generic', 'mkv': 'video-x-matroska', 'mp3': 'audio-x-mpeg', 'mp4': 'video-mp4', 'odp': 'x-office-presentation', 'ods': 'x-office-spreadsheet', 'odt': 'x-office-document', 'ogg': 'audio-x-generic', 'otf': 'application-x-font-otf', 'pdf': 'application-pdf', 'pgp': 'application-pgp', 'php': 'application-x-php', 'pkg': 'package-x-generic', 'pl': 'application-x-perl', 'png': 'image-png', 'ppt': 'x-office-presentation', 'pptx': 'x-office-presentation', 'psd': 'image-x-psd', 'py': 'text-x-generic', 'pyc': 'application-x-python-bytecode', 'rar': 'application-x-rar', 'rb': 'application-x-ruby', 'rpm': 'application-x-rpm', 'rtf': 'text-rtf', 'sh': 'application-x-executable-script', 'svg': 'image-svg+xml-compressed', 'svgz': 'image-svg+xml-compressed', 'swf': 'application-x-shockwave-flash', 'tar': 'application-x-tar', 'text': 'text-x-generic', 'tiff': 'image-tiff', 'ttf': 'application-x-font-ttf', 'txt': 'text-x-generic', 'wav': 'audio-x-wav', 'webm': 'video-webm', 'wmv': 'video-x-wmv', 'xcf': 'image-x-xcf', 'xhtml': 'text-html', 'xls': 'x-office-spreadsheet', 'xlsx': 'x-office-spreadsheet', 'xml': 'text-xml', 'xpi': 'package-x-generic', 'xz': 'application-x-lzma-compressed-tar', 'zip': 'application-zip', 'zsh': 'application-x-executable-script', 'opml': 'text-xml', '.': 'folder',
};

function icontag(icon) {
    return el('img', {
        height: 24,
        src: '{0}{1}.svg'.format(g_icon_base, icon.replace('/', '-')),
        alt: '',
    }, [], {
        'class': 'fileicon',
        'type': 'image/svg+xml',
        'onerror': "this.src=\'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==\'",
    });
}

function iconFor(ext) {
    var icon = 'application-octet-stream';
    if (IconMap[ext] !== undefined) {
        icon = IconMap[ext];
    }
    if (g_icon_base === null) {
        return el('div');
    }
    return icontag(icon);
}

function file_ext(path) {
    if (path.endsWith('/')) {
        return '.';
    }
    return path.slice(path.lastIndexOf('.') + 1).toLowerCase();
}

function auth_download(linktag) {
    var headers = new Headers();
    headers.append('Authorization', g_authorization_header);
    fetch(linktag.dataset.link, {
        credentials: 'omit', // prevent display of default pop-up
        headers: headers,
    }).then(res => {
        var size = res.headers.get('Content-Length');
        var fileStream = window.streamSaver.createWriteStream(linktag.download, {
            size: size ? size : 0,
        });
        var readableStream = res.body
        // more optimized
        if (window.WritableStream && readableStream.pipeTo) {
            return readableStream.pipeTo(fileStream)
                .then(() => console.log('download success'))
        }

        window.writer = fileStream.getWriter()

        var reader = res.body.getReader()
        var pump = () => reader.read()
            .then(res => res.done
                ? writer.close()
                : writer.write(res.value).then(pump))
        pump()
    });
}

var format_name = (name, link) => {
    var fileext = file_ext(link);
    var isdir = link.endsWith('/');
    var href = (g_downloads_need_auth && !isdir) ? 'javascript:void(0)' : link;
    var onclick = (g_downloads_need_auth && !isdir) ? 'auth_download(this)' : '';
    var html = el('a', {
        href: href,
        rel: 'noopener', // tabnabbing
        ...(isdir ? {} : { download: name })
    }, [
        iconFor(fileext),
        el('span', { innerText: name }),
    ], { 'data-link': link, 'onclick': onclick });
    return el('td', {}, [html], { 'data-sort': link });
};
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

function setup_files() {
    var now = new Date().getTime();
    g_icon_base = g_this_script.attributes['icons'].value;

    var fext_cnt = {};

    var body = dom('body')[0];
    if (dom('pre').length == 0) {
        if (g_authorization_header !== undefined && g_authorization_header !== null) {
            // redo request with auth
            var headers = new Headers();
            headers.append('Authorization', g_authorization_header);
            fetch(window.location.href, {
                credentials: 'omit', // prevent display of default pop-up
                headers: headers,
            }).then((response) => {
                return response.text().then((text) => {
                    g_downloads_need_auth = true;
                    var resp = (new DOMParser()).parseFromString(text, 'text/html');
                    var body_childs = resp.querySelector('body').children;
                    Array.from(body_childs).forEach((c) => body.appendChild(c));
                    if (response.status == 200) {
                        var streamserver = el('script', {}, [], { 'src': 'https://cdn.jsdelivr.net/npm/streamsaver@2.0.3/StreamSaver.min.js' }); // TODO try again to put it all in the same file here
                        streamserver.addEventListener("load", function(_ev) {
                            setup_files(); // re setup files
                        });
                        document.head.appendChild(streamserver);
                    }
                });
            }, (error) => console.error(error));
        } else {
            // probably unauthorized, tell menu
            menu_need_auth();
        }
        return;
    }
    var entries = dom('pre')[0].innerHTML.split('\n').filter((l) => l.length > 0 && l != '<a href="../">../</a>').map((entry) => {
        entry = entry.split('</a>');
        var link = entry[0].split('">');
        // var nginx_name = unescape(link[1]); // ignore it is truncated
        var link = decodeURIComponent(link[0].substr(9)); // <a href="
        var name = link;
        entry = entry[1].trim().split(/\s+/);
        var date = new Date(entry[0] + ' ' + entry[1]).getTime();;
        var size = (entry[2] == '-') ? 0 : parseInt(entry[2]);
        var ext = file_ext(link);
        fext_cnt[ext] = (fext_cnt[ext] ? fext_cnt[ext] : 0) + 1;
        return [name, link, size, date];
    }).map((data) => el('tr', {}, [
        format_name(data[0], data[1]),
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

    // remove everything except menu and auth_form
    Array.from(body.children).forEach((c) => {
        if (!['menu', 'auth_form'].includes(c.id)) {
            body.removeChild(c);
        }
    })
    body.appendChild(table);

    var getcnt = (list) => list.reduce((acc, key) => acc + ((fext_cnt[key] !== undefined) ? fext_cnt[key] : 0), 0);
    var uitype = 'default';
    var fcount = entries.length;
    var vids = getcnt(['mkv', 'avi', 'webm', 'mov', 'mp4', 'ogg']);
    var imgs = getcnt(['gif', 'png', 'jpeg', 'jpg', 'tiff', 'bpm']);
    var audios = getcnt(['mp3', 'wav', 'ogg', 'aac']);
    if ((imgs / fcount) > 0.8) {
        uitype = 'photo_gallery';
    } else if ((vids / fcount) > 0.82) {
        uitype = 'tvshow_season';
    } else if ((audios / fcount) > 0.82) {
        uitype = 'podcast_season';
    } else if (vids == 1 && ((fcount < 6) || (getcnt(['nfo']) > 0))) {
        uitype = 'tvshow_episode';
    }
    var uitype_func = {
        'photo_gallery': () => sort_table(dom('#fthead'), dom('#ftbody'), 0, false), // TODO gallery mode for images
        'tvshow_episode': () => sort_table(dom('#fthead'), dom('#ftbody'), 1, true), // sort by size
        'tvshow_season': () => sort_table(dom('#fthead'), dom('#ftbody'), 0, false), // sort by name
        'podcast_season': () => sort_table(dom('#fthead'), dom('#ftbody'), 0, false), // sort by name
        'default': () => sort_table(dom('#fthead'), dom('#ftbody'), 2, true), // default sort by date
    };
    uitype_func[uitype]();

    var wgetcode = el('div', { id: 'wget_code' }, [
        el('code', { innerText: "wget -r -c -nH --no-parent --reject 'index.html*' '{0}'".format(document.location) }) // TODO wget add username if logged in
    ], { 'class': 'form hide' });
    body.insertBefore(wgetcode, body.firstChild);
    if (fcount > 0) {
        menu_has_files();
    }
    if ((vids + imgs + audios) > 0 && !g_downloads_need_auth) {
        menu_has_media();
    }
}


/* Media */

var media_action_called = false;
function media_actions() {
    if (media_action_called) { return; }
    media_action_called = true;
    var tbodies = dom('#ftbody');
    for (j = 0; j < tbodies.length; j++) {
        var tbody = tbodies[j];
        if (tbody.rows.length == 0) {
            continue;
        }
        Array.from(tbody.rows).forEach((tr) => {
            var link = tr.cells[0].dataset.sort;
            var media = format_media_el(link);
            if (media !== null) {
                tr.cells[0].appendChild(media);
            }
        });
    }
}

function format_media_el(link) {
    var fext = file_ext(link);
    var media_html = (button, media_el, onclick) => {
        return el('span', {}, [
            el('input', { type: 'button', value: button }, [], { 'onclick': onclick + ' ; el_hide_toggle(event.target.nextSibling);' }),
            media_el,
        ]);
    };
    var err_disable = { 'onerror': 'event.target.parentNode.previousSibling.disabled = "disabled"' };
    var m = {
        'gif,png,jpeg,jpg,tiff,bpm': () => media_html(
            "🖼️", el('img', { width: '320', }, [], { 'class': 'hide', 'data-src': link }),
            'event.target.nextSibling.src = event.target.nextSibling.dataset.src',
        ),
        'mkv,avi,webm,mov,mp4,ogg': () => media_html(
            "📽️", el('video', { width: '320', height: '240', controls: 'controls', preload: 'none' }, [
                el('source', { src: link, type: 'video/{0}'.format(fext.replace('mkv', 'x-matroska').replace('avi', 'divx')) }, [], err_disable)
            ], { 'class': 'hide' }), ''
        ),
        'mp3,wav,ogg,aac,flac': () => media_html(
            "📻", el('audio', { width: '320', controls: 'controls', preload: 'none' }, [
                el('source', { src: link, }, [], err_disable)
            ], { 'class': 'hide' }), ''
        ),
    };
    for (var k in m) {
        if (k.split(',').includes(fext)) {
            return m[k]();
        }
    }
    return null;
}

/* Menu */

function setup_page() {
    var name = g_this_script.attributes['name'].value;
    document.title = '{0} {1}'.format(name, document.location.pathname);

    var favicon = g_this_script.attributes['favicon'].value;
    var svgmagic = '<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>{0}</text></svg>'.format(favicon);
    document.head.appendChild(el('link', { rel: 'shortcut icon', href: 'data:image/svg+xml,' + svgmagic, size: '24x24', type: 'image/ico' }));
    document.head.appendChild(el('meta', { name: 'viewport', content: 'width=device-width, initial-scale=1' }));
}

function setup_menu() {
    // TODO button tooltips
    var body = dom('body')[0];
    var logform = el('div', { id: 'menu' }, [
        el('input', { type: 'button', value: "💾" }, [], { 'class': 'hide', 'onclick': 'menu_toggle(event, "wget_code");' }),
        el('input', { type: 'button', value: "🔐" }, [], { 'class': 'hide', 'onclick': 'menu_toggle(event, "auth_form");' }),
        el('input', { type: 'button', value: "📤" }, [], { 'class': 'hide', 'onclick': 'menu_toggle(event, "upload_form");' }),
        el('input', { type: 'button', value: "🛋️" }, [], { 'class': 'hide', 'onclick': 'media_actions(); event.target.disabled = "disabled"' }),
    ]);
    body.appendChild(logform);
}

function menu_has_files() {
    var menu = dom('#menu')[0];
    menu.children[0].classList.remove('hide');
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
function menu_has_media() {
    var menu = dom('#menu')[0];
    menu.children[3].classList.remove('hide');
}

function menu_need_auth() {
    var menu = dom('#menu')[0];
    menu_toggle(null, "auth_form");
    menu.children[1].disabled = true;
}

function el_hide_toggle(el) {
    if (el.classList.contains('hide')) {
        el.classList.remove('hide');
    } else {
        el.classList.add('hide');
    }
}

function menu_toggle(_ev, id) {
    el_hide_toggle(dom('#' + id)[0]);
}

/* AUTH */

function setup_auth_html() { // called if auth is needed
    var body = dom('body')[0];
    var logform = el('form', { id: 'auth_form' }, [
        el('input', { name: 'username', type: 'text', placeholder: 'Username' }),
        el('input', { name: 'password', type: 'password', placeholder: 'Password' }),
        el('input', { type: 'submit', value: 'Sign In' }),
    ], { 'class': 'form hide', 'onsubmit': 'auth_sign_in(event);' });
    body.appendChild(logform);
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

// TODO show a curl command for terminal users
var upload_func = null;
var upload_endpoint = null;
var upload_max_size = null;

function setup_upload() {
    // Feature detection for required features
    if (!(!!((typeof (File) !== 'undefined') && (typeof (Blob) !== 'undefined') && (typeof (FileList) !== 'undefined') && (Blob.prototype.webkitSlice || Blob.prototype.mozSlice || Blob.prototype.slice)))) {
        console.error('Browser does not support chunked uploading');
        return;
    }
    upload_max_size = g_this_script.attributes['upload-max-size'].value;
    upload_endpoint = g_this_script.attributes['upload'].value;
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
        ], { 'class': 'hide' });
        body.insertBefore(updiv, body.firstChild);
    });
}

function uploade_etc_and_speed(now, transfer_size, transferred_size, last_transferred_date, last_transferred_size) {
    var estimate_to_completion = null;
    var speed = null;
    var duration = now - last_transferred_date;
    if (duration != 0.0) {
        speed = (transferred_size - last_transferred_size) / duration;
        if (speed != 0) {
            estimate_to_completion = (transfer_size - transferred_size) / speed;
        }
    }
    return estimate_to_completion, speed
}

function upload_start(ev) {
    if (upload_func === null) {
        console.error("Handle upload func is null");
        return;
    }

    var up_progress = ([e, upprogress]) => {
        var ftotal = e.total == 0 ? 1 : e.total;
        var floaded = e.loaded == 0 ? 1 : e.loaded;
        var perc = Math.floor((floaded / ftotal) * 100);
        var etc = null;
        var speed = null;
        var bar = upprogress.children[0];
        var last_transferred_date = bar.dataset.lasttransferreddate;
        if (last_transferred_date === undefined) {
            last_transferred_date = e.timeStamp;
        }
        var last_transferred_size = bar.dataset.lasttransferredsize;
        if (last_transferred_size === undefined) {
            last_transferred_size = 0;
        }
        var duration = e.timeStamp - last_transferred_date;
        etc, speed = uploade_etc_and_speed(e.timeStamp / 1000, ftotal, floaded, last_transferred_date, last_transferred_size);
        console.log("{0}%, transferred {1}MiB/{2}MiB, {3}MiB/S in the last {4}s should finish in {5} seconds".format(perc, (floaded / (1024 * 1024)).toFixed(1), (ftotal / (1024 * 1024)).toFixed(1), (speed / (1024 * 1024)).toFixed(1), (duration / 1000).toFixed(1), (etc / 1000).toFixed(0)));
        bar.value = perc;
        bar.dataset.lasttransferreddate = e.timeStamp;
        bar.dataset.lasttransferredsize = floaded;
    };
    var up_success = ([xhr, upprogress]) => {
        console.log('Success - server responded with:', xhr.responseText);
        upprogress.children[1].innerText = '\u2713';
    };
    var up_error = ([xhr, upprogress]) => {
        console.error('A server error occurred:', xhr.responseText); // Could retry at this stage depending on xhr.status
        upprogress.children[1].innerText = '\u274C';
    };

    var form = ev.target.parentNode;
    var table = form.parentNode.children[1];
    table.classList.remove("hide");
    var file = form.children[0];
    Array.from(file.files).forEach((f) => {
        var up_progress_el = el('span', {}, [
            el('progress', { max: 100, value: 0 }),
            el('span', { innerText: '◌' }),
        ]);
        var upentry = el('tr', {}, [
            el('td', {}, [
                icontag(f.type),
                el('span', { innerText: f.name }),
            ]),
            el('td', {}, [up_progress_el]),
        ]);
        table.appendChild(upentry);

        var chunk_cnt = 1;
        var chunk_size = f.size;
        var chunk_last_size = 0;
        if (upload_max_size > 0 && f.size > upload_max_size) {
            // upload in chunks
            chunk_cnt = Math.ceil(f.size / upload_max_size);
            chunk_size = Math.floor(f.size / chunk_cnt);
            if ((chunk_cnt * chunk_size) < f.size) {
                chunk_last_size = f.size - (chunk_cnt * chunk_size);
                chunk_cnt += 1;
            }
            console.log('Chunked upload -> Filesize: {0} ChunkCnt: {1} ChunkSz: {2} ChunkLastSz: {3}'.format(f.size, chunk_cnt, chunk_size, chunk_last_size));
        }

        // first upload meta file
        // /!\ /!\ /!\ conversion function should be
        // kept on server to avoid RCE from users
        var fixupcmd = 'find ./ -type f'; // find all files in current folder
        fixupcmd += ' | while read -r i; do if [ ! -f "$i" ]; then continue; fi'; // put in $i file that still exists
        fixupcmd += ' && read -r -n 12 head < "$i" && if [ "$head" != "#upload_meta" ]; then continue; fi';
        fixupcmd += ' && name="$(grep -v "#" "$i" | jq -r ".name")"'; // get name
        fixupcmd += ' && find ./ -type f -size "$(grep -v "#" "$i" | jq -r ".chunk_size | @sh")"c -or -size "$(grep -v "#" "$i" | jq -r ".chunk_last_size | @sh")"c'; // find all files that are $chunk_sz in size
        fixupcmd += ' | while read -r j; do if (( 10#${i##*/} < 10#${j##*/} )); then echo "$j"; fi; done'; // only keep the one with a higher id
        fixupcmd += ' | sort -n | head -n "$(grep -v "#" "$i" | jq -r ".chunk_cnt | @sh")"'; // sort them and keep $chunk_cnt
        fixupcmd += ' | while read -r f; do cat "$f" >> "$name" && rm -f "$f"; done && rm -f "$i"; done'; // concatenate
        var meta = "#upload_meta\n" + JSON.stringify({
            'name': f.name,
            'size': f.size,
            'type': f.type,
            'chunk_cnt': chunk_cnt,
            'chunk_size': chunk_size,
            'chunk_last_size': chunk_last_size,
        }) + '\n';
        meta += '# Fixup command\n# ' + fixupcmd + '\n';
        upload_func(upload_endpoint, '',
            Math.round(Math.pow(10, 17) * Math.random()), // generate random long number for SessionID
            meta, up_progress, up_progress_el,
        ).then(([_xhr, up_progress_el]) => {
            // meta upload success, start real upload
            var seeker = 0;
            up_progress_el.children[1].innerText = '◌';
            var promise_chain = Promise.resolve(([null, up_progress_el]));
            for (var i = 0; i < chunk_cnt; i++) {
                let chunk_txt = '◌';
                if (chunk_cnt > 1) {
                    chunk_txt = '{0}/{1}'.format(i + 1, chunk_cnt);
                }
                var chsz = chunk_size;
                if ((seeker + chsz) > f.size) {
                    chsz = chunk_last_size;
                }
                let chunk = f.slice(seeker, seeker + chsz);
                seeker += chsz;
                promise_chain = promise_chain.then(([_xhr, up_progress_el]) => {
                    up_progress_el.children[1].innerText = chunk_txt;
                    return upload_func(upload_endpoint, '',
                        Math.round(Math.pow(10, 17) * Math.random()), // generate random long number for SessionID
                        chunk, up_progress, up_progress_el
                    );
                });
            }
            promise_chain.then(up_success);
        }, up_error);

    });
    form.reset();
}

function upload_raw(url, extraParams, sessionID, file, progress, cb_data) {
    return new Promise((resolve, reject) => {
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
            progress([e, cb_data]);
        });
        xhr.addEventListener('load', (ev) => {
            var xhr = ev.target;
            if (aborting) { return; }
            if (xhr.readyState >= 4) {
                if (xhr.status >= 200 && xhr.status <= 299) {
                    progress([ev, cb_data]);
                    resolve([xhr, cb_data])
                } else {
                    try {
                        xhr.abort();
                    } catch (err) { }
                    reject([xhr, cb_data])
                }
            }
        });

        xhr.addEventListener('error', (ev) => {
            var xhr = ev.target;
            if (aborting) { return; }
            try {
                xhr.abort();
            } catch (err) { }
            reject([xhr, cb_data])
        });
        xhr.send(file);
    });
}
