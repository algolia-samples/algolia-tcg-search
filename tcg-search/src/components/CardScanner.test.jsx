import { vi, describe, test, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

// --- Mocks ---

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => mockNavigate,
}));

vi.mock('./Header', () => ({ default: () => null }));

// jsdom doesn't implement canvas — stub the minimum needed for CardScanner
HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
  drawImage: vi.fn(),
  getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(80 * 112 * 4) })),
  clearRect: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  fillRect: vi.fn(),
  beginPath: vi.fn(),
  fill: vi.fn(),
  stroke: vi.fn(),
  roundRect: vi.fn(),
  set globalCompositeOperation(_) {},
  set fillStyle(_) {},
  set strokeStyle(_) {},
  set lineWidth(_) {},
}));
HTMLCanvasElement.prototype.toDataURL = vi.fn(() => 'data:image/jpeg;base64,test');

const mockCascadeSearch = vi.fn();
vi.mock('../utilities/searchCard', () => ({ cascadeSearch: (...args) => mockCascadeSearch(...args) }));

// Fake stream returned by getUserMedia
function makeFakeStream() {
  return { getTracks: () => [{ stop: vi.fn() }] };
}

function renderScanner() {
  return render(
    <MemoryRouter initialEntries={['/foo-nyc-2026/scan']}>
      <Routes>
        <Route path="/:eventId/scan" element={<CardScanner />} />
      </Routes>
    </MemoryRouter>
  );
}

// Import component after mocks are set up
let CardScanner;
beforeEach(async () => {
  vi.resetModules();
  ({ default: CardScanner } = await import('./CardScanner.jsx'));
  mockNavigate.mockReset();
  mockCascadeSearch.mockReset();
  // Stub matchMedia per-test (non-touch/desktop default) so it doesn't leak
  vi.stubGlobal('matchMedia', vi.fn((query) => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })));
});

// --- Tests ---

