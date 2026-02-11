import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CardModal from './CardModal';

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
const mockOnClose = jest.fn();

describe('CardModal - Phase 1 UI', () => {
  let fetchSpy;

  beforeEach(() => {
    // Mock fetch for API calls
    fetchSpy = jest.spyOn(global, 'fetch').mockImplementation(() =>
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
    expect(screen.getByLabelText(/Your Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Your Email/i)).toBeInTheDocument();
  });

  it('validates name field - too short', async () => {
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

    const nameInput = screen.getByLabelText(/Your Name/i);
    const emailInput = screen.getByLabelText(/Your Email/i);
    const submitButton = screen.getByRole('button', { name: /Submit Claim/i });

    await userEvent.type(nameInput, 'A');
    await userEvent.type(emailInput, 'test@example.com');
    fireEvent.click(submitButton);

    expect(await screen.findByText(/Name must be at least 2 characters/i)).toBeInTheDocument();
  });

  it('validates name field - too long', async () => {
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

    const nameInput = screen.getByLabelText(/Your Name/i);
    const submitButton = screen.getByRole('button', { name: /Submit Claim/i });

    await userEvent.type(nameInput, 'A'.repeat(51));
    await userEvent.type(screen.getByLabelText(/Your Email/i), 'test@example.com');
    fireEvent.click(submitButton);

    expect(await screen.findByText(/Name must be less than 50 characters/i)).toBeInTheDocument();
  });

  it('validates name field - invalid characters', async () => {
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

    const nameInput = screen.getByLabelText(/Your Name/i);
    const submitButton = screen.getByRole('button', { name: /Submit Claim/i });

    await userEvent.type(nameInput, 'Test@User!');
    await userEvent.type(screen.getByLabelText(/Your Email/i), 'test@example.com');
    fireEvent.click(submitButton);

    expect(await screen.findByText(/Name can only contain letters, numbers, and spaces/i)).toBeInTheDocument();
  });

  it('validates email field - invalid format', async () => {
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

    const nameInput = screen.getByLabelText(/Your Name/i);
    const emailInput = screen.getByLabelText(/Your Email/i);
    const submitButton = screen.getByRole('button', { name: /Submit Claim/i });

    await userEvent.type(nameInput, 'Test User');
    await userEvent.type(emailInput, 'invalid-email');
    fireEvent.click(submitButton);

    expect(await screen.findByText(/Please enter a valid email address/i)).toBeInTheDocument();
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
    fetchSpy = jest.spyOn(global, 'fetch');

    // Mock window.location.reload
    reloadSpy = jest.fn();
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
    await userEvent.type(screen.getByLabelText(/Your Name/i), 'Ash Ketchum');
    await userEvent.type(screen.getByLabelText(/Your Email/i), 'ash@pokemon.com');

    // Submit
    fireEvent.click(screen.getByRole('button', { name: /Submit Claim/i }));

    // Verify API call
    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith('/api/claims/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cardId: 'card-123',
          pokemonName: 'Pikachu',
          cardNumber: '25',
          setName: 'Base Set',
          cardValue: 100.50,
          imageUrl: 'https://example.com/pikachu-large.jpg',
          claimerName: 'Ash Ketchum',
          claimerEmail: 'ash@pokemon.com',
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

    await userEvent.type(screen.getByLabelText(/Your Name/i), 'Ash Ketchum');
    await userEvent.type(screen.getByLabelText(/Your Email/i), 'ash@pokemon.com');
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

    await userEvent.type(screen.getByLabelText(/Your Name/i), 'Ash Ketchum');
    await userEvent.type(screen.getByLabelText(/Your Email/i), 'ash@pokemon.com');
    fireEvent.click(screen.getByRole('button', { name: /Submit Claim/i }));

    expect(await screen.findByText(/Network error. Please try again./i)).toBeInTheDocument();
  });

  it('disables submit button while submitting', async () => {
    fetchSpy.mockImplementationOnce(() => new Promise(resolve => setTimeout(resolve, 100)));

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

    await userEvent.type(screen.getByLabelText(/Your Name/i), 'Ash Ketchum');
    await userEvent.type(screen.getByLabelText(/Your Email/i), 'ash@pokemon.com');

    const submitButton = screen.getByRole('button', { name: /Submit Claim/i });
    fireEvent.click(submitButton);

    expect(submitButton).toBeDisabled();
    expect(screen.getByText(/Submitting.../i)).toBeInTheDocument();
  });
});
