import { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Highlight,
} from 'react-instantsearch';

// Helper to get card type badge color
function getCardTypeColor(cardType) {
  const colors = {
    'Full Art': '#e74c3c',
    'Alternative Full Art': '#ff6b6b',
    'Gold': '#f39c12',
    'Secret Art': '#9b59b6',
    'Holo': '#3498db',
    'Reverse Holo': '#1abc9c'
  };
  return colors[cardType] || '#3B4CCA';
}

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

export default function Hit({hit, sendEvent}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [origin, setOrigin] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  const imgRef = useRef(null);
  const formattedPrice = hit.estimated_value ? `$${hit.estimated_value.toFixed(2)}` : '\u00A0';

  // Preload large image only when card is visible in viewport
  useEffect(() => {
    if (!hit.image_large || !imgRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = new Image();
            img.src = hit.image_large;
            observer.disconnect();
          }
        });
      },
      { rootMargin: '50px' } // Start loading 50px before visible
    );

    observer.observe(imgRef.current);

    return () => observer.disconnect();
  }, [hit.image_large]);

  const handleImageClick = (e) => {
    if (hit.image_large || hit.image_small) {
      const rect = e.target.getBoundingClientRect();

      // Get the current transform (rotation) from the element
      const computedStyle = window.getComputedStyle(e.target);
      const matrix = computedStyle.transform;

      // Extract rotation from transform matrix
      let currentRotation = 0;
      if (matrix && matrix !== 'none') {
        const values = matrix.split('(')[1].split(')')[0].split(',');
        const a = values[0];
        const b = values[1];
        currentRotation = Math.round(Math.atan2(b, a) * (180 / Math.PI));
      }

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
      const computedStyle = window.getComputedStyle(imgRef.current);
      const matrix = computedStyle.transform;

      let currentRotation = 0;
      if (matrix && matrix !== 'none') {
        const values = matrix.split('(')[1].split(')')[0].split(',');
        const a = values[0];
        const b = values[1];
        currentRotation = Math.round(Math.atan2(b, a) * (180 / Math.PI));
      }

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
      <article className="hit-card" aria-label={`${hit.pokemon_name} Pokemon card`}>
        <div className="hit-name-header">
          <h1><Highlight attribute="pokemon_name" hit={hit} /></h1>
          {hit.number && (
            <span className="hit-card-number">#{hit.number}</span>
          )}
        </div>
        <div className="hit-card-image-wrapper">
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
      <div className="search__desc">
        <div className="hit-price-prominent">
          {formattedPrice}
        </div>

        {hit.card_type && (
          <div className="hit-variants-row">
            <span className="hit-label">Type:</span>
            <div className="variant-badges" role="list" aria-label="Card type">
              <span
                className="variant-badge"
                style={{ backgroundColor: getCardTypeColor(hit.card_type) }}
                role="listitem"
                aria-label={`${hit.card_type} card`}
              >
                {hit.card_type}
              </span>
            </div>
          </div>
        )}

        <div className="hit-details">
          <div className="hit-detail-row">
            <span className="hit-label">Set:</span>
            <span className="hit-value">{formatSetName(hit.set_name)}</span>
          </div>
          {hit.machine_quantity !== undefined && hit.machine_quantity !== null && (
            <div className="hit-detail-row">
              <span className="hit-label">In Stock:</span>
              <span className="hit-value">{hit.machine_quantity}</span>
            </div>
          )}
        </div>

        {/* Special badges 2x2 grid */}
        <div className="hit-special-badges">
          <span className={`special-badge badge-top-10 ${hit.is_top_10_chase_card ? 'active' : 'inactive'}`}>
            ⭐ Top 10!
          </span>
          <span className={`special-badge badge-chase ${hit.is_chase_card && !hit.is_top_10_chase_card ? 'active' : 'inactive'}`}>
            🏁 Chase Card
          </span>
          <span className={`special-badge badge-full-art ${hit.is_full_art ? 'active' : 'inactive'}`}>
            🎨 Full Art
          </span>
          <span className={`special-badge badge-gen1 ${hit.is_classic_pokemon ? 'active' : 'inactive'}`}>
            ✓ Gen 1
          </span>
        </div>
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

Hit.propTypes = {
  hit: PropTypes.object.isRequired,
  sendEvent: PropTypes.func.isRequired,
};
