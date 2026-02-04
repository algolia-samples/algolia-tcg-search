import { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Highlight } from 'react-instantsearch';

// Helper to format set name with line break after colon
function formatSetName(setName) {
  if (!setName) return null;
  const parts = setName.split(':');
  if (parts.length > 1) {
    return (
      <>
        {parts[0]}:<br />{parts.slice(1).join(':').trim()}
      </>
    );
  }
  return setName;
}

// Helper to extract rotation from transform matrix
function getRotationFromMatrix(element) {
  try {
    const computedStyle = window.getComputedStyle(element);
    const matrix = computedStyle.transform;

    if (!matrix || matrix === 'none') {
      return 0;
    }

    const values = matrix.split('(')[1]?.split(')')[0]?.split(',');
    if (!values || values.length < 2) {
      return 0;
    }

    const a = parseFloat(values[0]);
    const b = parseFloat(values[1]);

    if (isNaN(a) || isNaN(b)) {
      return 0;
    }

    return Math.round(Math.atan2(b, a) * (180 / Math.PI));
  } catch (error) {
    console.warn('Failed to extract rotation from matrix:', error);
    return 0;
  }
}

export default function CarouselHit({ hit, sendEvent }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [origin, setOrigin] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  const imgRef = useRef(null);
  const observerRef = useRef(null);
  const formattedPrice = hit.estimated_value ? `$${hit.estimated_value.toFixed(2)}` : '\u00A0';

  // Preload large image only when card is visible in viewport
  useEffect(() => {
    if (!hit.image_large || !imgRef.current) return;

    const element = imgRef.current;

    // Clean up any previous observer before creating a new one
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }

    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = new Image();
            img.src = hit.image_large;
            obs.disconnect();
          }
        });
      },
      { rootMargin: '50px' } // Start loading 50px before visible
    );

    observerRef.current = observer;
    observer.observe(element);

    return () => {
      if (observerRef.current) {
        observerRef.current.unobserve(element);
        observerRef.current.disconnect();
        observerRef.current = null;
      }
    };
  }, [hit.image_large]);

  // Handle Escape key to close modal
  useEffect(() => {
    if (!isModalOpen) return;

    const handleEscapeKey = (e) => {
      if (e.key === 'Escape') {
        handleCloseModal();
      }
    };

    document.addEventListener('keydown', handleEscapeKey);
    return () => document.removeEventListener('keydown', handleEscapeKey);
  }, [isModalOpen]);

  const handleImageClick = (e) => {
    if (hit.image_large || hit.image_small) {
      const rect = e.target.getBoundingClientRect();
      const currentRotation = getRotationFromMatrix(e.target);

      setOrigin({
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      });
      setRotation(currentRotation);
      setIsModalOpen(true);
      setIsClosing(false);
    }
  };

  const handleCloseModal = () => {
    // Capture current rotation state of the card before closing
    if (imgRef.current) {
      const currentRotation = getRotationFromMatrix(imgRef.current);
      setRotation(currentRotation);
    }

    setIsClosing(true);
    setTimeout(() => {
      setIsModalOpen(false);
      setIsClosing(false);
    }, 250); // Match animation duration
  };

  return (
    <>
      <article className="carousel-hit-card" aria-label={`${hit.pokemon_name} Pokemon card`}>
        <div className="carousel-hit-image-wrapper">
          {hit.image_small ? (
            <img
              ref={imgRef}
              className="card"
              src={hit.image_small}
              alt={`${hit.pokemon_name} Pokemon card`}
              loading="lazy"
              onClick={handleImageClick}
              style={{ cursor: 'pointer' }}
            />
          ) : (
            <div className="card" style={{
              width: '245px',
              height: '342px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '1.2rem',
              fontWeight: 'bold',
              textAlign: 'center',
              padding: '1rem',
              borderRadius: '8px'
            }}>
              {hit.pokemon_name}
            </div>
          )}
        </div>
        <div className="carousel-hit-details">
          <h3 className="carousel-hit-name">
            <Highlight attribute="pokemon_name" hit={hit} />
          </h3>
          <div className="carousel-hit-price">{formattedPrice}</div>
          {hit.set_name && (
            <div className="carousel-hit-set">{formatSetName(hit.set_name)}</div>
          )}
        </div>
      </article>

      {/* Image Modal */}
      {isModalOpen && (
        <div
          className={`image-modal-overlay ${isClosing ? 'closing' : ''}`}
          onClick={handleCloseModal}
          role="dialog"
          aria-modal="true"
          aria-label="Enlarged card image"
        >
          <div
            className={`image-modal-content ${isClosing ? 'closing' : ''}`}
            style={{
              '--origin-x': `${origin.x}px`,
              '--origin-y': `${origin.y}px`,
              '--rotation': `${rotation}deg`
            }}
          >
            <img
              src={hit.image_large || hit.image_small}
              alt={`${hit.pokemon_name} Pokemon card - enlarged`}
              className="image-modal-img"
            />
          </div>
        </div>
      )}
    </>
  );
}

CarouselHit.propTypes = {
  hit: PropTypes.shape({
    pokemon_name: PropTypes.string.isRequired,
    image_small: PropTypes.string,
    image_large: PropTypes.string,
    estimated_value: PropTypes.number,
    set_name: PropTypes.string,
  }).isRequired,
  sendEvent: PropTypes.func.isRequired,
};
