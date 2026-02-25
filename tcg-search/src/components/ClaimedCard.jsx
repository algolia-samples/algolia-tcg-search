import PropTypes from 'prop-types';
import OptimizedImage from './OptimizedImage';

// Helper to format time ago
function formatTimeAgo(timestamp) {
  const now = new Date();
  const claimedTime = new Date(timestamp);
  const diffMs = now - claimedTime;
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return 'Just now';
  } else if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else {
    return `${diffDays}d ago`;
  }
}

/**
 * ClaimedCard - Displays a claimed Pokemon card with stamp effect
 */
export default function ClaimedCard({ claim, eager = false }) {
  return (
    <div className="claimed-card">
      <div className="claimed-card-badge">CLAIMED</div>
      <div className="claimed-card-image-wrapper">
        {claim.image_url ? (
          <OptimizedImage
            className="claimed-card-image"
            src={claim.image_url}
            alt={`${claim.pokemon_name} Pokemon card`}
            width={245}
            height={342}
            eager={eager}
            fill={true}
          />
        ) : (
          <div className="claimed-card-image claimed-card-placeholder" style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '1.2rem',
            fontWeight: 'bold',
            textAlign: 'center',
            padding: '1rem'
          }}>
            {claim.pokemon_name}
          </div>
        )}
      </div>
      <div className="claimed-card-details">
        <h3 className="claimed-card-name">{claim.pokemon_name}</h3>
        <div className="claimed-card-value">
          {claim.card_value != null ? `$${claim.card_value.toFixed(2)}` : '\u00A0'}
        </div>
        <div className="claimed-card-claimer">
          by {claim.claimer_name ?? `${claim.claimer_first_name} ${claim.claimer_last_name}`} • {formatTimeAgo(claim.claimed_at)}
        </div>
      </div>
    </div>
  );
}

ClaimedCard.propTypes = {
  claim: PropTypes.shape({
    id: PropTypes.number.isRequired,
    pokemon_name: PropTypes.string.isRequired,
    image_url: PropTypes.string,
    card_value: PropTypes.number,
    claimer_name: PropTypes.string,
    claimer_first_name: PropTypes.string,
    claimer_last_name: PropTypes.string,
    claimed_at: PropTypes.string.isRequired,
  }).isRequired,
  eager: PropTypes.bool,
};
