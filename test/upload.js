// this test suite expect to have access to the upload endpoint and directory
//
// The tests are in upload_tests(), called once main.js is loaded: in a browser
// by the bootstrap at the end of this file (qunit.html, main.js from the
// server, the `upload` module runs against the real upload endpoint), without
// a browser by test/qunit.bats (node, no server: that module is skipped).

var g_this_script = 'inside_test';

function upload_tests(can_test_upload, upload_uri) {
    // up_meta_info() reads the uploader name from the script tag, give it one
    // once every test file has loaded main.js (the app must not start)
    QUnit.begin(() => { g_this_script = { attributes: { user: { value: 'qunit' } } }; });

    var ui = () => el('span', {}, [
        el('progress', { max: 100, value: 0 }),
        el('span', { innerText: '◌' }),
    ]);

    // No server needed: the upload function is replaced by one that records
    // the bodies that would have been POSTed.
    QUnit.module('upload_chunking', function() {
        // upload-max-size reaches the client as a script tag attribute: a string
        var tst_chunks = (assert, data, chsz, expected_sizes) => {
            var bodies = [];
            var fake_upload = (url, body, progress, cb_data) => Promise.resolve([{ responseText: String(bodies.push(body)) }, cb_data]);
            return upload_ngxp_file(new File([data], 'big', { type: 'text' }), ui(), fake_upload, '/nowhere/', chsz).then(() => {
                var chunks = bodies.slice(0, -1); // last one is the meta file
                var meta = JSON.parse(bodies[bodies.length - 1].split('\n').filter((l) => !l.startsWith('#')).join(''));
                assert.deepEqual(chunks.map((c) => c.size), expected_sizes, 'chunk sizes');
                assert.equal(meta.chunk_cnt, expected_sizes.length, 'meta chunk_cnt');
                assert.equal(meta.chunk_fileno.length, expected_sizes.length, 'meta chunk_fileno');
                assert.equal(typeof meta.chunk_size, 'number', 'meta chunk_size is a number');
                assert.equal(typeof meta.chunk_last_size, 'number', 'meta chunk_last_size is a number');
                return Promise.all(chunks.map((c) => c.text()));
            }).then((parts) => assert.equal(parts.join(''), data, 'chunks reassemble into the file'));
        };
        QUnit.test('one piece when smaller than upload-max-size', (assert) => tst_chunks(assert, 'x'.repeat(1000), '2000', [1000]));
        QUnit.test('2 chunks', (assert) => tst_chunks(assert, 'x'.repeat(1000), '600', [600, 400]));
        QUnit.test('4 chunks, none bigger than upload-max-size, none empty', (assert) => tst_chunks(assert, 'x'.repeat(1000), '300', [300, 300, 300, 100]));
        QUnit.test('exact multiple of upload-max-size', (assert) => tst_chunks(assert, 'x'.repeat(900), '300', [300, 300, 300]));
        QUnit.test('many chunks', (assert) => tst_chunks(assert, 'x'.repeat(10007), '1000', [1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 7]));
        QUnit.test('empty file', (assert) => tst_chunks(assert, '', '300', [0]));
        QUnit.test('upload-max-size 0 disables chunking', (assert) => tst_chunks(assert, 'x'.repeat(1000), '0', [1000]));
        QUnit.test('upload-max-size as a number', (assert) => tst_chunks(assert, 'x'.repeat(1000), 300, [300, 300, 300, 100]));

        // adversarial: a hand edited html header, or a server that misbehaves
        QUnit.test('upload-max-size that is not a number disables chunking', (assert) => Promise.all([
            tst_chunks(assert, 'x'.repeat(1000), 'abc', [1000]),
            tst_chunks(assert, 'x'.repeat(1000), '', [1000]),
            tst_chunks(assert, 'x'.repeat(1000), '-1', [1000]),
        ]));
        QUnit.test('upload-max-size with spaces or in scientific notation is still a size', (assert) => Promise.all([
            tst_chunks(assert, 'x'.repeat(1000), ' 300 ', [300, 300, 300, 100]),
            tst_chunks(assert, 'x'.repeat(1001), '1e3', [1000, 1]),
        ]));
        QUnit.test('upload-max-size of 1 byte', (assert) => tst_chunks(assert, 'xyzab', '1', [1, 1, 1, 1, 1]));

        // the fake server refuses the nth POST, or answers everything with `reply`
        var tst_server = (assert, chsz, fail_at, reply) => {
            var bodies = [];
            var sp = ui();
            var fake_upload = (url, body, progress, cb_data) => {
                bodies.push(body);
                if (bodies.length - 1 === fail_at) { return Promise.reject([{ status: 413, responseText: 'Request Entity Too Large' }, cb_data]); }
                return Promise.resolve([{ status: 201, responseText: (reply === undefined) ? String(bodies.length) : reply }, cb_data]);
            };
            return upload_ngxp_file(new File(['x'.repeat(1000)], 'big', { type: 'text' }), sp, fake_upload, '/nowhere/', chsz).then(() => {
                assert.equal(sp.children[1].innerText, '❌', 'shown as failed');
                assert.notOk(bodies.some((b) => typeof b === 'string'), 'no meta file sent');
                return bodies.length;
            });
        };
        QUnit.test('stops at the first chunk the server refuses', (assert) => tst_server(assert, '300', 1).then((n) => assert.equal(n, 2, 'POSTs sent')));
        QUnit.test('a refused meta file shows the upload as failed', (assert) => {
            var bodies = [];
            var sp = ui();
            var fake_upload = (url, body, progress, cb_data) => (typeof body === 'string')
                ? Promise.reject([{ status: 413, responseText: 'Request Entity Too Large' }, cb_data])
                : Promise.resolve([{ status: 201, responseText: String(bodies.push(body)) }, cb_data]);
            return upload_ngxp_file(new File(['x'.repeat(1000)], 'big', { type: 'text' }), sp, fake_upload, '/nowhere/', '300').then(() => {
                assert.equal(sp.children[1].innerText, '❌', 'shown as failed');
                assert.equal(bodies.length, 4, 'all chunks sent');
            });
        });
        QUnit.test('a server that does not answer with file numbers fails the upload', (assert) => Promise.all([
            tst_server(assert, '300', -1, '<html>Welcome to the captive portal</html>'),
            tst_server(assert, '300', -1, ''),
        ]).then((ns) => assert.deepEqual(ns, [1, 1], 'POSTs sent')));
    });

    QUnit.module.if('upload', can_test_upload, function() {
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
            var tst_up = (file, chsz) => upload_ngxp_file(file, ui(), upload_raw, upload_uri, chsz)
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
                    var max = Number(chsz);
                    assert.equal(fileinfo.chunk_fileno.length, max > 0 && file.size > max ? Math.ceil(file.size / max) : 1, 'chunk count');
                    return Promise.all([file.text(), Promise.all(
                        fileinfo.chunk_fileno.map((fn) => fetch('/uploads/' + fn).then((p) => {
                            assert.ok(p.ok);
                            return p.text();
                        }).then((d) => {
                            assert.ok(max == 0 || d.length <= max, 'chunk ' + fn + ' not bigger than ' + max);
                            return d;
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
                // same with upload-max-size as the string it really is in the app
                tst_up(new File(["afjkewll wjefoiwnocewipe pwefpdwqfwqjf  p wqpfkwfep wfewqfwfeewlkfwlekflwkemfwle"], "test6", { type: 'text' }), '3'),
                tst_up(new File(["afjkewll wjefoiwnocewipe pwefpdwqfwqjf  p wqpfkwfep wfewqfwfe"], "test7", { type: 'text' }), '20'),
                tst_up(new File(["rkljlkjljlj"], "test8", { type: 'text' }), '1'),
            ]);
        });
    });
}

if (typeof window !== 'undefined') {
    // browser: main.js is next to this file, the upload endpoint is in the html header
    window.dyn_scripts[document.currentScript.src] = dynamic_script_load([base + 'main.js'])
    .then(() => {
        return ngxp_html_header().then((head) => {
            const rea = new RegExp(" accesses=.*(/uploads).* ");
            const reu = new RegExp(" upload=.([^\\s]*). ");
            return [rea.test(head), head.match(reu)[1]];
        });
    })
    .then(([can_test_upload, upload_uri]) => upload_tests(can_test_upload, upload_uri));
}
