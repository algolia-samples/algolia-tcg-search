import { vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CardModal from './CardModal';
import { useEvent } from '../context/EventContext';

vi.mock('../context/EventContext', () => ({
  useEvent: vi.fn(),
}));

beforeEach(() => {
  useEvent.mockReturnValue({ eventConfig: { event_id: 'test-event-123' } });
});

const mockHit = {
  objectID: 'card-123',
  pokemon_name: 'Pikachu',
  number: '25',
  set_name: 'Base Set',
  estimated_value: 100.50,
  image_large: 'https://example.com/pikachu-large.jpg',
  image_small: 'https://example.com/pikachu-small.jpg',
};

const mockOrigin = { x: 500, y: 500 };
const mockOnClose = vi.fn();

describe('CardModal - Phase 1 UI', () => {
  let fetchSpy;

  beforeEach(() => {
    // Mock fetch for API calls
    fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: async () => ({ success: true })
      })
    );
  });

  afterEach(() => {
    // Restore original implementations
    fetchSpy.mockRestore();
  });

  it('renders image view with Claim and Close buttons', () => {
    render(
      <CardModal
        isOpen={true}
        onClose={mockOnClose}
        hit={mockHit}
        origin={mockOrigin}
        rotation={0}
        isClosing={false}
      />
    );

    expect(screen.getByAltText(/Pikachu Pokemon card - enlarged/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /claim this card/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /close modal/i })).toBeInTheDocument();
  });

  it('switches to form view when Claim button is clicked', () => {
    render(
      <CardModal
        isOpen={true}
        onClose={mockOnClose}
        hit={mockHit}
        origin={mockOrigin}
        rotation={0}
        isClosing={false}
      />
    );

    const claimButton = screen.getByRole('button', { name: /claim this card/i });
    fireEvent.click(claimButton);

    expect(screen.getByText(/Claim Pikachu/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/First Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Last Name/i)).toBeInTheDocument();
  });

  it('validates first name field - too short', async () => {
    render(
      <CardModal
        isOpen={true}
        onClose={mockOnClose}
        hit={mockHit}
        origin={mockOrigin}
        rotation={0}
        isClosing={false}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /claim this card/i }));

    const submitButton = screen.getByRole('button', { name: /Submit Claim/i });

    await userEvent.type(screen.getByLabelText(/First Name/i), 'A');
    await userEvent.type(screen.getByLabelText(/Last Name/i), 'Ketchum');
    fireEvent.click(submitButton);

    expect(await screen.findByText(/First name must be at least 2 characters/i)).toBeInTheDocument();
  });

  it('validates last name field - too short', async () => {
    render(
      <CardModal
        isOpen={true}
        onClose={mockOnClose}
        hit={mockHit}
        origin={mockOrigin}
        rotation={0}
        isClosing={false}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /claim this card/i }));

    const submitButton = screen.getByRole('button', { name: /Submit Claim/i });

    await userEvent.type(screen.getByLabelText(/First Name/i), 'Ash');
    await userEvent.type(screen.getByLabelText(/Last Name/i), 'K');
    fireEvent.click(submitButton);

    expect(await screen.findByText(/Last name must be at least 2 characters/i)).toBeInTheDocument();
  });

  it('validates first name field - too long', async () => {
    render(
      <CardModal
        isOpen={true}
        onClose={mockOnClose}
        hit={mockHit}
        origin={mockOrigin}
        rotation={0}
        isClosing={false}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /claim this card/i }));

    const submitButton = screen.getByRole('button', { name: /Submit Claim/i });

    await userEvent.type(screen.getByLabelText(/First Name/i), 'A'.repeat(51));
    await userEvent.type(screen.getByLabelText(/Last Name/i), 'Ketchum');
    fireEvent.click(submitButton);

    expect(await screen.findByText(/First name must be less than 50 characters/i)).toBeInTheDocument();
  });

  it('validates first name field - invalid characters', async () => {
    render(
      <CardModal
        isOpen={true}
        onClose={mockOnClose}
        hit={mockHit}
        origin={mockOrigin}
        rotation={0}
        isClosing={false}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /claim this card/i }));

    const submitButton = screen.getByRole('button', { name: /Submit Claim/i });

    await userEvent.type(screen.getByLabelText(/First Name/i), 'Test@User!');
    await userEvent.type(screen.getByLabelText(/Last Name/i), 'Ketchum');
    fireEvent.click(submitButton);

    expect(await screen.findByText(/First name can only contain letters, numbers, and spaces/i)).toBeInTheDocument();
  });

  it('returns to image view when Back button is clicked', () => {
    render(
      <CardModal
        isOpen={true}
        onClose={mockOnClose}
        hit={mockHit}
        origin={mockOrigin}
        rotation={0}
        isClosing={false}
      />
    );

    // Go to form view
    fireEvent.click(screen.getByRole('button', { name: /claim this card/i }));
    expect(screen.getByText(/Claim Pikachu/i)).toBeInTheDocument();

    // Go back to image view
    fireEvent.click(screen.getByRole('button', { name: /Back/i }));
    expect(screen.getByRole('button', { name: /claim this card/i })).toBeInTheDocument();
  });

  it('calls onClose when Close button is clicked', () => {
    render(
      <CardModal
        isOpen={true}
        onClose={mockOnClose}
        hit={mockHit}
        origin={mockOrigin}
        rotation={0}
        isClosing={false}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /close modal/i }));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Escape key is pressed', () => {
    render(
      <CardModal
        isOpen={true}
        onClose={mockOnClose}
        hit={mockHit}
        origin={mockOrigin}
        rotation={0}
        isClosing={false}
      />
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('does not render when isOpen is false', () => {
    const { container } = render(
      <CardModal
        isOpen={false}
        onClose={mockOnClose}
        hit={mockHit}
        origin={mockOrigin}
        rotation={0}
        isClosing={false}
      />
    );

    expect(container.firstChild).toBeNull();
  });
});

