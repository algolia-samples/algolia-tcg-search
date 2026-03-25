import PropTypes from 'prop-types';
import { useToggleRefinement } from 'react-instantsearch';

export default function FilterToggle({ attribute, label, shortLabel }) {
  const { value, refine } = useToggleRefinement({ attribute });

  return (
    <button
      className={`filter-toggle${value.isRefined ? ' filter-toggle--active' : ''}`}
      onClick={() => refine(value)}
      aria-pressed={value.isRefined}
    >
      <span className="label-full">{label}</span>
      <span className="label-short">{shortLabel ?? label}</span>
    </button>
  );
}

FilterToggle.propTypes = {
  attribute: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  shortLabel: PropTypes.string,
};
