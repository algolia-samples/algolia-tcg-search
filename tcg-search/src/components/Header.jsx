import { useEffect } from 'react';
import logo from '../assets/tcg-search-logo.svg';

export default function Header() {
  const scrollToSearch = () => {
    const searchBox = document.querySelector('.ais-SearchBox-input');
    if (searchBox) {
      searchBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
      searchBox.focus();
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Check for cmd/ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        scrollToSearch();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <header className="header">
      <div className="header-content">
        <a href="/">
          <img
            className="header-logo"
            src={logo}
            alt="TCG Search Logo"
            height="100px"
          />
        </a>
        <p className="header-subtitle">
          Gotta Find &apos;Em All!
        </p>
      </div>
      <button
        className="header-search-button"
        onClick={scrollToSearch}
        aria-label="Jump to search"
        title="Jump to search (⌘K)"
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
      </button>
    </header>
  );
}
