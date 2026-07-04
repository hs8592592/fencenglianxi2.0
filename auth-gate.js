/* ============================================================
   haoteach 全站登录门槛 auth-gate.js  (v2 · 健壮版)
   用法:需要登录的页面 <body> 后加一行:
       <script src="auth-gate.js"></script>
   - 未登录 → 全屏弹出登录/注册,挡住内容,不可绕过
   - 已登录 → 右上角显示 "Hi 昵称 · 退出"
   - 所有网络请求带超时,绝不无限转圈
   - 与首页 index.html 使用同一个 Supabase 账号体系
   ============================================================ */
(function () {
  var SB_URL = 'https://pqwgottflvwbyhjipcgb.supabase.co';
  var SB_KEY = 'sb_publishable_kk5uEHy84Wx71bRPYMUfLQ_T4jI_8Ef';
  var TIMEOUT = 12000; // 12秒超时

  function withTimeout(p, ms) {
    return Promise.race([
      p,
      new Promise(function (_, rej) { setTimeout(function () { rej(new Error('timeout')); }, ms || TIMEOUT); })
    ]);
  }

  var css = "\
  #agOverlay{position:fixed;inset:0;z-index:2147483000;background:#FBF8F2;display:flex;align-items:center;justify-content:center;padding:20px;font-family:'Poppins','Noto Sans SC',system-ui,-apple-system,sans-serif}\
  #agOverlay.ag-hide{display:none}\
  #agOverlay *{box-sizing:border-box}\
  .ag-card{width:min(94vw,400px);background:#fff;border-radius:22px;box-shadow:0 18px 60px rgba(0,0,0,.16);padding:30px 28px 22px;text-align:center}\
  .ag-logo{width:54px;height:54px;border-radius:14px;object-fit:contain;margin-bottom:10px}\
  .ag-h{font-size:22px;font-weight:800;color:#1a3a2b;margin:0 0 4px}\
  .ag-sub{font-size:14px;color:#8a8578;margin:0 0 18px}\
  .ag-tabs{display:flex;background:#f0ece3;border-radius:12px;padding:4px;margin-bottom:16px}\
  .ag-tabs button{flex:1;border:none;background:none;padding:9px;border-radius:9px;font-size:14px;font-weight:700;color:#8a8578;cursor:pointer}\
  .ag-tabs button.on{background:#fff;color:#1a3a2b;box-shadow:0 2px 6px rgba(0,0,0,.08)}\
  .ag-field{text-align:left;margin-bottom:12px}\
  .ag-field label{display:block;font-size:12.5px;font-weight:600;color:#6b6659;margin-bottom:5px}\
  .ag-field input{width:100%;padding:11px 13px;border:1.5px solid #e3ddd0;border-radius:10px;font-size:15px;outline:none;font-family:inherit}\
  .ag-field input:focus{border-color:#43A047}\
  .ag-pw{position:relative}\
  .ag-pw input{padding-right:42px}\
  .ag-eye{position:absolute;right:9px;top:50%;transform:translateY(-50%);border:none;background:none;cursor:pointer;font-size:16px;opacity:.55;padding:4px;line-height:1}\
  .ag-err{font-size:13px;color:#c0392b;min-height:18px;margin-bottom:8px;line-height:1.35}\
  .ag-submit{width:100%;padding:13px;border:none;border-radius:11px;background:#1a3a2b;color:#fff;font-size:15px;font-weight:700;cursor:pointer}\
  .ag-submit:hover{background:#43A047}\
  .ag-submit:disabled{opacity:.6;cursor:default}\
  .ag-link{display:inline-block;margin-top:12px;font-size:13px;color:#43A047;text-decoration:none;cursor:pointer}\
  .ag-home{display:block;margin-top:14px;font-size:12.5px;color:#a89f8e;text-decoration:none}\
  .ag-home:hover{color:#6b6659}\
  .ag-note{font-size:11.5px;color:#b5ac9c;margin-top:12px;line-height:1.4}\
  #agGreet{position:fixed;top:12px;right:14px;z-index:2147482000;display:none;align-items:center;gap:9px;background:#fff;border-radius:22px;box-shadow:0 4px 16px rgba(0,0,0,.12);padding:7px 8px 7px 14px;font-family:'Poppins','Noto Sans SC',system-ui,sans-serif}\
  #agGreet .g-name{font-size:13.5px;font-weight:700;color:#1a3a2b;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}\
  #agGreet .g-out{border:none;background:#f0ece3;color:#6b6659;font-size:12.5px;font-weight:600;padding:6px 13px;border-radius:16px;cursor:pointer}\
  #agGreet .g-out:hover{background:#43A047;color:#fff}\
  ";

  function inject() {
    var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    var ov = document.createElement('div'); ov.id = 'agOverlay';
    ov.innerHTML =
      '<div class="ag-card">' +
      '<img class="ag-logo" src="hlogo.png" alt="logo" onerror="this.style.display=\'none\'">' +
      '<h2 class="ag-h" id="agTitle">\u6b22\u8fce\u56de\u6765 Welcome back</h2>' +
      '<p class="ag-sub" id="agSub">\u767b\u5f55\u4ee5\u7ee7\u7eed Sign in to continue</p>' +
      '<div class="ag-tabs"><button id="agTabIn" class="on" type="button">\u767b\u5f55 Sign in</button>' +
      '<button id="agTabUp" type="button">\u6ce8\u518c Sign up</button></div>' +
      '<div class="ag-field" id="agNameField" style="display:none"><label>\u6635\u79f0 Name</label>' +
      '<input type="text" id="agName" placeholder="\u4f60\u7684\u6635\u79f0 Your name"></div>' +
      '<div class="ag-field"><label>\u90ae\u7bb1 Email</label>' +
      '<input type="email" id="agEmail" placeholder="you@example.com" autocomplete="username"></div>' +
      '<div class="ag-field"><label>\u5bc6\u7801 Password</label>' +
      '<div class="ag-pw"><input type="password" id="agPass" placeholder="\u5bc6\u7801 Password" autocomplete="current-password"><button type="button" class="ag-eye" id="agEye" tabindex="-1">\ud83d\udc41</button></div></div>' +
      '<div class="ag-err" id="agErr"></div>' +
      '<button class="ag-submit" id="agSubmit" type="button">\u767b\u5f55 Sign in</button>' +
      '<a class="ag-link" id="agForgot">\u5fd8\u8bb0\u5bc6\u7801 Forgot password?</a>' +
      '<a class="ag-home" href="index.html">\u2190 \u8fd4\u56de\u9996\u9875 Back to home</a>' +
      '<p class="ag-note">\u7ee7\u7eed\u5373\u8868\u793a\u540c\u610f\u670d\u52a1\u6761\u6b3e\u4e0e\u9690\u79c1\u653f\u7b56\u3002<br>By continuing you agree to our Terms of Service and Privacy Policy.</p>' +
      '</div>';
    document.body.appendChild(ov);
    var gr = document.createElement('div'); gr.id = 'agGreet';
    gr.innerHTML = '<span class="g-name" id="agGName"></span><button class="g-out" id="agGOut" type="button">\u9000\u51fa Sign out</button>';
    document.body.appendChild(gr);
    return ov;
  }

  var ov, sb, tab = 'signin';
  function q(id) { return document.getElementById(id); }
  function nameOf(u) {
    if (!u) return '';
    var n = u.user_metadata && (u.user_metadata.name || u.user_metadata.full_name);
    return n || (u.email ? u.email.split('@')[0] : 'there');
  }
  function setTab(m) {
    tab = m;
    q('agTabIn').classList.toggle('on', m === 'signin');
    q('agTabUp').classList.toggle('on', m === 'signup');
    q('agNameField').style.display = m === 'signup' ? 'block' : 'none';
    q('agTitle').textContent = m === 'signup' ? '\u521b\u5efa\u8d26\u53f7 Create account' : '\u6b22\u8fce\u56de\u6765 Welcome back';
    q('agSub').textContent = m === 'signup' ? '\u6ce8\u518c\u4e00\u4e2a\u65b0\u8d26\u53f7 Sign up to get started' : '\u767b\u5f55\u4ee5\u7ee7\u7eed Sign in to continue';
    q('agSubmit').textContent = m === 'signup' ? '\u6ce8\u518c Sign up' : '\u767b\u5f55 Sign in';
    q('agErr').textContent = '';
  }
  function showGate() { document.documentElement.style.overflow = 'hidden'; if (ov) ov.classList.remove('ag-hide'); q('agGreet').style.display = 'none'; }
  function hideGate(u) {
    document.documentElement.style.overflow = '';
    if (ov) ov.classList.add('ag-hide');
    if (u) { q('agGName').textContent = 'Hi ' + nameOf(u); q('agGreet').style.display = 'flex'; }
  }

  async function submit() {
    var email = q('agEmail').value.trim(), pass = q('agPass').value, name = q('agName').value.trim();
    var err = q('agErr'); err.style.color = '#c0392b'; err.textContent = '';
    if (!email || !pass) { err.textContent = '\u8bf7\u8f93\u5165\u90ae\u7bb1\u548c\u5bc6\u7801 Enter email & password'; return; }
    var btn = q('agSubmit'); btn.disabled = true;
    var wasSignup = (tab === 'signup');
    btn.textContent = wasSignup ? '\u6ce8\u518c\u4e2d\u2026 Signing up\u2026' : '\u767b\u5f55\u4e2d\u2026 Signing in\u2026';
    try {
      if (wasSignup) {
        if (pass.length < 6) { err.textContent = '\u5bc6\u7801\u81f3\u5c116\u4f4d Password min 6 chars'; throw null; }
        var r = await withTimeout(sb.auth.signUp({ email: email, password: pass, options: { data: { name: name } } }));
        if (r.error) { err.textContent = r.error.message; throw null; }
        if (r.data && r.data.session) { hideGate(r.data.user); return; }
        err.style.color = '#1a6637';
        err.textContent = '\u2705 \u6ce8\u518c\u6210\u529f!\u8bf7\u53bb\u90ae\u7bb1\u786e\u8ba4\u540e\u767b\u5f55 Registered! Check your email, then sign in.';
        setTab('signin');
      } else {
        var r2 = await withTimeout(sb.auth.signInWithPassword({ email: email, password: pass }));
        if (r2.error) {
          err.textContent = /confirm|verif/i.test(r2.error.message)
            ? '\u8bf7\u5148\u53bb\u90ae\u7bb1\u786e\u8ba4 Please confirm your email first'
            : '\u90ae\u7bb1\u6216\u5bc6\u7801\u9519\u8bef Incorrect email or password';
          throw null;
        }
        hideGate(r2.data.user);
      }
    } catch (e) {
      if (e && e.message === 'timeout') err.textContent = '\u8bf7\u6c42\u8d85\u65f6,\u8bf7\u68c0\u67e5\u7f51\u7edc\u6216\u7a0d\u540e\u91cd\u8bd5 Request timed out — check your connection.';
      else if (e) err.textContent = '\u51fa\u9519,\u8bf7\u91cd\u8bd5 Something went wrong, try again.';
    }
    btn.disabled = false;
    btn.textContent = tab === 'signup' ? '\u6ce8\u518c Sign up' : '\u767b\u5f55 Sign in';
  }

  async function forgot() {
    var email = q('agEmail').value.trim(), err = q('agErr');
    if (!email) { err.style.color = '#c0392b'; err.textContent = '\u8bf7\u5148\u586b\u90ae\u7bb1 Enter your email first'; return; }
    try {
      var _r = await withTimeout(sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + '/reset.html' }));
      if(_r && _r.error){ err.style.color='#c0392b'; err.textContent = /second|rate|too many|security/i.test(_r.error.message)?'\u8bf7\u6c42\u592a\u9891\u7e41,\u8bf7\u7a0d\u7b49\u7ea61\u5206\u949f\u518d\u8bd5 Please wait ~1 min.':('\u53d1\u9001\u5931\u8d25 '+_r.error.message); }
      else { err.style.color = '#1a6637'; err.textContent = '\ud83d\udce7 \u91cd\u7f6e\u90ae\u4ef6\u5df2\u53d1\u9001 Password reset email sent.'; }
    } catch (e) { err.style.color = '#c0392b'; err.textContent = '\u53d1\u9001\u5931\u8d25,\u8bf7\u91cd\u8bd5 Failed, try again.'; }
  }

  async function logout() { try { await withTimeout(sb.auth.signOut(), 6000); } catch (e) {} location.reload(); }

  function wire() {
    q('agTabIn').onclick = function () { setTab('signin'); };
    q('agTabUp').onclick = function () { setTab('signup'); };
    q('agSubmit').onclick = submit;
    q('agForgot').onclick = function (e) { e.preventDefault(); forgot(); };
    q('agPass').addEventListener('keydown', function (e) { if (e.key === 'Enter') submit(); });
    q('agGOut').onclick = logout;
    q('agEye').onclick = function(){ var i=q('agPass'); if(i.type==='password'){i.type='text';this.textContent='\ud83d\ude48';}else{i.type='password';this.textContent='\ud83d\udc41';} };
  }

  function readLocalSession() {
    try {
      var raw = localStorage.getItem('haoteach-auth'); if (!raw) return null;
      var o = JSON.parse(raw); var ss = o.currentSession || o;
      if (ss && ss.user && ss.refresh_token) return ss;
    } catch (e) {}
    return null;
  }
  async function start() {
    if (!window.supabase || !window.supabase.createClient) { console.error('[auth-gate] supabase-js \u672a\u52a0\u8f7d'); return; }
    sb = window.supabase.createClient(SB_URL, SB_KEY, {auth:{storageKey:'haoteach-auth',persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    wire();
    // 先读本地会话:有就即时放行,避免网络抖动误挡
    var ls = readLocalSession();
    if (ls) { hideGate(ls.user); }
    else {
      try {
        var res = await withTimeout(sb.auth.getSession(), 10000);
        var session = res && res.data && res.data.session;
        if (session && session.user) hideGate(session.user); else showGate();
      } catch (e) { showGate(); }
    }
    sb.auth.onAuthStateChange(function (_e, session) {
      if (session && session.user) hideGate(session.user); else showGate();
    });
    try { q('agEmail').focus(); } catch (e) {}
  }

  function ensureSupabase(cb) {
    if (window.supabase && window.supabase.createClient) return cb();
    var s = document.createElement('script'); s.src = 'supabase-js.js';
    s.onload = cb;
    s.onerror = function () { console.error('[auth-gate] \u65e0\u6cd5\u52a0\u8f7d supabase-js.js'); };
    document.head.appendChild(s);
  }

  function boot() { document.documentElement.style.overflow = 'hidden'; ov = inject(); ensureSupabase(start); }
  if (document.body) boot(); else document.addEventListener('DOMContentLoaded', boot);
})();
