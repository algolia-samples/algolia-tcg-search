import { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Highlight } from 'react-instantsearch';
import OptimizedImage from './OptimizedImage';
import CardModal from './CardModal';
import InventoryBar from './InventoryBar';

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

export default function CarouselHit({ hit, sendEvent, eager = false }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [origin, setOrigin] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  const imgRef = useRef(null);
  const wrapperRef = useRef(null);
  const formattedPrice = hit.estimated_value != null ? `$${hit.estimated_value.toFixed(2)}` : '\u00A0';
  const isClaimed = !hit.machine_quantity || hit.machine_quantity <= 0;

  const handleImageClick = (e) => {
    if (hit.image_large || hit.image_small) {
      // Find the actual image element
      const imgElement = e.target.tagName === 'IMG' ? e.target : e.target.querySelector('img');
      if (!imgElement) return;

      const rect = imgElement.getBoundingClientRect();
      const currentRotation = getRotationFromMatrix(wrapperRef.current);

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
    if (wrapperRef.current) {
      const currentRotation = getRotationFromMatrix(wrapperRef.current);
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
        <div className={`carousel-hit-image-wrapper ${isClaimed ? 'claimed' : ''}`} ref={wrapperRef}>
          {isClaimed && <div className="carousel-claimed-badge">CLAIMED</div>}
          {hit.image_small ? (
            <OptimizedImage
              ref={imgRef}
              className="card"
              src={hit.image_small}
              largeSrc={hit.image_large}
              alt={`${hit.pokemon_name} Pokemon card`}
              preloadLarge={true}
              onClick={handleImageClick}
              style={{ cursor: 'pointer' }}
              width={245}
              height={342}
              eager={eager}
              fill={true}
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
          {hit.machine_quantity !== undefined && hit.machine_quantity !== null && (
            <div className="carousel-inventory-row">
              <span className="carousel-inventory-label">In Stock:</span>
              <InventoryBar current={hit.machine_quantity} initial={hit.initial_quantity} />
              <span className="carousel-inventory-count">{hit.machine_quantity}</span>
            </div>
          )}
          {hit.set_name && (
            <div className="carousel-hit-set">{formatSetName(hit.set_name)}</div>
          )}
        </div>
      </article>

      {/* Card Modal with claim functionality */}
      <CardModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        hit={hit}
        origin={origin}
        rotation={rotation}
        isClosing={isClosing}
        isClaimed={isClaimed}
      />
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
    machine_quantity: PropTypes.number,
    initial_quantity: PropTypes.number,
  }).isRequired,
  sendEvent: PropTypes.func.isRequired,
  eager: PropTypes.bool,
};
