import PropTypes from 'prop-types';

export default function InventoryBar({ current, initial }) {
  if (!initial || initial < 3) return null;
  const safeCurrent = Math.max(0, Math.min(initial, current ?? 0));
  const isUntouched = safeCurrent >= initial;
  const fillPercent = Math.max(0, Math.min(100, (safeCurrent / initial) * 100));
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
