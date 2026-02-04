import React from 'react';
import PropTypes from 'prop-types';
import { useRefinementList } from 'react-instantsearch';

export default function FilterDropdown({ attribute, placeholder }) {
  const { items, refine } = useRefinementList({
    attribute,
    limit: 100,
  });

  const selectedItem = items.find(item => item.isRefined);
  const selectedValue = selectedItem ? selectedItem.value : '';

  const handleChange = (event) => {
    const value = event.target.value;

    // Clear current selection if one exists
    if (selectedItem) {
      refine(selectedItem.value);
    }

    // Apply new selection if not empty
    if (value) {
      refine(value);
    }
  };

  return (
    <select
      className="filter-dropdown"
      onChange={handleChange}
      value={selectedValue}
      aria-label={`Filter by ${placeholder}`}
    >
      <option value="">{placeholder}</option>
      {items.map((item) => (
        <option key={item.value} value={item.value}>
          {item.label} ({item.count})
        </option>
      ))}
    </select>
  );
}

FilterDropdown.propTypes = {
  attribute: PropTypes.string.isRequired,
  placeholder: PropTypes.string.isRequired,
};
