import {
  ArrowRightIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  createButtonComponent,
  createGroupedResultsToolComponent,
} from 'instantsearch-ui-components';
import PropTypes from 'prop-types';
import { createElement, Fragment, useCallback, useEffect, useRef } from 'react';
import { Carousel } from 'react-instantsearch';
import { scrollToSearchBox } from '../utilities/dom';

// Why this component exists at all: the Grouped Results tool ships no "View all".
// Only the *search* tool's carousel has one, and the search tool is hidden on any
// turn the agent curates — which the prompt makes every turn with cards. So the
// better the agent behaves, the more certainly the visitor loses the route from
// chat into the full search UI. This restores it, per group.
//
// `createGroupedResultsToolComponent` is the supported way in: it keeps the
// progressive rendering and the objectID hydration (including the guard against a
// half-streamed objectID hydrating the wrong card) and leaves the carousel and
// anything around it to us.

const Button = createButtonComponent({ createElement });

const GroupedResultsUIComponent = createGroupedResultsToolComponent({
  createElement,
  Fragment,
  useEffect,
  useRef,
});

// Attributes a group's filter may be built from: retrieved on every hydrated
// card (agent-config.json `attributesToRetrieve`) and facetable in the index.
const GROUP_FACET_ATTRIBUTES = ['card_type', 'pokemon_types'];
// Only when nothing above is shared. "More from this set" is a weaker promise
// than "more Gold cards", but still a true one.
const GROUP_FACET_FALLBACK = 'set_name';

/**
 * The values of `attribute` that every card in the group has.
 *
 * Handles both single-valued attributes (`card_type`) and multi-valued ones
 * (`pokemon_types`, where a card can be Fire *and* Flying) by intersecting.
 */
function sharedValues(items, attribute) {
  let shared = null;

  for (const item of items) {
    const raw = item?.[attribute];
    const values = Array.isArray(raw) ? raw : raw == null ? [] : [raw];
    if (values.length === 0) return [];
    shared =
      shared === null
        ? new Set(values)
        : new Set(values.filter((value) => shared.has(value)));
    if (shared.size === 0) return [];
  }

  return shared ? [...shared] : [];
}

/**
 * The facet filters a group's "View all" should apply, or undefined when the
 * group has nothing in common worth offering.
 *
 * Derived from the cards rather than from the search that found them, because
 * the payload does not say which search produced which group — and often no
 * single search did. "gold fire cards" made three search calls, one of them
 * carrying two queries whose hits come back merged, and then split the cards
 * into a Gold group and a Fire group. Nothing links group to query. But the
 * cards themselves do share `card_type: Gold` and `pokemon_types: Fire`, so the
 * group's own contents are the honest source.
 *
 * This is also what makes the label true: the filter is a *superset* of the
 * group, which is what "View all" promises. Groups whose cards share nothing —
 * "Legendary Birds", five different types — correctly get no button.
 */
export function deriveGroupFacetFilters(items) {
  if (!Array.isArray(items) || items.length === 0) return undefined;

  // Each attribute:value in its own array, which Algolia reads as AND between
  // arrays. A one-card group therefore gets Gold AND Fire, which is right.
  const filters = GROUP_FACET_ATTRIBUTES.flatMap((attribute) =>
    sharedValues(items, attribute).map((value) => [`${attribute}:${value}`])
  );
  if (filters.length > 0) return filters;

  const sets = sharedValues(items, GROUP_FACET_FALLBACK);
  return sets.length === 1 ? [[`${GROUP_FACET_FALLBACK}:${sets[0]}`]] : undefined;
}

/**
 * The per-group carousel header: result count, an optional "View all", and the
 * scroll buttons. Replicated from react-instantsearch's own grouped-results
 * header, class names included, so `instantsearch.css` still styles it —
 * supplying our own `groupCarouselComponent` means the library's header no
 * longer comes with it.
 */
