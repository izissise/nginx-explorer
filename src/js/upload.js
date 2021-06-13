
onWindowLoad(function() {
    // First check that upload is available for this session


    document.querySelector("#fileUpload").addEventListener('change', function(ev) {
        console.log(ev);
        var filename = "" + ev.target.value;
        filename = filename.replace("C:\\fakepath\\", "");
        console.log(filename);
        if (/^\s*$/.test(filename)) {
            document.querySelector(".file-upload").classList.remove('active');
        } else {
            document.querySelector(".file-upload").classList.add('active');
        }
        document.querySelector("#fileName").innerHTML = filename;
    });

});
