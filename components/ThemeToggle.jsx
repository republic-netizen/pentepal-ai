export default function ThemeToggle({ theme, onToggle, variant = 'light' }) {
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={`theme-toggle ${variant}`}
    >
      {isDark ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 3a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0V4a1 1 0 0 1 1-1zM12 19a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0v-1a1 1 0 0 1 1-1zM21 11a1 1 0 0 1 1 1 1 1 0 0 1-1 1h-1a1 1 0 1 1 0-2h1zM5 11a1 1 0 0 1 1 1 1 1 0 0 1-1 1H4a1 1 0 1 1 0-2h1zM18.4 5.6a1 1 0 0 1 0 1.4l-.7.7a1 1 0 1 1-1.4-1.4l.7-.7a1 1 0 0 1 1.4 0zM7.7 16.3a1 1 0 0 1 0 1.4l-.7.7a1 1 0 1 1-1.4-1.4l.7-.7a1 1 0 0 1 1.4 0zM18.4 18.4a1 1 0 0 1-1.4 0l-.7-.7a1 1 0 1 1 1.4-1.4l.7.7a1 1 0 0 1 0 1.4zM7.7 7.7a1 1 0 0 1-1.4 0l-.7-.7a1 1 0 0 1 1.4-1.4l.7.7a1 1 0 0 1 0 1.4z"
            fill="currentColor"
          />
          <circle cx="12" cy="12" r="4.2" fill="currentColor" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path
            d="M20.5 14.5A8.5 8.5 0 1 1 9.5 3.5a7 7 0 0 0 11 11z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </svg>
      )}

      <style jsx>{`
        .theme-toggle {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          border: none;
          flex-shrink: 0;
        }
        .theme-toggle.light {
          background: rgba(255, 255, 255, 0.14);
          color: var(--white);
        }
        .theme-toggle.light:hover {
          background: rgba(255, 255, 255, 0.24);
        }
        .theme-toggle.subtle {
          background: var(--foam);
          color: var(--navy);
          border: 1.5px solid var(--line);
        }
        .theme-toggle.subtle:hover {
          background: var(--line);
        }
      `}</style>
    </button>
  );
}
