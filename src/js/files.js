window.onload = function() {
  var config = document.getElementById("filesapp");

  loadJSON(config.dataset.api,
    function(data) {
      var dataTable = ConvertJsonToTable(data, 'dataTable', null, 'Download');
      config.innerHTML = dataTable;
      new Tablesort(document.getElementById("dataTable"));
    },
    function(err) { console.error(err); });
};
