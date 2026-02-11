import { render, screen, waitFor, act } from '@testing-library/react';
import ClaimedCarousel from './ClaimedCarousel';
import { supabase } from '../utilities/supabase';

// Mock dependencies
jest.mock('../utilities/supabase', () => ({
  supabase: {
    from: jest.fn(),
    channel: jest.fn(),
    removeChannel: jest.fn(),
  },
}));

jest.mock('./BaseCarousel', () => {
  return function MockBaseCarousel({ data, loading }) {
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
  };
});

const CACHE_KEY = 'tcg_recent_claims';

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
    jest.clearAllMocks();

    // Mock Supabase channel subscription
    insertCallback = null;
    subscribeCallback = null;
    mockSubscribe = jest.fn((callback) => {
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
      on: jest.fn((event, config, callback) => {
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
    mockSelect = jest.fn();
    mockFrom = jest.fn(() => ({
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
        order: jest.fn(() => ({
          limit: jest.fn(() => Promise.resolve({ data: mockClaims, error: null })),
        })),
      });

      render(<ClaimedCarousel />);

      await waitFor(() => {
        expect(screen.getByTestId('base-carousel')).toBeInTheDocument();
      });

      // Should NOT fetch (cache is fresh)
      expect(mockFrom).not.toHaveBeenCalled();

      // Should still subscribe for real-time updates
      expect(supabase.channel).toHaveBeenCalledWith('claims');
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
        order: jest.fn(() => ({
          limit: jest.fn(() => Promise.resolve({ data: mockClaims, error: null })),
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
          'id, pokemon_name, image_url, card_value, claimer_name, claimed_at'
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
        order: jest.fn(() => ({
          limit: jest.fn(() => Promise.resolve({ data: mockClaims, error: null })),
        })),
      });

      render(<ClaimedCarousel />);

      // Should fetch data
      await waitFor(() => {
        expect(mockFrom).toHaveBeenCalledWith('claims');
        expect(mockSelect).toHaveBeenCalledWith(
          'id, pokemon_name, image_url, card_value, claimer_name, claimed_at'
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
        order: jest.fn(() => ({
          limit: jest.fn(() => Promise.resolve({ data: mockClaims, error: null })),
        })),
      });

      render(<ClaimedCarousel />);

      await waitFor(() => {
        expect(mockSelect).toHaveBeenCalledWith(
          'id, pokemon_name, image_url, card_value, claimer_name, claimed_at'
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
        order: jest.fn(() => ({
          limit: jest.fn(() => Promise.resolve({ data: tenClaims, error: null })),
        })),
      });

      const { rerender } = render(<ClaimedCarousel />);

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
        order: jest.fn(() => ({
          limit: jest.fn(() => Promise.resolve({ data: mockClaims, error: null })),
        })),
      });

      const { unmount } = render(<ClaimedCarousel />);

      // Wait for data to load and carousel to render
      await waitFor(() => {
        expect(screen.getByTestId('base-carousel')).toBeInTheDocument();
      });

      // Wait for subscription to be established
      await waitFor(() => {
        expect(supabase.channel).toHaveBeenCalledWith('claims');
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
        order: jest.fn(() => ({
          limit: jest.fn(() => Promise.resolve({ data: [zeroValueClaim], error: null })),
        })),
      });

      render(<ClaimedCarousel />);

      await waitFor(() => {
        expect(screen.getByTestId('claim-1')).toHaveTextContent('Magikarp - $0');
      });
    });

    test('handles empty claims gracefully', async () => {
      mockSelect.mockReturnValue({
        order: jest.fn(() => ({
          limit: jest.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      });

      const { container } = render(<ClaimedCarousel />);

      await waitFor(() => {
        expect(container).toBeEmptyDOMElement();
      });
    });

    test('handles fetch error gracefully', async () => {
      mockSelect.mockReturnValue({
        order: jest.fn(() => ({
          limit: jest.fn(() => Promise.resolve({ data: null, error: new Error('Network error') })),
        })),
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const { container } = render(<ClaimedCarousel />);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Error fetching claims:', expect.any(Error));
      });

      expect(container).toBeEmptyDOMElement();

      consoleSpy.mockRestore();
    });
  });
});
