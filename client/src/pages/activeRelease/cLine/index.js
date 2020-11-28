import PropTypes from 'prop-types';
import React from 'react';
import styles from './cLine.module.css';

const CLine = ({ cLine }) => {
  if (!cLine) return null;

  return (
    <div className={styles.copyright}>
      &copy; {cLine.year} {cLine.owner}
    </div>
  );
};

CLine.propTypes = {
  cLine: PropTypes.object
};

export default CLine;
