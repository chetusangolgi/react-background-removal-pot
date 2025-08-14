import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter } from 'react-router-dom';
import PhotoPage from '../components/PhotoPage';
import appReducer from '../features/appSlice';

// Mock external dependencies
global.fetch = jest.fn();
const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

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

// Mock console methods
global.console.warn = jest.fn();
global.console.log = jest.fn();
global.console.error = jest.fn();

describe('PhotoPage', () => {
  let store;

  beforeEach(() => {
    jest.clearAllMocks();
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

  const renderWithProviders = (ui, initialState = {}) => {
    if (Object.keys(initialState).length > 0) {
      store = configureStore({
        reducer: { app: appReducer },
        preloadedState: { app: { ...store.getState().app, ...initialState } }
      });
    }

    return render(
      <Provider store={store}>
        <MemoryRouter>
          {ui}
        </MemoryRouter>
      </Provider>
    );
  };

  test('renders photo page with webcam and capture button', () => {
    renderWithProviders(<PhotoPage />);

    expect(screen.getByTestId('mock-webcam')).toBeInTheDocument();
    expect(screen.getByText('Capture')).toBeInTheDocument();
  });

  test('displays background preview when background is selected', () => {
    const selectedBackground = {
      id: 'bg1',
      src: '/bg1.jpg',
      label: 'Background 2'
    };

    renderWithProviders(<PhotoPage />, { selectedBackground });

    expect(screen.getByText('Background 2')).toBeInTheDocument();
    expect(screen.getByText('Change')).toBeInTheDocument();
    
    const previewImage = screen.getByAltText('Background 2');
    expect(previewImage).toHaveAttribute('src', '/bg1.jpg');
  });

  test('change background navigation', () => {
    const selectedBackground = {
      id: 'bg2',
      src: '/bg2.jpg',
      label: 'Background 3'
    };

    renderWithProviders(<PhotoPage />, { selectedBackground });

    const changeButton = screen.getByText('Change');
    fireEvent.click(changeButton);

    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  test('photo capture and processing flow', async () => {
    const selectedBackground = {
      id: 'bg1',
      src: '/bg1.jpg',
      label: 'Background 2'
    };

    renderWithProviders(<PhotoPage />, { selectedBackground });

    const captureButton = screen.getByText('Capture');
    fireEvent.click(captureButton);

    // Should show capturing step
    await waitFor(() => {
      expect(screen.getByText(/Capturing image/)).toBeInTheDocument();
    });

    // Should call ClipDrop API
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        'https://clipdrop-api.co/remove-background/v1',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'x-api-key': expect.any(String)
          })
        })
      );
    });

    // Mock image loading for combination
    const mockImage = global.Image();
    setTimeout(() => {
      if (mockImage.onload) mockImage.onload();
    }, 100);

    // Should navigate to result page
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/result', {
        state: { combinedImage: 'data:image/jpeg;base64,mockCombinedImage' }
      });
    });
  });

  test('fallback to default background when none selected', async () => {
    renderWithProviders(<PhotoPage />); // No background selected

    const captureButton = screen.getByText('Capture');
    fireEvent.click(captureButton);

    // Should show warning about using default background
    await waitFor(() => {
      expect(console.warn).toHaveBeenCalledWith(
        'No background selected, using default background:',
        '/bg1.jpg'
      );
    });

    // Mock image loading
    const mockImage = global.Image();
    setTimeout(() => {
      if (mockImage.onload) mockImage.onload();
    }, 100);

    // Should still proceed with default background
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/result', {
        state: { combinedImage: 'data:image/jpeg;base64,mockCombinedImage' }
      });
    });
  });

  test('ClipDrop API error handling', async () => {
    global.fetch.mockRejectedValue(new Error('API Error'));

    const selectedBackground = {
      id: 'bg1',
      src: '/bg1.jpg',
      label: 'Background 2'
    };

    renderWithProviders(<PhotoPage />, { selectedBackground });

    const captureButton = screen.getByText('Capture');
    fireEvent.click(captureButton);

    // Should show error message
    await waitFor(() => {
      expect(screen.getByText(/Error removing background/)).toBeInTheDocument();
    });

    // Should not navigate
    expect(mockNavigate).not.toHaveBeenCalled();

    // Capture button should be enabled again
    expect(captureButton).not.toBeDisabled();
  });

  test('image combination error handling', async () => {
    const selectedBackground = {
      id: 'bg1',
      src: '/bg1.jpg',
      label: 'Background 2'
    };

    renderWithProviders(<PhotoPage />, { selectedBackground });

    // Mock image loading failure
    global.Image = jest.fn(() => ({
      onload: null,
      onerror: null,
      crossOrigin: '',
      src: '',
      width: 1080,
      height: 1920
    }));

    const captureButton = screen.getByText('Capture');
    fireEvent.click(captureButton);

    // Wait for background removal to complete
    await waitFor(() => {
      expect(screen.getByText(/Combining with background/)).toBeInTheDocument();
    });

    // Simulate image loading error
    const mockImage = global.Image();
    setTimeout(() => {
      if (mockImage.onerror) mockImage.onerror(new Error('Image load error'));
    }, 100);

    // Should show error message
    await waitFor(() => {
      expect(screen.getByText(/Error combining images/)).toBeInTheDocument();
    });
  });

  test('processing state management', async () => {
    const selectedBackground = {
      id: 'bg1',
      src: '/bg1.jpg',
      label: 'Background 2'
    };

    renderWithProviders(<PhotoPage />, { selectedBackground });

    const captureButton = screen.getByText('Capture');
    
    // Initially not processing
    expect(captureButton).not.toBeDisabled();
    expect(captureButton).toHaveTextContent('Capture');

    // Start capture
    fireEvent.click(captureButton);

    // Should be in processing state
    await waitFor(() => {
      expect(captureButton).toBeDisabled();
      expect(screen.getByText(/Processing/)).toBeInTheDocument();
    });

    // Change button should also be disabled during processing
    const changeButton = screen.getByText('Change');
    expect(changeButton).toBeDisabled();
  });

  test('background preview styling and layout', () => {
    const selectedBackground = {
      id: 'bg3',
      src: '/bg3.jpg',
      label: 'Background 4'
    };

    renderWithProviders(<PhotoPage />, { selectedBackground });

    // Check preview container styling
    const previewContainer = screen.getByText('Background 4').closest('div');
    expect(previewContainer).toHaveStyle({
      position: 'absolute',
      top: '20px',
      right: '20px'
    });

    // Check image dimensions
    const previewImage = screen.getByAltText('Background 4');
    expect(previewImage).toHaveStyle({
      width: '100%',
      height: '100%',
      objectFit: 'cover'
    });
  });

  test('no background preview when none selected', () => {
    renderWithProviders(<PhotoPage />);

    // Should not show background preview
    expect(screen.queryByText('Change')).not.toBeInTheDocument();
    expect(screen.queryByText(/Background \d/)).not.toBeInTheDocument();
  });

  test('canvas setup and image combination logic', async () => {
    const selectedBackground = {
      id: 'bg1',
      src: '/bg1.jpg',
      label: 'Background 2'
    };

    const mockCanvas = {
      getContext: jest.fn(() => ({
        clearRect: jest.fn(),
        drawImage: jest.fn(),
        toDataURL: jest.fn(() => 'data:image/jpeg;base64,mockCombinedImage')
      })),
      width: 0,
      height: 0
    };

    // Mock canvas ref
    const mockCanvasRef = { current: mockCanvas };
    jest.spyOn(React, 'useRef').mockReturnValue(mockCanvasRef);

    renderWithProviders(<PhotoPage />, { selectedBackground });

    const captureButton = screen.getByText('Capture');
    fireEvent.click(captureButton);

    // Wait for processing to start
    await waitFor(() => {
      expect(screen.getByText(/Combining with background/)).toBeInTheDocument();
    });

    // Mock successful image loading
    const mockImage = global.Image();
    setTimeout(() => {
      if (mockImage.onload) mockImage.onload();
    }, 100);

    // Should set canvas dimensions and draw images
    await waitFor(() => {
      expect(mockCanvas.width).toBeGreaterThan(0);
      expect(mockCanvas.height).toBeGreaterThan(0);
    });
  });
});