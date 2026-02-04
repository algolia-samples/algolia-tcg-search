import { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';

/**
 * OptimizedImage - Zero-dependency, bandwidth-conscious image component
 * Perfect for conference floors with limited bandwidth
 *
 * Features:
 * - Lazy loading with IntersectionObserver
 * - Tiny blur placeholder (~200 bytes) for instant feedback
 * - Connection-aware: skips large images on slow connections
 * - Explicit dimensions to prevent layout shift
 * - Preloads high-res only when visible
 */
export default function OptimizedImage({
  src,
  largeSrc,
  alt,
  className = '',
  onClick,
  style = {},
  eager = false, // Set true for above-the-fold images
  preloadLarge = false, // Set true to preload large version for modals
  width = 245,
  height = 342,
}) {
  const [imageSrc, setImageSrc] = useState(null); // null = placeholder, src = loaded
  const imgRef = useRef(null);
  const observerRef = useRef(null);
  const largePreloadRef = useRef(null);

  // Check connection speed - skip large images on slow connections
  const isSlowConnection = useRef(false);
  useEffect(() => {
    // Network Information API (supported in Chrome/Edge, graceful fallback)
    if ('connection' in navigator) {
      const conn = navigator.connection;
      // saveData mode or slow connection types
      isSlowConnection.current =
        conn.saveData ||
        conn.effectiveType === 'slow-2g' ||
        conn.effectiveType === '2g';
    }
  }, []);

  // Lazy load the main image when visible
  useEffect(() => {
    // Feature detection: fallback to eager loading if IntersectionObserver not supported
    if (eager || typeof IntersectionObserver === 'undefined') {
      // Eager mode or no IntersectionObserver: load immediately
      const img = new Image();
      img.onload = () => setImageSrc(src);
      img.onerror = () => console.warn('Failed to load image:', src);
      img.src = src;
      return;
    }

    if (!imgRef.current) return;

    const element = imgRef.current;

    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Start loading the real image
            const img = new Image();
            img.onload = () => {
              setImageSrc(src);
            };
            img.onerror = () => {
              console.warn('Failed to load image:', src);
            };
            img.src = src;
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '800px', // Start loading ~2 viewport heights before visible
        threshold: 0.01,
      }
    );

    observerRef.current = observer;
    observer.observe(element);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [eager, src]);

  // Preload large image when main image is loaded (unless slow connection)
  useEffect(() => {
    if (!preloadLarge || !largeSrc || !imageSrc || isSlowConnection.current) return;

    // Clean up previous preload
    if (largePreloadRef.current) {
      largePreloadRef.current = null;
    }

    const img = new Image();
    largePreloadRef.current = img;

    img.onload = () => {
      // Large image ready for modal
    };

    img.onerror = () => {
      console.warn('Failed to preload large image:', largeSrc);
    };

    img.src = largeSrc;

    return () => {
      if (largePreloadRef.current) {
        largePreloadRef.current.onload = null;
        largePreloadRef.current.onerror = null;
        largePreloadRef.current = null;
      }
    };
  }, [largeSrc, imageSrc, preloadLarge]);

  // Simple gray placeholder - clean and visible while loading
  const placeholder = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${width} ${height}'%3E%3Crect width='100%25' height='100%25' fill='%23e5e5e5'/%3E%3C/svg%3E`;

  return (
    <div
      ref={imgRef}
      style={{
        position: 'relative',
        width: `${width}px`,
        height: `${height}px`,
        display: 'inline-block',
      }}
      onClick={onClick}
    >
      {/* Gray placeholder - always visible */}
      <img
        src={placeholder}
        alt=""
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          objectFit: 'contain',
        }}
        className={className}
      />

      {/* Real image - replaces placeholder when loaded */}
      {imageSrc && (
        <img
          className={className}
          src={imageSrc}
          alt={alt}
          style={{
            ...style,
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'contain',
          }}
        />
      )}
    </div>
  );
}

OptimizedImage.propTypes = {
  src: PropTypes.string.isRequired,
  largeSrc: PropTypes.string,
  alt: PropTypes.string.isRequired,
  className: PropTypes.string,
  onClick: PropTypes.func,
  style: PropTypes.object,
  eager: PropTypes.bool,
  preloadLarge: PropTypes.bool,
  width: PropTypes.number,
  height: PropTypes.number,
};
