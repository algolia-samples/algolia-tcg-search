import { vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ChatItemComponent from './ChatItemComponent';

// The card's own concerns are what matter here. The image pipeline, the modal
// and the inventory bar each have their own suites, so they are stubbed down to
// markers that let us assert this component's layout and branching.
vi.mock('./OptimizedImage', () => ({
  default: function OptimizedImage({ alt, src }) {
    return <img alt={alt} src={src} />;
  },
}));

vi.mock('./CardModal', () => ({
  default: function CardModal({ isOpen }) {
    return isOpen ? <div data-testid="card-modal" /> : null;
  },
}));

vi.mock('./InventoryBar', () => ({
  default: function InventoryBar({ current, initial }) {
    return <div data-testid="inventory-bar" data-current={current} data-initial={initial} />;
  },
}));

const baseItem = {
  objectID: 'me02-130',
  pokemon_name: 'Mega Charizard X ex',
  set_name: 'Mega Evolution Phantasmal Flame',
  image_small: 'https://example.test/low.webp',
  image_large: 'https://example.test/high.webp',
  estimated_value: 369.2,
  machine_quantity: 3,
  initial_quantity: 5,
};

function renderCard(overrides = {}) {
  return render(<ChatItemComponent item={{ ...baseItem, ...overrides }} />);
}

const why = (container) => container.querySelector('.carousel-hit-why');

describe('ChatItemComponent — curated reason', () => {
  // As of instantsearch-ui-components 0.41.0 the Grouped Results tool hands each
  // result's own `why` to the item component under __groupedToolResult. Before
  // that it was accepted by the tool and silently discarded.
  test('renders the per-result why from __groupedToolResult', () => {
    const { container } = renderCard({
      __groupedToolResult: { objectID: 'me02-130', why: 'Gold Rare, full-art holo' },
    });
    expect(why(container)).toHaveTextContent('Gold Rare, full-art holo');
  });

  // Cards from a raw search carousel have no curated reason. They must render
  // exactly as before rather than leaving an empty line in the card.
  test('renders no why element when the card was not curated', () => {
    const { container } = renderCard();
    expect(why(container)).toBeNull();
  });

  test('renders no why element when the tool result carries no why', () => {
    const { container } = renderCard({ __groupedToolResult: { objectID: 'me02-130' } });
    expect(why(container)).toBeNull();
  });

  test('treats a whitespace-only why as absent', () => {
    const { container } = renderCard({ __groupedToolResult: { why: '   ' } });
    expect(why(container)).toBeNull();
  });

  // The reason sits between the price and the inventory row: the placement is
  // load-bearing, since the card is fixed-height and the set name follows.
  test('places the why after the price and before the inventory row', () => {
    const { container } = renderCard({ __groupedToolResult: { why: 'Secret art rare' } });
    const classes = [...container.querySelectorAll('.carousel-hit-details > *')].map(
      (el) => el.className || el.getAttribute('data-testid')
    );
    expect(classes).toEqual([
      'carousel-hit-name',
      'carousel-hit-price',
      'carousel-hit-why',
      'carousel-inventory-row',
      'carousel-hit-set',
    ]);
  });
});

describe('ChatItemComponent — price', () => {
  test('formats a value to two decimal places', () => {
    const { container } = renderCard({ estimated_value: 369.2 });
    expect(container.querySelector('.carousel-hit-price')).toHaveTextContent('$369.20');
  });

  test('renders a non-breaking space when the value is missing', () => {
    const { container } = renderCard({ estimated_value: undefined });
    expect(container.querySelector('.carousel-hit-price').textContent).toBe(' ');
  });

  // 0 is a real price, not a missing one.
  test('renders a zero value rather than blanking it', () => {
    const { container } = renderCard({ estimated_value: 0 });
    expect(container.querySelector('.carousel-hit-price')).toHaveTextContent('$0.00');
  });
});

describe('ChatItemComponent — inventory', () => {
  test('shows the remaining count', () => {
    renderCard({ machine_quantity: 3 });
    expect(screen.getByText('3 left')).toBeInTheDocument();
  });

  test('shows "Last one!" at a quantity of one', () => {
    renderCard({ machine_quantity: 1 });
    expect(screen.getByText('Last one!')).toBeInTheDocument();
  });

  test('marks the card CLAIMED at zero', () => {
    const { container } = renderCard({ machine_quantity: 0 });
    expect(screen.getByText('CLAIMED')).toBeInTheDocument();
    expect(container.querySelector('.carousel-hit-image-wrapper')).toHaveClass('claimed');
  });

  test('omits the inventory row entirely when quantity is unknown', () => {
    const { container } = renderCard({ machine_quantity: undefined });
    expect(container.querySelector('.carousel-inventory-row')).toBeNull();
  });
});

describe('ChatItemComponent — image', () => {
  test('renders the card image with an accessible name', () => {
    renderCard();
    expect(
      screen.getByAltText('Mega Charizard X ex Pokemon card')
    ).toHaveAttribute('src', 'https://example.test/low.webp');
  });

  test('falls back to a placeholder bearing the name when there is no image', () => {
    const { container } = renderCard({ image_small: undefined });
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('.card')).toHaveTextContent('Mega Charizard X ex');
  });
});