describe('CardScanner', () => {
  beforeEach(() => {
    Object.defineProperty(navigator, 'mediaDevices', {
      writable: true,
      value: { getUserMedia: vi.fn().mockResolvedValue(makeFakeStream()) },
    });
    vi.stubGlobal('fetch', vi.fn());
  });

  test('does not start sampling on desktop (pointer: coarse = false)', async () => {
    const setIntervalSpy = vi.spyOn(globalThis, 'setInterval');
    const { container } = renderScanner();
    await waitFor(() => container.querySelector('video'));
    const callsBefore = setIntervalSpy.mock.calls.length;
    await act(async () => {
      fireEvent(container.querySelector('video'), new Event('loadedmetadata'));
    });
    expect(setIntervalSpy.mock.calls.length).toBe(callsBefore);
    setIntervalSpy.mockRestore();
  });

  test('starts sampling on touch device (pointer: coarse = true)', async () => {
    matchMedia.mockImplementation((query) => ({
      matches: query === '(pointer: coarse)',
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    const setIntervalSpy = vi.spyOn(globalThis, 'setInterval');
    const { container } = renderScanner();
    await waitFor(() => container.querySelector('video'));
    const callsBefore = setIntervalSpy.mock.calls.length;
    await act(async () => {
      fireEvent(container.querySelector('video'), new Event('loadedmetadata'));
    });
    expect(setIntervalSpy.mock.calls.length).toBeGreaterThan(callsBefore);
    setIntervalSpy.mockRestore();
  });

  test('shows "Starting camera…" hint before video is ready', async () => {
    renderScanner();
    await waitFor(() => {
      expect(screen.getByText(/Starting camera/i)).toBeInTheDocument();
    });
  });

  test('shows "Hold the card steady" hint after video is ready', async () => {
    const { container } = renderScanner();
    await waitFor(() => container.querySelector('video'));
    await act(async () => {
      fireEvent(container.querySelector('video'), new Event('loadedmetadata'));
    });
    await waitFor(() => {
      expect(screen.getByText(/Hold the card steady/i)).toBeInTheDocument();
    });
  });

  test('shows camera error when getUserMedia is denied', async () => {
    navigator.mediaDevices.getUserMedia.mockRejectedValue(new Error('denied'));
    renderScanner();
    await waitFor(() => {
      expect(screen.getByText(/Camera access denied/i)).toBeInTheDocument();
    });
  });

  test('shows "Capture now" button', async () => {
    renderScanner();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /capture now/i })).toBeInTheDocument();
    });
  });

  describe('after capture', () => {
    async function captureCard() {
      const { container } = renderScanner();
      // Wait for video to mount, then fire loadedmetadata to set videoReady
      await waitFor(() => container.querySelector('video'));
      await act(async () => {
        fireEvent(container.querySelector('video'), new Event('loadedmetadata'));
      });
      // Button is now enabled
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /capture now/i })).not.toBeDisabled();
      });
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /capture now/i }));
      });
    }

    test('shows "Reading card…" processing state', async () => {
      // Keep fetch pending so we stay in the 'scanning' state
      fetch.mockReturnValue(new Promise(() => {}));
      await captureCard();
      expect(screen.getByText(/Reading card/i)).toBeInTheDocument();
    });

    test('shows "Finding card…" when OCR succeeds and search starts', async () => {
      fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ name: 'Pikachu', number: '25/102', set: 'Base Set' }),
      });
      // Keep cascade search pending so we stay in the 'searching' state
      mockCascadeSearch.mockReturnValue(new Promise(() => {}));
      await captureCard();
      await waitFor(() => {
        expect(screen.getByText(/Finding card/i)).toBeInTheDocument();
      });
    });

    test('navigates to event search with query when cascade search succeeds', async () => {
      fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ name: 'Pikachu', number: '25/102', set: null }),
      });
      mockCascadeSearch.mockResolvedValue({ strategy: 'name', query: 'Pikachu', hits: [{}] });

      await captureCard();

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(
          '/foo-nyc-2026',
          expect.objectContaining({ replace: true, state: { searchQuery: 'Pikachu' } })
        );
      });
    });

    test('shows apology with card name when cascade search finds nothing', async () => {
      fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ name: 'Pikachu', number: null, set: null }),
      });
      mockCascadeSearch.mockResolvedValue({ strategy: 'none', query: '', hits: [] });

      await captureCard();

      await waitFor(() => {
        expect(screen.getByText(/Couldn't find "Pikachu"/i)).toBeInTheDocument();
      });
    });

    test('shows generic apology when OCR finds no name or number', async () => {
      fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ name: null, number: null, set: null }),
      });
      mockCascadeSearch.mockResolvedValue({ strategy: 'none', query: '', hits: [] });

      await captureCard();

      await waitFor(() => {
        expect(screen.getByText(/Couldn't read this card clearly/i)).toBeInTheDocument();
      });
    });

    test('shows apology when OCR request fails', async () => {
      fetch.mockResolvedValue({ ok: false, json: async () => ({ error: 'OCR failed' }) });

      await captureCard();

      await waitFor(() => {
        expect(screen.getByText(/Couldn't read this card clearly/i)).toBeInTheDocument();
      });
    });

    test('"Go to search" in apology navigates with parsed name as query', async () => {
      fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ name: 'Charizard', number: null, set: null }),
      });
      mockCascadeSearch.mockResolvedValue({ strategy: 'none', query: '', hits: [] });

      await captureCard();

      await waitFor(() => screen.getByRole('button', { name: /go to search/i }));
      fireEvent.click(screen.getByRole('button', { name: /go to search/i }));

      expect(mockNavigate).toHaveBeenCalledWith(
        '/foo-nyc-2026',
        expect.objectContaining({ state: { searchQuery: 'Charizard' } })
      );
    });

    test('shows "Retake" button after processing completes without navigation', async () => {
      fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ name: null, number: null, set: null }),
      });
      mockCascadeSearch.mockResolvedValue({ strategy: 'none', query: '', hits: [] });

      await captureCard();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /retake/i })).toBeInTheDocument();
      });
    });
  });
});
