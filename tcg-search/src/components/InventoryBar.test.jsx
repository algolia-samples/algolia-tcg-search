import { render } from '@testing-library/react';
import InventoryBar from './InventoryBar';

function getFill(container) {
  return container.querySelector('.inventory-bar-fill');
}

describe('InventoryBar', () => {
  describe('null renders (bar hidden)', () => {
    test('returns null when initial is undefined', () => {
      const { container } = render(<InventoryBar current={5} />);
      expect(container).toBeEmptyDOMElement();
    });

    test('returns null when initial is 0', () => {
      const { container } = render(<InventoryBar current={5} initial={0} />);
      expect(container).toBeEmptyDOMElement();
    });

    test('returns null when initial is 1', () => {
      const { container } = render(<InventoryBar current={1} initial={1} />);
      expect(container).toBeEmptyDOMElement();
    });

    test('returns null when current === 1 (last one)', () => {
      const { container } = render(<InventoryBar current={1} initial={10} />);
      expect(container).toBeEmptyDOMElement();
    });
  });

  describe('renders bar', () => {
    test('renders bar when initial >= 2 and current !== 1', () => {
      const { container } = render(<InventoryBar current={5} initial={10} />);
      expect(container.querySelector('.inventory-bar-container')).toBeInTheDocument();
    });
  });

  describe('color logic', () => {
    test('blue when current equals initial (untouched)', () => {
      const { container } = render(<InventoryBar current={10} initial={10} />);
      expect(getFill(container)).toHaveStyle({ background: '#3498db' });
    });

    test('blue when current exceeds initial (clamped to full)', () => {
      const { container } = render(<InventoryBar current={15} initial={10} />);
      expect(getFill(container)).toHaveStyle({ background: '#3498db' });
    });

    test('red when current is less than initial (depleting)', () => {
      const { container } = render(<InventoryBar current={5} initial={10} />);
      expect(getFill(container)).toHaveStyle({ background: '#e74c3c' });
    });
  });

  describe('fill width clamping', () => {
    test('100% width when current >= initial', () => {
      const { container } = render(<InventoryBar current={10} initial={10} />);
      expect(getFill(container)).toHaveStyle({ width: '100%' });
    });

    test('50% width when current is half of initial', () => {
      const { container } = render(<InventoryBar current={5} initial={10} />);
      expect(getFill(container)).toHaveStyle({ width: '50%' });
    });

    test('0% width when current is negative (clamped to 0)', () => {
      const { container } = render(<InventoryBar current={-1} initial={10} />);
      expect(getFill(container)).toHaveStyle({ width: '0%' });
    });

    test('0% width when current is undefined (defaults to 0)', () => {
      const { container } = render(<InventoryBar initial={10} />);
      expect(getFill(container)).toHaveStyle({ width: '0%' });
    });
  });
});
