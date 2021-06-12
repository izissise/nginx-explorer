var filesapp;

window.onpopstate = function(event) { // Restore wanted state
  fileApp(event.state.location);
};

window.onload = function() {
  filesapp = document.getElementById("filesapp");
  history.replaceState({'location': filesapp.dataset.api}, 'Files Listing', window.location.href);

  var url = window.location.href;
  var path = "";
  var posSlash = url.indexOf('/', "https://".length + 2);
  if ((posSlash !== -1) && ((posSlash + 1) != url.length)) {
    path = url.substring(posSlash + 1) + '/';
  }
  fileApp(filesapp.dataset.api + path);
};

function historyFileApp(api) {
  var state = {'location': api};
  var title = 'Files Listing';
  var url = window.location.href;

  var path = "";
  var base_url = url;
  // Set the correct path in the url bar
  if (api != filesapp.dataset.api) { // If it's not the base path
    path = '/' + api.replace(filesapp.dataset.api, "").replace(/\/$/, "");
  }
  var posSlash = url.indexOf('/', "https://".length + 2);
  if (posSlash !== -1) {
    base_url = url.substring(0, posSlash);
  }
  window.history.pushState(state, title, base_url + path); // Push new page in history
  fileApp(api);
}

function fileApp(api) {
  var fadingOut = fadeOut(filesapp, 150);

  get(api).then(function(rawData) { // Request
    return JSON.parse(rawData);
  }).then(function(data) {
    if (data.length <= 0) {
      filesapp.innerHTML = '<h3 style="center;">The directory is empty</h3>';
      fadeIn(filesapp, 150);
    } else {
      orderField(data); // Order field to name/Size/Date
      var dataTable = ConvertJsonToTable(data, null, null, null);

      var dataTableHtml = document.createElement('div'); // Create div container for the table
      dataTableHtml.innerHTML = dataTable;

      addSortInfo(dataTableHtml.getElementsByTagName('th')); // Add Header sort info
      // Format data for both sorting and pretty printing
      addSortValue(dataTableHtml.getElementsByTagName('tbody')[0].getElementsByTagName('tr'), api);
      dataTableHtml.getElementsByTagName('thead')[0].getElementsByTagName('tr')[0].deleteCell(3); // Remove Type columns

      var sortedTable = new Tablesort(dataTableHtml.getElementsByTagName('table')[0]);

      fadingOut.then(function(el) {
        filesapp.innerHTML = '';
        filesapp.appendChild(dataTableHtml);
        return fadeIn(filesapp, 150);
      });
    }
  }, function(err) {
    console.error(err);
    filesapp.innerHTML = '<h3 style="center;">An error occured</h3>';
    fadeIn(filesapp, 150);
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
  th[2].className += 'data-sort-default'; // Default sort to date
  th[3].setAttribute('data-sort-method', 'default'); // Type table Header
}

function addSortValue(trs, api) {
  var now = new Date();
  [].forEach.call(trs, function(tr) {
    var tds = tr.getElementsByTagName('td');
    formatNameField(tds[0], tds[3], api);
    formatSizeField(tds[1]);
    formatDateField(tds[2], now);
    tr.deleteCell(3); // Remove Type columns
  });
}

function formatNameField(tdName, tdType, baseUrl) {
   var name = tdName.innerHTML;
   var type = tdType.innerHTML;
   name = escape(name);
   console.log(name);
   name = name.replace(/\%C3\%u201A/g, 'Â');
   name = name.replace(/\%C3\%u20AC/g, 'À');
   name = name.replace(/\%C3\%u2021/g, 'Ç');
   try {
    name = decodeURIComponent(name);
   } catch (e) {}
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

function formatDateField(tdDate, now) {
  var d = new Date(tdDate.innerHTML);
  tdDate.setAttribute('data-sort', d.toISOString()); // Value used to sort
  if ((now.getTime() - d.getTime()) > (1000*60*60*24*2)) { // more than 2days
    tdDate.innerHTML = [d.getHours().padLeft(),
                    d.getMinutes().padLeft(),
                    d.getSeconds().padLeft()].join(':') +
                    ' ' +
                    [d.getDate().padLeft(),
                    (d.getMonth() + 1).padLeft(),
                    d.getFullYear()].join('/');
  } else if ((now.getTime() - d.getTime()) > -(1000*60*60*12)) {
    if ((now.getTime() - d.getTime()) < (1000*60)) { // Less than 60seconds
      var seconds = Math.round((now.getTime() - d.getTime()) / (1000));
      var secondsStr = (seconds == 1) ? "second" : "seconds";
      tdDate.innerHTML = [seconds.toString(), secondsStr, "ago"].join(" ");
    } else if ((now.getTime() - d.getTime()) < (1000*60*60)) { // Less than 60minutes
      var minutes = Math.round((now.getTime() - d.getTime()) / (1000*60));
      var minutesStr = (minutes == 1) ? "minute" : "minutes";
      tdDate.innerHTML = [minutes.toString(), minutesStr, "ago"].join(" ");
    } else if ((now.getTime() - d.getTime()) < (1000*60*60*24)) { // Less than 24hours
      var hours = Math.round((now.getTime() - d.getTime()) / (1000*60*60));
      var hoursStr = (hours == 1) ? "hour" : "hours";
      tdDate.innerHTML = [hours.toString(), hoursStr, "ago"].join(" ");
    } else { // More than one day
      tdDate.innerHTML = "Yesterday" + ' ' + [d.getHours().padLeft(),
                                              d.getMinutes().padLeft(),
                                              d.getSeconds().padLeft()].join(':');
    }
  } else { // We are too far in the future don't display
      tdDate.innerHTML = '-';
  }
}

function directoryfy(base, data) {
  return ['<a href="javascript:void(0)" onclick=\'historyFileApp("',
          escapeHtml(base), escapeHtml(data), '/")\'>',
          iconFor(data, true), data, '</a>'
  ].join("");
}

function linkify(base, data) {
  var name = escapeHtml(data);
  return ['<a href="', escapeHtml(base), name, '" download="', name, '">',
         iconFor(data, false), data, '</a>'
  ].join("");
}
