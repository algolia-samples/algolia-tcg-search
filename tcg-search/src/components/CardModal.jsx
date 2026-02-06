import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import pokeballIcon from '../assets/pokeball_icon.svg';

export default function CardModal({ isOpen, onClose, hit, origin, rotation, isClosing }) {
  const [modalView, setModalView] = useState('image'); // 'image' | 'form'
  const [claimerName, setClaimerName] = useState('');
  const [claimerEmail, setClaimerEmail] = useState('');
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset to image view when modal opens
  useEffect(() => {
    if (isOpen) {
      setModalView('image');
      setClaimerName('');
      setClaimerEmail('');
      setFormErrors({});
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const handleClaimClick = () => {
    setModalView('form');
  };

  const handleBackClick = () => {
    setModalView('image');
    setFormErrors({});
  };

  const validateForm = () => {
    const errors = {};

    // Name validation: 2-50 characters, alphanumeric and spaces
    if (!claimerName || claimerName.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters';
    } else if (claimerName.length > 50) {
      errors.name = 'Name must be less than 50 characters';
    } else if (!/^[a-zA-Z0-9\s]+$/.test(claimerName)) {
      errors.name = 'Name can only contain letters, numbers, and spaces';
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!claimerEmail || !emailRegex.test(claimerEmail)) {
      errors.email = 'Please enter a valid email address';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    // Phase 1: Placeholder functionality
    console.log('Claim form submitted:', {
      cardId: hit.objectID,
      pokemonName: hit.pokemon_name,
      cardNumber: hit.number,
      setName: hit.set_name,
      cardValue: hit.estimated_value,
      imageUrl: hit.image_large || hit.image_small,
      claimerName: claimerName.trim(),
      claimerEmail: claimerEmail.trim(),
    });

    // Simulate API call delay
    setTimeout(() => {
      setIsSubmitting(false);
      alert('Claim submitted successfully! (Placeholder - no backend yet)');
      onClose();
    }, 500);
  };

  if (!isOpen) return null;

  return (
    <div
      className={`image-modal-overlay ${isClosing ? 'closing' : ''}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-label={modalView === 'image' ? 'Enlarged card image' : 'Claim card form'}
    >
      {modalView === 'image' ? (
        // Image view with buttons
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
          <div className="modal-button-container">
            <button
              className="modal-btn modal-btn-claim"
              onClick={handleClaimClick}
              aria-label="Claim this card"
            >
              <img src={pokeballIcon} alt="" className="pokeball-icon" />
              Claim
            </button>
            <button
              className="modal-btn modal-btn-close"
              onClick={onClose}
              aria-label="Close modal"
            >
              Close
            </button>
          </div>
        </div>
      ) : (
        // Form view
        <div className="modal-form-container">
          <h2 className="modal-form-title">Claim {hit.pokemon_name}</h2>
          <form onSubmit={handleFormSubmit}>
            <div className="modal-form-group">
              <label htmlFor="claimer-name">Your Name</label>
              <input
                type="text"
                id="claimer-name"
                value={claimerName}
                onChange={(e) => setClaimerName(e.target.value)}
                placeholder="Enter your name"
                disabled={isSubmitting}
                aria-invalid={!!formErrors.name}
                aria-describedby={formErrors.name ? 'name-error' : undefined}
              />
              {formErrors.name && (
                <span id="name-error" className="form-error">{formErrors.name}</span>
              )}
            </div>

            <div className="modal-form-group">
              <label htmlFor="claimer-email">Your Email</label>
              <input
                type="email"
                id="claimer-email"
                value={claimerEmail}
                onChange={(e) => setClaimerEmail(e.target.value)}
                placeholder="Enter your email"
                disabled={isSubmitting}
                aria-invalid={!!formErrors.email}
                aria-describedby={formErrors.email ? 'email-error' : undefined}
              />
              {formErrors.email && (
                <span id="email-error" className="form-error">{formErrors.email}</span>
              )}
            </div>

            <div className="modal-form-actions">
              <button
                type="button"
                className="modal-btn modal-btn-back"
                onClick={handleBackClick}
                disabled={isSubmitting}
              >
                Back
              </button>
              <button
                type="submit"
                className="modal-btn modal-btn-submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Claim'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

CardModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  hit: PropTypes.shape({
    objectID: PropTypes.string.isRequired,
    pokemon_name: PropTypes.string.isRequired,
    image_small: PropTypes.string,
    image_large: PropTypes.string,
    number: PropTypes.string,
    set_name: PropTypes.string,
    estimated_value: PropTypes.number,
  }).isRequired,
  origin: PropTypes.shape({
    x: PropTypes.number.isRequired,
    y: PropTypes.number.isRequired,
  }).isRequired,
  rotation: PropTypes.number.isRequired,
  isClosing: PropTypes.bool.isRequired,
};
