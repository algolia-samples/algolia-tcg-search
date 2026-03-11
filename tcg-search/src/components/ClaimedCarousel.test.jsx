import { vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import ClaimedCarousel, { scoreAndSort } from './ClaimedCarousel';
import { supabase } from '../utilities/supabase';
import { useEvent } from '../context/EventContext';

vi.mock('../context/EventContext', () => ({
  useEvent: vi.fn(),
}));

// Mock dependencies
vi.mock('../utilities/supabase', () => ({
  supabase: {
    from: vi.fn(),
    channel: vi.fn(),
    removeChannel: vi.fn(),
  },
}));

vi.mock('./BaseCarousel', () => {
  return {
    default: function MockBaseCarousel({ data, loading }) {
      if (loading || !data || data.length === 0) return null;
      return (
        <div data-testid="base-carousel">
          {data.map((claim) => (
            <div key={claim.id} data-testid={`claim-${claim.id}`}>
              {claim.pokemon_name} - ${claim.card_value}
              {claim.claimer_email && <span data-testid="leaked-email">{claim.claimer_email}</span>}
            </div>
          ))}
        </div>
      );
    },
  };
});

const CACHE_KEY = 'tcg_recent_claims:test-event-123';

describe('scoreAndSort', () => {
  const makePool = (items) =>
    items.map(([id, value, msAgo]) => ({
      id,
      pokemon_name: `Pokemon${id}`,
      card_value: value,
      claimed_at: new Date(Date.now() - msAgo).toISOString(),
    }));

  test('high-value claim boosts above low-value newer claim', () => {
    // 3-item pool: newest is worthless, middle-aged is high-value, oldest is worthless
    const pool = makePool([
      [1, 0,   0],           // newest,  $0
      [2, 100, 5 * 60_000],  // 5m ago,  $100
      [3, 0,   10 * 60_000], // 10m ago, $0
    ]);
    const result = scoreAndSort(pool);
    // Charizard ($100, middle) outranks Magikarp ($0, newest)
    expect(result.map(c => c.id)).toEqual([2, 1, 3]);
  });

  test('most recent claim wins when values are equal', () => {
    const pool = makePool([
      [1, 10, 0],         // newest
      [2, 10, 60_000],    // 1m ago
      [3, 10, 120_000],   // 2m ago
    ]);
    const result = scoreAndSort(pool);
    expect(result[0].id).toBe(1);
  });

  test('limits output to DISPLAY_LIMIT (10) with a larger pool', () => {
    const pool = makePool(
      Array.from({ length: 20 }, (_, i) => [i + 1, i * 10, i * 1000])
    );
    expect(scoreAndSort(pool)).toHaveLength(10);
  });

  test('handles null card_value as 0', () => {
    const pool = [{ id: 1, pokemon_name: 'Magikarp', card_value: null, claimed_at: new Date().toISOString() }];
    const result = scoreAndSort(pool);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
  });

  test('returns empty array for empty pool', () => {
    expect(scoreAndSort([])).toEqual([]);
  });
});

describe('ClaimedCarousel', () => {
  let mockChannel;
  let mockSelect;
  let mockFrom;
  let mockSubscribe;
  let insertCallback;
  let subscribeCallback;

  beforeEach(() => {
    // Clear localStorage
    localStorage.clear();
    vi.clearAllMocks();

    useEvent.mockReturnValue({
      eventConfig: { event_id: 'test-event-123' },
      loading: false,
      error: null,
    });

    // Mock Supabase channel subscription
    insertCallback = null;
    subscribeCallback = null;
    mockSubscribe = vi.fn((callback) => {
      subscribeCallback = callback;
      // Simulate SUBSCRIBED status after a tick
      setTimeout(() => {
        if (subscribeCallback) {
          subscribeCallback('SUBSCRIBED');
        }
      }, 0);
      return mockChannel;
    });
    mockChannel = {
      on: vi.fn((event, config, callback) => {
        if (config.event === 'INSERT') {
          insertCallback = callback;
        }
        return mockChannel;
      }),
      subscribe: mockSubscribe,
    };

    supabase.channel.mockReturnValue(mockChannel);
    supabase.removeChannel.mockImplementation(() => {});

    // Mock Supabase query
    mockSelect = vi.fn();
    mockFrom = vi.fn(() => ({
      select: mockSelect,
    }));
    supabase.from = mockFrom;
  });

  afterEach(() => {
    localStorage.clear();
  });

  const mockClaims = [
    {
      id: 1,
      pokemon_name: 'Pikachu',
      image_url: 'pikachu.jpg',
      card_value: 10.5,
      claimer_name: 'Ash',
      claimed_at: new Date().toISOString(),
    },
    {
      id: 2,
      pokemon_name: 'Charizard',
      image_url: 'charizard.jpg',
      card_value: 150.0,
      claimer_name: 'Red',
      claimed_at: new Date().toISOString(),
    },
  ];

  describe('Cache Behavior', () => {
    test('uses fresh cache without fetching', async () => {
      // Set up fresh cache (< 5 minutes old)
      const cacheData = {
        data: mockClaims,
        timestamp: Date.now() - 1000, // 1 second ago
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));

      mockSelect.mockReturnValue({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve({ data: mockClaims, error: null })),
          })),
        })),
      });

      render(<ClaimedCarousel />);

      await waitFor(() => {
        expect(screen.getByTestId('base-carousel')).toBeInTheDocument();
      });

      // Should NOT fetch (cache is fresh)
      expect(mockFrom).not.toHaveBeenCalled();

      // Should still subscribe for real-time updates
      expect(supabase.channel).toHaveBeenCalledWith('claims:test-event-123');
      expect(mockChannel.on).toHaveBeenCalled();
      expect(mockSubscribe).toHaveBeenCalled();

      // Should display cached data
      expect(screen.getByTestId('claim-1')).toHaveTextContent('Pikachu - $10.5');
      expect(screen.getByTestId('claim-2')).toHaveTextContent('Charizard - $150');
    });

    test('shows stale cache immediately then fetches fresh data', async () => {
      // Set up stale cache (> 5 minutes old)
      const staleClaims = [mockClaims[0]]; // Only first claim
      const cacheData = {
        data: staleClaims,
        timestamp: Date.now() - 6 * 60 * 1000, // 6 minutes ago
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));

      mockSelect.mockReturnValue({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve({ data: mockClaims, error: null })),
          })),
        })),
      });

      render(<ClaimedCarousel />);

      // Should show stale data immediately
      await waitFor(() => {
        expect(screen.getByTestId('claim-1')).toBeInTheDocument();
      });

      // Should fetch fresh data in background
      await waitFor(() => {
        expect(mockFrom).toHaveBeenCalledWith('claims');
        expect(mockSelect).toHaveBeenCalledWith(
          'id, pokemon_name, image_url, card_value, claimer_name, claimer_first_name, claimer_last_name, claimed_at'
        );
      });

      // Should show updated data after fetch
      await waitFor(() => {
        expect(screen.getByTestId('claim-2')).toBeInTheDocument();
      });

      // Should subscribe
      expect(mockSubscribe).toHaveBeenCalled();
    });

    test('fetches fresh data when cache is missing', async () => {
      mockSelect.mockReturnValue({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve({ data: mockClaims, error: null })),
          })),
        })),
      });

      render(<ClaimedCarousel />);

      // Should fetch data
      await waitFor(() => {
        expect(mockFrom).toHaveBeenCalledWith('claims');
        expect(mockSelect).toHaveBeenCalledWith(
          'id, pokemon_name, image_url, card_value, claimer_name, claimer_first_name, claimer_last_name, claimed_at'
        );
      });

      // Should display fetched data
      await waitFor(() => {
        expect(screen.getByTestId('claim-1')).toBeInTheDocument();
        expect(screen.getByTestId('claim-2')).toBeInTheDocument();
      });

      // Should subscribe
      expect(mockSubscribe).toHaveBeenCalled();
    });
  });

  describe('PII Protection', () => {
    test('does not fetch or cache claimer_email', async () => {
      mockSelect.mockReturnValue({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve({ data: mockClaims, error: null })),
          })),
        })),
      });

      render(<ClaimedCarousel />);

      await waitFor(() => {
        expect(mockSelect).toHaveBeenCalledWith(
          'id, pokemon_name, image_url, card_value, claimer_name, claimer_first_name, claimer_last_name, claimed_at'
        );
      });

      // Verify claimer_email is not in the select
      const selectCall = mockSelect.mock.calls[0][0];
      expect(selectCall).not.toContain('claimer_email');
      expect(selectCall).not.toContain('*');

      // Verify no leaked email in rendered output
      expect(screen.queryByTestId('leaked-email')).not.toBeInTheDocument();
    });
  });

  describe('Real-time Subscription', () => {
    test('adds new claim from INSERT event and limits to 10', async () => {
      // Start with 10 claims
      const tenClaims = Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        pokemon_name: `Pokemon${i + 1}`,
        image_url: 'image.jpg',
        card_value: 10,
        claimer_name: 'Trainer',
        claimed_at: new Date().toISOString(),
      }));

      mockSelect.mockReturnValue({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve({ data: tenClaims, error: null })),
          })),
        })),
      });

      render(<ClaimedCarousel />);

      await waitFor(() => {
        expect(screen.getByTestId('base-carousel')).toBeInTheDocument();
      });

      // Simulate INSERT event wrapped in act
      const newClaim = {
        id: 11,
        pokemon_name: 'Mew',
        image_url: 'mew.jpg',
        card_value: 200,
        claimer_name: 'Giovanni',
        claimed_at: new Date().toISOString(),
      };

      await waitFor(() => {
        if (insertCallback) {
          insertCallback({ new: newClaim });
        }
      });

      // Verify new claim was added and old one removed
      await waitFor(() => {
        expect(screen.getByTestId('claim-11')).toBeInTheDocument();
      });

      // Verify we still have exactly 10 claims (new one added, oldest dropped)
      const baseCarousel = screen.getByTestId('base-carousel');
      const claims = baseCarousel.querySelectorAll('[data-testid^="claim-"]');
      expect(claims.length).toBe(10);
    });

    test('cleans up subscription on unmount', async () => {
      mockSelect.mockReturnValue({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve({ data: mockClaims, error: null })),
          })),
        })),
      });

      const { unmount } = render(<ClaimedCarousel />);

      // Wait for data to load and carousel to render
      await waitFor(() => {
        expect(screen.getByTestId('base-carousel')).toBeInTheDocument();
      });

      // Wait for subscription to be established
      await waitFor(() => {
        expect(supabase.channel).toHaveBeenCalledWith('claims:test-event-123');
        expect(mockSubscribe).toHaveBeenCalled();
      });

      // Unmount and verify cleanup
      unmount();

      expect(supabase.removeChannel).toHaveBeenCalledWith(mockChannel);
    });
  });

  describe('Edge Cases', () => {
    test('handles $0.00 card values correctly', async () => {
      const zeroValueClaim = {
        id: 1,
        pokemon_name: 'Magikarp',
        image_url: 'magikarp.jpg',
        card_value: 0,
        claimer_name: 'Joey',
        claimed_at: new Date().toISOString(),
      };

      mockSelect.mockReturnValue({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve({ data: [zeroValueClaim], error: null })),
          })),
        })),
      });

      render(<ClaimedCarousel />);

      await waitFor(() => {
        expect(screen.getByTestId('claim-1')).toHaveTextContent('Magikarp - $0');
      });
    });

    test('handles empty claims gracefully', async () => {
      mockSelect.mockReturnValue({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
          })),
        })),
      });

      const { container } = render(<ClaimedCarousel />);

      await waitFor(() => {
        expect(container).toBeEmptyDOMElement();
      });
    });

    test('handles fetch error gracefully', async () => {
      mockSelect.mockReturnValue({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve({ data: null, error: new Error('Network error') })),
          })),
        })),
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { container } = render(<ClaimedCarousel />);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Error fetching claims:', expect.any(Error));
      });

      expect(container).toBeEmptyDOMElement();

      consoleSpy.mockRestore();
    });
  });
});
