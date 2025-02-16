
dynamic_script_load([base + 'main.js']).then(() => {

QUnit.module('table', function() {
    QUnit.test('create', function(assert) {
            var table = create_table(["A", "B"], [
                el('tr', {}, [el('td', { innerText: "1" }), el('td', { innerText: "2" })]),
                el('tr', {}, [el('td', { innerText: "3" }), el('td', { innerText: "4" })]),
            ]);
            console.log(table);
            assert.equal(2, table.childElementCount); // thead and tbody
            var thead = table.childNodes[0];
            assert.equal(thead.childNodes[0].innerText, "A");
            assert.equal(thead.childNodes[1].innerText, "B");
            var tbody = table.childNodes[1];
            assert.equal(tbody.childNodes[0].childNodes[0].innerText, "1");
            assert.equal(tbody.childNodes[0].childNodes[1].innerText, "2");
            assert.equal(tbody.childNodes[1].childNodes[0].innerText, "3");
            assert.equal(tbody.childNodes[1].childNodes[1].innerText, "4");
    });
});

});