describe('CardModal - Phase 2 API Integration', () => {
  let fetchSpy;
  let reloadSpy;

  beforeEach(() => {
    // Mock fetch
    fetchSpy = vi.spyOn(global, 'fetch');

    // Mock window.location.reload
    reloadSpy = vi.fn();
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { reload: reloadSpy }
    });
  });

  afterEach(() => {
    // Restore mocks
    fetchSpy.mockRestore();
  });

  it('submits claim successfully', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      headers: {
        get: (header) => header === 'content-type' ? 'application/json' : null
      },
      json: async () => ({ success: true, claim: { id: 1 } }),
    });

    render(
      <CardModal
        isOpen={true}
        onClose={mockOnClose}
        hit={mockHit}
        origin={mockOrigin}
        rotation={0}
        isClosing={false}
      />
    );

    // Go to form view
    fireEvent.click(screen.getByRole('button', { name: /claim this card/i }));

    // Fill out form
    await userEvent.type(screen.getByLabelText(/First Name/i), 'Ash');
    await userEvent.type(screen.getByLabelText(/Last Name/i), 'Ketchum');

    // Submit
    fireEvent.click(screen.getByRole('button', { name: /Submit Claim/i }));

    // Verify API call
    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith('/api/claims/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: 'test-event-123',
          cardId: 'card-123',
          pokemonName: 'Pikachu',
          cardNumber: '25',
          setName: 'Base Set',
          cardValue: 100.50,
          imageUrl: 'https://example.com/pikachu-large.jpg',
          claimerFirstName: 'Ash',
          claimerLastName: 'Ketchum',
        }),
      });
    });

    // Verify success view is shown
    await waitFor(() => {
      expect(screen.getByText('Successfully Claimed!')).toBeInTheDocument();
      expect(screen.getByText(/You've claimed/i)).toBeInTheDocument();
      expect(screen.getByText('Pikachu')).toBeInTheDocument();
    });

    // Wait for auto-close to trigger (2 seconds + small buffer)
    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled();
      expect(window.location.reload).toHaveBeenCalled();
    }, { timeout: 3000 });
  });

  it('displays API error message', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      headers: {
        get: (header) => header === 'content-type' ? 'application/json' : null
      },
      json: async () => ({ error: 'Card already claimed' }),
    });

    render(
      <CardModal
        isOpen={true}
        onClose={mockOnClose}
        hit={mockHit}
        origin={mockOrigin}
        rotation={0}
        isClosing={false}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /claim this card/i }));

    await userEvent.type(screen.getByLabelText(/First Name/i), 'Ash');
    await userEvent.type(screen.getByLabelText(/Last Name/i), 'Ketchum');
    fireEvent.click(screen.getByRole('button', { name: /Submit Claim/i }));

    expect(await screen.findByText(/Card already claimed/i)).toBeInTheDocument();
  });

  it('displays network error message', async () => {
    fetchSpy.mockRejectedValueOnce(new Error('Network error'));

    render(
      <CardModal
        isOpen={true}
        onClose={mockOnClose}
        hit={mockHit}
        origin={mockOrigin}
        rotation={0}
        isClosing={false}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /claim this card/i }));

    await userEvent.type(screen.getByLabelText(/First Name/i), 'Ash');
    await userEvent.type(screen.getByLabelText(/Last Name/i), 'Ketchum');
    fireEvent.click(screen.getByRole('button', { name: /Submit Claim/i }));

    expect(await screen.findByText(/Network error. Please try again./i)).toBeInTheDocument();
  });

  it('disables submit button while submitting', async () => {
    fetchSpy.mockImplementationOnce(() =>
      new Promise(resolve =>
        setTimeout(() => resolve({
          ok: true,
          headers: {
            get: (header) => header === 'content-type' ? 'application/json' : null
          },
          json: async () => ({ success: true })
        }), 100)
      )
    );

    render(
      <CardModal
        isOpen={true}
        onClose={mockOnClose}
        hit={mockHit}
        origin={mockOrigin}
        rotation={0}
        isClosing={false}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /claim this card/i }));

    await userEvent.type(screen.getByLabelText(/First Name/i), 'Ash');
    await userEvent.type(screen.getByLabelText(/Last Name/i), 'Ketchum');

    const submitButton = screen.getByRole('button', { name: /Submit Claim/i });
    fireEvent.click(submitButton);

    expect(submitButton).toBeDisabled();
    expect(screen.getByText(/Submitting.../i)).toBeInTheDocument();
  });

  it('handles non-JSON response (HTML error page)', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      headers: {
        get: (header) => header === 'content-type' ? 'text/html' : null
      }
    });

    render(
      <CardModal
        isOpen={true}
        onClose={mockOnClose}
        hit={mockHit}
        origin={mockOrigin}
        rotation={0}
        isClosing={false}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /claim this card/i }));

    await userEvent.type(screen.getByLabelText(/First Name/i), 'Ash');
    await userEvent.type(screen.getByLabelText(/Last Name/i), 'Ketchum');
    fireEvent.click(screen.getByRole('button', { name: /Submit Claim/i }));

    expect(await screen.findByText(/Server error. Please try again later./i)).toBeInTheDocument();
  });

  it('handles invalid JSON response', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      headers: {
        get: (header) => header === 'content-type' ? 'application/json' : null
      },
      json: async () => {
        throw new SyntaxError('Unexpected token < in JSON');
      }
    });

    render(
      <CardModal
        isOpen={true}
        onClose={mockOnClose}
        hit={mockHit}
        origin={mockOrigin}
        rotation={0}
        isClosing={false}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /claim this card/i }));

    await userEvent.type(screen.getByLabelText(/First Name/i), 'Ash');
    await userEvent.type(screen.getByLabelText(/Last Name/i), 'Ketchum');
    fireEvent.click(screen.getByRole('button', { name: /Submit Claim/i }));

    expect(await screen.findByText(/Server error. Please try again later./i)).toBeInTheDocument();
  });

  it('clears success timeout when modal closes early', async () => {
    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

    fetchSpy.mockResolvedValueOnce({
      ok: true,
      headers: {
        get: (header) => header === 'content-type' ? 'application/json' : null
      },
      json: async () => ({ success: true, claim: { id: 1 } }),
    });

    const { rerender } = render(
      <CardModal
        isOpen={true}
        onClose={mockOnClose}
        hit={mockHit}
        origin={mockOrigin}
        rotation={0}
        isClosing={false}
      />
    );

    // Go to form view and submit
    fireEvent.click(screen.getByRole('button', { name: /claim this card/i }));
    await userEvent.type(screen.getByLabelText(/First Name/i), 'Ash');
    await userEvent.type(screen.getByLabelText(/Last Name/i), 'Ketchum');
    fireEvent.click(screen.getByRole('button', { name: /Submit Claim/i }));

    // Wait for success view to appear (timeout is created here)
    await waitFor(() => {
      expect(screen.getByText('Successfully Claimed!')).toBeInTheDocument();
    });

    // Clear the spy history so we only see clearTimeout calls from closing
    clearTimeoutSpy.mockClear();

    // Close modal before 2 seconds elapse
    rerender(
      <CardModal
        isOpen={false}
        onClose={mockOnClose}
        hit={mockHit}
        origin={mockOrigin}
        rotation={0}
        isClosing={false}
      />
    );

    // Verify clearTimeout was called (cleanup effect ran)
    expect(clearTimeoutSpy).toHaveBeenCalled();

    clearTimeoutSpy.mockRestore();
  });
});

