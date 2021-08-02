function onWindowLoad(callback) {
      if(window.addEventListener){
          window.addEventListener('load', callback, false);
      }else{
          window.attachEvent('onload', callback);
      }
}

function get(path) {
  var headers = new Headers();
  if (g_authorization_header !== undefined && g_authorization_header !== null) {
      headers.append('Authorization', g_authorization_header);
  }
  return fetch(path, {
        credentials: 'omit', // Prevent display of default pop-up
        headers: headers,
    }).then(function(response) {
        if (!response.ok) {
            return Promise.reject(response);
        }
        return response;
    });
}

Number.prototype.padLeft = function(base, chr){
    var  len = (String(base || 10).length - String(this).length) + 1;
    return len > 0 ? new Array(len).join(chr || '0') + this : this;
};

function escapeHtml(text) {
  var map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };

  return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}

function humanFileSize(bytes, si) {
    var thresh = si ? 1000 : 1024;
    if(Math.abs(bytes) < thresh) {
        return bytes + ' B';
    }
    var units = si ? ['kB','MB','GB','TB','PB','EB','ZB','YB']
        : ['KiB','MiB','GiB','TiB','PiB','EiB','ZiB','YiB'];
    var u = -1;
    do {
        bytes /= thresh;
        ++u;
    } while(Math.abs(bytes) >= thresh && u < units.length - 1);
    return bytes.toFixed(1) + ' ' + units[u];
}

// fade out
function fadeOut(el, speed) {
  return new Promise(function(done) {
    el.style.opacity = 1;
    var opacity = 1;
    var startTime = new Date();

    (function fadeOutTransition() {
      var delta = Math.min(1, (new Date() - startTime) / speed);
      opacity = 1 - delta;
      if (delta < 1) {
        el.style.opacity = opacity;
        requestAnimationFrame(fadeOutTransition);
      } else {
        done(el);
      }
    })();
  });
}

// fade in
function fadeIn(el, speed) {
  return new Promise(function(done) {
    el.style.opacity = 0;
    var opacity = 0;
    var startTime = new Date();

    (function fadeInTransition() {
      var delta = Math.min(1, (new Date() - startTime) / speed);
      opacity = delta;
      if (delta < 1) {
        el.style.opacity = opacity;
        requestAnimationFrame(fadeInTransition);
      } else {
        el.style.opacity = 1;
        done(el);
      }
    })();
  });
}

if (!Date.prototype.toISOString) {
  (function() {

    function pad(number) {
      if (number < 10) {
        return '0' + number;
      }
      return number;
    }

    Date.prototype.toISOString = function() {
      return this.getUTCFullYear() +
        '-' + pad(this.getUTCMonth() + 1) +
        '-' + pad(this.getUTCDate()) +
        'T' + pad(this.getUTCHours()) +
        ':' + pad(this.getUTCMinutes()) +
        ':' + pad(this.getUTCSeconds()) +
        '.' + (this.getUTCMilliseconds() / 1000).toFixed(3).slice(2, 5) +
        'Z';
    };

  }());
}
