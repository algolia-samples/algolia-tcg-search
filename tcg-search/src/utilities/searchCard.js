import { searchClient, getIndexNames } from './algolia';

/**
 * Cascade search strategy:
 * 1. name + number filter  → most precise
 * 2. name only             → fuzzy fallback
 * 3. number only           → last resort
 * 4. nothing found         → strategy: 'none'
 */
export async function cascadeSearch(eventId, { parsedName, parsedNumber }) {
  const { primary } = getIndexNames(eventId);

  if (parsedName && parsedNumber) {
    const result = await searchClient.searchSingleIndex({
      indexName: primary,
      searchParams: {
        query: parsedName,
        filters: `number:"${parsedNumber}"`,
        hitsPerPage: 5,
      },
    });
    if (result.hits.length > 0) {
      return { hits: result.hits, query: parsedName, strategy: 'name_number' };
    }
  }

  if (parsedName) {
    const result = await searchClient.searchSingleIndex({
      indexName: primary,
      searchParams: { query: parsedName, hitsPerPage: 10 },
    });
    if (result.hits.length > 0) {
      return { hits: result.hits, query: parsedName, strategy: 'name' };
    }
  }

  if (parsedNumber) {
    const result = await searchClient.searchSingleIndex({
      indexName: primary,
      searchParams: { query: parsedNumber, hitsPerPage: 10 },
    });
    if (result.hits.length > 0) {
      return { hits: result.hits, query: parsedNumber, strategy: 'number' };
    }
  }

  return { hits: [], query: parsedName || parsedNumber || '', strategy: 'none' };
}
