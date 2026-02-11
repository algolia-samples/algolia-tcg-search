import { useState, useEffect } from 'react';
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
  const [shouldFetch, setShouldFetch] = useState(false);

  // Fetch claims from Supabase
  const fetchClaims = async (showStaleWhileRevalidate = false) => {
    try {
      // If using stale-while-revalidate, don't show loading state
      if (!showStaleWhileRevalidate) {
        setLoading(true);
      }

      const { data, error } = await supabase
        .from('claims')
        .select('*')
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

  // Initialize data and real-time subscription when component becomes visible
  useEffect(() => {
    // Try to load from cache first (stale-while-revalidate)
    const cached = getCachedClaims();
    if (cached) {
      if (cached.stale) {
        // Show stale data immediately, fetch fresh in background
        setClaims(cached.data);
        setLoading(false);
        setShouldFetch(true);
      } else {
        // Fresh cache - use it
        setClaims(cached);
        setLoading(false);
      }
    } else {
      // No cache - mark that we need to fetch
      setShouldFetch(true);
    }
  }, []);

  // Fetch data when needed
  useEffect(() => {
    if (!shouldFetch) return;

    fetchClaims(claims.length > 0); // If we have cached data, fetch in background

    // Set up real-time subscription
    const channel = supabase
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
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [shouldFetch]);

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