describe('CardModal - isClaimed behavior', () => {
  let fetchSpy;

  beforeEach(() => {
    // Mock fetch for API calls
    fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: async () => ({ success: true })
      })
    );
  });

  afterEach(() => {
    // Restore original implementations
    fetchSpy.mockRestore();
  });

  it('should disable claim button when isClaimed is true', () => {
    render(
      <CardModal
        isOpen={true}
        onClose={mockOnClose}
        hit={mockHit}
        origin={mockOrigin}
        rotation={0}
        isClosing={false}
        isClaimed={true}
      />
    );

    const claimButton = screen.getByRole('button', { name: /claimed/i });
    expect(claimButton).toBeDisabled();
    expect(claimButton).toHaveTextContent('Claimed');
    expect(claimButton).toHaveClass('disabled');
  });

  it('should show "Claim (X left)" when inventory available', () => {
    render(
      <CardModal
        isOpen={true}
        onClose={mockOnClose}
        hit={{ ...mockHit, machine_quantity: 5 }}
        origin={mockOrigin}
        rotation={0}
        isClosing={false}
        isClaimed={false}
      />
    );

    const claimButton = screen.getByRole('button', { name: /claim this card/i });
    expect(claimButton).toHaveTextContent('Claim (5 left)');
    expect(claimButton).not.toBeDisabled();
  });

  it('should not call handleClaimClick when button is disabled', () => {
    render(
      <CardModal
        isOpen={true}
        onClose={mockOnClose}
        hit={mockHit}
        origin={mockOrigin}
        rotation={0}
        isClosing={false}
        isClaimed={true}
      />
    );

    const claimButton = screen.getByRole('button', { name: /claimed/i });
    fireEvent.click(claimButton);

    // Should stay on image view, not transition to form
    expect(screen.queryByText(/claim.*pikachu/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/your name/i)).not.toBeInTheDocument();
  });
});
