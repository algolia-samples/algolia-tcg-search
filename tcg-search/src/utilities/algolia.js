import { algoliasearch } from 'algoliasearch'

export const appId = import.meta.env.VITE_ALGOLIA_APP_ID || ''
export const appKey = import.meta.env.VITE_ALGOLIA_API_KEY || ''
export const indexName = import.meta.env.VITE_ALGOLIA_INDEX_NAME || ''
export const userToken = import.meta.env.VITE_USER_TOKEN || ''
export const chatAgentId = import.meta.env.VITE_ALGOLIA_CHAT_AGENT_ID || ''

// Replica index names for sorting - fallback to base index + suffix if not configured
export const indexNamePriceAsc = import.meta.env.VITE_ALGOLIA_INDEX_NAME_PRICE_ASC || `${indexName}_price_asc`
export const indexNamePriceDesc = import.meta.env.VITE_ALGOLIA_INDEX_NAME_PRICE_DESC || `${indexName}_price_desc`

export const searchClient = algoliasearch(appId, appKey)
