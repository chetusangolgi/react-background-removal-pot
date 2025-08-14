import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';
import appReducer from '../features/appSlice';

// Mock external dependencies
global.fetch = jest.fn();
global.navigator.mediaDevices = {
  getUserMedia: jest.fn(() => Promise.resolve({
    getTracks: () => [{ stop: jest.fn() }]
  }))
};

// Mock Webcam component
jest.mock('react-webcam', () => {
  return React.forwardRef(function MockWebcam(props, ref) {
    React.useImperativeHandle(ref, () => ({
      getScreenshot: () => 'data:image/jpeg;base64,mockScreenshot'
    }));
    
    return <div data-testid="mock-webcam" />;
  });
});

// Mock canvas operations
HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
  clearRect: jest.fn(),
  drawImage: jest.fn(),
  toDataURL: jest.fn(() => 'data:image/jpeg;base64,mockCombinedImage')
}));

// Mock Image constructor
global.Image = jest.fn(() => ({
  onload: null,
  onerror: null,
  crossOrigin: '',
  src: '',
  width: 1080,
  height: 1920
}));

describe('Workflow Reorganization Tests', () => {
  let store;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create fresh store for each test
    store = configureStore({
      reducer: {
        app: appReducer,
      },
    });
    
    // Mock successful ClipDrop API response
    global.fetch.mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(8))
    });
  });

  const renderWithProviders = (ui, { initialEntries = ['/'] } = {}) => {
    return render(
      <Provider store={store}>
        <MemoryRouter initialEntries={initialEntries}>
          {ui}
        </MemoryRouter>
      </Provider>
    );
  };

  describe('New Workflow Flow', () => {
    test('complete new workflow: background selection → photo capture → result', async () => {
      renderWithProviders(<App />);

      // Should start with background selection page
      expect(screen.getByText('Choose Your Background')).toBeInTheDocument();
      expect(screen.getByText('Select a background for your photo')).toBeInTheDocument();

      // Should display all background options
      expect(screen.getByText('Background 1')).toBeInTheDocument();
      expect(screen.getByText('Background 2')).toBeInTheDocument();
      expect(screen.getByText('Background 3')).toBeInTheDocument();
      expect(screen.getByText('Background 4')).toBeInTheDocument();
      expect(screen.getByText('Background 5')).toBeInTheDocument();

      // Continue button should be disabled initially
      const takePhotoButton = screen.getByText('Take Photo');
      expect(takePhotoButton).toBeDisabled();

      // Select a background
      const firstBackground = screen.getByAltText('Background 1');
      fireEvent.click(firstBackground);

      // Continue button should be enabled
      expect(takePhotoButton).not.toBeDisabled();

      // Navigate to photo page
      fireEvent.click(takePhotoButton);

      // Should be on photo page
      await waitFor(() => {
        expect(screen.getByText('Capture')).toBeInTheDocument();
      });

      // Should show selected background preview
      expect(screen.getByText('Background 1')).toBeInTheDocument();
      expect(screen.getByText('Change')).toBeInTheDocument();

      // Capture photo
      const captureButton = screen.getByText('Capture');
      fireEvent.click(captureButton);

      // Should show processing steps
      await waitFor(() => {
        expect(screen.getByText(/Capturing image/)).toBeInTheDocument();
      });

      // Mock image loading for combination
      const mockImage = global.Image();
      setTimeout(() => {
        if (mockImage.onload) mockImage.onload();
      }, 100);

      // Should navigate to result page
      await waitFor(() => {
        expect(screen.getByText('Home')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    test('background change functionality from photo page', async () => {
      // Start with background already selected
      store.dispatch({
        type: 'app/setSelectedBackground',
        payload: { id: 'bg1', src: '/bg1.jpg', label: 'Background 2' }
      });

      renderWithProviders(<App />, { initialEntries: ['/photo'] });

      // Should show selected background preview
      expect(screen.getByText('Background 2')).toBeInTheDocument();
      
      // Click change button
      const changeButton = screen.getByText('Change');
      fireEvent.click(changeButton);

      // Should navigate back to background selection
      await waitFor(() => {
        expect(screen.getByText('Choose Your Background')).toBeInTheDocument();
      });
    });
  });

  describe('Redux State Management', () => {
    test('background selection is stored in Redux', async () => {
      renderWithProviders(<App />);

      // Select a background
      const secondBackground = screen.getByAltText('Background 2');
      fireEvent.click(secondBackground);

      // Click take photo
      const takePhotoButton = screen.getByText('Take Photo');
      fireEvent.click(takePhotoButton);

      // Check Redux state
      const state = store.getState();
      expect(state.app.selectedBackground).toEqual({
        id: 'bg1',
        src: '/bg1.jpg',
        label: 'Background 2'
      });
    });

    test('background selection persists across navigation', async () => {
      renderWithProviders(<App />);

      // Select background
      const thirdBackground = screen.getByAltText('Background 3');
      fireEvent.click(thirdBackground);
      fireEvent.click(screen.getByText('Take Photo'));

      // Navigate back to background selection
      await waitFor(() => {
        fireEvent.click(screen.getByText('Change'));
      });

      // Redux state should still have the selection
      const state = store.getState();
      expect(state.app.selectedBackground).toEqual({
        id: 'bg2',
        src: '/bg2.jpg',
        label: 'Background 3'
      });
    });
  });

  describe('Error Handling', () => {
    test('fallback to default background when none selected', async () => {
      renderWithProviders(<App />, { initialEntries: ['/photo'] });

      // Capture without selecting background
      const captureButton = screen.getByText('Capture');
      fireEvent.click(captureButton);

      // Should use default background (logged warning)
      await waitFor(() => {
        expect(console.warn).toHaveBeenCalledWith(
          'No background selected, using default background:',
          '/bg1.jpg'
        );
      });
    });

    test('error handling in background selection', async () => {
      renderWithProviders(<App />);

      // Mock navigation error
      const originalDispatch = store.dispatch;
      store.dispatch = jest.fn(() => {
        throw new Error('Redux error');
      });

      // Select background and try to continue
      const firstBackground = screen.getByAltText('Background 1');
      fireEvent.click(firstBackground);
      
      const takePhotoButton = screen.getByText('Take Photo');
      fireEvent.click(takePhotoButton);

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/Failed to proceed to photo capture/)).toBeInTheDocument();
      });

      // Restore original dispatch
      store.dispatch = originalDispatch;
    });

    test('ClipDrop API error handling', async () => {
      // Mock API failure
      global.fetch.mockRejectedValue(new Error('API Error'));

      // Start with background selected
      store.dispatch({
        type: 'app/setSelectedBackground',
        payload: { id: 'bg1', src: '/bg1.jpg', label: 'Background 2' }
      });

      renderWithProviders(<App />, { initialEntries: ['/photo'] });

      // Capture photo
      const captureButton = screen.getByText('Capture');
      fireEvent.click(captureButton);

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/Error removing background/)).toBeInTheDocument();
      });
    });
  });

  describe('UI and Styling', () => {
    test('background selection visual feedback', async () => {
      renderWithProviders(<App />);

      const backgrounds = [
        screen.getByAltText('Background 1'),
        screen.getByAltText('Background 2'),
        screen.getByAltText('Background 3')
      ];

      // Test selection highlighting
      backgrounds.forEach((background, index) => {
        fireEvent.click(background);
        
        // Should highlight selected background
        expect(background.closest('.background-thumbnail')).toHaveClass('selected');
        
        // Other backgrounds should not be selected
        backgrounds.forEach((otherBg, otherIndex) => {
          if (index !== otherIndex) {
            expect(otherBg.closest('.background-thumbnail')).not.toHaveClass('selected');
          }
        });
      });
    });

    test('disabled state handling', async () => {
      renderWithProviders(<App />);

      // Take Photo button should be disabled initially
      const takePhotoButton = screen.getByText('Take Photo');
      expect(takePhotoButton).toBeDisabled();

      // Select background
      const firstBackground = screen.getByAltText('Background 1');
      fireEvent.click(firstBackground);

      // Button should be enabled
      expect(takePhotoButton).not.toBeDisabled();
    });

    test('background preview on photo page', async () => {
      // Start with background selected
      store.dispatch({
        type: 'app/setSelectedBackground',
        payload: { id: 'bg3', src: '/bg3.jpg', label: 'Background 4' }
      });

      renderWithProviders(<App />, { initialEntries: ['/photo'] });

      // Should show background preview
      expect(screen.getByText('Background 4')).toBeInTheDocument();
      expect(screen.getByText('Change')).toBeInTheDocument();
      
      // Should show background image
      const previewImage = screen.getByAltText('Background 4');
      expect(previewImage).toHaveAttribute('src', '/bg3.jpg');
    });
  });

  describe('Routing', () => {
    test('root path shows background selection', () => {
      renderWithProviders(<App />);
      expect(screen.getByText('Choose Your Background')).toBeInTheDocument();
    });

    test('photo page accessible directly', () => {
      renderWithProviders(<App />, { initialEntries: ['/photo'] });
      expect(screen.getByText('Capture')).toBeInTheDocument();
    });

    test('result page accessible with state', () => {
      renderWithProviders(<App />, { 
        initialEntries: [{
          pathname: '/result',
          state: { combinedImage: 'data:image/jpeg;base64,mockImage' }
        }]
      });
      // Result page should render (specific assertions depend on ResultPage implementation)
    });
  });
});