import React from 'react';
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
              <FilterDropdown attribute="set_name" placeholder="Set" />
              <FilterDropdown attribute="card_type" placeholder="Type" />
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
