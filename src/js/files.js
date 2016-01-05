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

var config;

window.onload = function() {
  config = document.getElementById("filesapp");
  fileApp(config.dataset.api, config);
};

function createDropDown(that) {
  var par = that.parentNode;
  return par;
}

function fileApp(api, div) {
  loadJSON(api,
    function(data) {

      formatData(api, data);
      var dataTable = ConvertJsonToTable(data, null, null, null);

      div.innerHTML = '';
      if (api != config.dataset.api) {
        var posSlash = api.lastIndexOf('/', api.length - 2);
        var posLastSlash = api.lastIndexOf('/');
        var textLocation = api.substring(posSlash + 1, posLastSlash);

        div.innerHTML = ['<h3 style="center;">', escapeHtml(textLocation), '</h3>'].join("");
      }
      div.innerHTML += dataTable;
      var headers = div.getElementsByTagName('th');
      if (headers.length > 0) {
        addSortInfo(headers);
        var sortedTable = new Tablesort(div.getElementsByTagName('table')[0]);
      }
    },
    function(err) {
      console.error(err);
      div.innerHTML = 'An error occured';
    });
}

Number.prototype.padLeft = function(base, chr){
    var  len = (String(base || 10).length - String(this).length) + 1;
    return len > 0 ? new Array(len).join(chr || '0') + this : this;
};

function addSortInfo(div) {
  div[0].setAttribute('data-sort-method', 'default');
  div[1].setAttribute('data-sort-method', 'filesize');
  div[2].setAttribute('data-sort-method', 'date');
  div[2].className += 'sort-default';
}

function formatData(baseUrl, data) {
  //Transform as a link or directory
  data.forEach(function(e) {
   var name = "";
   if (e.type == "directory") {
     name = directoryfy(baseUrl, e.name);
   } else {
     name = linkify(baseUrl, e.name);
   }
   var d = new Date(e.mtime);
   d = [d.getDate().padLeft(),
               (d.getMonth()+1).padLeft(),
               d.getFullYear()].join('/') +' ' +
              [d.getHours().padLeft(),
               d.getMinutes().padLeft(),
               d.getSeconds().padLeft()].join(':');
   var size = "-";
   if (e.size) {
      size = humanFileSize(e.size, false);
   }

   e.Filename = name;
   e.Size = size;
   e.Date = d;

   delete e.size;
   delete e.name;
   delete e.type;
   delete e.mtime;
  });

}

function directoryfy(base, data) {
  return ['<a href="javascript:void(0)" onclick=\'fileApp("',
          escapeHtml(base), escapeHtml(data), '/", createDropDown(this))\'>',
          iconFor(data, true), data, '</a>'
  ].join("");
}

function linkify(base, data) {
  return ['<a href="', escapeHtml(base), escapeHtml(data), '">',
         iconFor(data, false), data, '</a>'
  ].join("");
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
