import { useEffect } from 'react';
import { searchClient, indexName, indexNamePriceAsc, indexNamePriceDesc } from '../utilities/algolia';
import {
  Configure,
  Hits,
  InstantSearch,
  Pagination,
  SearchBox,
  SortBy,
  NoResultsBoundary,
  NoResults
} from 'react-instantsearch';
import aa from 'search-insights';
import { userToken } from '../utilities/algolia';

// Set user token for insights
aa('setUserToken', userToken);
import Header from './Header';
import Hit from './Hit';
import FilterDropdown from './FilterDropdown';
import Carousel from './Carousel';

export default function Search() {
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

  return (
    <div>
      <Header />
      <div className="container">
        <InstantSearch
          searchClient={searchClient}
          indexName={indexNamePriceDesc}
          routing={true}
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

          {/* Top 10 Carousel - separate InstantSearch instance */}
          <Carousel
            title="⭐ Top 10 Chase Cards"
            filters="is_top_10_chase_card:true"
            hitsPerPage={10}
          />

          <div className="search-header">
            <div className="search-controls-row">
              <SearchBox placeholder="Search for cards" className="searchbox" />
              <FilterDropdown attribute="set_name" placeholder="All Sets" />
              <FilterDropdown attribute="card_type" placeholder="All Types" />
              <SortBy
                items={[
                  { label: 'Relevance', value: indexName },
                  { label: 'Sort Price ↑', value: indexNamePriceAsc },
                  { label: 'Sort Price ↓', value: indexNamePriceDesc }
                ]}
              />
            </div>
          </div>

          <div className="search-panel">
            <div className="search-panel__results">
              <NoResultsBoundary fallback={<NoResults />}>
                <Hits hitComponent={Hit} />
                <div className="pagination">
                  <Pagination />
                </div>
              </NoResultsBoundary>
            </div>
          </div>
        </InstantSearch>
      </div>
    </div>
  );
}
