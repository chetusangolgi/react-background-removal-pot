import { renderHook } from '@testing-library/react';
import { 
  useResponsiveImageSize, 
  calculateResponsiveDimensions, 
  convertToPixels 
} from '../hooks/useResponsiveImageSize';

// Mock the useDeviceDetection hook
jest.mock('../hooks/useDeviceDetection', () => ({
  useDeviceDetection: jest.fn()
}));

import { useDeviceDetection } from '../hooks/useDeviceDetection';

const mockDeviceDetection = (deviceType, viewport) => {
  const constraints = {
    mobile: {
      maxWidth: '95vw',
      maxHeight: '70vh',
      minWidth: '280px',
      bottomSpacing: '120px'
    },
    tablet: {
      maxWidth: '85vw',
      maxHeight: '75vh',
      minWidth: '400px',
      bottomSpacing: '140px'
    },
    desktop: {
      maxWidth: '80vw',
      maxHeight: '80vh',
      minWidth: '500px',
      bottomSpacing: '160px'
    }
  };

  useDeviceDetection.mockReturnValue({
    deviceType,
    constraints: constraints[deviceType],
    viewport,
    isTablet: deviceType === 'tablet',
    isMobile: deviceType === 'mobile',
    isDesktop: deviceType === 'desktop'
  });
};

describe('convertToPixels', () => {
  const viewport = { width: 1000, height: 800 };

  test('should convert pixel values correctly', () => {
    expect(convertToPixels('400px', viewport)).toBe(400);
    expect(convertToPixels('100px', viewport)).toBe(100);
  });

  test('should convert viewport width values correctly', () => {
    expect(convertToPixels('50vw', viewport)).toBe(500);
    expect(convertToPixels('95vw', viewport)).toBe(950);
  });

  test('should convert viewport height values correctly', () => {
    expect(convertToPixels('50vh', viewport)).toBe(400);
    expect(convertToPixels('75vh', viewport)).toBe(600);
  });

  test('should handle numeric values', () => {
    expect(convertToPixels(400, viewport)).toBe(400);
    expect(convertToPixels(100, viewport)).toBe(100);
  });

  test('should handle invalid values', () => {
    expect(convertToPixels('invalid', viewport)).toBe(0);
    expect(convertToPixels('', viewport)).toBe(0);
    expect(convertToPixels(null, viewport)).toBe(0);
  });
});

describe('calculateResponsiveDimensions', () => {
  const viewport = { width: 1000, height: 800 };
  const constraints = {
    maxWidth: '80vw', // 800px
    maxHeight: '70vh', // 560px
    minWidth: '400px',
    bottomSpacing: '120px'
  };

  test('should return default dimensions when no image dimensions provided', () => {
    const result = calculateResponsiveDimensions(null, constraints, viewport);
    
    expect(result).toEqual({
      displayWidth: '400px',
      displayHeight: 'auto',
      containerWidth: '400px',
      containerHeight: 'auto',
      scale: 1
    });
  });

  test('should handle wide images correctly', () => {
    const imageDimensions = {
      naturalWidth: 1920,
      naturalHeight: 1080,
      aspectRatio: 1920 / 1080 // ~1.78 (wide)
    };

    const result = calculateResponsiveDimensions(imageDimensions, constraints, viewport);
    
    expect(parseInt(result.displayWidth)).toBe(800); // maxWidth constraint
    expect(parseInt(result.displayHeight)).toBe(Math.round(800 / imageDimensions.aspectRatio));
    expect(result.scale).toBeCloseTo(800 / 1920);
  });

  test('should handle tall images correctly', () => {
    const imageDimensions = {
      naturalWidth: 600,
      naturalHeight: 1200,
      aspectRatio: 600 / 1200 // 0.5 (tall)
    };

    const result = calculateResponsiveDimensions(imageDimensions, constraints, viewport);
    
    expect(parseInt(result.displayHeight)).toBe(560); // maxHeight constraint
    expect(parseInt(result.displayWidth)).toBe(Math.round(560 * imageDimensions.aspectRatio));
  });

  test('should handle square-ish images correctly', () => {
    const imageDimensions = {
      naturalWidth: 800,
      naturalHeight: 800,
      aspectRatio: 1 // square
    };

    const result = calculateResponsiveDimensions(imageDimensions, constraints, viewport);
    
    // Should fit within both width and height constraints
    expect(parseInt(result.displayWidth)).toBeLessThanOrEqual(800);
    expect(parseInt(result.displayHeight)).toBeLessThanOrEqual(560);
  });

  test('should enforce minimum width constraint', () => {
    const imageDimensions = {
      naturalWidth: 200,
      naturalHeight: 300,
      aspectRatio: 200 / 300
    };

    const result = calculateResponsiveDimensions(imageDimensions, constraints, viewport);
    
    expect(parseInt(result.displayWidth)).toBe(400); // minWidth constraint
    expect(parseInt(result.displayHeight)).toBe(Math.round(400 / imageDimensions.aspectRatio));
  });

  test('should handle very wide images with height constraint', () => {
    const imageDimensions = {
      naturalWidth: 3000,
      naturalHeight: 1000,
      aspectRatio: 3 // very wide
    };

    const result = calculateResponsiveDimensions(imageDimensions, constraints, viewport);
    
    // Should be constrained by height when width-based calculation exceeds height limit
    const widthBasedHeight = 800 / 3; // ~267px
    const heightBasedWidth = 560 * 3; // 1680px
    
    if (widthBasedHeight <= 560) {
      expect(parseInt(result.displayWidth)).toBe(800);
      expect(parseInt(result.displayHeight)).toBe(Math.round(widthBasedHeight));
    } else {
      expect(parseInt(result.displayHeight)).toBe(560);
      expect(parseInt(result.displayWidth)).toBe(Math.round(heightBasedWidth));
    }
  });
});

