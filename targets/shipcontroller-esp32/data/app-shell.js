(()=>{
  const ASSET_VERSION = '20260323-editorflow1';
  const FRAGMENTS = [
    { mountId: 'appPanelsMount', url: '/fragments/app-panels.html' },
    { mountId: 'appModalsMount', url: '/fragments/app-modals.html' }
  ];

  const SCRIPT_ORDER = [
    '/app-i18n.js',
    '/app-help.js',
    '/app-ui-text.js',
    '/app.js',
    '/app-signals.js',
    '/app-features.js',
    '/app-templates.js',
    '/app-init.js'
  ];

  function $(id) {
    return document.getElementById(id);
  }

  function versionedUrl(url) {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}v=${ASSET_VERSION}`;
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

  async function bootstrapShell() {
    const status = $('shellBootstrapStatus');
    try {
      if (status) status.textContent = 'Загружаю интерфейс...';
      for (const fragment of FRAGMENTS) {
        await loadFragment(fragment.mountId, fragment.url);
      }
      if (status) status.textContent = 'Подключаю скрипты...';
      for (const src of SCRIPT_ORDER) {
        await loadScript(src);
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
