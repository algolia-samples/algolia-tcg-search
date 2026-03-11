import { vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { forwardRef as reactForwardRef } from 'react';
import Hit from './Hit';

vi.mock('react-instantsearch', () => ({
  Highlight: ({ hit, attribute }) => <span>{hit[attribute]}</span>,
}));

vi.mock('./OptimizedImage', () => ({
  default: reactForwardRef(({ alt, onClick, src }, _ref) => (
    <img alt={alt} src={src} onClick={onClick} />
  )),
}));

vi.mock('./CardModal', () => ({
  default: ({ isOpen }) => isOpen ? <div data-testid="card-modal" /> : null,
}));

vi.mock('./InventoryBar', () => ({
  default: ({ current, initial }) => (
    <div data-testid="inventory-bar" data-current={current} data-initial={initial} />
  ),
}));

const baseHit = {
  objectID: 'card-1',
  pokemon_name: 'Pikachu',
  number: '25',
  estimated_value: 10.50,
  card_type: 'Holo',
  set_name: 'Base Set',
  machine_quantity: 5,
  initial_quantity: 10,
  image_small: 'https://example.com/pikachu-small.jpg',
  image_large: 'https://example.com/pikachu-large.jpg',
  is_top_10_chase_card: false,
  is_chase_card: false,
  is_full_art: false,
  is_classic_pokemon: false,
};

describe('Hit', () => {
  describe('basic rendering', () => {
    test('renders pokemon name', () => {
      render(<Hit hit={baseHit} />);
      expect(screen.getByText('Pikachu')).toBeInTheDocument();
    });

    test('renders card number', () => {
      render(<Hit hit={baseHit} />);
      expect(screen.getByText('#25')).toBeInTheDocument();
    });

    test('renders formatted price', () => {
      render(<Hit hit={baseHit} />);
      expect(screen.getByText('$10.50')).toBeInTheDocument();
    });

    test('renders non-breaking space when price is null', () => {
      const { container } = render(<Hit hit={{ ...baseHit, estimated_value: null }} />);
      const priceEl = container.querySelector('.hit-price-prominent');
      expect(priceEl.textContent).toBe('\u00A0');
    });

    test('renders card image', () => {
      render(<Hit hit={baseHit} />);
      expect(screen.getByAltText('Pikachu Pokemon card')).toBeInTheDocument();
    });

    test('renders placeholder div when no image', () => {
      const { container } = render(<Hit hit={{ ...baseHit, image_small: null, image_large: null }} />);
      expect(container.querySelector('.card')).toBeInTheDocument();
      expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });
  });

  describe('claimed state', () => {
    test('shows CLAIMED badge when machine_quantity is 0', () => {
      render(<Hit hit={{ ...baseHit, machine_quantity: 0 }} />);
      expect(screen.getByText('CLAIMED')).toBeInTheDocument();
    });

    test('shows CLAIMED badge when machine_quantity is null', () => {
      render(<Hit hit={{ ...baseHit, machine_quantity: null }} />);
      expect(screen.getByText('CLAIMED')).toBeInTheDocument();
    });

    test('no CLAIMED badge when machine_quantity > 0', () => {
      render(<Hit hit={baseHit} />);
      expect(screen.queryByText('CLAIMED')).not.toBeInTheDocument();
    });
  });

  describe('card type badge', () => {
    test('renders card type badge', () => {
      render(<Hit hit={baseHit} />);
      expect(screen.getByText('Holo')).toBeInTheDocument();
    });

    test('does not render card type section when card_type is absent', () => {
      render(<Hit hit={{ ...baseHit, card_type: undefined }} />);
      expect(screen.queryByText('Type:')).not.toBeInTheDocument();
    });
  });

  describe('set name', () => {
    test('renders plain set name', () => {
      render(<Hit hit={baseHit} />);
      expect(screen.getByText('Base Set')).toBeInTheDocument();
    });

    test('splits set name on colon', () => {
      render(<Hit hit={{ ...baseHit, set_name: 'Scarlet & Violet: Prismatic Evolutions' }} />);
      expect(screen.getByText(/Scarlet & Violet:/)).toBeInTheDocument();
      expect(screen.getByText(/Prismatic Evolutions/)).toBeInTheDocument();
    });
  });

  describe('inventory', () => {
    test('renders inventory bar and count when machine_quantity is set', () => {
      render(<Hit hit={baseHit} />);
      expect(screen.getByTestId('inventory-bar')).toBeInTheDocument();
      expect(screen.getByText('5 left')).toBeInTheDocument();
    });

    test('shows "Last one!" when machine_quantity is 1', () => {
      render(<Hit hit={{ ...baseHit, machine_quantity: 1 }} />);
      expect(screen.getByText('Last one!')).toBeInTheDocument();
    });

    test('does not render inventory row when machine_quantity is undefined', () => {
      render(<Hit hit={{ ...baseHit, machine_quantity: undefined }} />);
      expect(screen.queryByTestId('inventory-bar')).not.toBeInTheDocument();
    });
  });

  describe('special badges', () => {
    test('Top 10 badge is active when is_top_10_chase_card is true', () => {
      render(<Hit hit={{ ...baseHit, is_top_10_chase_card: true }} />);
      expect(screen.getByText(/Top 10!/)).toHaveClass('active');
    });

    test('Top 10 badge is inactive when is_top_10_chase_card is false', () => {
      render(<Hit hit={baseHit} />);
      expect(screen.getByText(/Top 10!/)).toHaveClass('inactive');
    });

    test('Chase Card badge is active when is_chase_card is true', () => {
      render(<Hit hit={{ ...baseHit, is_chase_card: true }} />);
      expect(screen.getByText(/Chase Card/)).toHaveClass('active');
    });

    test('Full Art badge is active when is_full_art is true', () => {
      render(<Hit hit={{ ...baseHit, is_full_art: true }} />);
      expect(screen.getByText(/Full Art/)).toHaveClass('active');
    });

    test('Gen 1 badge is active when is_classic_pokemon is true', () => {
      render(<Hit hit={{ ...baseHit, is_classic_pokemon: true }} />);
      expect(screen.getByText(/Gen 1/)).toHaveClass('active');
    });
  });

  describe('modal', () => {
    test('modal is closed by default', () => {
      render(<Hit hit={baseHit} />);
      expect(screen.queryByTestId('card-modal')).not.toBeInTheDocument();
    });

    test('clicking the image opens the modal', () => {
      render(<Hit hit={baseHit} />);
      const img = screen.getByAltText('Pikachu Pokemon card');
      fireEvent.click(img);
      expect(screen.getByTestId('card-modal')).toBeInTheDocument();
    });
  });
});
