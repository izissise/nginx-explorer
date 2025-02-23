var g_this_script = 'inside_test';
window.dyn_scripts[document.currentScript.src] = dynamic_script_load([base + 'main.js']).then(() => QUnit.module('table', function() {
    QUnit.test('create', function(assert) {
            var t = table(["A", "B"], [
                el('tr', {}, [el('td', { innerText: "1" }), el('td', { innerText: "2" })]),
                el('tr', {}, [el('td', { innerText: "3" }), el('td', { innerText: "4" })]),
            ]);
            assert.equal(2, t.childElementCount); // thead and tbody
            var thead = t.childNodes[0];
            assert.equal(thead.childNodes[0].innerText, "A");
            assert.equal(thead.childNodes[1].innerText, "B");
            var tbody = t.childNodes[1];
            assert.equal(tbody.childNodes[0].childNodes[0].innerText, "1");
            assert.equal(tbody.childNodes[0].childNodes[1].innerText, "2");
            assert.equal(tbody.childNodes[1].childNodes[0].innerText, "3");
            assert.equal(tbody.childNodes[1].childNodes[1].innerText, "4");
    });

    QUnit.test('insert_accesses', function(assert) {
            var a = insert_accesses(["/"], "/");
            assert.equal(a, true);
            var a = insert_accesses(["/aaaa"], "/aaaa");
            assert.equal(a, true);
            var a = insert_accesses(["/aaa", "/kl"], "/aaa");
            assert.equal(a, true);
            var a = insert_accesses(["/___ngxp/upload"], "/");
            assert.equal(false, a);
            var a = insert_accesses([""], "/");
            assert.equal(false, a);
            var a = insert_accesses(["/___ngxp/asd", "/___ngxp/upload"], "/");
            assert.equal(false, a);
            var a = insert_accesses([], "/");
            assert.equal(false, a);
            var a = insert_accesses(["/a", "/b/c"], "/");
            assert.equal('/a\n/b/c\n', a.innerText);
    });
}));
