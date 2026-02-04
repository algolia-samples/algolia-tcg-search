import React from 'react';
import { searchClient, indexName, indexNamePriceAsc, indexNamePriceDesc } from '../utilities/algolia';
import {
  Configure,
  Hits,
  InstantSearch,
  Pagination,
  RefinementList,
  SearchBox,
  SortBy,
  ToggleRefinement,
  RangeInput
} from 'react-instantsearch';
import aa from 'search-insights';
import { userToken } from '../utilities/algolia';

// Set user token for insights
aa('setUserToken', userToken);
import Header from './Header';
import Hit from './Hit';
import Panel from './Panel';

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
              <SortBy
                items={[
                  { label: 'Sort A-Z', value: indexName },
                  { label: 'Sort Price ↑', value: indexNamePriceAsc },
                  { label: 'Sort Price ↓', value: indexNamePriceDesc }
                ]}
              />
            </div>
          </div>

          <div className="search-panel">
            <div className="search-panel__filters">
              <h2 className="search-panel__filters-header">Filters</h2>

              <Panel header="Set">
                <RefinementList
                  attribute="set_name"
                  searchable={true}
                  searchablePlaceholder="Search sets..."
                  showMore={true}
                  showMoreLimit={100}
                />
              </Panel>

              <Panel header="Card Type">
                <RefinementList
                  attribute="card_type"
                  searchable={true}
                  searchablePlaceholder="Search types..."
                  showMore={true}
                  showMoreLimit={50}
                />
              </Panel>

              <Panel header="Estimated Value">
                <RangeInput attribute="estimated_value" />
              </Panel>

              <Panel header="Special Cards">
                <ToggleRefinement
                  attribute="is_chase_card"
                  label="Chase Cards"
                />
                <ToggleRefinement
                  attribute="is_top_10_chase_card"
                  label="Top 10 Chase Cards"
                />
                <ToggleRefinement
                  attribute="is_full_art"
                  label="Full Art Cards"
                />
                <ToggleRefinement
                  attribute="is_classic_pokemon"
                  label="Classic Pokemon (Gen 1)"
                />
              </Panel>
            </div>
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
