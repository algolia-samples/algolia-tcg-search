import algoliasearch from 'algoliasearch'

export const appId = process.env.REACT_APP_ALGOLIA_APP_ID || ''
export const appKey = process.env.REACT_APP_ALGOLIA_API_KEY || ''
export const indexName = process.env.REACT_APP_ALGOLIA_INDEX_NAME || ''
export const userToken = process.env.REACT_APP_USER_TOKEN || ''

// Replica index names for sorting - fallback to base index + suffix if not configured
export const indexNameValueAsc = process.env.REACT_APP_ALGOLIA_INDEX_NAME_VALUE_ASC || `${indexName}_value_asc`
export const indexNameValueDesc = process.env.REACT_APP_ALGOLIA_INDEX_NAME_VALUE_DESC || `${indexName}_value_desc`

export const searchClient = algoliasearch(appId, appKey)