function GroupCarouselHeader({
  nbItems,
  canScrollLeft,
  canScrollRight,
  scrollLeft,
  scrollRight,
  onViewAll,
}) {
  return (
    <div className="ais-ChatToolGroupedResultsCarouselHeader">
      <div className="ais-ChatToolGroupedResultsCarouselHeaderCount">
        {nbItems} result{nbItems > 1 ? 's' : ''}
      </div>
      {onViewAll && (
        <Button
          variant="ghost"
          size="sm"
          className="chat-grouped-results-view-all"
          onClick={onViewAll}
        >
          View all
          <ArrowRightIcon createElement={createElement} />
        </Button>
      )}
      <div className="ais-ChatToolGroupedResultsCarouselHeaderScrollButtons">
        <Button
          variant="outline"
          size="sm"
          iconOnly
          aria-label="Previous"
          onClick={scrollLeft}
          disabled={!canScrollLeft}
          className="ais-ChatToolGroupedResultsCarouselHeaderScrollButton"
        >
          <ChevronLeftIcon createElement={createElement} />
        </Button>
        <Button
          variant="outline"
          size="sm"
          iconOnly
          aria-label="Next"
          onClick={scrollRight}
          disabled={!canScrollRight}
          className="ais-ChatToolGroupedResultsCarouselHeaderScrollButton"
        >
          <ChevronRightIcon createElement={createElement} />
        </Button>
      </div>
    </div>
  );
}

GroupCarouselHeader.propTypes = {
  nbItems: PropTypes.number.isRequired,
  canScrollLeft: PropTypes.bool,
  canScrollRight: PropTypes.bool,
  scrollLeft: PropTypes.func,
  scrollRight: PropTypes.func,
  /** Omitted when the group's cards share no facet worth offering. */
  onViewAll: PropTypes.func,
};

/**
 * Builds the `tools` entry for the Grouped Results tool.
 *
 * Deliberately returns only `layoutComponent`: react-instantsearch's
 * `mergeToolOptions` then inherits `streamInput` (and any future `shouldRender`)
 * from its own default, so progressive rendering keeps working without us
 * restating it — and keeps working if the library changes its mind.
 */
export function createGroupedResultsTool(itemComponent) {
  function GroupedResultsLayout(toolProps) {
    const { message, applyFilters, onClose } = toolProps.context;

    // Wait for the block to finish streaming, so a button does not appear
    // beside a group whose cards are still arriving — and so the filter is
    // derived from the group's full contents, not a partial one.
    const offersViewAll =
      message?.state === 'output-available' && typeof applyFilters === 'function';

    const applyGroupFilters = useCallback(
      (facetFilters) => {
        applyFilters({ query: '', facetFilters });
        onClose?.();
        // The kiosk is a single page: closing the panel reveals the results
        // behind it, so all this has to do is bring the search box into view.
        scrollToSearchBox();
      },
      [applyFilters, onClose]
    );

    return (
      <GroupedResultsUIComponent
        toolProps={toolProps}
        translations={{ streamingLabel: 'Picking cards…' }}
        groupCarouselComponent={({ items, sendEvent }) => {
          const facetFilters = offersViewAll ? deriveGroupFacetFilters(items) : undefined;

          // Defined here because Carousel hands its header only the five props
          // it chooses, with no pass-through, so the filter has to be closed
          // over. Safe to rebuild: the header holds no state, the scroll state
          // lives in Carousel, and while the block streams the header is the
          // stable one above.
          const Header = facetFilters
            ? function HeaderWithViewAll(headerProps) {
                return (
                  <GroupCarouselHeader
                    {...headerProps}
                    onViewAll={() => applyGroupFilters(facetFilters)}
                  />
                );
              }
            : GroupCarouselHeader;

          return (
            <Carousel
              items={items}
              itemComponent={itemComponent}
              sendEvent={sendEvent}
              showNavigation={false}
              headerComponent={Header}
            />
          );
        }}
      />
    );
  }

  return { layoutComponent: GroupedResultsLayout };
}