describe('useResponsiveImageSize', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should return responsive dimensions for desktop', () => {
    const viewport = { width: 1920, height: 1080 };
    mockDeviceDetection('desktop', viewport);

    const imageDimensions = {
      naturalWidth: 800,
      naturalHeight: 600,
      aspectRatio: 800 / 600
    };

    const { result } = renderHook(() => useResponsiveImageSize(imageDimensions));
    
    expect(result.current.deviceType).toBe('desktop');
    expect(result.current.displayWidth).toMatch(/^\d+px$/);
    expect(result.current.displayHeight).toMatch(/^\d+px$/);
    expect(result.current.containerStyle).toHaveProperty('width');
    expect(result.current.containerStyle).toHaveProperty('height');
    expect(result.current.imageStyle).toHaveProperty('width');
    expect(result.current.imageStyle).toHaveProperty('height');
    expect(result.current.bottomContainerStyle).toHaveProperty('flexDirection', 'row');
  });

  test('should return responsive dimensions for mobile', () => {
    const viewport = { width: 375, height: 667 };
    mockDeviceDetection('mobile', viewport);

    const imageDimensions = {
      naturalWidth: 800,
      naturalHeight: 600,
      aspectRatio: 800 / 600
    };

    const { result } = renderHook(() => useResponsiveImageSize(imageDimensions));
    
    expect(result.current.deviceType).toBe('mobile');
    expect(result.current.bottomContainerStyle).toHaveProperty('flexDirection', 'column');
  });

  test('should return responsive dimensions for tablet', () => {
    const viewport = { width: 1024, height: 768 };
    mockDeviceDetection('tablet', viewport);

    const imageDimensions = {
      naturalWidth: 800,
      naturalHeight: 600,
      aspectRatio: 800 / 600
    };

    const { result } = renderHook(() => useResponsiveImageSize(imageDimensions));
    
    expect(result.current.deviceType).toBe('tablet');
    expect(result.current.bottomContainerStyle).toHaveProperty('flexDirection', 'row');
  });

  test('should handle null image dimensions', () => {
    const viewport = { width: 1920, height: 1080 };
    mockDeviceDetection('desktop', viewport);

    const { result } = renderHook(() => useResponsiveImageSize(null));
    
    expect(result.current.displayWidth).toBe('500px'); // desktop minWidth
    expect(result.current.displayHeight).toBe('auto');
  });

  test('should provide proper container styles', () => {
    const viewport = { width: 1920, height: 1080 };
    mockDeviceDetection('desktop', viewport);

    const imageDimensions = {
      naturalWidth: 800,
      naturalHeight: 600,
      aspectRatio: 800 / 600
    };

    const { result } = renderHook(() => useResponsiveImageSize(imageDimensions));
    
    expect(result.current.containerStyle).toEqual(
      expect.objectContaining({
        margin: '0 auto',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      })
    );
  });

  test('should provide proper image styles', () => {
    const viewport = { width: 1920, height: 1080 };
    mockDeviceDetection('desktop', viewport);

    const imageDimensions = {
      naturalWidth: 800,
      naturalHeight: 600,
      aspectRatio: 800 / 600
    };

    const { result } = renderHook(() => useResponsiveImageSize(imageDimensions));
    
    expect(result.current.imageStyle).toEqual(
      expect.objectContaining({
        objectFit: 'contain',
        maxWidth: '100%',
        maxHeight: '100%'
      })
    );
  });

  test('should calculate scale factor correctly', () => {
    const viewport = { width: 1920, height: 1080 };
    mockDeviceDetection('desktop', viewport);

    const imageDimensions = {
      naturalWidth: 1600,
      naturalHeight: 1200,
      aspectRatio: 1600 / 1200
    };

    const { result } = renderHook(() => useResponsiveImageSize(imageDimensions));
    
    const displayWidthPx = parseInt(result.current.displayWidth);
    const expectedScale = displayWidthPx / 1600;
    
    expect(result.current.scale).toBeCloseTo(expectedScale, 2);
  });
});