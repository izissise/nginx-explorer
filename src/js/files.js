window.onload = function() {
  var config = document.getElementById("filesapp");

  loadJSON(config.dataset.api,
    function(data) {
      formatData(data);

      var dataTable = ConvertJsonToTable(data, 'dataTable', null, null);
      config.innerHTML = dataTable;
      new Tablesort(document.getElementById("dataTable"));
    },
    function(err) { console.error(err); });
};

Number.prototype.padLeft = function(base,chr){
    var  len = (String(base || 10).length - String(this).length)+1;
    return len > 0? new Array(len).join(chr || '0')+this : this;
}

function formatData(data) {

  //Transform as a link or directory
  data.forEach(function(e) {
   var name = e.name;
   var d = new Date(e.mtime);
   d = [d.getDate().padLeft(),
               (d.getMonth()+1).padLeft(),
               d.getFullYear()].join('/') +' ' +
              [d.getHours().padLeft(),
               d.getMinutes().padLeft(),
               d.getSeconds().padLeft()].join(':');
               var size = ""
               if (e.size != null) {
                 size = e.size
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
