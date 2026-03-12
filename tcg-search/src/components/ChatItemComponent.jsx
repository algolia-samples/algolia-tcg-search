import PropTypes from 'prop-types';
import OptimizedImage from './OptimizedImage';
import CardModal from './CardModal';
import InventoryBar from './InventoryBar';
import { useCardModal } from './useCardModal';
import { formatSetName, PLACEHOLDER_CARD_STYLE, CURSOR_POINTER_STYLE } from '../utilities/cardHelpers.jsx';

export default function ChatItemComponent({ item }) {
  const { isModalOpen, isClosing, origin, rotation, imgRef, wrapperRef, handleImageClick, handleCloseModal } = useCardModal(item);
  const formattedPrice = item.estimated_value != null ? `$${item.estimated_value.toFixed(2)}` : '\u00A0';
  const isClaimed = !item.machine_quantity || item.machine_quantity <= 0;

  return (
    <>
      <article className="carousel-hit-card" aria-label={`${item.pokemon_name} Pokemon card`}>
        <div className={`carousel-hit-image-wrapper ${isClaimed ? 'claimed' : ''}`} ref={wrapperRef}>
          {isClaimed && <div className="carousel-claimed-badge">CLAIMED</div>}
          {item.image_small ? (
            <OptimizedImage
              ref={imgRef}
              className="card"
              src={item.image_small}
              largeSrc={item.image_large}
              alt={`${item.pokemon_name} Pokemon card`}
              preloadLarge={true}
              onClick={handleImageClick}
              style={CURSOR_POINTER_STYLE}
              width={245}
              height={342}
              fill={true}
            />
          ) : (
            <div className="card" style={PLACEHOLDER_CARD_STYLE}>
              {item.pokemon_name}
            </div>
          )}
        </div>
        <div className="carousel-hit-details">
          <h3 className="carousel-hit-name">
            {item.pokemon_name}
          </h3>
          <div className="carousel-hit-price">{formattedPrice}</div>
          {item.machine_quantity !== undefined && item.machine_quantity !== null && (
            <div className="carousel-inventory-row">
              <span className={item.machine_quantity === 1 ? 'inventory-count inventory-count--last' : 'inventory-count'}>{item.machine_quantity === 1 ? 'Last one!' : `${item.machine_quantity} left`}</span>
              <InventoryBar current={item.machine_quantity} initial={item.initial_quantity} />
            </div>
          )}
          {item.set_name && (
            <div className="carousel-hit-set">{formatSetName(item.set_name)}</div>
          )}
        </div>
      </article>

      <CardModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        hit={item}
        origin={origin}
        rotation={rotation}
        isClosing={isClosing}
        isClaimed={isClaimed}
      />
    </>
  );
}

ChatItemComponent.propTypes = {
  item: PropTypes.shape({
    objectID: PropTypes.string.isRequired,
    pokemon_name: PropTypes.string.isRequired,
    image_small: PropTypes.string,
    image_large: PropTypes.string,
    estimated_value: PropTypes.number,
    set_name: PropTypes.string,
    number: PropTypes.string,
    machine_quantity: PropTypes.number,
    initial_quantity: PropTypes.number,
  }).isRequired,
};
