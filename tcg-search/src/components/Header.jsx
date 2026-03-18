import { useEffect, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams, useLocation } from 'react-router-dom';
import logo from '../assets/tcg-search-logo.svg';

export default function Header() {
  const navigate = useNavigate();
  const { eventId } = useParams();
  const [searchParams] = useSearchParams();
  const { pathname } = useLocation();
  const isOnScanPage = pathname.endsWith('/scan');

  const scrollToSearch = useCallback(() => {
    if (isOnScanPage) {
      navigate(`/${eventId}`, { replace: true, state: { scrollToSearch: true } });
      return;
    }
    const searchBox = document.querySelector('.ais-SearchBox-input');
    if (searchBox) {
      searchBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
      searchBox.focus();
    }
  }, [isOnScanPage, navigate, eventId]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        scrollToSearch();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [scrollToSearch]);

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
      <div className="header-buttons">
        <button
          className="header-search-button header-scan-button"
          onClick={() => navigate({ pathname: `/${eventId}/scan`, search: searchParams.toString() ? `?${searchParams.toString()}` : '' })}
          aria-label="Scan a card"
          title="Scan a card"
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
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
        </button>
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
      </div>
    </header>
  );
}
