import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import App from '../App';

// Mock the ClipDrop API and other external dependencies
global.fetch = jest.fn();
global.navigator.mediaDevices = {
  getUserMedia: jest.fn(() => Promise.resolve({
    getTracks: () => [{ stop: jest.fn() }]
  }))
};

// Mock Webcam component
jest.mock('react-webcam', () => {
  return function MockWebcam({ onUserMedia, ...props }) {
    React.useEffect(() => {
      if (onUserMedia) {
        onUserMedia();
      }
    }, [onUserMedia]);
    
    return (
      <div data-testid="mock-webcam">
        <button 
          onClick={() => {
            if (props.ref && props.ref.current) {
              props.ref.current.getScreenshot = () => 'data:image/jpeg;base64,mockScreenshot';
            }
          }}
        >
          Mock Capture
        </button>
      </div>
    );
  };
});

// Mock canvas operations
HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
  clearRect: jest.fn(),
  drawImage: jest.fn(),
  toDataURL: jest.fn(() => 'data:image/jpeg;base64,mockCombinedImage')
}));

// Mock Supabase
jest.mock('../lib/supabaseClient', () => ({
  supabase: {
    storage: {
      from: () => ({
        upload: jest.fn(() => Promise.resolve({ data: { path: 'mock-path' }, error: null }))
      })
    }
  }
}));

// Mock QR Code component
jest.mock('qrcode.react', () => ({
  QRCodeCanvas: ({ value }) => <div data-testid="qr-code">{value}</div>
}));

describe('Background Selection Flow Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock successful ClipDrop API response
    global.fetch.mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(8))
    });
  });

  test('complete flow from photo capture through background selection to result', async () => {
    render(
      <MemoryRouter initialEntries={['/photo']}>
        <App />
      </MemoryRouter>
    );

    // Should be on photo page
    expect(screen.getByText('Capture')).toBeInTheDocument();

    // Mock successful image capture and processing
    const captureButton = screen.getByText('Capture');
    fireEvent.click(captureButton);

    // Wait for background removal processing
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        'https://clipdrop-api.co/remove-background/v1',
        expect.any(Object)
      );
    });

    // Should navigate to background selection page
    await waitFor(() => {
      expect(screen.getByText('Choose Background')).toBeInTheDocument();
    });

    // Should display background options
    expect(screen.getByText('Background 1')).toBeInTheDocument();
    expect(screen.getByText('Background 2')).toBeInTheDocument();
    expect(screen.getByText('Background 3')).toBeInTheDocument();
    expect(screen.getByText('Background 4')).toBeInTheDocument();
    expect(screen.getByText('Background 5')).toBeInTheDocument();

    // Select a background
    const firstBackground = screen.getByAltText('Background 1');
    fireEvent.click(firstBackground);

    // Continue button should be enabled
    const continueButton = screen.getByText('Continue');
    expect(continueButton).not.toBeDisabled();

    // Mock successful image combination
    const mockImage = {
      onload: null,
      onerror: null,
      crossOrigin: '',
      src: '',
      width: 1080,
      height: 1920
    };
    global.Image = jest.fn(() => mockImage);

    // Click continue
    fireEvent.click(continueButton);

    // Simulate image loading
    setTimeout(() => {
      if (mockImage.onload) mockImage.onload();
    }, 100);

    // Should navigate to result page
    await waitFor(() => {
      expect(screen.getByText('Home')).toBeInTheDocument();
    });
  });

  test('back navigation from background selection to photo page', async () => {
    render(
      <MemoryRouter initialEntries={['/background-selection']} initialIndex={0}>
        <App />
      </MemoryRouter>
    );

    // Should redirect to photo page due to missing processed image data
    await waitFor(() => {
      expect(screen.getByText('Capture')).toBeInTheDocument();
    });
  });

  test('state passing between components via React Router', async () => {
    const mockProcessedImageData = 'data:image/png;base64,mockProcessedImage';
    
    render(
      <MemoryRouter 
        initialEntries={[{
          pathname: '/background-selection',
          state: { processedImageData: mockProcessedImageData }
        }]}
      >
        <App />
      </MemoryRouter>
    );

    // Should display background selection page with processed image data
    expect(screen.getByText('Choose Background')).toBeInTheDocument();
    
    // Select background and continue
    const firstBackground = screen.getByAltText('Background 1');
    fireEvent.click(firstBackground);
    
    const continueButton = screen.getByText('Continue');
    fireEvent.click(continueButton);

    // Should process with the passed image data
    await waitFor(() => {
      expect(screen.getByText(/Processing/)).toBeInTheDocument();
    });
  });

  test('error recovery and navigation edge cases', async () => {
    // Mock failed ClipDrop API response
    global.fetch.mockRejectedValue(new Error('API Error'));
    
    render(
      <MemoryRouter initialEntries={['/photo']}>
        <App />
      </MemoryRouter>
    );

    const captureButton = screen.getByText('Capture');
    fireEvent.click(captureButton);

    // Should show error message
    await waitFor(() => {
      expect(screen.getByText(/Error removing background/)).toBeInTheDocument();
    });

    // Should remain on photo page
    expect(screen.getByText('Capture')).toBeInTheDocument();
  });

  test('image combination with different background selections', async () => {
    const mockProcessedImageData = 'data:image/png;base64,mockProcessedImage';
    
    render(
      <MemoryRouter 
        initialEntries={[{
          pathname: '/background-selection',
          state: { processedImageData: mockProcessedImageData }
        }]}
      >
        <App />
      </MemoryRouter>
    );

    // Test selecting different backgrounds
    const backgrounds = [
      screen.getByAltText('Background 1'),
      screen.getByAltText('Background 2'),
      screen.getByAltText('Background 3')
    ];

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
});