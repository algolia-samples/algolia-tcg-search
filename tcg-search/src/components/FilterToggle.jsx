import PropTypes from 'prop-types';
import { useToggleRefinement } from 'react-instantsearch';

export default function FilterToggle({ attribute, label }) {
  const { value, refine } = useToggleRefinement({ attribute });

  return (
    <button
      className={`filter-toggle${value.isRefined ? ' filter-toggle--active' : ''}`}
      onClick={() => refine(value)}
      aria-pressed={value.isRefined}
    >
      {label}
      {value.count != null && (
        <span className="filter-toggle-count">({value.count})</span>
      )}
    </button>
  );
}

FilterToggle.propTypes = {
  attribute: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
};
