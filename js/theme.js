const STORAGE_KEY = 'pentepal-theme';

const SUN_ICON = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M20.5 14.5A8.5 8.5 0 1 1 9.5 3.5a7 7 0 0 0 11 11z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/></svg>`;

const MOON_ICON = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 3a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0V4a1 1 0 0 1 1-1zM12 19a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0v-1a1 1 0 0 1 1-1zM21 11a1 1 0 0 1 1 1 1 1 0 0 1-1 1h-1a1 1 0 1 1 0-2h1zM5 11a1 1 0 0 1 1 1 1 1 0 0 1-1 1H4a1 1 0 1 1 0-2h1zM18.4 5.6a1 1 0 0 1 0 1.4l-.7.7a1 1 0 1 1-1.4-1.4l.7-.7a1 1 0 0 1 1.4 0zM7.7 16.3a1 1 0 0 1 0 1.4l-.7.7a1 1 0 1 1-1.4-1.4l.7-.7a1 1 0 0 1 1.4 0zM18.4 18.4a1 1 0 0 1-1.4 0l-.7-.7a1 1 0 1 1 1.4-1.4l.7.7a1 1 0 0 1 0 1.4zM7.7 7.7a1 1 0 0 1-1.4 0l-.7-.7a1 1 0 0 1 1.4-1.4l.7.7a1 1 0 0 1 0 1.4z" fill="currentColor"/><circle cx="12" cy="12" r="4.2" fill="currentColor"/></svg>`;

function getInitialTheme() {
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  window.localStorage.setItem(STORAGE_KEY, theme);
}

// Call once per page, passing the button element that should toggle the theme.
export function initThemeToggle(buttonEl) {
  let theme = getInitialTheme();
  applyTheme(theme);

  function render() {
    buttonEl.innerHTML = theme === 'dark' ? MOON_ICON : SUN_ICON;
    buttonEl.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
  }
  render();

  buttonEl.addEventListener('click', () => {
    theme = theme === 'light' ? 'dark' : 'light';
    applyTheme(theme);
    render();
  });
}

// Applies the saved/preferred theme immediately, before the toggle button
// even exists — prevents a flash of the wrong theme on page load.
applyTheme(getInitialTheme());
