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
    orderField(data); // Order field to name/Size/Date
    var dataTable = ConvertJsonToTable(data, null, null, null);

    var dataTableHtml = document.createElement('div'); // Create div container for the table
    dataTableHtml.innerHTML = dataTable;

    if (dataTable.length > 0) { // If there is files in the directory
      addSortInfo(dataTableHtml.getElementsByTagName('th')); // Add Header sort info
      // Format data for both sorting and pretty printing
      addSortValue(dataTableHtml.getElementsByTagName('tbody')[0].getElementsByTagName('tr'), api);
      dataTableHtml.getElementsByTagName('thead')[0].getElementsByTagName('tr')[0].deleteCell(3); // Remove Type columns


      var sortedTable = new Tablesort(dataTableHtml.getElementsByTagName('table')[0]);
    }

    if (api != filesapp.dataset.api) { // If it's not the base path
      var posSlash = api.lastIndexOf('/', api.length - 2);
      var posLastSlash = api.lastIndexOf('/');
      var textLocation = api.substring(posSlash + 1, posLastSlash);

    }
    fadingOut.then(function(el) {
      filesapp.innerHTML = '';
      filesapp.appendChild(dataTableHtml);
      return fadeIn(filesapp, 150);
    });
  }, function(err) {
    console.error(err);
    filesapp.innerHTML = '<h3 style="center;">An error occured</h3>';
  });
}

function orderField(data) {
  data.forEach(function(e) {
    var size = e.size;
    if (e.size === undefined)
      size = "-";
    e.Filename = e.name;
    e.Size = size.toString();
    e.Date = e.mtime;
    e.Type = e.type;

    delete e.size;
    delete e.name;
    delete e.type;
    delete e.mtime;
  });
}

function addSortInfo(th) {
  th[0].setAttribute('data-sort-method', 'default'); // Name table Header
  th[1].setAttribute('data-sort-method', 'number'); // FileSize table Header
  th[2].setAttribute('data-sort-method', 'date'); // Date table Header
  th[2].className += 'sort-default'; // Default sort to date
  th[3].setAttribute('data-sort-method', 'default'); // Type table Header
}

function addSortValue(trs, api) {
  [].forEach.call(trs, function(tr) {
    var tds = tr.getElementsByTagName('td');
    formatNameField(tds[0], tds[3], api);
    formatSizeField(tds[1]);
    formatDateField(tds[2]);
    tr.deleteCell(3); // Remove Type columns
  });
}

function formatNameField(tdName, tdType, baseUrl) {
   var name = tdName.innerHTML;
   var type = tdType.innerHTML;
   tdName.setAttribute('data-sort', name); // Value used to sort
   if (type == "directory") {
     tdName.innerHTML = directoryfy(baseUrl, name);
   } else {
     tdName.innerHTML = linkify(baseUrl, name);
   }
}

function formatSizeField(tdSize) {
  var size = tdSize.innerHTML;
  tdSize.setAttribute('data-sort', (size == '-') ? '-' : size); // Value used to sort
  tdSize.innerHTML = (size == '-') ? '-' : humanFileSize(parseInt(size), false);
}

function formatDateField(tdDate) {
  var date = new Date(tdDate.innerHTML);
  tdDate.setAttribute('data-sort', date.toISOString()); // Value used to sort
  var d = date;
  tdDate.innerHTML = [d.getHours().padLeft(),
                      d.getMinutes().padLeft(),
                      d.getSeconds().padLeft()].join(':') +
                      ' ' +
                      [d.getDate().padLeft(),
                      (d.getMonth() + 1).padLeft(),
                      d.getFullYear()].join('/');
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
