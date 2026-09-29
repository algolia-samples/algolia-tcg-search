import { vi } from 'vitest';
import { render, screen } from '@testing-library/react';

/* eslint-disable react/prop-types -- test doubles, not components */
vi.mock('react-instantsearch', () => ({
  // Stubbed down to the header it is handed, the only part these tests use.
  Carousel: function Carousel({ items, headerComponent: Header }) {
    return (
      <div data-testid="carousel">
        {Header ? (
          <Header
            nbItems={items.length}
            canScrollLeft={false}
            canScrollRight
            scrollLeft={() => {}}
            scrollRight={() => {}}
          />
        ) : null}
      </div>
    );
  },
}));
/* eslint-enable react/prop-types */

const { deriveGroupFacetFilters, createGroupedResultsTool } = await import(
  './ChatGroupedResultsTool'
);

const card = (objectID, attrs = {}) => ({ objectID, pokemon_name: objectID, ...attrs });

describe('deriveGroupFacetFilters', () => {
  // The "gold fire cards" turn: three searches, one of them carrying two
  // queries whose hits come back merged, split into a Gold group and a Fire
  // group. Nothing links group to query — but the cards share the facet.
  test('derives the shared card_type of a Gold group', () => {
    const items = [
      card('sv08-247', { card_type: 'Gold', pokemon_types: ['Lightning'] }),
      card('sv10-240', { card_type: 'Gold', pokemon_types: ['Water'] }),
      card('sv10-242', { card_type: 'Gold', pokemon_types: ['Psychic'] }),
    ];
    expect(deriveGroupFacetFilters(items)).toEqual([['card_type:Gold']]);
  });

  test('derives the shared pokemon_type of a Fire group', () => {
    const items = [
      card('me02-109', { card_type: 'Illustration Rare', pokemon_types: ['Fire'] }),
      card('me01-138', { card_type: 'Special Illustration Rare', pokemon_types: ['Fire'] }),
    ];
    expect(deriveGroupFacetFilters(items)).toEqual([['pokemon_types:Fire']]);
  });

  // A one-card group still yields the right filter, and AND-ing is what makes
  // "View all" a superset rather than a coincidence.
  test('ANDs both attributes when a group shares both', () => {
    const items = [card('me02-130', { card_type: 'Gold', pokemon_types: ['Fire'] })];
    expect(deriveGroupFacetFilters(items)).toEqual([
      ['card_type:Gold'],
      ['pokemon_types:Fire'],
    ]);
  });

  // The bird case: five different types, nothing in common, no promise to make.
  test('returns undefined when the cards share no facet', () => {
    const items = [
      card('a', { card_type: 'Gold', pokemon_types: ['Lightning'] }),
      card('b', { card_type: 'Illustration Rare', pokemon_types: ['Fire'] }),
      card('c', { card_type: 'Full Art', pokemon_types: ['Water'] }),
    ];
    expect(deriveGroupFacetFilters(items)).toBeUndefined();
  });

  test('intersects multi-valued types rather than taking the first card', () => {
    const items = [
      card('a', { pokemon_types: ['Fire', 'Flying'] }),
      card('b', { pokemon_types: ['Fire', 'Water'] }),
    ];
    expect(deriveGroupFacetFilters(items)).toEqual([['pokemon_types:Fire']]);
  });

  describe('set_name fallback', () => {
    test('uses a shared set when nothing better is shared', () => {
      const items = [
        card('a', { card_type: 'Gold', set_name: 'Surging Sparks' }),
        card('b', { card_type: 'Full Art', set_name: 'Surging Sparks' }),
      ];
      expect(deriveGroupFacetFilters(items)).toEqual([['set_name:Surging Sparks']]);
    });

    // A card_type or type is the better promise, so the set is not piled on —
    // it would narrow "all Gold cards" to "Gold cards from this one set".
    test('is ignored when a stronger facet is shared', () => {
      const items = [
        card('a', { card_type: 'Gold', set_name: 'Surging Sparks' }),
        card('b', { card_type: 'Gold', set_name: 'Surging Sparks' }),
      ];
      expect(deriveGroupFacetFilters(items)).toEqual([['card_type:Gold']]);
    });
  });

  describe('malformed input', () => {
    test.each([
      ['no items', undefined],
      ['empty items', []],
      ['items with no facetable attributes', [card('a'), card('b')]],
      ['a card missing the attribute the others share', [card('a', { card_type: 'Gold' }), card('b')]],
    ])('returns undefined for %s', (_label, items) => {
      expect(deriveGroupFacetFilters(items)).toBeUndefined();
    });
  });
});

describe('createGroupedResultsTool', () => {
  // mergeToolOptions inherits streamInput only while we leave it undefined.
  test('returns a layout component and nothing else', () => {
    const tool = createGroupedResultsTool(() => null);
    expect(Object.keys(tool)).toEqual(['layoutComponent']);
    expect(typeof tool.layoutComponent).toBe('function');
  });
});

