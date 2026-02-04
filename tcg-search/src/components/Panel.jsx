import React from 'react';
import PropTypes from 'prop-types';

export default function Panel({ header, children }) {
  return (
    <div className="ais-Panel">
      {header && <div className="ais-Panel-header">{header}</div>}
      <div className="ais-Panel-body">{children}</div>
    </div>
  );
}

Panel.propTypes = {
  header: PropTypes.string,
  children: PropTypes.node.isRequired,
};
