import PropTypes from 'prop-types';

export default function InventoryBar({ current, initial }) {
  if (!initial || initial < 3) return null;
  const dispensed = initial - Math.max(0, current);
  const isUntouched = dispensed <= 0;
  const fillPercent = isUntouched ? 100 : Math.min(100, dispensed / initial * 100);
  const fillColor = isUntouched ? '#3498db' : '#e74c3c';
  return (
    <div className="inventory-bar-container">
      <div className="inventory-bar-track">
        <div className="inventory-bar-fill" style={{ width: `${fillPercent}%`, background: fillColor }} />
      </div>
    </div>
  );
}

InventoryBar.propTypes = {
  current: PropTypes.number,
  initial: PropTypes.number,
};