describe('the rendered curated block', () => {
  function renderBlock({ groups, state = 'output-available' }) {
    const message = {
      type: 'tool-algolia_grouped_results',
      toolCallId: 'grouped-1',
      state,
      input: {
        intro: 'Here you go',
        groups: groups.map(({ title, cards }) => ({
          title,
          why: 'because',
          results: cards.map(({ objectID }) => ({ objectID, why: 'nice card' })),
        })),
      },
      output: { status: 'success' },
    };
    const applyFilters = vi.fn(() => ({}));
    const onClose = vi.fn();
    const records = new Map(
      groups.flatMap(({ cards }) => cards.map((c) => [c.objectID, c]))
    );

    const Layout = createGroupedResultsTool(() => null).layoutComponent;
    const utils = render(
      <Layout
        context={{
          message,
          messages: [{ role: 'assistant', parts: [message] }],
          records,
          status: 'ready',
          applyFilters,
          onClose,
          sendEvent: vi.fn(),
          insightsEventContext: {},
        }}
      />
    );
    return { ...utils, applyFilters, onClose };
  }

  const viewAlls = () => screen.queryAllByRole('button', { name: /view all/i });

  const GOLD = [
    card('sv08-247', { card_type: 'Gold' }),
    card('sv10-240', { card_type: 'Gold' }),
  ];
  const FIRE = [
    card('me02-109', { card_type: 'Illustration Rare', pokemon_types: ['Fire'] }),
    card('me01-138', { card_type: 'Special Illustration Rare', pokemon_types: ['Fire'] }),
  ];
  const MIXED = [
    card('a', { card_type: 'Gold', pokemon_types: ['Lightning'] }),
    card('b', { card_type: 'Full Art', pokemon_types: ['Water'] }),
  ];

  // The screenshot that prompted this: both carousels should have had one.
  test('gives every group that shares a facet its own View all', () => {
    renderBlock({
      groups: [
        { title: 'Other Gold Cards', cards: GOLD },
        { title: 'Alternative Fire Cards', cards: FIRE },
      ],
    });
    expect(viewAlls()).toHaveLength(2);
  });

  test('offers none to a group whose cards share nothing', () => {
    renderBlock({ groups: [{ title: 'Legendary Birds', cards: MIXED }] });
    expect(viewAlls()).toHaveLength(0);
  });

  test('offers a button per qualifying group only', () => {
    renderBlock({
      groups: [
        { title: 'Other Gold Cards', cards: GOLD },
        { title: 'Legendary Birds', cards: MIXED },
      ],
    });
    expect(viewAlls()).toHaveLength(1);
  });

  test('offers none while the block is still streaming', () => {
    renderBlock({
      groups: [{ title: 'Other Gold Cards', cards: GOLD }],
      state: 'input-streaming',
    });
    expect(viewAlls()).toHaveLength(0);
  });

  // App.css hides a lone group's `why` with
  // `.ais-ChatToolGroupedResults:not(:has(.group ~ .group)) .groupWhy`.
  // jsdom does not apply that stylesheet, so this guards the DOM shape the
  // selector depends on: sibling `-group` divs, each holding its own
  // `-groupWhy`. If the library flattens or renames either, the rule silently
  // stops matching and this fails instead.
  describe('the DOM shape the single-group CSS rule relies on', () => {
    const groupsIn = (c) => c.querySelectorAll('.ais-ChatToolGroupedResults-group');

    test('renders one -group holding a -groupWhy when there is one group', () => {
      const { container } = renderBlock({
        groups: [{ title: 'Other Gold Cards', cards: GOLD }],
      });
      const groups = groupsIn(container);
      expect(groups).toHaveLength(1);
      expect(groups[0].querySelector('.ais-ChatToolGroupedResults-groupWhy')).toBeInTheDocument();
    });

    test('renders -group divs as siblings when there are several', () => {
      const { container } = renderBlock({
        groups: [
          { title: 'Other Gold Cards', cards: GOLD },
          { title: 'Alternative Fire Cards', cards: FIRE },
        ],
      });
      const groups = groupsIn(container);
      expect(groups).toHaveLength(2);
      expect(groups[0].parentElement).toBe(groups[1].parentElement);
    });
  });

  test("applies that group's filter and closes the panel when clicked", () => {
    const { applyFilters, onClose } = renderBlock({
      groups: [
        { title: 'Other Gold Cards', cards: GOLD },
        { title: 'Alternative Fire Cards', cards: FIRE },
      ],
    });

    viewAlls()[1].click();
    expect(applyFilters).toHaveBeenCalledWith({
      query: '',
      facetFilters: [['pokemon_types:Fire']],
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
