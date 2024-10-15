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
    var g_this_script = Array.from(dom('script')).filter((s) => s.hasAttribute('name'))[0];
    var g_icon_base = null;

    onWindowLoad(setup_menu);
    onWindowLoad(setup_auth_html);
    onWindowLoad(setup_files);
    onWindowLoad(setup_page);
    onWindowLoad(setup_upload);
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

var format_name = (name, link) => {
    var fileext = file_ext(link);
    var isdir = link.endsWith('/');
    var html = el('a', {
        href: link,
        rel: 'noopener', // tabnabbing
        ...(isdir ? {} : { download: name })
    }, [
        iconFor(fileext),
        el('span', { innerText: name }),
    ], { 'data-link': link });
    return el('td', {}, [html], { 'data-sort': link });
};
var format_size = (size) => el('td', {
    innerText: (size == 0) ? '-' : humanFileSize(size, false)
}, [], { 'data-sort': size });
var format_date = (date, now, with_seconds) => el('td', {
    innerText: (() => {
        var d = new Date(date);
        var dtime = d.getTime();
        var formatted_24h = [d.getHours().padLeft(),
            d.getMinutes().padLeft()].concat(with_seconds ? [d.getSeconds().padLeft()] : []).join(':');
        if ((now - dtime) > (1000 * 60 * 60 * 24 * 2)) { // more than 2days in the past
            return formatted_24h +
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
                return "Yesterday" + ' ' + formatted_24h;
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
    // I tried multiple solution to sort the elements in the DOM
    // in 2023 I found this to be the fatest way
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

// TODO https://btxx.org/posts/Please_Make_Your_Table_Headings_Sticky/
function setup_files() {
    var now = new Date().getTime();
    var date_format = g_this_script.attributes['date-format'].value;
    var user = g_this_script.attributes['user'].value;
    var status = g_this_script.attributes['status'].value;
    g_icon_base = g_this_script.attributes['icons'].value;

    var fext_cnt = {};
    var fpre_cnt = {};
    var fpre_length = 4;

    var body = dom('body')[0];
    body.appendChild(el('span', { id: 'status', style: 'float: right; margin-right: 10px;', innerText: status }));
    if (dom('pre').length == 0) { // nothing, probably unauthorized, tell menu
        var access = g_this_script.attributes['access'].value;
        var upload = g_this_script.attributes['upload'].value;
        if (access != '' && access[access.length - 1] != '/') {
            access += '/';
        }
        if (access == '' || access == upload) {
            menu_need_auth();
            return;
        }
        if (document.location.pathname.startsWith(access)) {
            return;
        }
        var elem = el('pre', {}, [el('a', {
            href: access,
            innerText: access,
        }, [], {})]);
        body.appendChild(elem);
    }
    menu_has_auth(!['wan_anon', 'local_anon', ''].includes(user));
    var entries = dom('pre')[0].innerHTML.split('\n').filter((l) => l.length > 0 && l != '<a href="../">../</a>').map((entry) => {
        entry = entry.split('</a>');
        var link = entry[0].split('">');
        var link = decodeURIComponent(link[0].substr(9)); // <a href="
        var name = link;
        entry = entry[1].trim().split(/\s+/);
        var date = new Date(entry[0] + ' ' + entry[1]).getTime();
        var size = (entry[2] == '-' || entry.length < 3) ? 0 : parseInt(entry[2]);
        var pre = name.substr(0, fpre_length);
        var ext = file_ext(link);
        fpre_cnt[pre] = (fpre_cnt[pre] ? fpre_cnt[pre] : 0) + 1;
        fext_cnt[ext] = (fext_cnt[ext] ? fext_cnt[ext] : 0) + 1;
        return [name, link, size, date];
    }).map((data) => el('tr', {}, [
        format_name(data[0], data[1]),
        format_size(data[2]),
        format_date(data[3], now, date_format == 'seconds'),
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
        if (!['menu', 'auth_form', 'status'].includes(c.id)) {
            body.removeChild(c);
        }
    })
    body.appendChild(table);

    var uitype = 'default';
    var getcnt = (list) => list.reduce((acc, key) => acc + ((fext_cnt[key] !== undefined) ? fext_cnt[key] : 0), 0);
    var fwithprefix = Math.max.apply(null, Object.values(fpre_cnt));
    var fcount = entries.length;
    var vids = getcnt(['mkv', 'avi', 'webm', 'mov', 'mp4', 'ogg']);
    var imgs = getcnt(['gif', 'png', 'jpeg', 'jpg', 'tiff', 'bpm']);
    var audios = getcnt(['mp3', 'wav', 'ogg', 'aac']);
    if ((imgs / fcount) > 0.8) {
        uitype = 'photo_gallery';
    } else if ([vids, audios, fwithprefix].some((c) => (c / fcount) > 0.82)) {
        uitype = 'media_season';
    } else if (vids == 1 && ((fcount < 6) || (getcnt(['nfo']) > 0))) {
        uitype = 'tvshow_episode';
    }
    var uitype_func = {
        'photo_gallery': () => sort_table(dom('#fthead'), dom('#ftbody'), 0, false), // TODO gallery mode for images (https://darekkay.com/blog/photography-website/ or https://www.files.gallery/)
        'tvshow_episode': () => sort_table(dom('#fthead'), dom('#ftbody'), 1, true), // sort by size
        'media_season': () => sort_table(dom('#fthead'), dom('#ftbody'), 0, false), // sort by name
        'default': () => sort_table(dom('#fthead'), dom('#ftbody'), 2, true), // default sort by date
    };
    uitype_func[uitype]();

    var wgetcode = el('div', { id: 'wget_code' }, [
        el('code', { innerText: "wget -r -c -nH --no-parent --reject 'index.html*' '{0}'".format(document.location) }) // TODO wget add cookie if logged in
    ], { 'class': 'form hide' });
    body.insertBefore(wgetcode, body.firstChild);
    if (fcount > 0) {
        menu_has_files();
    }
    if ((vids + imgs + audios) > 0) {
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
    var body = dom('body')[0];
    var logform = el('div', { id: 'menu' }, [
        el('input', { type: 'button', value: "💾", title: 'bulk download/upload' }, [], { 'class': 'hide', 'onclick': 'menu_toggle(event, "wget_code");' }),
        el('input', { type: 'button', value: "🔐", title: 'login' }, [], { 'class': 'hide', 'onclick': 'menu_toggle(event, "auth_form");' }),
        el('input', { type: 'button', value: "📤", title: 'upload' }, [], { 'class': 'hide', 'onclick': 'menu_toggle(event, "upload_form");' }),
        el('input', { type: 'button', value: "🛋️", title: 'media mode' }, [], { 'class': 'hide', 'onclick': 'media_actions(); event.target.disabled = "disabled"' }),
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
        menu.children[1].title = 'logout';
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
    ], { 'class': 'form hide', 'onsubmit': 'auth_login(event);' });
    body.appendChild(logform);
}

function auth_login(ev) {
    ev.preventDefault();
    var password_el = ev.target.children[1];
    var user_el = ev.target.children[0];
    var user = user_el.value;
    var password = password_el.value;
    var headers = new Headers();
    headers.append('Authorization', 'Basic ' + btoa(user + ":" + password));
    fetch(g_this_script.attributes['login'].value, {
        method: "POST",
        headers: headers,
    }).then((r) => {
        document.location.reload();
    })
}

function auth_logout(ev) {
    ev.preventDefault();
    console.log('logout');
    fetch(g_this_script.attributes['logout'].value, { method: "POST" }).then((r) => {
        document.location.reload();
    })
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
    return fetch(upload_endpoint).then(function(response) {
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
        // TODO calculate and send block and file hashes
        // /!\ /!\ /!\ copy of conversion script should be
        // kept on server to avoid RCE from users
        var fixupcmd = 'find ./ -type f'; // find all files in current folder
        fixupcmd += ' | while read -r i; do if [ ! -f "$i" ]; then continue; fi'; // put in $i file that still exists
        fixupcmd += ' && read -r -n 12 head < "$i" && if [ "$head" != "#upload_meta" ]; then continue; fi';
        fixupcmd += ' && name=$(grep -v "#" "$i" | jq -r ".name" | tr "/" "_")'; // get name
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
