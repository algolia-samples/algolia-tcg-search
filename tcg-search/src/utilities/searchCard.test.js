import { vi, describe, test, expect, beforeEach } from 'vitest';

const mockSearchSingleIndex = vi.fn();

vi.mock('./algolia', () => ({
  searchClient: { searchSingleIndex: (...args) => mockSearchSingleIndex(...args) },
  getIndexNames: (eventId) => ({
    primary: `tcg_cards_${eventId}`,
    priceAsc: `tcg_cards_${eventId}_price_asc`,
    priceDesc: `tcg_cards_${eventId}_price_desc`,
  }),
}));

const { cascadeSearch } = await import('./searchCard.js');

const EVENT_ID = 'foo-nyc-2026';
const INDEX = `tcg_cards_${EVENT_ID}`;

function hits(...names) {
  return { hits: names.map((n, i) => ({ objectID: `card-${i}`, pokemon_name: n })) };
}
const noHits = { hits: [] };

describe('cascadeSearch', () => {
  beforeEach(() => {
    mockSearchSingleIndex.mockReset();
  });

  test('name+number strategy: returns hits and strategy when both match', async () => {
    mockSearchSingleIndex.mockResolvedValueOnce(hits('Pikachu'));

    const result = await cascadeSearch(EVENT_ID, { parsedName: 'Pikachu', parsedNumber: '25/102' });

    expect(result.strategy).toBe('name_number');
    expect(result.query).toBe('Pikachu');
    expect(result.hits).toHaveLength(1);
    expect(mockSearchSingleIndex).toHaveBeenCalledTimes(1);
    expect(mockSearchSingleIndex).toHaveBeenCalledWith(
      expect.objectContaining({
        indexName: INDEX,
        searchParams: expect.objectContaining({ query: 'Pikachu', filters: 'number:"25/102"' }),
      })
    );
  });

  test('falls back to name-only when name+number yields no hits', async () => {
    mockSearchSingleIndex
      .mockResolvedValueOnce(noHits)     // name+number
      .mockResolvedValueOnce(hits('Pikachu')); // name only

    const result = await cascadeSearch(EVENT_ID, { parsedName: 'Pikachu', parsedNumber: '25/102' });

    expect(result.strategy).toBe('name');
    expect(result.query).toBe('Pikachu');
    expect(mockSearchSingleIndex).toHaveBeenCalledTimes(2);
  });

  test('falls back to number-only when name yields no hits', async () => {
    mockSearchSingleIndex
      .mockResolvedValueOnce(noHits)     // name+number
      .mockResolvedValueOnce(noHits)     // name only
      .mockResolvedValueOnce(hits('Pikachu')); // number only

    const result = await cascadeSearch(EVENT_ID, { parsedName: 'Pikachu', parsedNumber: '25/102' });

    expect(result.strategy).toBe('number');
    expect(result.query).toBe('25/102');
  });

  test('returns strategy "none" when all searches yield no hits', async () => {
    mockSearchSingleIndex.mockResolvedValue(noHits);

    const result = await cascadeSearch(EVENT_ID, { parsedName: 'Pikachu', parsedNumber: '25/102' });

    expect(result.strategy).toBe('none');
    expect(result.hits).toHaveLength(0);
  });

  test('name-only: skips name+number search and uses name strategy', async () => {
    mockSearchSingleIndex.mockResolvedValueOnce(hits('Charizard'));

    const result = await cascadeSearch(EVENT_ID, { parsedName: 'Charizard', parsedNumber: null });

    expect(result.strategy).toBe('name');
    expect(mockSearchSingleIndex).toHaveBeenCalledTimes(1);
    expect(mockSearchSingleIndex).toHaveBeenCalledWith(
      expect.objectContaining({ searchParams: expect.objectContaining({ query: 'Charizard' }) })
    );
  });

  test('number-only: skips name searches and uses number strategy', async () => {
    mockSearchSingleIndex.mockResolvedValueOnce(hits('Bulbasaur'));

    const result = await cascadeSearch(EVENT_ID, { parsedName: null, parsedNumber: '1/102' });

    expect(result.strategy).toBe('number');
    expect(result.query).toBe('1/102');
    expect(mockSearchSingleIndex).toHaveBeenCalledTimes(1);
  });

  test('neither name nor number: returns "none" without any search calls', async () => {
    const result = await cascadeSearch(EVENT_ID, { parsedName: null, parsedNumber: null });

    expect(result.strategy).toBe('none');
    expect(result.query).toBe('');
    expect(mockSearchSingleIndex).not.toHaveBeenCalled();
  });

  test('name-only falls through to "none" when name search yields no hits', async () => {
    mockSearchSingleIndex.mockResolvedValueOnce(noHits);

    const result = await cascadeSearch(EVENT_ID, { parsedName: 'Unknown', parsedNumber: null });

    expect(result.strategy).toBe('none');
    expect(result.query).toBe('Unknown');
  });
});
