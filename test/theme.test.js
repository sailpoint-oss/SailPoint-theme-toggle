const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function createMockEnv(initialTheme = null) {
  const store = {};
  if (initialTheme) {
    store['themetoggleplugin_theme'] = initialTheme;
  }

  const classList = (initialClasses = []) => {
    const classes = new Set(initialClasses);
    return {
      add: (c) => classes.add(c),
      remove: (c) => classes.delete(c),
      contains: (c) => classes.has(c),
      get length() { return classes.size; }
    };
  };

  const documentElement = {
    classList: classList(),
    style: { colorScheme: '' }
  };

  const body = {
    classList: classList(),
    style: {},
    appendChild: () => {},
    querySelectorAll: () => [],
    querySelector: () => null
  };

  const head = {
    appendChild: () => {}
  };

  const elementsById = {};

  const document = {
    documentElement,
    body,
    head,
    createElement: (tag) => {
      const el = {
        tagName: tag.toUpperCase(),
        attributes: {},
        classList: classList(),
        style: {},
        children: [],
        id: '',
        className: '',
        setAttribute: (k, v) => {
          el.attributes[k] = v;
          if (k === 'id') el.id = v;
          if (k === 'class') el.className = v;
        },
        getAttribute: (k) => el.attributes[k] || (k === 'id' ? el.id : null),
        appendChild: (child) => { el.children.push(child); return child; },
        insertBefore: (child) => { el.children.unshift(child); return child; },
        querySelector: () => null,
        querySelectorAll: () => [],
        addEventListener: (event, handler) => { el['on' + event] = handler; }
      };
      return el;
    },
    getElementById: (id) => elementsById[id] || null,
    querySelector: () => null,
    querySelectorAll: () => []
  };

  const localStorage = {
    getItem: (key) => (key in store ? store[key] : null),
    setItem: (key, val) => { store[key] = String(val); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { for (const k in store) delete store[k]; }
  };

  const context = {
    document,
    window: { localStorage },
    localStorage,
    setTimeout: (fn) => fn(),
    setInterval: () => 123,
    clearInterval: () => {},
    module: { exports: {} },
    exports: {}
  };

  context.window.document = document;
  vm.createContext(context);

  const scriptPath = path.join(__dirname, '../themetoggleplugin/ui/js/headerInject.js');
  const code = fs.readFileSync(scriptPath, 'utf8');
  vm.runInContext(code, context);

  return {
    exports: context.module.exports,
    context,
    store,
    document
  };
}

test('Theme Detection & Default Behavior', async (t) => {
  await t.test('defaults to light theme when localStorage is empty', () => {
    const env = createMockEnv();
    assert.strictEqual(env.exports.getTheme(), 'light');
  });

  await t.test('retrieves dark theme when dark is stored', () => {
    const env = createMockEnv('dark');
    assert.strictEqual(env.exports.getTheme(), 'dark');
  });

  await t.test('retrieves light theme when light is stored', () => {
    const env = createMockEnv('light');
    assert.strictEqual(env.exports.getTheme(), 'light');
  });

  await t.test('falls back to light theme on invalid/corrupted storage value', () => {
    const env = createMockEnv('invalid_value_123');
    assert.strictEqual(env.exports.getTheme(), 'light');
  });
});

test('Theme Persistence & Switching', async (t) => {
  await t.test('setTheme updates localStorage value', () => {
    const env = createMockEnv();
    env.exports.setTheme('dark');
    assert.strictEqual(env.store['themetoggleplugin_theme'], 'dark');
    assert.strictEqual(env.exports.getTheme(), 'dark');

    env.exports.setTheme('light');
    assert.strictEqual(env.store['themetoggleplugin_theme'], 'light');
    assert.strictEqual(env.exports.getTheme(), 'light');
  });

  await t.test('applyBodyClass toggles iiq-theme-dark on body and documentElement', () => {
    const env = createMockEnv();

    env.exports.applyBodyClass('dark');
    assert.strictEqual(env.document.body.classList.contains('iiq-theme-dark'), true);
    assert.strictEqual(env.document.documentElement.classList.contains('iiq-theme-dark'), true);
    assert.strictEqual(env.document.documentElement.style.colorScheme, 'dark');

    env.exports.applyBodyClass('light');
    assert.strictEqual(env.document.body.classList.contains('iiq-theme-dark'), false);
    assert.strictEqual(env.document.documentElement.classList.contains('iiq-theme-dark'), false);
    assert.strictEqual(env.document.documentElement.style.colorScheme, '');
  });
});

test('Protected Surface Protection Logic (isProtected)', async (t) => {
  const env = createMockEnv();

  await t.test('protects CodeMirror and debug editor elements', () => {
    const cmEl = {
      classList: { contains: (c) => c === 'CodeMirror' },
      closest: (sel) => (sel === '.CodeMirror' ? true : false)
    };
    assert.strictEqual(env.exports.isProtected(cmEl), true);

    const debugEl = {
      id: 'debug-editor',
      classList: { contains: () => false },
      closest: () => false
    };
    assert.strictEqual(env.exports.isProtected(debugEl), true);
  });

  await t.test('protects Business Process workflow designer canvas', () => {
    const wfEl = {
      id: 'stepNode',
      classList: { contains: () => false },
      closest: (sel) => (sel === '#workflowDesigner' ? true : false)
    };
    assert.strictEqual(env.exports.isProtected(wfEl), true);
  });

  await t.test('protects status badges, risk chips, and alerts', () => {
    const badgeEl = {
      classList: { contains: (c) => c === 'badge' },
      closest: () => false
    };
    assert.strictEqual(env.exports.isProtected(badgeEl), true);

    const alertEl = {
      classList: { contains: (c) => c === 'alert-danger' },
      closest: () => false
    };
    assert.strictEqual(env.exports.isProtected(alertEl), true);
  });

  await t.test('does not protect regular grid and panel containers', () => {
    const gridEl = {
      id: 'identityGrid',
      classList: { contains: () => false },
      closest: () => false
    };
    assert.strictEqual(env.exports.isProtected(gridEl), false);
  });
});

test('Color Detection Utility (isWhiteOrLightBg)', async (t) => {
  const env = createMockEnv();

  await t.test('identifies white and light hex / rgb colors', () => {
    assert.strictEqual(env.exports.isWhiteOrLightBg('#ffffff'), true);
    assert.strictEqual(env.exports.isWhiteOrLightBg('#fff'), true);
    assert.strictEqual(env.exports.isWhiteOrLightBg('white'), true);
    assert.strictEqual(env.exports.isWhiteOrLightBg('#f5f5f5'), true);
    assert.strictEqual(env.exports.isWhiteOrLightBg('rgb(255, 255, 255)'), true);
    assert.strictEqual(env.exports.isWhiteOrLightBg('rgba(250, 250, 250, 1)'), true);
  });

  await t.test('does not flag dark or accent colors', () => {
    assert.strictEqual(env.exports.isWhiteOrLightBg('#151b26'), false);
    assert.strictEqual(env.exports.isWhiteOrLightBg('#000000'), false);
    assert.strictEqual(env.exports.isWhiteOrLightBg('rgb(30, 35, 45)'), false);
    assert.strictEqual(env.exports.isWhiteOrLightBg('transparent'), false);
  });
});

test('Toggle Element Creation (createToggleElement)', async (t) => {
  await t.test('creates standard HTML layout with accessible attributes', () => {
    const env = createMockEnv('light');
    const li = env.exports.createToggleElement();

    assert.strictEqual(li.tagName, 'LI');
    assert.strictEqual(li.attributes['role'], 'presentation');
    assert.strictEqual(li.className, 'themetoggleplugin-nav-item');

    assert.strictEqual(li.children.length, 1);
    const a = li.children[0];
    assert.strictEqual(a.tagName, 'A');
    assert.strictEqual(a.id, 'themetoggleplugin-toggle-btn');
    assert.strictEqual(a.attributes['role'], 'menuitem');
    assert.strictEqual(a.attributes['tabindex'], '0');
    assert.strictEqual(typeof a.onclick, 'function');
  });

  await t.test('clicking toggle toggles theme and updates state', () => {
    const env = createMockEnv('light');
    const li = env.exports.createToggleElement();
    const a = li.children[0];

    // Click to switch to dark
    let prevented = false;
    a.onclick({ preventDefault: () => { prevented = true; } });
    assert.strictEqual(prevented, true);
    assert.strictEqual(env.exports.getTheme(), 'dark');
    assert.strictEqual(env.document.body.classList.contains('iiq-theme-dark'), true);

    // Click to switch back to light
    a.onclick({ preventDefault: () => {} });
    assert.strictEqual(env.exports.getTheme(), 'light');
    assert.strictEqual(env.document.body.classList.contains('iiq-theme-dark'), false);
  });
});
