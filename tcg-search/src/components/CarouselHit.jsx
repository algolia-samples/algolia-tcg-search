import { Highlight } from 'react-instantsearch';
import PropTypes from 'prop-types';
import OptimizedImage from './OptimizedImage';
import CardModal from './CardModal';
import InventoryBar from './InventoryBar';
import { useCardModal } from './useCardModal';
import { formatSetName, PLACEHOLDER_CARD_STYLE, CURSOR_POINTER_STYLE } from '../utilities/cardHelpers.jsx';

export default function CarouselHit({ hit, eager = false }) {
  const { isModalOpen, isClosing, origin, rotation, imgRef, wrapperRef, handleImageClick, handleCloseModal } = useCardModal(hit);
  const formattedPrice = hit.estimated_value != null ? `$${hit.estimated_value.toFixed(2)}` : '\u00A0';
  const isClaimed = !hit.machine_quantity || hit.machine_quantity <= 0;

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
              style={CURSOR_POINTER_STYLE}
              width={245}
              height={342}
              eager={eager}
              fill={true}
            />
          ) : (
            <div className="card" style={PLACEHOLDER_CARD_STYLE}>
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
              <span className={hit.machine_quantity === 1 ? 'inventory-count inventory-count--last' : 'inventory-count'}>{hit.machine_quantity === 1 ? 'Last one!' : `${hit.machine_quantity} left`}</span>
              <InventoryBar current={hit.machine_quantity} initial={hit.initial_quantity} />
            </div>
          )}
          {hit.set_name && (
            <div className="carousel-hit-set">{formatSetName(hit.set_name)}</div>
          )}
        </div>
      </article>

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
  eager: PropTypes.bool,
};
