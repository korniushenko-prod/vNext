(()=>{
  const ASSET_VERSION = '20260416-runtimefix2';
  const FRAGMENTS = [
    { mountId: 'appPanelsMount', url: '/fragments/app-panels.html' },
    { mountId: 'appModalsMount', url: '/fragments/app-modals.html' }
  ];

  const SCRIPT_ORDER = [
    '/app-i18n.js',
    '/app-help.js',
    '/app-ui-text.js',
    '/app-api.js',
    '/app-core.js',
    '/app-signals.js',
    '/app-blocks.js',
    '/app-display.js',
    '/app-alarms.js',
    '/app-sequences.js',
    '/app-comms.js',
    '/app-editor.js',
    '/app-modules.js',
    '/app-templates.js',
    '/app-features.js',
    '/app-init.js'
  ];

  function $(id) {
    return document.getElementById(id);
  }

  function versionedUrl(url) {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}v=${ASSET_VERSION}`;
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function loadFragment(mountId, url) {
    const mount = $(mountId);
    if (!mount) return;
    const response = await fetch(versionedUrl(url), { cache: 'no-cache' });
    if (!response.ok) {
      throw new Error(`fragment ${url} -> ${response.status}`);
    }
    mount.innerHTML = await response.text();
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = versionedUrl(src);
      script.onload = resolve;
      script.onerror = () => reject(new Error(`script ${src}`));
      document.body.appendChild(script);
    });
  }

  async function withRetries(loader, label, attempts = 3) {
    let lastError = null;
    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        return await loader();
      } catch (error) {
        lastError = error;
        if (attempt < attempts) {
          await sleep(200 * attempt);
        }
      }
    }
    throw lastError || new Error(label);
  }

  async function bootstrapShell() {
    const status = $('shellBootstrapStatus');
    try {
      if (status) status.textContent = 'Загружаю интерфейс...';
      for (const fragment of FRAGMENTS) {
        await withRetries(
          () => loadFragment(fragment.mountId, fragment.url),
          `fragment ${fragment.url}`
        );
      }
      if (status) status.textContent = 'Подключаю скрипты...';
      for (const src of SCRIPT_ORDER) {
        if (status) status.textContent = `Подключаю ${src}...`;
        await withRetries(
          () => loadScript(src),
          `script ${src}`
        );
      }
      if (status) status.remove();
    } catch (error) {
      if (status) {
        status.textContent = `Не удалось загрузить UI shell: ${error.message}`;
        status.classList.add('warning-box');
      }
      console.error('[app-shell]', error);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrapShell, { once: true });
  } else {
    bootstrapShell();
  }
})();
