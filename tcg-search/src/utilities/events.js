import { searchClient } from './algolia';

const eventsIndex = import.meta.env.VITE_ALGOLIA_EVENTS_INDEX || 'tcg_events';

/**
 * Fetch the currently active event (current:true) from tcg_events.
 * Used by CurrentEventRedirect to determine where to send the user.
 */
export async function fetchCurrentEvent() {
  const { results } = await searchClient.search([{
    indexName: eventsIndex,
    query: '',
    params: { filters: 'current:true', hitsPerPage: 1 },
  }]);

  const hits = results[0]?.hits ?? [];
  return hits[0] ?? null;
}

/**
 * Fetch a specific event by its objectID (= event_id slug).
 * Used by EventProvider on the /:eventId route.
 */
export async function fetchEventById(eventId) {
  return searchClient.getObject({
    indexName: eventsIndex,
    objectID: eventId,
  });
}
