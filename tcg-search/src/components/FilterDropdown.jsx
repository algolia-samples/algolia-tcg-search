import React from 'react';
import PropTypes from 'prop-types';
import { useRefinementList } from 'react-instantsearch';

export default function FilterDropdown({ attribute, placeholder }) {
  const { items, refine } = useRefinementList({
    attribute,
    limit: 100,
  });

  const selectedCount = items.filter(item => item.isRefined).length;
  const label = selectedCount > 0 ? `${selectedCount} ${placeholder}${selectedCount > 1 ? 's' : ''}` : placeholder;

  const handleChange = (event) => {
    const value = event.target.value;
    if (value) {
      refine(value);
    }
  };

  return (
    <select
      className="filter-dropdown"
      onChange={handleChange}
      value=""
      aria-label={`Filter by ${placeholder}`}
    >
      <option value="">{label}</option>
      {items.map((item) => (
        <option key={item.value} value={item.value}>
          {item.isRefined ? '✓ ' : ''}{item.label} ({item.count})
        </option>
      ))}
    </select>
  );
}

FilterDropdown.propTypes = {
  attribute: PropTypes.string.isRequired,
  placeholder: PropTypes.string.isRequired,
};
