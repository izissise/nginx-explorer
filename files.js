window.onload = function() {
  var config = document.getElementById("files-app");

  loadJSON(config.dataset.api,
    function(data) {
    console.log(data);
    },
    function(err) { console.error(err); })
}

function loadJSON(path, success, error)
{
    var request = new XMLHttpRequest();
    request.onreadystatechange = function()
    {
        if (request.readyState === XMLHttpRequest.DONE) {
          if (request.status >= 200 && request.status < 400) {
                if (success)
                    success(JSON.parse(request.responseText));
            } else {
                if (error)
                    error(request);
            }
        }
    };
    request.open("GET", path, true);
    request.send();
}
