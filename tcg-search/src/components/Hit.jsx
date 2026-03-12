import { Highlight } from 'react-instantsearch';
import PropTypes from 'prop-types';
import OptimizedImage from './OptimizedImage';
import CardModal from './CardModal';
import InventoryBar from './InventoryBar';
import { useCardModal } from './useCardModal';
import { formatSetName, getCardTypeColor, PLACEHOLDER_CARD_STYLE, CURSOR_POINTER_STYLE } from '../utilities/cardHelpers.jsx';

export default function Hit({ hit }) {
  const { isModalOpen, isClosing, origin, rotation, imgRef, wrapperRef, handleImageClick, handleCloseModal } = useCardModal(hit);
  const formattedPrice = hit.estimated_value != null ? `$${hit.estimated_value.toFixed(2)}` : '\u00A0';
  const isClaimed = !hit.machine_quantity || hit.machine_quantity <= 0;

  return (
    <>
      <article className="hit-card" aria-label={`${hit.pokemon_name} Pokemon card`}>
        <div className="hit-name-header">
          <h1><Highlight attribute="pokemon_name" hit={hit} /></h1>
          {hit.number && (
            <span className="hit-card-number">#{hit.number}</span>
          )}
        </div>
        <div className={`hit-card-image-wrapper ${isClaimed ? 'claimed' : ''}`} ref={wrapperRef}>
          {isClaimed && <div className="hit-claimed-badge">CLAIMED</div>}
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
            />
          ) : (
            <div className="card" style={PLACEHOLDER_CARD_STYLE}>
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
            {hit.set_name && (
              <div className="hit-detail-value">{formatSetName(hit.set_name)}</div>
            )}
            {hit.machine_quantity !== undefined && hit.machine_quantity !== null && (
              <div className="hit-inventory-row">
                <span className={hit.machine_quantity === 1 ? 'inventory-count inventory-count--last' : 'inventory-count'}>{hit.machine_quantity === 1 ? 'Last one!' : `${hit.machine_quantity} left`}</span>
                <InventoryBar current={hit.machine_quantity} initial={hit.initial_quantity} />
              </div>
            )}
          </div>

          {/* Special badges 2x2 grid */}
          <div className="hit-special-badges">
            <span className={`special-badge badge-top-10 ${hit.is_top_10_chase_card ? 'active' : 'inactive'}`}>
              ⭐ Top 10!
            </span>
            <span className={`special-badge badge-chase ${hit.is_chase_card ? 'active' : 'inactive'}`}>
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

Hit.propTypes = {
  hit: PropTypes.shape({
    pokemon_name: PropTypes.string.isRequired,
    image_small: PropTypes.string,
    image_large: PropTypes.string,
    estimated_value: PropTypes.number,
    card_type: PropTypes.string,
    set_name: PropTypes.string,
    number: PropTypes.string,
    machine_quantity: PropTypes.number,
    initial_quantity: PropTypes.number,
    is_top_10_chase_card: PropTypes.bool,
    is_chase_card: PropTypes.bool,
    is_full_art: PropTypes.bool,
    is_classic_pokemon: PropTypes.bool,
  }).isRequired,
};
