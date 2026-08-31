(function bootstrapSiteTheme() {
  'use strict';

  var storageKey = 'knd.theme.preference';
  var root = document.documentElement;
  var systemQuery = window.matchMedia('(prefers-color-scheme: dark)');

  function readPreference() {
    try {
      var value = window.localStorage.getItem(storageKey);
      return value === 'light' || value === 'dark' ? value : null;
    } catch {
      return null;
    }
  }

  function storePreference(theme) {
    try {
      window.localStorage.setItem(storageKey, theme);
    } catch {
      // A blocked storage API must not prevent theme selection for this page.
    }
  }

  function applyTheme(theme) {
    var normalized = theme === 'dark' ? 'dark' : 'light';
    root.dataset.siteTheme = normalized;
    root.classList.toggle('app-theme-dark', normalized === 'dark');
    root.style.colorScheme = normalized;

    var colorMeta = document.querySelector('meta[name="theme-color"]');
    if (colorMeta instanceof HTMLMetaElement) {
      colorMeta.content = normalized === 'dark' ? '#141414' : '#e4e3e0';
    }

    var toggle = document.querySelector('[data-site-theme-toggle]');
    if (toggle instanceof HTMLButtonElement) {
      var nextLabel = normalized === 'dark' ? 'Gunakan tema terang' : 'Gunakan tema gelap';
      toggle.setAttribute('aria-label', nextLabel);
      toggle.setAttribute('title', nextLabel);
      toggle.setAttribute('aria-pressed', String(normalized === 'dark'));
      var label = toggle.querySelector('[data-site-theme-label]');
      if (label instanceof HTMLElement) label.textContent = normalized === 'dark' ? 'Gelap' : 'Terang';
    }
  }

  function currentTheme() {
    return root.dataset.siteTheme === 'dark' ? 'dark' : 'light';
  }

  var savedPreference = readPreference();
  applyTheme(savedPreference || (systemQuery.matches ? 'dark' : 'light'));

  function createElement(tag, className, text) {
    var element = document.createElement(tag);
    if (className) element.className = className;
    if (text) element.textContent = text;
    return element;
  }

  function mountThemeControls() {
    if (!document.body) return;

    var toggle = document.querySelector('[data-site-theme-toggle]');
    if (!(toggle instanceof HTMLButtonElement)) {
      toggle = createElement('button', 'site-theme-toggle');
      toggle.type = 'button';
      toggle.dataset.siteThemeToggle = '';
      toggle.setAttribute('aria-live', 'polite');

      var icon = createElement('span', 'site-theme-toggle__icon', '◐');
      icon.setAttribute('aria-hidden', 'true');
      var label = createElement('span', 'site-theme-toggle__label');
      label.dataset.siteThemeLabel = '';
      toggle.append(icon, label);
      document.body.append(toggle);

      toggle.addEventListener('click', function () {
        var next = currentTheme() === 'dark' ? 'light' : 'dark';
        savedPreference = next;
        storePreference(next);
        applyTheme(next);
      });
    }

    applyTheme(currentTheme());
    if (!savedPreference) mountThemeChooser(toggle);
  }

  function mountThemeChooser(toggle) {
    if (document.querySelector('[data-site-theme-chooser]')) return;

    var chooser = createElement('dialog', 'site-theme-chooser');
    chooser.dataset.siteThemeChooser = '';
    chooser.setAttribute('aria-labelledby', 'site-theme-chooser-title');
    chooser.setAttribute('aria-describedby', 'site-theme-chooser-description');

    var eyebrow = createElement('p', 'site-theme-chooser__eyebrow', 'Preferensi tampilan');
    var title = createElement('h2', 'site-theme-chooser__title', 'Pilih tampilan Anda');
    title.id = 'site-theme-chooser-title';
    var description = createElement(
      'p',
      'site-theme-chooser__description',
      'Pilih tema terang atau gelap. Pilihan ini tidak memengaruhi desain kartu nama Anda.',
    );
    description.id = 'site-theme-chooser-description';

    var choices = createElement('div', 'site-theme-chooser__choices');
    choices.append(
      themeChoice('light', 'Terang', 'Latar terang dengan teks gelap'),
      themeChoice('dark', 'Gelap', 'Latar gelap dengan teks terang'),
    );
    chooser.append(eyebrow, title, description, choices);
    chooser.addEventListener('cancel', function (event) {
      event.preventDefault();
    });

    document.body.append(chooser);
    if (typeof chooser.showModal === 'function') chooser.showModal();
    else chooser.setAttribute('open', '');

    var firstChoice = chooser.querySelector('[data-site-theme-choice="light"]');
    if (firstChoice instanceof HTMLButtonElement) firstChoice.focus();

    function themeChoice(theme, label, detail) {
      var button = createElement('button', 'site-theme-chooser__choice');
      button.type = 'button';
      button.dataset.siteThemeChoice = theme;
      button.append(
        createElement('strong', 'site-theme-chooser__choice-title', label),
        createElement('span', 'site-theme-chooser__choice-detail', detail),
      );
      button.addEventListener('click', function () {
        savedPreference = theme;
        storePreference(theme);
        applyTheme(theme);
        if (typeof chooser.close === 'function') chooser.close();
        chooser.remove();
        toggle.focus();
      });
      return button;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountThemeControls, { once: true });
  } else {
    mountThemeControls();
  }

  function followSystemTheme(event) {
    if (!savedPreference) applyTheme(event.matches ? 'dark' : 'light');
  }

  if (typeof systemQuery.addEventListener === 'function') {
    systemQuery.addEventListener('change', followSystemTheme);
  } else if (typeof systemQuery.addListener === 'function') {
    systemQuery.addListener(followSystemTheme);
  }
}());
