function get(path) {
  return new Promise(function(resolve, reject) {
    var request = new XMLHttpRequest();
    request.overrideMimeType("text/html; charset=ISO-8859-1");
    // Handle network errors
    request.onerror = function() {
      reject(Error("Network Error"));
    };
    request.onreadystatechange = function() {
        if (request.readyState === XMLHttpRequest.DONE) {
          if (request.status >= 200 && request.status < 400) {
              resolve(request.responseText);
            } else {
              reject(request);
            }
        }
    };

    request.open("GET", path, true);
    request.send();
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
    return bytes.toFixed(1)+' '+units[u];
}

// fade out
function fadeOut(el){
  return new Promise(function(done) {
    el.style.opacity = 1;

    (function fadeOutTransition() {
      if ((el.style.opacity -= 0.1) < 0) {
        el.style.display = "none";
        done(el);
      } else {
        requestAnimationFrame(fadeOutTransition);
      }
    })();
  });
}

// fade in
function fadeIn(el, display){
  return new Promise(function(done) {
    el.style.opacity = 0;
    el.style.display = display || "";

    (function fadeInTransition() {
      if ((el.style.opacity += 0.1) < 1.1) {
        requestAnimationFrame(fadeInTransition);
      } else {
        el.style.opacity = 1;
        done(el);
      }
    })();
  });
}