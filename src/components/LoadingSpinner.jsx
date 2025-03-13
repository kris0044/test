// src/components/LoadingSpinner.jsx
import React from 'react';
import "../assets/styles/styles.css";
const LoadingSpinner = ({ size = 'medium', message = 'Loading...' }) => {
  const sizeStyles = {
    small: { width: '30px', height: '30px' },
    medium: { width: '50px', height: '50px' },
    large: { width: '80px', height: '80px' }
  };

  return (
    <div className="loading-container">
      <div className="cricket-spinner" style={sizeStyles[size]}>
        <div className="cricket-ball"></div>
        <div className="stumps">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
      {message && <p className="loading-message">{message}</p>}
    </div>
  );
};

export default LoadingSpinner;