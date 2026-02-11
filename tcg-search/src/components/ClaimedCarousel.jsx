import { useState, useRef, useEffect } from 'react';
import { supabase } from '../utilities/supabase';
import OptimizedImage from './OptimizedImage';

// Helper to format time ago
function formatTimeAgo(timestamp) {
  const now = new Date();
  const claimedTime = new Date(timestamp);
  const diffMs = now - claimedTime;
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return 'Just now';
  } else if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else {
    return `${diffDays}d ago`;
  }
}

export default function ClaimedCarousel() {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const scrollTimeoutRef = useRef(null);

  // Fetch initial claims
  const fetchClaims = async () => {
    try {
      const { data, error } = await supabase
        .from('claims')
        .select('*')
        .order('claimed_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setClaims(data || []);
    } catch (error) {
      console.error('Error fetching claims:', error);
    } finally {
      setLoading(false);
    }
  };

  // Set up real-time subscription
  useEffect(() => {
    // Initial fetch
    fetchClaims();

    // Real-time subscription
    const channel = supabase
      .channel('claims')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'claims'
      }, (payload) => {
        // Add new claim to the beginning, keep only 20
        setClaims(prev => [payload.new, ...prev].slice(0, 20));
      })
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Check scroll position to show/hide navigation arrows
  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  // Throttled scroll handler
  const handleScroll = () => {
    if (scrollTimeoutRef.current) {
      return;
    }
    scrollTimeoutRef.current = setTimeout(() => {
      checkScroll();
      scrollTimeoutRef.current = null;
    }, 100);
  };

  useEffect(() => {
    // Check scroll position when claims update
    setTimeout(checkScroll, 100);
    const scrollElement = scrollRef.current;
    if (scrollElement) {
      scrollElement.addEventListener('scroll', handleScroll);
      window.addEventListener('resize', checkScroll);
      return () => {
        scrollElement.removeEventListener('scroll', handleScroll);
        window.removeEventListener('resize', checkScroll);
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
        }
      };
    }
  }, [claims]);

  const scroll = (direction) => {
    if (scrollRef.current) {
      const firstItem = scrollRef.current.querySelector('.claimed-card');
      if (firstItem) {
        const track = scrollRef.current.querySelector('.claimed-carousel-track');
        const gap = track ? parseFloat(window.getComputedStyle(track).gap) : 0;
        const scrollAmount = firstItem.offsetWidth + gap;
        scrollRef.current.scrollBy({
          left: direction === 'left' ? -scrollAmount : scrollAmount,
          behavior: 'smooth'
        });
      } else {
        scrollRef.current.scrollBy({
          left: direction === 'left' ? -scrollRef.current.clientWidth * 0.8 : scrollRef.current.clientWidth * 0.8,
          behavior: 'smooth'
        });
      }
    }
  };

  // Don't render if loading or no claims
  if (loading || claims.length === 0) {
    return null;
  }

  return (
    <div className="claimed-carousel-wrapper">
      <h2 className="claimed-carousel-title">🎉 Recently Claimed</h2>
      <div className="carousel-container">
        {canScrollLeft && (
          <button
            className="carousel-nav carousel-nav-left"
            onClick={() => scroll('left')}
            aria-label="Scroll left"
          >
            ‹
          </button>
        )}
        <div className="carousel-scroll" ref={scrollRef}>
          <div className="claimed-carousel-track">
            {claims.map((claim) => (
              <div key={claim.id} className="claimed-card">
                <div className="claimed-card-badge">CLAIMED</div>
                <div className="claimed-card-image-wrapper">
                  {claim.image_url ? (
                    <OptimizedImage
                      className="claimed-card-image"
                      src={claim.image_url}
                      alt={`${claim.pokemon_name} Pokemon card`}
                      width={245}
                      height={342}
                      eager={false}
                      fill={true}
                    />
                  ) : (
                    <div className="claimed-card-image claimed-card-placeholder" style={{
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: '1.2rem',
                      fontWeight: 'bold',
                      textAlign: 'center',
                      padding: '1rem'
                    }}>
                      {claim.pokemon_name}
                    </div>
                  )}
                </div>
                <div className="claimed-card-details">
                  <h3 className="claimed-card-name">{claim.pokemon_name}</h3>
                  <div className="claimed-card-value">
                    {claim.card_value ? `$${claim.card_value.toFixed(2)}` : '\u00A0'}
                  </div>
                  <div className="claimed-card-claimer">
                    Claimed by {claim.claimer_name}
                  </div>
                  <div className="claimed-card-time">
                    {formatTimeAgo(claim.claimed_at)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        {canScrollRight && (
          <button
            className="carousel-nav carousel-nav-right"
            onClick={() => scroll('right')}
            aria-label="Scroll right"
          >
            ›
          </button>
        )}
      </div>
    </div>
  );
}
