
function auth_html() {
    return `
  <div class="grid__col grid__col--6-of-12 grid__col--centered">
    <div class="login-form">
        <input class="username" name="username" type="text" placeholder="User Name">
        <input class="password" name="password" type="password" placeholder="Password">
        <input type="button" value="Sign In" onclick="auth_sign_in(event);" />
    </div>
  </div>
   `;
}

var g_authorization_header = localStorage.getItem('authorization_header');

function auth_field_enter_key(ev, cb) {
    if (e.keycode == 13) {
        auth_sign_in()
    }

}

function auth_sign_in(ev) {
    var password_el = ev.target.previousElementSibling;
    var user_el = password_el.previousElementSibling;
    var user = user_el.value;
    var password = password_el.value;
    g_authorization_header = 'Basic ' + window.btoa(user + ":" + password);
    localStorage.setItem('authorization_header', g_authorization_header);
    // Call setups again
    setup_files();
    setup_upload();
}

function auth_logout() {
    g_authorization_header = null;
    localStorage.setItem('authorization_header', null);
}
