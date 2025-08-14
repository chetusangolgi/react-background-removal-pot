import { renderHook, waitFor } from '@testing-library/react';
import { useImageDimensions } from '../hooks/useImageDimensions';

// Mock Image constructor
const mockImage = {
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  naturalWidth: 800,
  naturalHeight: 600,
  src: ''
};

// Store the original Image constructor
const OriginalImage = global.Image;

beforeEach(() => {
  // Reset mocks
  jest.clearAllMocks();
  
  // Mock Image constructor
  global.Image = jest.fn(() => mockImage);
});

afterEach(() => {
  // Restore original Image constructor
  global.Image = OriginalImage;
});

describe('useImageDimensions', () => {
  test('should initialize with loading state', () => {
    const { result } = renderHook(() => useImageDimensions('test-image.jpg'));
    
    expect(result.current.isLoading).toBe(true);
    expect(result.current.dimensions).toBe(null);
    expect(result.current.error).toBe(null);
    expect(typeof result.current.retry).toBe('function');
  });

  test('should handle successful image loading', async () => {
    const { result } = renderHook(() => useImageDimensions('test-image.jpg'));
    
    // Simulate successful image load
    const loadHandler = mockImage.addEventListener.mock.calls.find(
      call => call[0] === 'load'
    )[1];
    
    loadHandler();
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.dimensions).toEqual({
        width: 800,
        height: 600,
        aspectRatio: 800 / 600,
        naturalWidth: 800,
        naturalHeight: 600
      });
    });
  });

  test('should handle image loading errors', async () => {
    const { result } = renderHook(() => useImageDimensions('invalid-image.jpg'));
    
    // Simulate image load error
    const errorHandler = mockImage.addEventListener.mock.calls.find(
      call => call[0] === 'error'
    )[1];
    
    errorHandler();
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe('Failed to load image dimensions');
      expect(result.current.dimensions).toBe(null);
    });
  });

  test('should handle empty image source', () => {
    const { result } = renderHook(() => useImageDimensions(''));
    
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe('No image source provided');
    expect(result.current.dimensions).toBe(null);
  });

  test('should handle null image source', () => {
    const { result } = renderHook(() => useImageDimensions(null));
    
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe('No image source provided');
    expect(result.current.dimensions).toBe(null);
  });

  test('should calculate aspect ratio correctly for different image dimensions', async () => {
    // Test with wide image
    mockImage.naturalWidth = 1920;
    mockImage.naturalHeight = 1080;
    
    const { result } = renderHook(() => useImageDimensions('wide-image.jpg'));
    
    const loadHandler = mockImage.addEventListener.mock.calls.find(
      call => call[0] === 'load'
    )[1];
    
    loadHandler();
    
    await waitFor(() => {
      expect(result.current.dimensions.aspectRatio).toBeCloseTo(1920 / 1080);
    });
  });

  test('should clean up event listeners on unmount', () => {
    const { unmount } = renderHook(() => useImageDimensions('test-image.jpg'));
    
    unmount();
    
    expect(mockImage.removeEventListener).toHaveBeenCalledWith('load', expect.any(Function));
    expect(mockImage.removeEventListener).toHaveBeenCalledWith('error', expect.any(Function));
  });

  test('should retry loading on retry function call', async () => {
    const { result } = renderHook(() => useImageDimensions('test-image.jpg'));
    
    // Simulate initial error
    const errorHandler = mockImage.addEventListener.mock.calls.find(
      call => call[0] === 'error'
    )[1];
    errorHandler();
    
    await waitFor(() => {
      expect(result.current.error).toBe('Failed to load image dimensions');
    });
    
    // Clear mocks to track retry behavior
    jest.clearAllMocks();
    
    // Call retry
    result.current.retry();
    
    // Verify new Image instance was created and event listeners added
    expect(global.Image).toHaveBeenCalled();
    expect(mockImage.addEventListener).toHaveBeenCalledWith('load', expect.any(Function));
    expect(mockImage.addEventListener).toHaveBeenCalledWith('error', expect.any(Function));
  });

  test('should handle data URLs correctly', async () => {
    const dataUrl = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8A8A';
    
    const { result } = renderHook(() => useImageDimensions(dataUrl));
    
    expect(mockImage.src).toBe(dataUrl);
    expect(result.current.isLoading).toBe(true);
  });
});