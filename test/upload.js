// this test suite expect to have access to the upload endpoint and directory

var g_this_script = 'inside_test';
window.dyn_scripts[document.currentScript.src] = dynamic_script_load([base + 'main.js'])
.then(() => {
    return ngxp_html_header().then((head) => {
        const rea = new RegExp(" accesses=.*(/uploads).* ");
        const reu = new RegExp(" upload=.([^\\s]*). ");
        return [rea.test(head), head.match(reu)[1]];
    });
})
.then(([can_test_upload, upload_uri]) => QUnit.module.if('upload', can_test_upload, function() {
    QUnit.test('basic', function(assert) {
        var file = new File(["testdata1"], "test1", { type: 'text' });;
        return upload_raw(upload_uri, file, () => {}, []).then(([xhr, _]) => {
            return fetch('/uploads/' + xhr.responseText);
        }).then((r) => {
            assert.ok(r.ok);
            return r.text();
        }).then((d) => assert.equal("testdata1", d));
    });
    QUnit.test('nxgp_files', function(assert) {
        var meta_magick = '#ngxpupload_meta';
        var ui = el('span', {}, [
            el('progress', { max: 100, value: 0 }),
            el('span', { innerText: '◌' }),
        ]);
        var tst_up = (file, chsz) => upload_ngxp_file(file, ui, upload_raw, upload_uri, chsz)
            .then((id) => fetch('/uploads/' + id))
            .then((r) => {
                assert.ok(r.ok);
                return r.text();
            }).then((d) => {
                assert.equal('#ngxpupload_meta', d.substring(0, meta_magick.length));
                var j = d.split('\n').filter((l) => !l.startsWith('#')).join('');
                var fileinfo = JSON.parse(j);
                assert.equal(file.size, fileinfo.size);
                assert.equal(file.type, fileinfo.type);
                assert.equal(file.name, fileinfo.name);
                assert.ok(fileinfo.chunk_fileno.length > 0);
                return Promise.all([file.text(), Promise.all(
                    fileinfo.chunk_fileno.map((fn) => fetch('/uploads/' + fn).then((p) => {
                        assert.ok(p.ok);
                        return p.text();
                    }))
                ).then((ds) => ds.join(''))]);
            }).then(([e, a]) => {
                assert.equal(a, e);
        });

        return Promise.all([
            tst_up(new File(["afjkewll wjefoiwnocewipe pwefpdwqfwqjf  p wqpfkwfep wfewqfwfeewlkfwlekflwkemfwle"], "test1", { type: 'text' }), 3),
            tst_up(new File(["afjkewll wjefoiwnocewipe pwefpdwqfwqjf  p wqpfkwfep wfewqfwfe"], "test2", { type: 'text' }), 5),
            tst_up(new File(["afjkewll wjefoiwnocewipe pwefpdwqfwqjf  p wqpfkwfep wfewqfwfe"], "test3", { type: 'text' }), 100),
            tst_up(new File([""], "test4", { type: 'text' }), 100),
            tst_up(new File(["r"], "test5", { type: 'text' }), 100),
            tst_up(new File(["rkljlkjljlj"], "test5", { type: 'text' }), 1),
        ]);
    });
}));
