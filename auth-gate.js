/* ============================================================
   haoteach 全站登录门槛 auth-gate.js  —— 已停用（登录门槛已取消）
   ------------------------------------------------------------
   原来:未登录会全屏弹出登录/注册框,挡住整页内容。
   现在:不做任何登录拦截,所有页面直接开放访问。
        (84 个课程页 + lianxi.html + saywordsonbeat.html 都引用本文件,
         所以只改这一个文件,全站账号登录即全部取消。)
   仅保留 Vercel 访问统计(与登录无关)。
   如需恢复登录,把本文件还原成旧版本即可。
   ============================================================ */

/* ---- Vercel Web Analytics（访问统计，自动加载，与登录无关） ---- */
(function () {
  try {
    if (window.__vaInjected) return;   // 防止重复注入
    window.__vaInjected = true;
    window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };
    var s = document.createElement('script');
    s.defer = true;
    s.src = '/_vercel/insights/script.js';
    (document.head || document.documentElement).appendChild(s);
  } catch (e) { /* 统计失败也绝不影响页面正常使用 */ }
})();

/* 登录门槛已取消：不注入登录框、不拦截、不锁定页面滚动。 */
