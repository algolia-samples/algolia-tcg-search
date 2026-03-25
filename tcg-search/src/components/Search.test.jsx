import { vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { useEvent } from '../context/EventContext';
import Search from './Search';

const { FALLBACK_AGENT_ID } = vi.hoisted(() => ({
  FALLBACK_AGENT_ID: 'fallback-agent-id',
}));

vi.mock('../utilities/algolia', () => ({
  searchClient: {},
  getIndexNames: (eventId) => ({
    primary: `tcg_cards_${eventId}`,
    priceAsc: `tcg_cards_${eventId}_price_asc`,
    priceDesc: `tcg_cards_${eventId}_price_desc`,
  }),
  userToken: 'test-user',
  chatAgentId: FALLBACK_AGENT_ID,
}));

vi.mock('../context/EventContext', () => ({
  useEvent: vi.fn(),
}));

vi.mock('react-instantsearch', () => ({
  InstantSearch: ({ children }) => <div>{children}</div>,
  Configure: () => null,
  Hits: () => null,
  Pagination: () => null,
  PoweredBy: () => null,
  SearchBox: () => null,
  SortBy: () => null,
  useHits: () => ({ results: { hits: [] } }),
  useSearchBox: () => ({ refine: vi.fn() }),
  useToggleRefinement: () => ({ value: { isRefined: false, count: 0 }, refine: vi.fn() }),
  useClearRefinements: () => ({ refine: vi.fn(), canRefine: false }),
  useSortBy: () => ({ currentRefinement: 'primary', refine: vi.fn() }),
}));

vi.mock('search-insights', () => ({ default: vi.fn() }));
vi.mock('./Header', () => ({ default: () => null }));
vi.mock('./Hit', () => ({ default: () => null }));
vi.mock('./FilterDropdown', () => ({ default: () => null }));
vi.mock('./FilterToggle', () => ({ default: () => null }));
vi.mock('./Carousel', () => ({ default: () => null }));
vi.mock('./ClaimedCarousel', () => ({ default: () => null }));
vi.mock('./ChatAgent', () => ({
  default: ({ agentId }) => <div data-testid="chat-agent" data-agent-id={agentId} />,
}));

describe('Search — agentId derivation', () => {
  test('passes eventConfig.agent_id to ChatAgent when present', () => {
    useEvent.mockReturnValue({
      eventConfig: { event_id: 'test-event', agent_id: 'event-specific-agent' },
      loading: false,
      error: null,
    });

    render(<MemoryRouter initialEntries={['/test-event']}><Routes><Route path="/:eventId" element={<Search />} /></Routes></MemoryRouter>);
    expect(screen.getByTestId('chat-agent')).toHaveAttribute('data-agent-id', 'event-specific-agent');
  });

  test('falls back to chatAgentId when eventConfig.agent_id is absent', () => {
    useEvent.mockReturnValue({
      eventConfig: { event_id: 'test-event' },
      loading: false,
      error: null,
    });

    render(<MemoryRouter initialEntries={['/test-event']}><Routes><Route path="/:eventId" element={<Search />} /></Routes></MemoryRouter>);
    expect(screen.getByTestId('chat-agent')).toHaveAttribute('data-agent-id', FALLBACK_AGENT_ID);
  });
});
