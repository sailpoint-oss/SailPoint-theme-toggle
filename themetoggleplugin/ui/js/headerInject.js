/**
 * Theme Toggle plugin – injects toggle into SP nav bar (same pattern as Object Browser plugin).
 * SP menu.xhtml: <ul class="nav navbar-nav navbar-right"> inside #menuMainDiv.
 * Plugin scripts load with defer in head (include/plugins.xhtml); CONTEXT_PATH is set by page before us.
 */
(function () {
  'use strict';

  var themeKey = 'themetoggleplugin_theme';
  var bodyClass = 'iiq-theme-dark';

  /* CONTEXT_PATH: set by page in extAppPage/ngAppPage/appPage; SailPoint.CONTEXT_PATH may also exist (iiqScriptBase) */
  function getBase() {
    if (typeof CONTEXT_PATH !== 'undefined' && CONTEXT_PATH) return CONTEXT_PATH;
    if (typeof SailPoint !== 'undefined' && SailPoint.CONTEXT_PATH) return SailPoint.CONTEXT_PATH;
    return '';
  }

  var base = getBase();
  var themeUrl = base + '/plugin/ThemeToggle/ui/css/theme-';

  function getTheme() {
    try {
      var t = localStorage.getItem(themeKey);
      return (t === 'dark' || t === 'light') ? t : 'light';
    } catch (e) { return 'light'; }
  }

  function setTheme(theme) {
    try { localStorage.setItem(themeKey, theme); } catch (e) {}
  }

  /* SP extAppPage.xhtml line 253: <div id="spBodyPanelDiv" style="background:#fff; margin:0 25px"> – inline style cannot be overridden by CSS */
  var darkSurface = '#151b26';
  function applyInlineOverrides(theme) {
    var el = document.getElementById('spBodyPanelDiv');
    if (el) {
      el.style.backgroundColor = theme === 'dark' ? darkSurface : '#fff';
    }
    if (theme === 'dark') {
      clearInlineWhiteBackgrounds();
    }
  }

  /* Continuous cleaner for dynamic ExtJS grid renders and AJAX store updates */
  var bgInterval = null;
  var bgObserver = null;

  function isWhiteOrLightBg(val) {
    if (!val || typeof val !== 'string') return false;
    var s = val.replace(/\s/g, '').toLowerCase();
    if (/^#(fff|ffffff|fafafa|f8f8f8|f5f5f5|f0f0f0|e6e6e6|edeff3|ededed|eeeeee|eee|ddd|dadada)$/i.test(s) || s === 'white') return true;
    var rgbMatch = s.match(/rgba?\((\d+),(\d+),(\d+)/);
    if (rgbMatch) {
      var r = parseInt(rgbMatch[1]), g = parseInt(rgbMatch[2]), b = parseInt(rgbMatch[3]);
      if (r > 210 && g > 210 && b > 210) return true;
    }
    if (s.indexOf('#fff') !== -1 || s.indexOf('white') !== -1 || s.indexOf('255,255,255') !== -1) return true;
    return false;
  }

  /* Detect linear-gradient backgrounds that fade from white (used in base.css headers) */
  function hasLightGradient(val) {
    if (!val) return false;
    return /gradient.*#(fff|ffffff|fafafa|f5f5f5|f0f0f0|ededed|dadada|eee)/i.test(val);
  }

  /* Check a computed backgroundColor value for near-white (r,g,b all > 210) */
  function isWhiteOrLightComputed(val) {
    if (!val || typeof val !== 'string') return false;
    var match = val.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
    if (match) {
      var r = parseInt(match[1]), g = parseInt(match[2]), b = parseInt(match[3]);
      return (r > 210 && g > 210 && b > 210);
    }
    return false;
  }

  /* Elements that should never be overridden (colored badges, risk indicators, brand accents, code editor)
     #workflowDesigner = Business Process Editor canvas: Raphael SVG diagram + PNG step
     sprites authored for a white background – the cleaner must leave it light. */
  function isProtected(el) {
    if (!el) return false;
    if (el.id === 'debug-editor') return true;
    if (el.closest && el.closest('#debug-editor')) return true;
    if (el.closest && el.closest('#workflowDesigner')) return true;
    if (el.closest && el.closest('.iiq-light-modal')) return true;
    if (el.closest && el.closest('.iiq-light-picker')) return true;
    if (el.closest && el.closest('.CodeMirror')) return true;
    if (!el.classList) return false;
    if (el.classList.contains('CodeMirror') || el.classList.contains('CodeMirror-gutters')) return true;
    var skip = ['badge', 'label', 'btn', 'btn-primary', 'btn-success', 'btn-danger', 'btn-warning', 'btn-info',
                'circle', 'risk-indicator', 'risk', 'progress-bar', 'carousel-indicators', 'dot', 'high-priority-icon',
                'alert-danger', 'alert-warning', 'alert-success', 'alert-info', 'bg-danger', 'bg-warning', 'bg-success',
                'successBox', 'warnBox', 'failBox', 'successText', 'failText'];
    for (var k = 0; k < skip.length; k++) {
      if (el.classList.contains(skip[k])) return true;
    }
    return false;
  }

  /* Key structural selectors that ExtJS / SailPoint dynamically injects inline styles onto */
  var keyContainerSelector = [
    '.x-panel-body', '.x-panel-bwrap', '.x-tab-panel-body', '.x-window-body',
    '.x-panel-mc', '.x-window-mc', '.x-window-plain .x-window-body',
    '.x-grid3', '.x-grid3-body', '.x-grid3-viewport', '.x-grid3-scroller',
    '.spContent', '.spTabledContent', '.spAjaxContent', '.spGridContent',
    '.spLightBlueTabledContent', '.spBlueTabledContent', '.spTitledContent',
    '#appTable', '.bodyDiv', '#bodyContentTd', '#bodyTitleTd', '#bodyBottomTd',
    '.baseWindowBody', '.baseWindow', '.detailsPanelContent', '.detailsPanel',
    '.submenuContentBox', '.applicationTabPanelBody', '.expandPanelBody',
    '.borderCell', '.spWhite', '.spBackground',
    '.modal-content', '.well', '.tabbable .tab-pane',
    '#pageTitle', '#pageTitle table', '#title', '.pageTitle', '#spErrorMsgsDiv', '.lcmErrorMsgsDiv',
    '#workflowPanel', '#workflowDesigner', '#workflowDesigner .x-panel-body'
  ].join(', ');

  /* Keep the Object Browser XML editor (id=debug-editor) light even before
     CodeMirror finishes rendering, and tag the floating Theme picker boundlist
     (rendered OUTSIDE the window as #themeCombo-picker) so CSS can keep it
     stock-white. No inline-style wiping: pure class marking. */
  function markLightModals() {
    if (!document.body || getTheme() !== 'dark') return;

    var editor = document.getElementById('debug-editor');
    if (editor && !editor.classList.contains('iiq-light-modal')) {
      editor.classList.add('iiq-light-modal');
    }

    var pickers = document.querySelectorAll('[id^="themeCombo-picker"]');
    for (var p = 0; p < pickers.length; p++) {
      pickers[p].classList.add('iiq-light-picker');
    }

    var cms = document.querySelectorAll('.CodeMirror');
    for (var i = 0; i < cms.length; i++) {
      var host = cms[i].closest('.x-window') ||
                 cms[i].closest('.x-panel') ||
                 cms[i].closest('.modal-content');
      if (host && !host.classList.contains('iiq-light-modal')) {
        host.classList.add('iiq-light-modal');
      }
    }
  }

  /* Base text inside the XML editor must always contrast with the ACTIVE
     CodeMirror theme canvas. Some cm theme files never define a base color on
     the .CodeMirror root, so inheriting text (plain text, meta tokens, line
     numbers) falls back to the dark window color and goes black-on-black.
     Fix: measure the editor's computed background luminance and pin the ROOT
     base color inline – cm-* token spans keep their own theme colors because
     a specified color always beats inheritance. The existing CSS restore
     rules make inner wrappers/pre/gutters inherit from this root. */
  function tuneCodeMirrorContrast() {
    if (!document.body || getTheme() !== 'dark') return;
    var editors = document.querySelectorAll('#debug-editor .CodeMirror');
    for (var i = 0; i < editors.length; i++) {
      var cm = editors[i];
      var node = cm;
      var bg = '';
      while (node && node !== document.documentElement) {
        try { bg = window.getComputedStyle(node).backgroundColor || ''; } catch (e) { bg = ''; }
        if (bg && bg !== 'transparent' && bg.indexOf('rgba(0, 0, 0, 0)') !== 0) break;
        node = node.parentElement;
      }
      var m = bg.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
      var lum = 255; /* assume light canvas if nothing measurable */
      if (m) {
        lum = (parseInt(m[1], 10) * 299 + parseInt(m[2], 10) * 587 + parseInt(m[3], 10) * 114) / 1000;
      }
      var target = lum < 140 ? '#e6edf3' : '#111827';
      /* data-marker avoids re-setting style every tick (would loop the observer) */
      if (cm.getAttribute('data-iiq-cm-color') !== target) {
        cm.style.setProperty('color', target, 'important');
        cm.setAttribute('data-iiq-cm-color', target);
      }
    }
  }

  function clearInlineWhiteBackgrounds() {
    if (!document.body || getTheme() !== 'dark') return;

    markLightModals();
    tuneCodeMirrorContrast();

    /* Pass 1: Target all elements that have an inline style with 'background' in it */
    var inlineNodes = document.body.querySelectorAll('[style]');
    for (var i = 0; i < inlineNodes.length; i++) {
      var el = inlineNodes[i];
      if (isProtected(el)) continue;
      var inlineStyle = el.getAttribute('style') || '';
      if (inlineStyle.indexOf('background') === -1) continue;

      var bg = el.style.backgroundColor || '';
      var bgFull = el.style.background || '';

      if (isWhiteOrLightBg(bg) || isWhiteOrLightBg(bgFull) || hasLightGradient(bgFull)) {
        el.style.setProperty('background-color', darkSurface, 'important');
        el.style.setProperty('background-image', 'none', 'important');
      }
    }

    /* Pass 2: Computed-style analysis on key structural containers (Dark Reader approach) */
    try {
      var containers = document.body.querySelectorAll(keyContainerSelector);
      for (var j = 0; j < containers.length; j++) {
        var cel = containers[j];
        if (isProtected(cel)) continue;
        var computed = window.getComputedStyle(cel);
        if (isWhiteOrLightComputed(computed.backgroundColor)) {
          cel.style.setProperty('background-color', darkSurface, 'important');
          cel.style.setProperty('background-image', 'none', 'important');
        }
      }
    } catch(e) { /* getComputedStyle may fail on detached nodes */ }

    /* Pass 3: Broad sweep for massive white bands (page titles, workflow headers, empty panels).
       Also detects light background-IMAGE gradients (toolbars/panel headers whose whiteness
       comes from linear-gradient images – computed backgroundColor is transparent there). */
    try {
      var broad = document.body.querySelectorAll('div, header, section, table, td, th, tr, fieldset, header#pageTitle, #title');
      var cap = Math.min(broad.length, 900);
      for (var k = 0; k < cap; k++) {
        var bel = broad[k];
        if (isProtected(bel)) continue;
        // skip tiny inline controls/spans
        if (bel.offsetWidth < 120 && bel.offsetHeight < 40) continue;
        // skip already handled key containers to avoid double work
        if (bel.matches && bel.matches(keyContainerSelector)) continue;
        var comp = window.getComputedStyle(bel);
        var bgLight = isWhiteOrLightComputed(comp.backgroundColor);
        var imgLight = false;
        var bgi = comp.backgroundImage || '';
        if (!bgLight && bgi.indexOf('gradient') !== -1) {
          // e.g. linear-gradient(rgb(255,255,255), rgb(218,218,218))
          if (/rgba?\(\s*2[2-5]\d\s*,\s*2[2-5]\d\s*,\s*2[2-5]\d/.test(bgi) || /#f{3,6}/i.test(bgi)) {
            imgLight = true;
          }
        }
        if (bgLight || imgLight) {
          // only kill substantial white blocks to avoid bleaching badges/icons
          if (bel.offsetWidth > 200 || bel.offsetHeight > 28) {
            bel.style.setProperty('background-color', darkSurface, 'important');
            bel.style.setProperty('background-image', 'none', 'important');
          }
        }
      }
    } catch(e2) {}
  }

  function startCleaner() {
    clearInlineWhiteBackgrounds();
    if (!bgInterval) {
      bgInterval = setInterval(clearInlineWhiteBackgrounds, 800);
    }
    if (!bgObserver && typeof MutationObserver !== 'undefined' && document.body) {
      bgObserver = new MutationObserver(function () {
        if (getTheme() === 'dark') clearInlineWhiteBackgrounds();
      });
      bgObserver.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['style'] });
    }
  }

  function stopCleaner() {
    if (bgInterval) { clearInterval(bgInterval); bgInterval = null; }
    if (bgObserver) { bgObserver.disconnect(); bgObserver = null; }
  }

  function applyBodyClass(theme) {
    if (!document.body) return;
    var root = document.documentElement;
    if (theme === 'dark') {
      document.body.classList.add(bodyClass);
      if (root) root.classList.add(bodyClass);
      if (root && root.style) root.style.colorScheme = 'dark';
      startCleaner();
    } else {
      document.body.classList.remove(bodyClass);
      if (root) root.classList.remove(bodyClass);
      if (root && root.style) root.style.colorScheme = '';
      stopCleaner();
    }
    applyInlineOverrides(theme);
  }

  var link = document.createElement('link');
  link.id = 'themetoggleplugin-theme-link';
  link.rel = 'stylesheet';
  if (document.head) document.head.appendChild(link);

  function loadTheme(theme) {
    link.href = themeUrl + theme + '.css';
    setTheme(theme);
    applyBodyClass(theme);
  }

  loadTheme(getTheme());

  function createToggleElement() {
    var isDark = getTheme() === 'dark';
    var iconClass = isDark ? 'fa fa-sun-o fa-lg' : 'fa fa-moon-o fa-lg';

    var li = document.createElement('li');
    li.setAttribute('role', 'presentation');
    li.className = 'themetoggleplugin-nav-item';

    var a = document.createElement('a');
    a.setAttribute('href', '#');
    a.setAttribute('role', 'menuitem');
    a.setAttribute('tabindex', '0');
    a.setAttribute('title', 'Toggle light/dark theme');
    a.className = 'menuitem themetoggleplugin-toggle-btn';
    a.id = 'themetoggleplugin-toggle-btn';

    var track = document.createElement('span');
    track.className = 'themetoggle-track';
    var thumb = document.createElement('span');
    thumb.className = 'themetoggle-thumb';
    var i = document.createElement('i');
    i.setAttribute('role', 'presentation');
    i.className = iconClass;

    thumb.appendChild(i);
    track.appendChild(thumb);
    a.appendChild(track);

    a.addEventListener('click', function (e) {
      e.preventDefault();
      var next = getTheme() === 'dark' ? 'light' : 'dark';
      loadTheme(next);
      i.className = next === 'dark' ? 'fa fa-sun-o fa-lg' : 'fa fa-moon-o fa-lg';
    });

    li.appendChild(a);
    return li;
  }

  function tryInject() {
    if (document.getElementById('themetoggleplugin-toggle-btn')) return true;
    var ul = document.querySelector('ul.navbar-right') || document.querySelector('#menuMainDiv ul.navbar-right');
    if (!ul) return false;

    var li = createToggleElement();
    var first = ul.querySelector('li');
    if (first) {
      ul.insertBefore(li, first);
    } else {
      ul.appendChild(li);
    }
    return true;
  }

  function injectButton() {
    if (tryInject()) return;
    /* Fallback: fixed wrap only if nav never appears (e.g. minimal layout) */
    if (document.getElementById('themetoggleplugin-toggle-btn')) return;

    var wrap = document.createElement('div');
    wrap.className = 'themetoggleplugin-fixed-wrap';
    wrap.appendChild(createToggleElement());
    document.body.appendChild(wrap);
  }

  function onReady() {
    applyBodyClass(getTheme());
    injectButton();
    /* Clear inline white backgrounds again after SP/ExtJS render (dialogs, tables) */
    if (getTheme() === 'dark') {
      setTimeout(clearInlineWhiteBackgrounds, 1500);
    }
  }

  if (typeof jQuery !== 'undefined') {
    jQuery(document).ready(onReady);
  } else if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onReady);
  } else {
    onReady();
  }

  /* Retry injection: nav is server-rendered but defer runs after parse; some layouts may render menu later */
  var tries = 0;
  var maxTries = 24;
  var interval = setInterval(function () {
    if (document.getElementById('themetoggleplugin-toggle-btn')) {
      clearInterval(interval);
      return;
    }
    tryInject();
    tries++;
    if (tries >= maxTries) clearInterval(interval);
  }, 500);

  /* If nav appears later (e.g. dynamic), try once when body is fully loaded */
  if (typeof window.addEventListener !== 'undefined') {
    window.addEventListener('load', function () {
      if (!document.getElementById('themetoggleplugin-toggle-btn')) tryInject();
    });
  }

  /* Expose helpers in Node / CommonJS test environments */
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      getTheme: getTheme,
      setTheme: setTheme,
      loadTheme: loadTheme,
      applyBodyClass: applyBodyClass,
      isProtected: isProtected,
      isWhiteOrLightBg: isWhiteOrLightBg,
      createToggleElement: createToggleElement,
      tryInject: tryInject
    };
  }
})();
