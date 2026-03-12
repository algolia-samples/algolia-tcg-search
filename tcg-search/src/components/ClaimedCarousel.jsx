import { useState, useEffect, useRef } from 'react';
import { supabase } from '../utilities/supabase';
import { useEvent } from '../context/EventContext';
import BaseCarousel from './BaseCarousel';
import ClaimedCard from './ClaimedCard';

const CACHE_KEY_PREFIX = 'tcg_recent_claims';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const FETCH_LIMIT = 50;  // Pool size to score from
const DISPLAY_LIMIT = 10; // Cards shown in carousel
const RECENCY_WEIGHT = 0.6;
const VALUE_WEIGHT = 0.4;

/**
 * Score and sort a pool of claims by blending recency rank and card value,
 * then return the top DISPLAY_LIMIT results.
 */
export function scoreAndSort(pool) {
  if (!pool.length) return [];

  const values = pool.map(c => parseFloat(c.card_value) || 0);
  const maxValue = Math.max(...values);
  const minValue = Math.min(...values);
  const valueRange = maxValue - minValue || 1;

  // Assign recency ranks (0 = most recent) — precompute map for O(n) lookup
  const sortedByTime = [...pool].sort(
    (a, b) => new Date(b.claimed_at) - new Date(a.claimed_at)
  );
  const n = sortedByTime.length;
  const recencyRankById = new Map(sortedByTime.map((claim, i) => [claim.id, i]));

  const scored = pool.map((claim, i) => {
    const valueScore = (values[i] - minValue) / valueRange;
    const recencyScore = 1 - (recencyRankById.get(claim.id) ?? 0) / Math.max(n - 1, 1);
    return {
      ...claim,
      _score: RECENCY_WEIGHT * recencyScore + VALUE_WEIGHT * valueScore,
    };
  });

  return scored.sort((a, b) => b._score - a._score).slice(0, DISPLAY_LIMIT);
}

// Cache helpers — keyed by event to prevent cross-event leakage
function getCachedClaims(cacheKey) {
  try {
    const cached = localStorage.getItem(cacheKey);
    if (!cached) return null;

    const { data, timestamp } = JSON.parse(cached);
    const age = Date.now() - timestamp;

    // Return cached data if fresh (< 5 minutes)
    if (age < CACHE_TTL) {
      return data;
    }

    // Stale - return it anyway, but signal that we should refresh
    return { data, stale: true };
  } catch (error) {
    console.warn('Error reading cache:', error);
    return null;
  }
}

function setCachedClaims(cacheKey, data) {
  try {
    localStorage.setItem(cacheKey, JSON.stringify({
      data,
      timestamp: Date.now()
    }));
  } catch (error) {
    console.warn('Error writing cache:', error);
  }
}

/**
 * ClaimedCarousel - Displays recently claimed cards with real-time updates
 *
 * Features:
 * - localStorage caching with 5-minute TTL
 * - Stale-while-revalidate pattern
 * - Real-time updates via Supabase subscriptions
 * - Lazy loading with IntersectionObserver
 * - Smart image preloading via BaseCarousel
 */
export default function ClaimedCarousel() {
  const { eventConfig } = useEvent();
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const subscriptionEstablished = useRef(false);
  // Raw pool of fetched claims — used to re-score when new claims arrive
  const claimsPool = useRef([]);
  // Debounce timer for localStorage writes triggered by real-time inserts
  const cacheDebounceTimer = useRef(null);
  const rescoreTimer = useRef(null);

  const cacheKey = `${CACHE_KEY_PREFIX}:${eventConfig?.event_id}`;

  // Fetch claims from Supabase
  const fetchClaims = async (showStaleWhileRevalidate = false) => {
    try {
      // If using stale-while-revalidate, don't show loading state
      if (!showStaleWhileRevalidate) {
        setLoading(true);
      }

      const { data, error } = await supabase
        .from('claims')
        .select('id, pokemon_name, image_url, card_value, claimer_name, claimer_first_name, claimer_last_name, claimed_at')
        .eq('event_id', eventConfig.event_id)
        .order('claimed_at', { ascending: false })
        .limit(FETCH_LIMIT);

      if (error) throw error;

      const freshData = data || [];
      claimsPool.current = freshData;
      const scored = scoreAndSort(freshData);
      setClaims(scored);
      setCachedClaims(cacheKey, freshData);
    } catch (error) {
      console.error('Error fetching claims:', error);
    } finally {
      setLoading(false);
    }
  };

  // Initialize data and set up real-time subscription
  useEffect(() => {
    let channel;
    let mounted = true;

    if (!eventConfig) return;

    const initializeData = async () => {
      // Check cache first (stale-while-revalidate)
      const cached = getCachedClaims(cacheKey);

      if (cached && !cached.stale) {
        // Fresh cache - use it, skip fetch
        if (mounted) {
          claimsPool.current = cached;
          setClaims(scoreAndSort(cached));
          setLoading(false);
        }
      } else if (cached && cached.stale) {
        // Stale cache - show immediately, fetch in background
        if (mounted) {
          claimsPool.current = cached.data;
          setClaims(scoreAndSort(cached.data));
          setLoading(false);
        }
        await fetchClaims(true);
      } else {
        // No cache - fetch fresh data
        await fetchClaims(false);
      }

      // Only set up subscription if still mounted
      if (!mounted) return;

      // Always set up real-time subscription (regardless of cache state)
      channel = supabase
        .channel(`claims:${eventConfig.event_id}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'claims',
          filter: `event_id=eq.${eventConfig.event_id}`,
        }, (payload) => {
          // Prepend new claim to pool, trim to FETCH_LIMIT
          claimsPool.current = [payload.new, ...claimsPool.current].slice(0, FETCH_LIMIT);
          // Debounce re-score to batch burst inserts — pool stays current via ref
          clearTimeout(rescoreTimer.current);
          rescoreTimer.current = setTimeout(() => {
            setClaims(scoreAndSort(claimsPool.current));
          }, 150);
          // Debounce localStorage write separately (longer window)
          clearTimeout(cacheDebounceTimer.current);
          cacheDebounceTimer.current = setTimeout(() => {
            setCachedClaims(cacheKey, claimsPool.current);
          }, 500);
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            subscriptionEstablished.current = true;
            console.log('Claims subscription established');
          }
        });
    };

    initializeData();

    // Cleanup subscription and pending cache write on unmount
    return () => {
      mounted = false;
      clearTimeout(rescoreTimer.current);
      clearTimeout(cacheDebounceTimer.current);
      // Only remove channel if subscription was established (prevents StrictMode issues)
      if (channel && subscriptionEstablished.current) {
        supabase.removeChannel(channel);
        subscriptionEstablished.current = false;
      }
    };
  }, [eventConfig]);

  return (
    <BaseCarousel
      title="🎉 Recently Claimed"
      data={claims}
      renderCard={(claim, index, isVisible) => (
        <ClaimedCard claim={claim} eager={isVisible} />
      )}
      getItemKey={(claim) => claim.id}
      loading={loading}
      wrapperClassName="claimed-carousel-wrapper"
      titleClassName="claimed-carousel-title"
      containerClassName="carousel-container"
      trackClassName="claimed-carousel-track"
      itemClassName="carousel-item"
      enableLazyLoading={true}
      lazyLoadMargin="100px"
    />
  );
}
