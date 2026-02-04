import { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  InstantSearch,
  Configure,
  useInfiniteHits,
} from 'react-instantsearch';
import { searchClient, indexNamePriceDesc } from '../utilities/algolia';
import CarouselHit from './CarouselHit';

// Inner component that uses InstantSearch hooks
function CarouselContent() {
  const { hits } = useInfiniteHits();
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [visibleIndices, setVisibleIndices] = useState(new Set([0, 1, 2, 3])); // Preload first 4
  const scrollTimeoutRef = useRef(null);

  // Check scroll position to show/hide navigation arrows and preload nearby images
  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);

      // Calculate which items are visible or close to being visible
      const items = scrollRef.current.querySelectorAll('.carousel-item');
      const newVisibleIndices = new Set();

      items.forEach((item, index) => {
        const rect = item.getBoundingClientRect();
        const containerRect = scrollRef.current.getBoundingClientRect();

        // Check if item is visible or within 2 card widths (preload buffer)
        const isNearViewport = rect.left < containerRect.right + (rect.width * 2) &&
                               rect.right > containerRect.left - (rect.width * 2);

        if (isNearViewport) {
          newVisibleIndices.add(index);
        }
      });

      setVisibleIndices(newVisibleIndices);
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
    // Use setTimeout to ensure DOM is ready
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
  }, [hits]);

  const scroll = (direction) => {
    if (scrollRef.current) {
      // Get the first carousel item to determine exact card width + gap
      const firstItem = scrollRef.current.querySelector('.carousel-item');
      if (firstItem) {
        const track = scrollRef.current.querySelector('.carousel-track');
        const gap = track ? parseFloat(window.getComputedStyle(track).gap) : 0;
        const scrollAmount = firstItem.offsetWidth + gap;
        scrollRef.current.scrollBy({
          left: direction === 'left' ? -scrollAmount : scrollAmount,
          behavior: 'smooth'
        });
      } else {
        // Fallback if items aren't ready yet
        scrollRef.current.scrollBy({
          left: direction === 'left' ? -scrollRef.current.clientWidth * 0.8 : scrollRef.current.clientWidth * 0.8,
          behavior: 'smooth'
        });
      }
    }
  };

  // Don't render if no hits
  if (hits.length === 0) {
    return null;
  }

  return (
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
        <div className="carousel-track">
          {hits.map((hit, index) => (
            <div key={hit.objectID} className="carousel-item">
              <CarouselHit
                hit={hit}
                sendEvent={() => {}}
                eager={visibleIndices.has(index)}
              />
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
  );
}

// Main carousel component with separate InstantSearch instance
export default function Carousel({ title, filters, hitsPerPage = 10 }) {
  return (
    <div className="carousel-wrapper">
      <h2 className="carousel-title">{title}</h2>
      <InstantSearch
        searchClient={searchClient}
        indexName={indexNamePriceDesc}
      >
        <Configure
          hitsPerPage={hitsPerPage}
          filters={filters}
        />
        <CarouselContent />
      </InstantSearch>
    </div>
  );
}

Carousel.propTypes = {
  title: PropTypes.string.isRequired,
  filters: PropTypes.string.isRequired,
  hitsPerPage: PropTypes.number,
};
