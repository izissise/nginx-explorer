var filesapp;

window.onload = function() {
  filesapp = document.getElementById("filesapp");
  fileApp(filesapp.dataset.api);
};

function fileApp(api) {
  var fadingOut = fadeOut(filesapp, 150);

  get(api).then(function(rawData) { // Request
    return JSON.parse(rawData);
  }).then(function(data) {
    formatData(api, data);
    var dataTable = ConvertJsonToTable(data, null, null, null);
    var dataTableHtml = document.createElement('div');
    dataTableHtml.innerHTML = dataTable;
    if (dataTableHtml.length > 0) {
      console.log(dataTable);
      addSortInfo(dataTableHtml);
      var sortedTable = new Tablesort(dataTableHtml.getElementsByTagName('table')[0]);
    }

    if (api != filesapp.dataset.api) { // If it's not the base path
      var posSlash = api.lastIndexOf('/', api.length - 2);
      var posLastSlash = api.lastIndexOf('/');
      var textLocation = api.substring(posSlash + 1, posLastSlash);

    }

    fadingOut.then(function(el) {
      filesapp.innerHTML = '';
      filesapp.innerHTML = '';
      filesapp.appendChild(dataTableHtml);
      return fadeIn(filesapp, 150);
    });
  },
  function(err) {
    console.error(err);
    div.innerHTML = '<h3 style="center;">An error occured</h3>';
  });
}

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
   d =        [d.getHours().padLeft(),
               d.getMinutes().padLeft(),
               d.getSeconds().padLeft()].join(':') +
               ' ' +
               [d.getDate().padLeft(),
               (d.getMonth()+1).padLeft(),
               d.getFullYear()].join('/');
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
          escapeHtml(base), escapeHtml(data), '/")\'>',
          iconFor(data, true), data, '</a>'
  ].join("");
}

function linkify(base, data) {
  return ['<a href="', escapeHtml(base), escapeHtml(data), '">',
         iconFor(data, false), data, '</a>'
  ].join("");
}
