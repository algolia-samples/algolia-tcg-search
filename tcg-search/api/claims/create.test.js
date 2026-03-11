import { vi, describe, test, expect, beforeEach } from 'vitest';
import { createRequest, createResponse } from 'node-mocks-http';

// Mock Supabase and Algolia before the module-level clients are initialized
const mockInsert = vi.fn();
const mockPartialUpdateObject = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: mockInsert,
      })),
    })),
  })),
}));

vi.mock('algoliasearch', () => ({
  algoliasearch: vi.fn(() => ({
    partialUpdateObject: mockPartialUpdateObject,
  })),
}));

const { default: handler } = await import('./create.js');

const validBody = {
  eventId: 'foo-nyc-2026',
  cardId: 'card-123',
  pokemonName: 'Pikachu',
  cardNumber: '25',
  setName: 'Base Set',
  cardValue: 10.5,
  imageUrl: 'https://example.com/pikachu.jpg',
  claimerFirstName: 'Ash',
  claimerLastName: 'Ketchum',
};

function makeReqRes(body = validBody, method = 'POST') {
  const req = createRequest({ method, body });
  const res = createResponse();
  return { req, res };
}

describe('POST /api/claims/create', () => {
  beforeEach(() => {
    mockInsert.mockResolvedValue({ data: [{ id: 1, ...validBody }], error: null });
    mockPartialUpdateObject.mockResolvedValue({});
  });

  describe('Method validation', () => {
    test('returns 405 for GET requests', async () => {
      const { req, res } = makeReqRes(validBody, 'GET');
      await handler(req, res);
      expect(res.statusCode).toBe(405);
      expect(res._getJSONData()).toEqual({ error: 'Method not allowed' });
    });

    test('returns 405 for PUT requests', async () => {
      const { req, res } = makeReqRes(validBody, 'PUT');
      await handler(req, res);
      expect(res.statusCode).toBe(405);
    });
  });

  describe('Required field validation', () => {
    test.each([
      ['eventId', { ...validBody, eventId: undefined }],
      ['cardId', { ...validBody, cardId: undefined }],
      ['pokemonName', { ...validBody, pokemonName: undefined }],
      ['claimerFirstName', { ...validBody, claimerFirstName: undefined }],
      ['claimerLastName', { ...validBody, claimerLastName: undefined }],
    ])('returns 400 when %s is missing', async (field, body) => {
      const { req, res } = makeReqRes(body);
      await handler(req, res);
      expect(res.statusCode).toBe(400);
      expect(res._getJSONData()).toEqual({ error: 'Missing required fields' });
    });
  });

  describe('eventId validation', () => {
    test('returns 400 for eventId with uppercase letters', async () => {
      const { req, res } = makeReqRes({ ...validBody, eventId: 'Foo-NYC-2026' });
      await handler(req, res);
      expect(res.statusCode).toBe(400);
      expect(res._getJSONData()).toEqual({ error: 'Invalid event ID' });
    });

    test('returns 400 for eventId with spaces', async () => {
      const { req, res } = makeReqRes({ ...validBody, eventId: 'foo nyc 2026' });
      await handler(req, res);
      expect(res.statusCode).toBe(400);
      expect(res._getJSONData()).toEqual({ error: 'Invalid event ID' });
    });

    test('accepts lowercase alphanumeric with hyphens', async () => {
      const { req, res } = makeReqRes({ ...validBody, eventId: 'foo-nyc-2026' });
      await handler(req, res);
      expect(res.statusCode).toBe(200);
    });
  });

  describe('First name validation', () => {
    test('returns 400 when first name is too short', async () => {
      const { req, res } = makeReqRes({ ...validBody, claimerFirstName: 'A' });
      await handler(req, res);
      expect(res.statusCode).toBe(400);
      expect(res._getJSONData().error).toMatch(/2 and 50 characters/);
    });

    test('returns 400 when first name is too long', async () => {
      const { req, res } = makeReqRes({ ...validBody, claimerFirstName: 'A'.repeat(51) });
      await handler(req, res);
      expect(res.statusCode).toBe(400);
      expect(res._getJSONData().error).toMatch(/2 and 50 characters/);
    });

    test('returns 400 when first name contains invalid characters', async () => {
      const { req, res } = makeReqRes({ ...validBody, claimerFirstName: 'Ash@Ketchum' });
      await handler(req, res);
      expect(res.statusCode).toBe(400);
      expect(res._getJSONData().error).toMatch(/letters, numbers, and spaces/);
    });
  });

  describe('Last name validation', () => {
    test('returns 400 when last name is too short', async () => {
      const { req, res } = makeReqRes({ ...validBody, claimerLastName: 'K' });
      await handler(req, res);
      expect(res.statusCode).toBe(400);
      expect(res._getJSONData().error).toMatch(/2 and 50 characters/);
    });

    test('returns 400 when last name is too long', async () => {
      const { req, res } = makeReqRes({ ...validBody, claimerLastName: 'K'.repeat(51) });
      await handler(req, res);
      expect(res.statusCode).toBe(400);
      expect(res._getJSONData().error).toMatch(/2 and 50 characters/);
    });

    test('returns 400 when last name contains invalid characters', async () => {
      const { req, res } = makeReqRes({ ...validBody, claimerLastName: 'Ketchum!' });
      await handler(req, res);
      expect(res.statusCode).toBe(400);
      expect(res._getJSONData().error).toMatch(/letters, numbers, and spaces/);
    });
  });

  describe('Successful claim', () => {
    test('returns 200 with claim data on success', async () => {
      const { req, res } = makeReqRes();
      await handler(req, res);
      expect(res.statusCode).toBe(200);
      expect(res._getJSONData()).toMatchObject({ success: true });
    });

    test('calls Algolia partialUpdateObject to decrement inventory', async () => {
      const { req, res } = makeReqRes();
      await handler(req, res);
      expect(mockPartialUpdateObject).toHaveBeenCalledWith(
        expect.objectContaining({
          indexName: `tcg_cards_${validBody.eventId}`,
          objectID: validBody.cardId,
          attributesToUpdate: {
            machine_quantity: { _operation: 'Decrement', value: 1 },
          },
        })
      );
    });
  });

  describe('Error handling', () => {
    test('returns 500 when Supabase insert fails', async () => {
      mockInsert.mockResolvedValueOnce({ data: null, error: new Error('DB error') });
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { req, res } = makeReqRes();
      await handler(req, res);

      expect(res.statusCode).toBe(500);
      expect(res._getJSONData()).toEqual({ error: 'Failed to save claim' });
      consoleSpy.mockRestore();
    });

    test('still returns 200 when Algolia update fails (claim already saved)', async () => {
      mockPartialUpdateObject.mockRejectedValueOnce(new Error('Algolia error'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { req, res } = makeReqRes();
      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res._getJSONData().success).toBe(true);
      consoleSpy.mockRestore();
    });
  });
});
