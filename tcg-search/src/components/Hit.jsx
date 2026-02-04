import React from 'react';
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
  const formattedPrice = hit.estimated_value ? `$${hit.estimated_value.toFixed(2)}` : '\u00A0';

  return (
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
            className="card"
            src={hit.image_small}
            alt={`${hit.pokemon_name} Pokemon card`}
            loading="lazy"
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
  );
}

Hit.propTypes = {
  hit: PropTypes.object.isRequired,
  sendEvent: PropTypes.func.isRequired,
};
