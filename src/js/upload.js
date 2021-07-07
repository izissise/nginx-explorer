
onWindowLoad(setup_upload);

function setup_upload() {
    // Feature detection for required features
    if (!(!!((typeof(File) !== 'undefined') && (typeof(Blob) !== 'undefined') && (typeof(FileList) !== 'undefined') && (Blob.prototype.webkitSlice|| Blob.prototype.mozSlice || Blob.prototype.slice)))) {
        console.error('Browser does not support chunked uploading');
        return;
    }

    var upload_app = document.querySelector('#uploadapp');
    var upload_endpoint = upload_app.dataset.api;

    // First check that upload is authorized for this session
    server_upload_capa(upload_endpoint).then(function(upload_func) {
        if (upload_func === null) {
            document.querySelector('.file-upload').classList.add("hide");
            return;
        }
        // Server support upload
        upload_activate_ui(upload_endpoint, upload_func);
    })
}

function upload_activate_ui(upload_endpoint, upload_func) {
    // Unhide
    document.querySelector('.file-upload').classList.remove("hide");

    // File upload # TODO support multiple upload
    document.querySelector('#upload-button').addEventListener('click', function() {
        var file = document.querySelector('#file-to-upload').files[0];
        document.querySelector('#upload-indicator').classList.remove("hide");
        if (file === undefined) { return; }
        //generate random long number for SessionID
        var sessionID = Math.round(Math.pow(10,17)*Math.random());

        if (!upload_func) {
            console.error("Handle upload func is null");
            return;
        }
        var upload = upload_func(upload_endpoint, '', sessionID, file, function(progress) {
            console.log('Total file progress is ' + Math.floor(progress * 100) + '%');
        }, function(responseText) {
            console.log('Success - server responded with:', responseText);
            document.querySelector('#upload-indicator').classList.add("hide");
        }, function(errorText) {
            console.error('A server error occurred: ' + errorText); // Could retry at this stage depending on xhr.status
            document.querySelector('#upload-indicator').classList.add("hide");
        });

    }, false);


    // Filename label on change
    var uploads = document.querySelectorAll('.file-upload');
    Array.prototype.forEach.call(uploads, function(upload) {
        var label = upload.querySelector('label');
        var labelVal = label.innerHTML;
        var input = upload.querySelector('input');
        input.addEventListener('change', function(e) {
            var fileName = '';
            if (this.files && this.files.length > 1)
                fileName = (this.getAttribute( 'data-multiple-caption') || '' ).replace('{count}', this.files.length);
            else
                fileName = e.target.value.split( '\\' ).pop();

            if (fileName)
                label.innerHTML = fileName;
            else
                label.innerHTML = labelVal;
        });
    });
}

function server_upload_capa(endpoint) {
    return get(endpoint).then(function (response) {
        // 200 <= status < 400

        // If it returns contents there probably a filename collision with the endpoint
        if (response.text().length == 0) {
            return doUploadRaw;
        }
    }, function (response) {
        if (response.status == 200) {
        } else if (response.status == 411) {
            return doUploadChunked;
        } else if (response.status == 404) {
            console.info("Server doesn't support upload");
        } else if (response.status == 403) {
            console.warn("Upload need auth");
        } else {
            console.error(response);
        }
        return null;
    });
}

function doUploadRaw(url, extraParams, sessionID, file, progress, success, error) {
    aborting = false;

    xhr = new XMLHttpRequest();
    if (extraParams) {
        xhr.open('POST', url + (url.indexOf('?') > -1 ? '&' : '?') + extraParams, true);
    } else {
        xhr.open('POST', url, true);
    }
    if (g_authorization_header !== undefined) {
        xhr.setRequestHeader('Authorization', g_authorization_header);
    }
    xhr.setRequestHeader('Content-Type', 'application/octet-stream');
    xhr.setRequestHeader('Content-Disposition', 'attachment; filename="' + encodeURIComponent(file.name) + '"');
    xhr.setRequestHeader('X-Content-Range', 'bytes ' + 0 + '-' + (file.size - 1) + '/' + file.size);
    xhr.setRequestHeader('X-Session-ID', sessionID);
    xhr.upload.addEventListener('progress', function(e) {
        if (aborting) {
            return;
        }

        progress(e.loaded / file.size);
    });
    xhr.addEventListener('load', function() {
        if (aborting) {
            return;
        }

        if (xhr.readyState >= 4) {
            if (xhr.status >= 200 && xhr.status <= 299) {
                progress(1);

                // done
                success(xhr.responseText);
            } else {
                try {
                    xhr.abort();
                } catch (err) {}
                error(xhr.responseText);
            }
        }
    });

    xhr.addEventListener('error', function() {
        if (aborting) {
            return;
        }

        try {
            xhr.abort();
        } catch (err) {}
        error(xhr.responseText);
    });
    xhr.send(file);
    return {
        abort: function() {
            aborting = true;
            try {
                xhr.abort();
            } catch (err) {}
        },
        pause: function() {
            aborting = true;
            this.abort();
        },
        resume: function() {
            xhr.send(file);
        }
    };
}




