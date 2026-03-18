import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { searchClient, getIndexNames, userToken, chatAgentId } from '../utilities/algolia';
import { useEvent } from '../context/EventContext';
import {
  Configure,
  Hits,
  InstantSearch,
  Pagination,
  PoweredBy,
  SearchBox,
  SortBy,
  useHits
} from 'react-instantsearch';
import aa from 'search-insights';
import Header from './Header';
import Hit from './Hit';
import CardModal from './CardModal';
import FilterDropdown from './FilterDropdown';
import Carousel from './Carousel';
import ClaimedCarousel from './ClaimedCarousel';
import ChatAgent from './ChatAgent';

// Set user token for insights
aa('setUserToken', userToken);

function HitsWithNoResults() {
  const { results } = useHits();
  const hasResults = results && results.hits.length > 0;

  if (!hasResults) {
    return (
      <div className="no-results">
        <h2 className="no-results-title">No cards found</h2>
        <p className="no-results-description">
          Try adjusting your search or filters to find what you&apos;re looking for.
        </p>
      </div>
    );
  }

  return (
    <>
      <Hits hitComponent={Hit} />
      <div className="pagination">
        <Pagination />
      </div>
    </>
  );
}

export default function Search() {
  const { eventConfig, loading, error } = useEvent();
  const location = useLocation();
  const [autoOpenHit, setAutoOpenHit] = useState(location.state?.autoOpenHit ?? null);
  const [autoHitClosing, setAutoHitClosing] = useState(false);
  const searchQuery = location.state?.searchQuery ?? '';

  function handleAutoHitClose() {
    setAutoHitClosing(true);
    setTimeout(() => {
      setAutoOpenHit(null);
      setAutoHitClosing(false);
    }, 250);
  }

  // Override mobile browser's default scroll-to-center behavior on input focus
  useEffect(() => {
    const handleFocus = (e) => {
      if (e.target.matches('.ais-SearchBox-input')) {
        // Small delay to override browser's default scroll
        setTimeout(() => {
          e.target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }
    };

    document.addEventListener('focus', handleFocus, true);
    return () => document.removeEventListener('focus', handleFocus, true);
  }, []);

  if (loading) return <div className="event-loading">Loading event…</div>;
  if (error || !eventConfig) return <div className="event-error">Event not found.</div>;

  const { primary, priceAsc, priceDesc } = getIndexNames(eventConfig.event_id);
  const agentId = eventConfig.agent_id || chatAgentId;

  return (
    <div>
      <Header />
      <div className="container">
        <InstantSearch
          searchClient={searchClient}
          indexName={priceDesc}
          routing={true}
          initialUiState={searchQuery ? { [priceDesc]: { query: searchQuery } } : undefined}
          insights={{
            insightsClient: aa,
            insightsInitParams: {
              useCookie: true
            }
          }}
        >
          <Configure
            hitsPerPage={12}
            clickAnalytics={true}
          />

          {/* Powered by Algolia */}
          <div className="powered-by-container">
            <span className="event-name">{eventConfig.name} (Booth {eventConfig.booth})</span>
            <PoweredBy />
          </div>

          {/* Top 10 Carousel - separate InstantSearch instance */}
          <Carousel
            title="⭐ Top 10 Chase Cards"
            filters="is_top_10_chase_card:true"
            hitsPerPage={10}
          />

          {/* Recently Claimed Carousel */}
          <ClaimedCarousel />

          <div className="search-header">
            <div className="search-controls-row">
              <SearchBox placeholder="Search for cards" className="searchbox" />
              <FilterDropdown attribute="set_name" placeholder="All Sets" />
              <FilterDropdown attribute="card_type" placeholder="All Types" />
              <SortBy
                items={[
                  { label: 'Relevance', value: primary },
                  { label: 'Sort Price ↑', value: priceAsc },
                  { label: 'Sort Price ↓', value: priceDesc }
                ]}
              />
            </div>
          </div>

          <div className="search-panel">
            <div className="search-panel__results">
              <HitsWithNoResults />
            </div>
          </div>

          {/* AI Chat Agent */}
          <ChatAgent agentId={agentId} />
        </InstantSearch>

        {autoOpenHit && (
          <CardModal
            isOpen={!autoHitClosing}
            onClose={handleAutoHitClose}
            hit={autoOpenHit}
            origin={null}
            rotation={0}
            isClosing={autoHitClosing}
            isClaimed={!autoOpenHit.machine_quantity || autoOpenHit.machine_quantity <= 0}
          />
        )}
      </div>
    </div>
  );
}
