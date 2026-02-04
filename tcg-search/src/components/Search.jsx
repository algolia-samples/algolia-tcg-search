import { searchClient, indexName, indexNamePriceAsc, indexNamePriceDesc } from '../utilities/algolia';
import {
  Configure,
  Hits,
  InstantSearch,
  Pagination,
  SearchBox,
  SortBy
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

          {/* Top 10 Carousel - separate InstantSearch instance */}
          <Carousel
            title="⭐ Top 10 Chase Cards"
            filters="is_top_10_chase_card:true"
            hitsPerPage={20}
          />

          <div className="search-panel">
            <div className="search-panel__results">
              <Hits hitComponent={Hit} />
              <div className="pagination">
                <Pagination />
              </div>
            </div>
          </div>
        </InstantSearch>
      </div>
    </div>
  );
}
