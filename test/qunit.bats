#!/usr/bin/env bats
bats_require_minimum_version 1.5.0

# The QUnit tests of test/qunit.html run against main.js without a browser, in
# a node container: a sandbox with just enough of a page for main.js to load
# and to build its ui, where each test file (test/<name>.js) is run and its
# <name>_tests() called like qunit.html does. There is no server, so the
# `upload` module (real uploads) is skipped. QUnit itself is the one
# qunit.html loads, downloaded once next to bats.

driver=docker
if command -v podman &>/dev/null; then
    driver=podman
fi

setup_file() {
    export TEST_DIR ROOT_DIR QUNIT_JS QUNIT_TESTS
    TEST_DIR=$( cd "${BATS_TEST_FILENAME%/*}" >/dev/null 2>&1 && pwd )
    ROOT_DIR=${TEST_DIR}/../
    local qunit_url
    qunit_url=$(grep -o 'https://code.jquery.com/qunit/qunit-[0-9.]*\.js' "${TEST_DIR}/qunit.html")
    QUNIT_JS=${TEST_DIR}/bats/${qunit_url##*/}
    if [ ! -f "$QUNIT_JS" ]; then
        curl -f -s -L "$qunit_url" -o "$QUNIT_JS"
    fi
    QUNIT_TESTS=$(grep -o "'[a-z_]*\.js'" "${TEST_DIR}/qunit.html" | tr -d "'" | tr '\n' ' ') # the `tests` list of qunit.html
}

setup() {
    load 'bats/bats-support/load'
    load 'bats/bats-assert/load'
}

qunit() { # test files...
    local t mounts=()
    for t in "$@"; do
        mounts+=(-v "${TEST_DIR}/${t}:/ngxp/test/${t}:ro")
    done
    "$driver" run --rm -i \
        --user="$(id -u):$(id -g)" \
        --userns=keep-id --cap-drop=ALL \
        -v "${ROOT_DIR}/main.js:/ngxp/main.js:ro" \
        -v "${QUNIT_JS}:/ngxp/qunit.js:ro" \
        "${mounts[@]}" \
        node:alpine node - "$@" <<'JS'
const vm = require('vm');
const fs = require('fs');
const QUnit = require('/ngxp/qunit.js');
// the DOM main.js uses to build what the tests look at: el(), children, innerText
class Node {
    constructor(tag) { this.tagName = tag; this.childNodes = []; this.dataset = {}; this.text = ''; }
    appendChild(c) { this.childNodes.push(c); return c; }
    setAttribute(k, v) { this[k] = v; }
    get children() { return this.childNodes.filter((c) => c instanceof Node); }
    get childElementCount() { return this.children.length; }
    get innerText() { return this.text + this.childNodes.map((c) => c.innerText).join(''); }
    set innerText(t) { this.text = t; }
}
const page = {
    QUnit, File, Blob,
    console: { log() {}, error() {}, warn() {}, info() {} },
    document: { createElement: (tag) => new Node(tag), createTextNode: (t) => ({ innerText: t }) },
};
vm.createContext(page);
const tests = process.argv.slice(2);
// same order as in a browser: the test files first (g_this_script = 'inside_test' keeps the app from starting), then main.js
for (const f of [...tests.map((t) => '/ngxp/test/' + t), '/ngxp/main.js']) {
    vm.runInContext(fs.readFileSync(f, 'utf8'), page, { filename: f });
}
for (const t of tests) { page[t.replace(/\.js$/, '') + '_tests'](); }
QUnit.config.autostart = false;
QUnit.reporters.tap.init(QUnit);
QUnit.done((d) => { process.exitCode = d.failed ? 1 : 0; });
QUnit.start();
JS
}

@test "qunit: main.js passes the QUnit tests of test/qunit.html in node" {
    # shellcheck disable=SC2086 # the list of test files
    run qunit $QUNIT_TESTS
    assert_success
    assert_line --regexp '^# pass [1-9]'
    assert_line '# fail 0'
    refute_line --partial 'not ok'
}
