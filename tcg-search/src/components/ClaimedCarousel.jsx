import { useState, useEffect, useRef } from 'react';
import { supabase } from '../utilities/supabase';
import BaseCarousel from './BaseCarousel';
import ClaimedCard from './ClaimedCard';

const CACHE_KEY = 'tcg_recent_claims';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const CLAIMS_LIMIT = 10;

// Cache helpers
function getCachedClaims() {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
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

function setCachedClaims(data) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
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
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const subscriptionEstablished = useRef(false);

  // Fetch claims from Supabase
  const fetchClaims = async (showStaleWhileRevalidate = false) => {
    try {
      // If using stale-while-revalidate, don't show loading state
      if (!showStaleWhileRevalidate) {
        setLoading(true);
      }

      const { data, error } = await supabase
        .from('claims')
        .select('id, pokemon_name, image_url, card_value, claimer_name, claimed_at')
        .order('claimed_at', { ascending: false })
        .limit(CLAIMS_LIMIT);

      if (error) throw error;

      const freshData = data || [];
      setClaims(freshData);
      setCachedClaims(freshData);
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

    const initializeData = async () => {
      // Check cache first (stale-while-revalidate)
      const cached = getCachedClaims();

      if (cached && !cached.stale) {
        // Fresh cache - use it, skip fetch
        if (mounted) {
          setClaims(cached);
          setLoading(false);
        }
      } else if (cached && cached.stale) {
        // Stale cache - show immediately, fetch in background
        if (mounted) {
          setClaims(cached.data);
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
        .channel('claims')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'claims'
        }, (payload) => {
          // Add new claim to the beginning, keep only CLAIMS_LIMIT
          setClaims(prev => {
            const updated = [payload.new, ...prev].slice(0, CLAIMS_LIMIT);
            setCachedClaims(updated); // Update cache
            return updated;
          });
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            subscriptionEstablished.current = true;
            console.log('Claims subscription established');
          }
        });
    };

    initializeData();

    // Cleanup subscription on unmount
    return () => {
      mounted = false;
      // Only remove channel if subscription was established (prevents StrictMode issues)
      if (channel && subscriptionEstablished.current) {
        supabase.removeChannel(channel);
        subscriptionEstablished.current = false;
      }
    };
  }, []);

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
