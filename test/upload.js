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
}));
