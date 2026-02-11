import { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';

/**
 * BaseCarousel - Reusable carousel component with smart image preloading
 *
 * Features:
 * - Horizontal scrolling with navigation arrows
 * - Smart visibility tracking for optimized image loading
 * - Optional lazy loading with IntersectionObserver
 * - Throttled scroll handling for performance
 * - Responsive and accessible
 */
export default function BaseCarousel({
  title,
  data,
  renderCard,
  getItemKey,
  loading = false,
  wrapperClassName = 'carousel-wrapper',
  titleClassName = 'carousel-title',
  containerClassName = 'carousel-container',
  trackClassName = 'carousel-track',
  itemClassName = 'carousel-item',
  enableLazyLoading = false,
  lazyLoadMargin = '100px',
}) {
  const wrapperRef = useRef(null);
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [visibleIndices, setVisibleIndices] = useState(new Set([0, 1, 2, 3])); // Preload first 4
  const [isVisible, setIsVisible] = useState(!enableLazyLoading); // If lazy loading disabled, always visible
  const scrollTimeoutRef = useRef(null);
  const hasInitialized = useRef(false);

  // IntersectionObserver for conditional loading
  useEffect(() => {
    if (!enableLazyLoading || !wrapperRef.current) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasInitialized.current) {
            setIsVisible(true);
            hasInitialized.current = true;
          }
        });
      },
      { rootMargin: lazyLoadMargin }
    );

    observer.observe(wrapperRef.current);

    return () => {
      if (wrapperRef.current) {
        observer.unobserve(wrapperRef.current);
      }
    };
  }, [enableLazyLoading, lazyLoadMargin]);

  // Check scroll position to show/hide navigation arrows and track visible items
  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);

      // Calculate which items are visible or close to being visible
      const items = scrollRef.current.querySelectorAll(`.${itemClassName}`);
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
    if (!isVisible) return;

    // Check scroll position when data updates
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
  }, [data, isVisible]);

  const scroll = (direction) => {
    if (scrollRef.current) {
      const firstItem = scrollRef.current.querySelector(`.${itemClassName}`);
      if (firstItem) {
        const track = scrollRef.current.querySelector(`.${trackClassName}`);
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

  // Don't render if loading or no data
  if (loading || !data || data.length === 0) {
    return null;
  }

  // Don't render until visible (if lazy loading enabled)
  if (enableLazyLoading && !isVisible) {
    return <div ref={wrapperRef} style={{ minHeight: '400px' }} />; // Placeholder
  }

  return (
    <div className={wrapperClassName} ref={wrapperRef}>
      <h2 className={titleClassName}>{title}</h2>
      <div className={containerClassName}>
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
          <div className={trackClassName}>
            {data.map((item, index) => (
              <div key={getItemKey(item, index)} className={itemClassName}>
                {renderCard(item, index, visibleIndices.has(index))}
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

BaseCarousel.propTypes = {
  title: PropTypes.string.isRequired,
  data: PropTypes.array.isRequired,
  renderCard: PropTypes.func.isRequired,
  getItemKey: PropTypes.func.isRequired,
  loading: PropTypes.bool,
  wrapperClassName: PropTypes.string,
  titleClassName: PropTypes.string,
  containerClassName: PropTypes.string,
  trackClassName: PropTypes.string,
  itemClassName: PropTypes.string,
  enableLazyLoading: PropTypes.bool,
  lazyLoadMargin: PropTypes.string,
};
