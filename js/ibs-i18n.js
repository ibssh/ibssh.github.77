(function(){
  function getDict(){
    return window.IBS_I18N_DICT || {};
  }

  function isDictReady(){
    try {
      var d = window.IBS_I18N_DICT;
      if (!d) return false;
      // If it has at least one key, consider it ready
      for (var k in d) {
        if (Object.prototype.hasOwnProperty.call(d, k)) return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  function warn(){
    try {
      if (window.console && window.console.warn) {
        window.console.warn.apply(window.console, arguments);
      }
    } catch (e) {}
  }

  function getDictScriptUrl(){
    var src = '';


    try {
      if (document.currentScript && document.currentScript.src) {
        src = document.currentScript.src;
      }
    } catch (e) {}

    if (!src) {
      try {
        var scripts = document.getElementsByTagName('script');
        for (var i = scripts.length - 1; i >= 0; i--) {
          var s = scripts[i];
          if (s && s.src && s.src.indexOf('ibs-i18n.js') !== -1) {
            src = s.src;
            break;
          }
        }
      } catch (e2) {}
    }

    if (!src) return 'js/ibs-i18n-dict.js';

    // Replace the tail filename, preserving possible query string
    return src.replace(/ibs-i18n\.js(\?.*)?$/i, function(_, q){
      return 'ibs-i18n-dict.js' + (q || '');
    });
  }

  function ensureDictLoaded(cb){
    if (isDictReady()) {
      cb && cb(true);
      return;
    }

    // Deduplicate concurrent loads (Promise-free for older browsers)
    var state = window.__IBS_I18N_DICT_STATE;
    if (!state) {
      state = window.__IBS_I18N_DICT_STATE = { loading: false, cbs: [] };
    }

    if (cb) state.cbs.push(cb);

    if (state.loading) return;
    state.loading = true;

    var url = getDictScriptUrl();

    try {
      var script = document.createElement('script');
      script.src = url;
      script.async = true;

      var done = function(){
        state.loading = false;
        var ok = isDictReady();
        if (!ok) {
          warn('[IBS i18n] 字典未就绪，可能是 404/脚本报错/路径问题：', url);
        }


        var list = state.cbs.slice(0);
        state.cbs.length = 0;
        for (var i = 0; i < list.length; i++) {
          try { list[i](ok); } catch (e2) {}
        }
      };

      script.onload = done;
      script.onerror = done;

      (document.head || document.documentElement).appendChild(script);
    } catch (e3) {
      state.loading = false;
      if (cb) {
        try { cb(isDictReady()); } catch (e4) {}
      }
    }
  }

  function getCookie(name){
    try {
      var m = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/([.$?*|{}()\[\]\\\/\+^])/g, '\\$1') + '=([^;]*)'));
      return m ? decodeURIComponent(m[1]) : null;
    } catch (e) {
      return null;
    }
  }

  function setCookie(name, value, days){
    try {
      var expires = '';
      if (days) {
        var d = new Date();
        d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
        expires = '; expires=' + d.toUTCString();
      }
      document.cookie = name + '=' + encodeURIComponent(value) + expires + '; path=/';
    } catch (e) {}
  }

  function getCurrentLang(){
    var stored = null;
    try { stored = localStorage.getItem('ibs_lang'); } catch (e) {}
    if (stored !== 'en' && stored !== 'zh') {
      stored = getCookie('ibs_lang');
    }
    if (stored === 'en' || stored === 'zh') return stored;
    return 'zh';
  }

  function setCurrentLang(lang){
    try { localStorage.setItem('ibs_lang', lang); } catch (e) {}
    setCookie('ibs_lang', lang, 365);
  }


  function t(key, lang){
    var dict = getDict();
    var item = dict[key];
    if (!item) return '';
    if (item[lang] != null) return item[lang];
    return item.zh != null ? item.zh : '';
  }

  function format(str, vars){
    if (!str) return str;
    return str.replace(/\{(\w+)\}/g, function(_, k){
      return (vars && vars[k] != null) ? String(vars[k]) : _;
    });
  }

  function setText(el, val){
    if (!el) return;
    // IE8/旧内核兼容：没有 textContent 时用 innerText
    if (typeof el.textContent !== 'undefined') {
      el.textContent = val;
      return;
    }
    if (typeof el.innerText !== 'undefined') {
      el.innerText = val;
      return;
    }
    // 兜底：尽量不当作 HTML
    try {
      el.innerHTML = '';
      el.appendChild(document.createTextNode(val));
    } catch (e) {}
  }

  function on(el, evt, handler){
    if (!el) return;
    if (el.addEventListener) {
      el.addEventListener(evt, handler, false);
      return;
    }
    if (el.attachEvent) {
      el.attachEvent('on' + evt, function(){
        handler.call(el, window.event);
      });
    }
  }

  function hasClassName(el, cls){
    var cn = (el && el.className) ? String(el.className) : '';
    return (' ' + cn + ' ').indexOf(' ' + cls + ' ') !== -1;
  }

  function qsa(selector){
    try {
      if (document.querySelectorAll) return document.querySelectorAll(selector);
    } catch (e) {}
    return null;
  }

  function qs(selector){
    try {
      if (document.querySelector) return document.querySelector(selector);
    } catch (e) {}
    var list = qsa(selector);
    return (list && list[0]) ? list[0] : null;
  }

  function findByAttr(attrName){
    var all = document.getElementsByTagName('*');
    var out = [];
    for (var i = 0; i < all.length; i++) {
      var el = all[i];
      if (el && el.getAttribute && el.getAttribute(attrName) != null) out.push(el);
    }
    return out;
  }

  function findByClass(cls){
    var all = document.getElementsByTagName('*');
    var out = [];
    for (var i = 0; i < all.length; i++) {
      var el = all[i];
      if (el && hasClassName(el, cls)) out.push(el);
    }
    return out;
  }

  function applyTitle(lang){
    var titleEl = qs('title[data-i18n]');

    if (titleEl) {
      var key = titleEl.getAttribute('data-i18n');
      var val = t(key, lang);
      if (val) document.title = val;
      return;
    }
    var key2 = document.documentElement.getAttribute('data-i18n-title');
    if (key2) {
      var val2 = t(key2, lang);
      if (val2) document.title = val2;
    }
  }

  function applyLangAttr(lang){
    // Use standard language tags for html lang
    document.documentElement.setAttribute('lang', lang === 'en' ? 'en' : 'zh-CN');
  }

  function applyTextNodes(lang){
    var nodes = qsa('[data-i18n]') || findByAttr('data-i18n');

    for (var i=0; i<nodes.length; i++) {
      var el = nodes[i];
      var key = el.getAttribute('data-i18n');
      var val = t(key, lang);
      if (val !== '') setText(el, val);
    }


    var htmlNodes = qsa('[data-i18n-html]') || findByAttr('data-i18n-html');

    for (var j=0; j<htmlNodes.length; j++) {
      var el2 = htmlNodes[j];
      var keyH = el2.getAttribute('data-i18n-html');
      var valH = t(keyH, lang);
      if (valH !== '') el2.innerHTML = valH;
    }

    var attrNodes = qsa('[data-i18n-attr]') || findByAttr('data-i18n-attr');

    for (var k=0; k<attrNodes.length; k++) {
      var el3 = attrNodes[k];
      var raw = el3.getAttribute('data-i18n-attr');
      if (!raw) continue;
      try {
        var map = JSON.parse(raw);
        for (var attr in map) {
          if (!Object.prototype.hasOwnProperty.call(map, attr)) continue;
          var keyA = map[attr];
          var valA = t(keyA, lang);
          if (valA !== '') el3.setAttribute(attr, valA);
        }
      } catch (e) {
        // ignore
      }
    }

    // placeholders
    var phNodes = qsa('[data-i18n-placeholder]') || findByAttr('data-i18n-placeholder');

    for (var m=0; m<phNodes.length; m++) {
      var el4 = phNodes[m];
      var keyP = el4.getAttribute('data-i18n-placeholder');
      var valP = t(keyP, lang);
      if (valP !== '') el4.setAttribute('placeholder', valP);
    }

    // fallback text nodes (e.g., inside <video> ...text... </video>)
    var fbNodes = qsa('[data-i18n-fallback]') || findByAttr('data-i18n-fallback');

    for (var n=0; n<fbNodes.length; n++) {
      var el5 = fbNodes[n];
      var keyF = el5.getAttribute('data-i18n-fallback');
      var valF = t(keyF, lang);
      if (valF === '') continue;

      var replaced = false;
      for (var c=0; c<el5.childNodes.length; c++) {
        var child = el5.childNodes[c];
        if (child && child.nodeType === 3) {
          var text = (child.nodeValue || '');
          if (text.replace(/\s+/g, '') !== '') {
            child.nodeValue = valF;
            replaced = true;
            break;
          }
        }
      }
      if (!replaced) {
        el5.appendChild(document.createTextNode(valF));
      }
    }
  }

  function removeClass(el, cls){
    if (!el) return;
    var cn = (el.className != null) ? String(el.className) : '';
    var parts = cn.split(/\s+/);
    var out = [];
    for (var i = 0; i < parts.length; i++) {
      if (parts[i] && parts[i] !== cls) out.push(parts[i]);
    }
    el.className = out.join(' ');
  }

  function addClass(el, cls){
    if (!el) return;
    if (hasClassName(el, cls)) return;
    var cn = (el.className != null) ? String(el.className) : '';
    el.className = (cn ? (cn + ' ') : '') + cls;
  }

  function findLangSwitchLink(target){
    var node = target;
    while (node && node !== document && node.nodeType === 1) {
      if (node.tagName && String(node.tagName).toLowerCase() === 'a') {
        // ensure it's inside .lang-switch
        var p = node;
        while (p && p !== document && p.nodeType === 1) {
          if (hasClassName(p, 'lang-switch')) return node;
          p = p.parentNode;
        }
        return null;
      }
      node = node.parentNode;
    }
    return null;
  }

  function updateLangSwitchUI(lang){
    var switches = qsa('.lang-switch') || findByClass('lang-switch');
    for (var i=0; i<switches.length; i++) {
      var sw = switches[i];
      var links = (sw && sw.getElementsByTagName) ? sw.getElementsByTagName('a') : [];
      for (var j=0; j<links.length; j++) {
        removeClass(links[j], 'active');
        // also remove inline color override if exists
        if (links[j].style) links[j].style.color = '';
      }

      var active = null;
      for (var k=0; k<links.length; k++) {
        if (links[k] && links[k].getAttribute && links[k].getAttribute('data-lang') === lang) {
          active = links[k];
          break;
        }
      }
      if (active) {
        addClass(active, 'active');
      }
    }
  }


  function bindLangSwitch(){
    on(document, 'click', function(e){
      e = e || window.event;
      var target = e.target || e.srcElement;
      var a = findLangSwitchLink(target);
      if (!a) return;
      var lang = a.getAttribute('data-lang');
      if (!lang) return;

      if (e.preventDefault) e.preventDefault();
      e.returnValue = false;

      setLanguage(lang);
    });
  }



  function setLanguage(lang){
    if (lang !== 'en' && lang !== 'zh') return;
    setCurrentLang(lang);

    ensureDictLoaded(function(){
      apply(lang);
    });
  }

  function apply(lang){
    applyLangAttr(lang);
    applyTitle(lang);
    applyTextNodes(lang);
    updateLangSwitchUI(lang);

    // Custom hook for page-specific adjustments
    try {
      if (typeof window.IBS_I18N_AFTER_APPLY === 'function') {
        window.IBS_I18N_AFTER_APPLY(lang);
      }
    } catch (e) {}
  }

  // expose for debugging
  window.IBS_setLanguage = setLanguage;
  window.IBS_getLanguage = function(){ return getCurrentLang(); };

  function init(){
    bindLangSwitch();

    ensureDictLoaded(function(){
      apply(getCurrentLang());
    });
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    init();
  } else {
    if (document.addEventListener) {
      document.addEventListener('DOMContentLoaded', init, false);
    } else if (document.attachEvent) {
      document.attachEvent('onreadystatechange', function(){
        if (document.readyState === 'complete') init();
      });
    } else {
      window.onload = init;
    }
  }
})();

