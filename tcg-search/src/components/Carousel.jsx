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

  // Check scroll position to show/hide navigation arrows
  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    // Use setTimeout to ensure DOM is ready
    setTimeout(checkScroll, 100);
    const scrollElement = scrollRef.current;
    if (scrollElement) {
      scrollElement.addEventListener('scroll', checkScroll);
      window.addEventListener('resize', checkScroll);
      return () => {
        scrollElement.removeEventListener('scroll', checkScroll);
        window.removeEventListener('resize', checkScroll);
      };
    }
  }, [hits]);

  const scroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = scrollRef.current.clientWidth * 0.8;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
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
          {hits.map((hit) => (
            <div key={hit.objectID} className="carousel-item">
              <CarouselHit hit={hit} sendEvent={() => {}} />
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
export default function Carousel({ title, filters, hitsPerPage = 20 }) {
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
