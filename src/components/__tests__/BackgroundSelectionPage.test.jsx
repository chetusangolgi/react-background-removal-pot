import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import BackgroundSelectionPage from '../BackgroundSelectionPage';

// Mock useNavigate and useLocation
const mockNavigate = jest.fn();
const mockLocation = {
  state: {
    processedImageData: 'data:image/png;base64,mockImageData'
  }
};

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useLocation: () => mockLocation
}));

// Mock canvas and image loading
HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
  clearRect: jest.fn(),
  drawImage: jest.fn(),
  toDataURL: jest.fn(() => 'data:image/jpeg;base64,mockCombinedImage')
}));

const renderComponent = (locationState = mockLocation.state) => {
  const mockLocationWithState = { state: locationState };
  jest.doMock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useNavigate: () => mockNavigate,
    useLocation: () => mockLocationWithState
  }));
  
  return render(
    <BrowserRouter>
      <BackgroundSelectionPage />
    </BrowserRouter>
  );
};

describe('BackgroundSelectionPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders component with valid processed image data', () => {
    renderComponent();
    
    expect(screen.getByText('Choose Background')).toBeInTheDocument();
    expect(screen.getByText('Background 1')).toBeInTheDocument();
    expect(screen.getByText('Background 2')).toBeInTheDocument();
    expect(screen.getByText('Back')).toBeInTheDocument();
    expect(screen.getByText('Continue')).toBeInTheDocument();
  });

  test('redirects to photo page when no processed image data', () => {
    renderComponent(null);
    
    expect(mockNavigate).toHaveBeenCalledWith('/photo');
  });

  test('background selection state management', () => {
    renderComponent();
    
    const firstBackground = screen.getByAltText('Background 1');
    const continueButton = screen.getByText('Continue');
    
    // Initially continue button should be disabled
    expect(continueButton).toBeDisabled();
    
    // Click on first background
    fireEvent.click(firstBackground);
    
    // Continue button should now be enabled
    expect(continueButton).not.toBeDisabled();
  });

  test('back button navigation', () => {
    renderComponent();
    
    const backButton = screen.getByText('Back');
    fireEvent.click(backButton);
    
    expect(mockNavigate).toHaveBeenCalledWith('/photo');
  });

  test('handles image loading errors with fallback', () => {
    renderComponent();
    
    const firstBackgroundImg = screen.getByAltText('Background 1');
    
    // Simulate image load error
    fireEvent.error(firstBackgroundImg);
    
    // Should fallback to default background
    expect(firstBackgroundImg.src).toContain('/bg1.jpg');
    expect(firstBackgroundImg.alt).toBe('Background (fallback)');
  });

  test('error handling during image combination', async () => {
    // Mock canvas context to throw error
    HTMLCanvasElement.prototype.getContext = jest.fn(() => {
      throw new Error('Canvas error');
    });
    
    renderComponent();
    
    const firstBackground = screen.getByAltText('Background 1');
    const continueButton = screen.getByText('Continue');
    
    // Select background and click continue
    fireEvent.click(firstBackground);
    fireEvent.click(continueButton);
    
    // Should show error message
    await waitFor(() => {
      expect(screen.getByText(/Failed to combine images/)).toBeInTheDocument();
    });
  });

  test('processing state during image combination', async () => {
    renderComponent();
    
    const firstBackground = screen.getByAltText('Background 1');
    const continueButton = screen.getByText('Continue');
    
    // Select background
    fireEvent.click(firstBackground);
    
    // Mock successful image combination
    const mockImage = {
      onload: null,
      onerror: null,
      crossOrigin: '',
      src: '',
      width: 100,
      height: 200
    };
    
    global.Image = jest.fn(() => mockImage);
    
    // Click continue
    fireEvent.click(continueButton);
    
    // Should show processing state
    expect(screen.getByText('Processing...')).toBeInTheDocument();
    expect(continueButton).toBeDisabled();
  });
});