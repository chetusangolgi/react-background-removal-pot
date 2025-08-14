import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ResultPage from '../components/ResultPage';

// Mock the hooks
jest.mock('../hooks/useImageDimensions');
jest.mock('../hooks/useResponsiveImageSize');
jest.mock('../lib/supabaseClient');

import { useImageDimensions } from '../hooks/useImageDimensions';
import { useResponsiveImageSize } from '../hooks/useResponsiveImageSize';
import { supabase } from '../lib/supabaseClient';

// Mock react-router-dom
const mockNavigate = jest.fn();
const mockLocation = {
  state: {
    combinedImage: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/test'
  }
};

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useLocation: () => mockLocation
}));

// Mock QRCodeCanvas
jest.mock('qrcode.react', () => ({
  QRCodeCanvas: ({ value, size, level, className }) => (
    <div data-testid="qr-code" data-value={value} data-size={size} data-level={level} className={className}>
      QR Code
    </div>
  )
}));

const renderResultPage = () => {
  return render(
    <BrowserRouter>
      <ResultPage />
    </BrowserRouter>
  );
};

describe('ResultPage Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock for supabase
    supabase.storage = {
      from: jest.fn(() => ({
        upload: jest.fn().mockResolvedValue({
          data: { path: 'test-path' },
          error: null
        })
      }))
    };
  });

  describe('Loading States', () => {
    test('should show loading spinner while calculating image dimensions', () => {
      useImageDimensions.mockReturnValue({
        dimensions: null,
        isLoading: true,
        error: null,
        retry: jest.fn()
      });

      useResponsiveImageSize.mockReturnValue({
        displayWidth: '400px',
        displayHeight: '300px',
        containerStyle: {},
        imageStyle: {},
        bottomContainerStyle: {},
        deviceType: 'desktop'
      });

      renderResultPage();

      expect(screen.getByText('Preparing your image...')).toBeInTheDocument();
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });

    test('should not show loading spinner when no image is provided', () => {
      mockLocation.state = { combinedImage: null };
      
      useImageDimensions.mockReturnValue({
        dimensions: null,
        isLoading: false,
        error: 'No image source provided',
        retry: jest.fn()
      });

      renderResultPage();

      expect(screen.queryByText('Preparing your image...')).not.toBeInTheDocument();
      expect(screen.getByText('No image found to display.')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    test('should show error state with retry option when dimension loading fails', () => {
      const mockRetry = jest.fn();
      
      useImageDimensions.mockReturnValue({
        dimensions: null,
        isLoading: false,
        error: 'Failed to load image dimensions',
        retry: mockRetry
      });

      renderResultPage();

      expect(screen.getByText('Failed to load image dimensions')).toBeInTheDocument();
      expect(screen.getByText('Retry')).toBeInTheDocument();
      expect(screen.getByText('Home')).toBeInTheDocument();

      // Test retry functionality
      fireEvent.click(screen.getByText('Retry'));
      expect(mockRetry).toHaveBeenCalledTimes(1);
    });

    test('should navigate home when home button is clicked in error state', () => {
      useImageDimensions.mockReturnValue({
        dimensions: null,
        isLoading: false,
        error: 'Failed to load image dimensions',
        retry: jest.fn()
      });

      renderResultPage();

      fireEvent.click(screen.getByText('Home'));
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  describe('Successful Image Display', () => {
    const mockDimensions = {
      width: 800,
      height: 600,
      aspectRatio: 800 / 600,
      naturalWidth: 800,
      naturalHeight: 600
    };

    const mockResponsiveSize = {
      displayWidth: '400px',
      displayHeight: '300px',
      containerStyle: {
        width: '400px',
        height: '300px',
        margin: '0 auto',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      },
      imageStyle: {
        width: '400px',
        height: '300px',
        objectFit: 'contain',
        maxWidth: '100%',
        maxHeight: '100%'
      },
      bottomContainerStyle: {
        width: '400px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '20px',
        flexDirection: 'row'
      },
      deviceType: 'desktop'
    };

    beforeEach(() => {
      useImageDimensions.mockReturnValue({
        dimensions: mockDimensions,
        isLoading: false,
        error: null,
        retry: jest.fn()
      });

      useResponsiveImageSize.mockReturnValue(mockResponsiveSize);
    });

    test('should display image with responsive dimensions', () => {
      renderResultPage();

      const image = screen.getByAltText('Combined Result');
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute('src', mockLocation.state.combinedImage);
    });

    test('should apply responsive container styles', () => {
      renderResultPage();

      const imageContainer = screen.getByAltText('Combined Result').parentElement;
      expect(imageContainer).toHaveStyle({
        width: '400px',
        height: '300px',
        margin: '0 auto',
        display: 'flex',
        'justify-content': 'center',
        'align-items': 'center'
      });
    });

    test('should apply responsive image styles with transitions', () => {
      renderResultPage();

      const image = screen.getByAltText('Combined Result');
      expect(image).toHaveStyle({
        border: '5px solid white',
        'border-radius': '20px',
        transition: 'all 0.3s ease'
      });
    });

    test('should show QR code when image URL is available', async () => {
      renderResultPage();

      // Wait for the upload to complete and QR code to appear
      await waitFor(() => {
        expect(screen.getByTestId('qr-code')).toBeInTheDocument();
      });

      const qrCode = screen.getByTestId('qr-code');
      expect(qrCode).toHaveAttribute('data-size', '200');
      expect(qrCode).toHaveAttribute('data-level', 'H');
      expect(qrCode).toHaveClass('qrcode');
    });

    test('should show home button in bottom container', () => {
      renderResultPage();

      const homeButton = screen.getByRole('button', { name: 'Home' });
      expect(homeButton).toBeInTheDocument();
      
      fireEvent.click(homeButton);
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  describe('Responsive Behavior', () => {
    test('should adapt layout for mobile devices', () => {
      const mockDimensions = {
        width: 800,
        height: 600,
        aspectRatio: 800 / 600,
        naturalWidth: 800,
        naturalHeight: 600
      };

      useImageDimensions.mockReturnValue({
        dimensions: mockDimensions,
        isLoading: false,
        error: null,
        retry: jest.fn()
      });

      useResponsiveImageSize.mockReturnValue({
        displayWidth: '300px',
        displayHeight: '225px',
        containerStyle: { width: '300px', height: '225px' },
        imageStyle: { width: '300px', height: '225px' },
        bottomContainerStyle: {
          width: '300px',
          flexDirection: 'column',
          gap: '20px'
        },
        deviceType: 'mobile'
      });

      renderResultPage();

      const image = screen.getByAltText('Combined Result');
      expect(image).toBeInTheDocument();
    });

    test('should adapt layout for tablet devices', () => {
      const mockDimensions = {
        width: 800,
        height: 600,
        aspectRatio: 800 / 600,
        naturalWidth: 800,
        naturalHeight: 600
      };

      useImageDimensions.mockReturnValue({
        dimensions: mockDimensions,
        isLoading: false,
        error: null,
        retry: jest.fn()
      });

      useResponsiveImageSize.mockReturnValue({
        displayWidth: '500px',
        displayHeight: '375px',
        containerStyle: { width: '500px', height: '375px' },
        imageStyle: { width: '500px', height: '375px' },
        bottomContainerStyle: {
          width: '500px',
          flexDirection: 'row',
          gap: '20px'
        },
        deviceType: 'tablet'
      });

      renderResultPage();

      const image = screen.getByAltText('Combined Result');
      expect(image).toBeInTheDocument();
    });
  });

  describe('Different Image Aspect Ratios', () => {
    test('should handle wide images correctly', () => {
      const wideDimensions = {
        width: 1920,
        height: 1080,
        aspectRatio: 1920 / 1080,
        naturalWidth: 1920,
        naturalHeight: 1080
      };

      useImageDimensions.mockReturnValue({
        dimensions: wideDimensions,
        isLoading: false,
        error: null,
        retry: jest.fn()
      });

      useResponsiveImageSize.mockReturnValue({
        displayWidth: '600px',
        displayHeight: '338px',
        containerStyle: { width: '600px', height: '338px' },
        imageStyle: { width: '600px', height: '338px' },
        bottomContainerStyle: { width: '600px', flexDirection: 'row' },
        deviceType: 'desktop'
      });

      renderResultPage();

      const image = screen.getByAltText('Combined Result');
      expect(image).toBeInTheDocument();
    });

    test('should handle tall images correctly', () => {
      const tallDimensions = {
        width: 600,
        height: 1200,
        aspectRatio: 600 / 1200,
        naturalWidth: 600,
        naturalHeight: 1200
      };

      useImageDimensions.mockReturnValue({
        dimensions: tallDimensions,
        isLoading: false,
        error: null,
        retry: jest.fn()
      });

      useResponsiveImageSize.mockReturnValue({
        displayWidth: '300px',
        displayHeight: '600px',
        containerStyle: { width: '300px', height: '600px' },
        imageStyle: { width: '300px', height: '600px' },
        bottomContainerStyle: { width: '300px', flexDirection: 'row' },
        deviceType: 'desktop'
      });

      renderResultPage();

      const image = screen.getByAltText('Combined Result');
      expect(image).toBeInTheDocument();
    });

    test('should handle square images correctly', () => {
      const squareDimensions = {
        width: 800,
        height: 800,
        aspectRatio: 1,
        naturalWidth: 800,
        naturalHeight: 800
      };

      useImageDimensions.mockReturnValue({
        dimensions: squareDimensions,
        isLoading: false,
        error: null,
        retry: jest.fn()
      });

      useResponsiveImageSize.mockReturnValue({
        displayWidth: '400px',
        displayHeight: '400px',
        containerStyle: { width: '400px', height: '400px' },
        imageStyle: { width: '400px', height: '400px' },
        bottomContainerStyle: { width: '400px', flexDirection: 'row' },
        deviceType: 'desktop'
      });

      renderResultPage();

      const image = screen.getByAltText('Combined Result');
      expect(image).toBeInTheDocument();
    });
  });

  describe('Supabase Integration', () => {
    test('should handle successful image upload', async () => {
      const mockDimensions = {
        width: 800,
        height: 600,
        aspectRatio: 800 / 600,
        naturalWidth: 800,
        naturalHeight: 600
      };

      useImageDimensions.mockReturnValue({
        dimensions: mockDimensions,
        isLoading: false,
        error: null,
        retry: jest.fn()
      });

      useResponsiveImageSize.mockReturnValue({
        displayWidth: '400px',
        displayHeight: '300px',
        containerStyle: {},
        imageStyle: {},
        bottomContainerStyle: {},
        deviceType: 'desktop'
      });

      renderResultPage();

      await waitFor(() => {
        expect(screen.getByTestId('qr-code')).toBeInTheDocument();
      });

      const qrCode = screen.getByTestId('qr-code');
      expect(qrCode.getAttribute('data-value')).toMatch(/https:\/\/.*\.supabase\.co\/storage\/v1\/object\/public\/images\/combined-image-\d+\.jpeg/);
    });

    test('should handle upload errors gracefully', async () => {
      supabase.storage.from.mockReturnValue({
        upload: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Upload failed' }
        })
      });

      const mockDimensions = {
        width: 800,
        height: 600,
        aspectRatio: 800 / 600,
        naturalWidth: 800,
        naturalHeight: 600
      };

      useImageDimensions.mockReturnValue({
        dimensions: mockDimensions,
        isLoading: false,
        error: null,
        retry: jest.fn()
      });

      useResponsiveImageSize.mockReturnValue({
        displayWidth: '400px',
        displayHeight: '300px',
        containerStyle: {},
        imageStyle: {},
        bottomContainerStyle: {},
        deviceType: 'desktop'
      });

      renderResultPage();

      // Should still show the image even if upload fails
      expect(screen.getByAltText('Combined Result')).toBeInTheDocument();
      
      // QR code should not appear due to upload failure
      await waitFor(() => {
        expect(screen.queryByTestId('qr-code')).not.toBeInTheDocument();
      }, { timeout: 1000 });
    });
  });
});

// Add a custom test ID to the loading spinner for testing
const originalResultPage = require('../components/ResultPage').default;
jest.doMock('../components/ResultPage', () => {
  return function ResultPage() {
    const result = originalResultPage.apply(this, arguments);
    if (result && result.props && result.props.children) {
      const loadingSpinner = result.props.children.find(child => 
        child && child.props && child.props.className === 'loading-container'
      );
      if (loadingSpinner) {
        const spinner = loadingSpinner.props.children.find(child =>
          child && child.props && child.props.className === 'loading-spinner'
        );
        if (spinner) {
          spinner.props['data-testid'] = 'loading-spinner';
        }
      }
    }
    return result;
  };
});