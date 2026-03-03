import { algoliasearch } from 'algoliasearch'

export const appId = import.meta.env.VITE_ALGOLIA_APP_ID || ''
export const appKey = import.meta.env.VITE_ALGOLIA_API_KEY || ''
export const userToken = import.meta.env.VITE_USER_TOKEN || ''
export const chatAgentId = import.meta.env.VITE_ALGOLIA_CHAT_AGENT_ID || ''

export const searchClient = algoliasearch(appId, appKey)

/**
 * Derive the primary and replica index names from an event_id slug.
 * e.g. getIndexNames('etail-west-2026') returns:
 *   { primary: 'tcg_cards_etail-west-2026', priceAsc: '...', priceDesc: '...' }
 */
export function getIndexNames(eventId) {
  const primary = `tcg_cards_${eventId}`
  return {
    primary,
    priceAsc: `${primary}_price_asc`,
    priceDesc: `${primary}_price_desc`,
  }
}
