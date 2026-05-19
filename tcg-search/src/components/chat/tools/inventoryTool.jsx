import PropTypes from 'prop-types';
import { searchClient, getIndexNames } from '../../../utilities/algolia';
import InventoryBar from '../../InventoryBar';

function InventoryToolResult({ message }) {
  if (message.state === 'input-streaming' || message.state === 'input-available') {
    return <p className="inventory-tool-status">Checking inventory…</p>;
  }
  if (message.state === 'output-error') {
    return <p className="inventory-tool-status">Could not retrieve inventory.</p>;
  }

  const { hits, nbHits } = message.output ?? {};
  if (!nbHits) {
    return <p className="inventory-tool-status">No matching cards found.</p>;
  }

  return (
    <div className="inventory-tool-results">
      {hits.map((hit) => {
        const isClaimed = !hit.machine_quantity || hit.machine_quantity <= 0;
        const price = hit.estimated_value != null ? `$${hit.estimated_value.toFixed(2)}` : null;
        return (
          <article key={hit.objectID} className="carousel-hit-card" aria-label={`${hit.pokemon_name} Pokemon card`}>
            <div className={`carousel-hit-image-wrapper ${isClaimed ? 'claimed' : ''}`}>
              {isClaimed && <div className="carousel-claimed-badge">CLAIMED</div>}
              {hit.image_small ? (
                <img
                  className="card"
                  src={hit.image_small}
                  alt={`${hit.pokemon_name} card`}
                  width={122}
                  height={171}
                />
              ) : (
                <div className="card inventory-tool-placeholder">{hit.pokemon_name}</div>
              )}
            </div>
            <div className="carousel-hit-details">
              <h3 className="carousel-hit-name">{hit.pokemon_name}</h3>
              {price && <div className="carousel-hit-price">{price}</div>}
              {hit.machine_quantity != null && (
                <div className="carousel-inventory-row">
                  <span className={hit.machine_quantity === 1 ? 'inventory-count inventory-count--last' : 'inventory-count'}>
                    {isClaimed ? 'Claimed' : hit.machine_quantity === 1 ? 'Last one!' : `${hit.machine_quantity} left`}
                  </span>
                  <InventoryBar current={hit.machine_quantity} initial={hit.initial_quantity} />
                </div>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}

InventoryToolResult.propTypes = {
  message: PropTypes.shape({
    state: PropTypes.string.isRequired,
    output: PropTypes.shape({
      hits: PropTypes.array,
      nbHits: PropTypes.number,
    }),
  }).isRequired,
};

export function makeInventoryTool(eventId) {
  const { primary } = getIndexNames(eventId);
  return {
    onToolCall({ input, addToolResult }) {
      searchClient
        .searchSingleIndex({
          indexName: primary,
          searchParams: { query: input.query, hitsPerPage: 10 },
        })
        .then(({ hits, nbHits }) => addToolResult({ output: { hits, nbHits } }))
        .catch(() => addToolResult({ output: { hits: [], nbHits: 0 } }));
    },
    layoutComponent: InventoryToolResult,
  };
}
