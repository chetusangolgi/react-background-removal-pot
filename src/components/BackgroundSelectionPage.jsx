import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setSelectedBackground } from '../features/appSlice';

const BACKGROUND_OPTIONS = [
  { id: 'bg', src: '/bg.jpg', label: 'Background 1' },
  { id: 'bg1', src: '/bg1.jpg', label: 'Background 2' },
  { id: 'bg2', src: '/bg2.jpg', label: 'Background 3' },
  { id: 'bg3', src: '/bg3.jpg', label: 'Background 4' },
  { id: 'bg4', src: '/bg4.jpg', label: 'Background 5' },
  { id: 'bg4', src: '/ccc.png', label: 'Background 5' },
  { id: 'bg5', src: '/bg5.jpg', label: 'Background 6' }
];

function BackgroundSelectionPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [selectedBackground, setSelectedBackgroundLocal] = useState(null);
  const [error, setError] = useState(null);

  // Handle background selection
  const handleBackgroundSelect = (background) => {
    setSelectedBackgroundLocal(background);
  };

  // Handle continue button click
  const handleContinue = () => {
    if (!selectedBackground) return;
    
    try {
      // Store selected background in Redux
      dispatch(setSelectedBackground(selectedBackground));
      
      // Navigate to photo capture
      navigate('/photo');
    } catch (error) {
      console.error("Error during navigation:", error);
      setError("Failed to proceed to photo capture. Please try again.");
    }
  };

  return (
    <div className="background-selection-page">
      <div className="header-area">
        <h1>Choose Your Background</h1>
        <p style={{ fontSize: '1.2rem', marginTop: '10px', opacity: '0.9' }}>
          Select a background for your photo
        </p>
      </div>

      <div className="background-grid">
        {BACKGROUND_OPTIONS.map((background) => (
          <div
            key={background.id}
            className={`background-thumbnail ${selectedBackground?.id === background.id ? 'selected' : ''}`}
            onClick={() => handleBackgroundSelect(background)}
          >
            <img
              src={background.src}
              alt={background.label}
              onError={(e) => {
                e.target.src = '/bg1.jpg'; // Fallback to default background
                e.target.alt = 'Background (fallback)';
              }}
            />
            <span className="background-label">{background.label}</span>
          </div>
        ))}
      </div>

      {error && (
        <div className="error-message">
          <p>{error}</p>
          <button onClick={() => setError(null)}>Try Again</button>
        </div>
      )}

      <div className="action-buttons">
        <button
          className="continue-button"
          onClick={handleContinue}
          disabled={!selectedBackground}
        >
          Take Photo
        </button>
      </div>
    </div>
  );
}

export default BackgroundSelectionPage;