function doUploadChunked(url, extraParams, sessionID, file, progress, success, error) {
    var chunkSize = 32000,// this is first chunk size, which will be adaptively expanded depending on upload speed
        aborting = false,
        TO = null,
        lastChecksum = null,
        offset = 0,
        lastChunkTime = 4000; //used for adaptive chunk size recalculation
    var xhr;

    function adjustChunkSize(startTime) {
        var end = new Date().getTime();
        var duration = end - startTime;
        var kbps = Math.round(chunkSize / duration);
        if (duration < 2000 && chunkSize < 8 * 1024 * 1024) {
            //faster, increase chunk size up to 8MB, there will be no more increases over 4MB/s
            // Important: remember about client_max_body_size in nginx config if you alter max chunk size
            chunkSize <<= 1;
            console.log("Increase chunkSize="+chunkSize+", kbps="+kbps);
        } else if (duration > 10000 && chunkSize > 32 * 1024) {
            //slower, down to min 32KB chunk size, there will be no more decreases below ~3.2KB/s
            chunkSize >>= 1;
            console.log("Increase chunkSize="+chunkSize+", kbps="+kbps);

        }
    }

    var uploadNextChunk = function() {
            TO = null;
            var chunkStartTime = new Date().getTime();

            var chunkStart = offset,
                chunkEnd = Math.min(offset + chunkSize, file.size) - 1;

            var currentBlob = (file.slice || file.mozSlice || file.webkitSlice).call(file, chunkStart, chunkEnd + 1);

            if (!(currentBlob && currentBlob.size > 0)) {
                console.warn('Chunk size is 0'); // Sometimes the browser reports an empty chunk when it shouldn't, could retry here
                return;
            }


            xhr = new XMLHttpRequest();

            if (chunkEnd === file.size - 1) {
                // Add extra URL params on the last chunk
                // Important: URL parameters passing this doesn't work currently, pass parameters via some custom "X-" header instead
                xhr.open('POST', url + (url.indexOf('?') > -1 ? '&' : '?') + extraParams, true);
            } else {
                xhr.open('POST', url, true);
            }

            // chunking gives usually ~2sec progress you can skip this handler
            xhr.upload.addEventListener('progress', function(e) {
                if (aborting) {
                    return;
                }

                progress((chunkStart + e.loaded) / file.size);
            });

            xhr.addEventListener('load', function() {
                if (aborting) {
                    return;
                }

                if (xhr.readyState >= 4) {
                    if (xhr.status === 200) {
                        progress((chunkEnd + 1) / file.size);

                        // done
                        success(xhr.responseText);

                    } else if (xhr.status === 201) {
                        offset = chunkEnd + 1;
                        progress(offset / file.size);
                        adjustChunkSize(chunkStartTime);

                        //the checksum of data uploaded so far
                        lastChecksum = xhr.getResponseHeader('X-Checksum');
                        TO = setTimeout(uploadNextChunk, 1); // attempt to avoid xhrs sticking around longer than needed
                    } else {
                        // error, restart chunk
                        try {
                            xhr.abort();
                        } catch (err) {}
                        error(xhr.responseText);
                    }
                }
            });

            xhr.addEventListener('error', function() {
                if (aborting) {
                    return;
                }

                // error, restart chunk

                try {
                    xhr.abort();
                } catch (err) {}
                error(xhr.responseText);
            });

            if (g_authorization_header !== undefined) {
                xhr.setRequestHeader('Authorization', g_authorization_header);
            }
            xhr.setRequestHeader('Content-Type', 'application/octet-stream');
            xhr.setRequestHeader('Content-Disposition', 'attachment; filename="' + encodeURIComponent(file.name) + '"');
            xhr.setRequestHeader('X-Content-Range', 'bytes ' + chunkStart + '-' + chunkEnd + '/' + file.size);
            xhr.setRequestHeader('X-Session-ID', sessionID);
            if(lastChecksum) {
                //client must pass the checksum of all previous chunks
                //this way server will continue checksum calculation
                xhr.setRequestHeader('X-Last-Checksum', lastChecksum);
            }
            xhr.send(currentBlob);
        };

    TO = setTimeout(uploadNextChunk, 1);


    return {
        abort: function() {
            aborting = true;
            if (TO !== null) {
                clearTimeout(TO);
                TO = null;
            }
            try {
                xhr.abort();
            } catch (err) {}
        },
        pause: function() {
            this.abort();
            aborting = false;
        },
        resume: function() {
            uploadNextChunk();
        }
    };
}
