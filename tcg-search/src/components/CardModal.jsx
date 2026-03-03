import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import pokeballIcon from '../assets/pokeball_icon.svg';
import { useEvent } from '../context/EventContext';

export default function CardModal({ isOpen, onClose, hit, origin, rotation, isClosing, isClaimed = false }) {
  const { eventConfig } = useEvent();
  const [modalView, setModalView] = useState('image'); // 'image' | 'form' | 'success'
  // const [claimerName, setClaimerName] = useState('');
  // const [claimerEmail, setClaimerEmail] = useState('');
  const [claimerFirstName, setClaimerFirstName] = useState('');
  const [claimerLastName, setClaimerLastName] = useState('');
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const successTimeoutRef = useRef(null);

  // Reset to image view when modal opens
  useEffect(() => {
    if (isOpen) {
      setModalView('image');
      // setClaimerName('');
      // setClaimerEmail('');
      setClaimerFirstName('');
      setClaimerLastName('');
      setFormErrors({});
      setIsSubmitting(false);
    }
  }, [isOpen]);

  // Cleanup success timeout when modal closes or unmounts
  useEffect(() => {
    if (!isOpen && successTimeoutRef.current) {
      clearTimeout(successTimeoutRef.current);
      successTimeoutRef.current = null;
    }

    return () => {
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current);
        successTimeoutRef.current = null;
      }
    };
  }, [isOpen]);

  // Handle Escape key to close modal
  useEffect(() => {
    if (!isOpen) return;

    const handleEscapeKey = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscapeKey);
    return () => document.removeEventListener('keydown', handleEscapeKey);
  }, [isOpen, onClose]);

  const handleClaimClick = () => {
    setModalView('form');
  };

  const handleBackClick = () => {
    setModalView('image');
    setFormErrors({});
  };

  const validateForm = () => {
    const errors = {};

    // // Name validation: 2-50 characters, alphanumeric and spaces
    // if (!claimerName || claimerName.trim().length < 2) {
    //   errors.name = 'Name must be at least 2 characters';
    // } else if (claimerName.length > 50) {
    //   errors.name = 'Name must be less than 50 characters';
    // } else if (!/^[a-zA-Z0-9\s]+$/.test(claimerName)) {
    //   errors.name = 'Name can only contain letters, numbers, and spaces';
    // }

    // // Email validation
    // const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    // if (!claimerEmail || !emailRegex.test(claimerEmail)) {
    //   errors.email = 'Please enter a valid email address';
    // }

    // First name validation: 2-50 characters, alphanumeric and spaces
    if (!claimerFirstName || claimerFirstName.trim().length < 2) {
      errors.firstName = 'First name must be at least 2 characters';
    } else if (claimerFirstName.length > 50) {
      errors.firstName = 'First name must be less than 50 characters';
    } else if (!/^[a-zA-Z0-9\s]+$/.test(claimerFirstName)) {
      errors.firstName = 'First name can only contain letters, numbers, and spaces';
    }

    // Last name validation: 2-50 characters, alphanumeric and spaces
    if (!claimerLastName || claimerLastName.trim().length < 2) {
      errors.lastName = 'Last name must be at least 2 characters';
    } else if (claimerLastName.length > 50) {
      errors.lastName = 'Last name must be less than 50 characters';
    } else if (!/^[a-zA-Z0-9\s]+$/.test(claimerLastName)) {
      errors.lastName = 'Last name can only contain letters, numbers, and spaces';
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
    setFormErrors({});

    try {
      // Call the API to save the claim
      const response = await fetch('/api/claims/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventId: eventConfig?.event_id,
          cardId: hit.objectID,
          pokemonName: hit.pokemon_name,
          cardNumber: hit.number,
          setName: hit.set_name,
          cardValue: hit.estimated_value,
          imageUrl: hit.image_large || hit.image_small,
          // claimerName: claimerName.trim(),
          // claimerEmail: claimerEmail.trim(),
          claimerFirstName: claimerFirstName.trim(),
          claimerLastName: claimerLastName.trim(),
        }),
      });

      // Check if response is JSON before parsing
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.error('Non-JSON response from API:', response.status, response.statusText);
        setFormErrors({ submit: 'Server error. Please try again later.' });
        setIsSubmitting(false);
        return;
      }

      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        console.error('Failed to parse JSON response:', parseError);
        setFormErrors({ submit: 'Server error. Please try again later.' });
        setIsSubmitting(false);
        return;
      }

      if (!response.ok) {
        // Handle error from API
        setFormErrors({ submit: data.error || 'Failed to submit claim' });
        setIsSubmitting(false);
        return;
      }

      // Success! Show success view
      setModalView('success');
      setIsSubmitting(false);

      // Auto-close and reload after 2 seconds
      successTimeoutRef.current = setTimeout(() => {
        onClose();
        window.location.reload();
      }, 2000);

    } catch (error) {
      console.error('Error submitting claim:', error);
      setFormErrors({ submit: 'Network error. Please try again.' });
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <div
      className={`image-modal-overlay ${isClosing ? 'closing' : ''}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-label={modalView === 'image' ? 'Enlarged card image' : modalView === 'success' ? 'Claim success' : 'Claim card form'}
    >
      {modalView === 'success' ? (
        // Success view
        <div className="modal-form-container modal-success-container">
          <div className="success-icon">✓</div>
          <h2 className="modal-form-title">Successfully Claimed!</h2>
          <p className="success-message">
            You've claimed <strong>{hit.pokemon_name}</strong>!
          </p>
          <p className="success-submessage">Refreshing page...</p>
        </div>
      ) : modalView === 'image' ? (
        // Image view with buttons
        <div
          className={`image-modal-content ${isClosing ? 'closing' : ''}`}
          style={{
            '--origin-x': `${origin.x}px`,
            '--origin-y': `${origin.y}px`,
            '--rotation': `${rotation}deg`
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-image-wrapper">
            <img
              src={hit.image_large || hit.image_small}
              alt={`${hit.pokemon_name} Pokemon card - enlarged`}
              className="image-modal-img"
            />
          </div>
          <div className="modal-button-bar">
            <button
              className={`modal-btn modal-btn-claim ${isClaimed ? 'disabled' : ''}`}
              onClick={isClaimed ? undefined : handleClaimClick}
              aria-label={isClaimed ? "Card already claimed" : "Claim this card"}
              disabled={isClaimed}
            >
              <img src={pokeballIcon} alt="" className="pokeball-icon" />
              {isClaimed ? 'Claimed' : hit.machine_quantity > 0 ? `Claim (${hit.machine_quantity} left)` : 'Claim'}
            </button>
            <button
              className="modal-btn modal-btn-close"
              onClick={onClose}
              aria-label="Close modal"
            >
              <span className="close-icon">✕</span>
              Close
            </button>
          </div>
        </div>
      ) : (
        // Form view
        <div className="modal-form-container">
          <h2 className="modal-form-title">Claim {hit.pokemon_name}</h2>
          <form onSubmit={handleFormSubmit} noValidate>
            {/* <div className="modal-form-group">
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
            </div> */}

            <div className="modal-form-group">
              <label htmlFor="claimer-first-name">First Name</label>
              <input
                type="text"
                id="claimer-first-name"
                value={claimerFirstName}
                onChange={(e) => setClaimerFirstName(e.target.value)}
                placeholder="Enter your first name"
                disabled={isSubmitting}
                aria-invalid={!!formErrors.firstName}
                aria-describedby={formErrors.firstName ? 'first-name-error' : undefined}
              />
              {formErrors.firstName && (
                <span id="first-name-error" className="form-error">{formErrors.firstName}</span>
              )}
            </div>

            <div className="modal-form-group">
              <label htmlFor="claimer-last-name">Last Name</label>
              <input
                type="text"
                id="claimer-last-name"
                value={claimerLastName}
                onChange={(e) => setClaimerLastName(e.target.value)}
                placeholder="Enter your last name"
                disabled={isSubmitting}
                aria-invalid={!!formErrors.lastName}
                aria-describedby={formErrors.lastName ? 'last-name-error' : undefined}
              />
              {formErrors.lastName && (
                <span id="last-name-error" className="form-error">{formErrors.lastName}</span>
              )}
            </div>

            {formErrors.submit && (
              <div className="form-error" style={{ marginTop: '1rem', textAlign: 'center' }}>
                {formErrors.submit}
              </div>
            )}

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

  return createPortal(modalContent, document.body);
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
    machine_quantity: PropTypes.number,
  }).isRequired,
  origin: PropTypes.shape({
    x: PropTypes.number.isRequired,
    y: PropTypes.number.isRequired,
  }).isRequired,
  rotation: PropTypes.number.isRequired,
  isClosing: PropTypes.bool.isRequired,
  isClaimed: PropTypes.bool,
};
