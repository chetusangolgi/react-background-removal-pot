import { renderHook, act } from '@testing-library/react';
import { 
  useDeviceDetection, 
  getDeviceType, 
  getLayoutConstraints, 
  DEVICE_TYPES, 
  LAYOUT_CONSTRAINTS 
} from '../hooks/useDeviceDetection';

// Mock window dimensions
const mockWindow = (width, height) => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: height,
  });
};

// Mock resize event
const mockResizeEvent = (width, height) => {
  mockWindow(width, height);
  window.dispatchEvent(new Event('resize'));
};

describe('getDeviceType', () => {
  test('should return mobile for small screens', () => {
    expect(getDeviceType(320, 568)).toBe(DEVICE_TYPES.MOBILE);
    expect(getDeviceType(768, 1024)).toBe(DEVICE_TYPES.MOBILE);
    expect(getDeviceType(600, 800)).toBe(DEVICE_TYPES.MOBILE);
  });

  test('should return tablet for medium screens', () => {
    expect(getDeviceType(1024, 768)).toBe(DEVICE_TYPES.TABLET);
    expect(getDeviceType(1024, 1366)).toBe(DEVICE_TYPES.TABLET); // iPad Pro Portrait
    expect(getDeviceType(1366, 1024)).toBe(DEVICE_TYPES.TABLET); // iPad Pro Landscape
    expect(getDeviceType(800, 600)).toBe(DEVICE_TYPES.TABLET);
  });

  test('should return desktop for large screens', () => {
    expect(getDeviceType(1920, 1080)).toBe(DEVICE_TYPES.DESKTOP);
    expect(getDeviceType(1440, 900)).toBe(DEVICE_TYPES.DESKTOP);
    expect(getDeviceType(2560, 1440)).toBe(DEVICE_TYPES.DESKTOP);
  });

  test('should handle edge cases correctly', () => {
    // Exactly at mobile breakpoint
    expect(getDeviceType(768, 1024)).toBe(DEVICE_TYPES.MOBILE);
    
    // Just above mobile breakpoint
    expect(getDeviceType(769, 1024)).toBe(DEVICE_TYPES.TABLET);
    
    // iPad Pro specific dimensions
    expect(getDeviceType(1024, 1366)).toBe(DEVICE_TYPES.TABLET);
    expect(getDeviceType(1366, 1024)).toBe(DEVICE_TYPES.TABLET);
  });
});

describe('getLayoutConstraints', () => {
  test('should return correct constraints for each device type', () => {
    expect(getLayoutConstraints(DEVICE_TYPES.MOBILE)).toEqual(LAYOUT_CONSTRAINTS.mobile);
    expect(getLayoutConstraints(DEVICE_TYPES.TABLET)).toEqual(LAYOUT_CONSTRAINTS.tablet);
    expect(getLayoutConstraints(DEVICE_TYPES.DESKTOP)).toEqual(LAYOUT_CONSTRAINTS.desktop);
  });

  test('should return desktop constraints for invalid device type', () => {
    expect(getLayoutConstraints('invalid')).toEqual(LAYOUT_CONSTRAINTS.desktop);
    expect(getLayoutConstraints(null)).toEqual(LAYOUT_CONSTRAINTS.desktop);
    expect(getLayoutConstraints(undefined)).toEqual(LAYOUT_CONSTRAINTS.desktop);
  });

  test('should have all required constraint properties', () => {
    Object.values(DEVICE_TYPES).forEach(deviceType => {
      const constraints = getLayoutConstraints(deviceType);
      expect(constraints).toHaveProperty('maxWidth');
      expect(constraints).toHaveProperty('maxHeight');
      expect(constraints).toHaveProperty('minWidth');
      expect(constraints).toHaveProperty('bottomSpacing');
      expect(constraints).toHaveProperty('breakpoint');
      expect(constraints.breakpoint).toHaveProperty('min');
      expect(constraints.breakpoint).toHaveProperty('max');
    });
  });
});

describe('useDeviceDetection', () => {
  beforeEach(() => {
    // Reset window dimensions
    mockWindow(1024, 768);
  });

  test('should initialize with correct device type and constraints', () => {
    mockWindow(1024, 768);
    const { result } = renderHook(() => useDeviceDetection());
    
    expect(result.current.deviceType).toBe(DEVICE_TYPES.TABLET);
    expect(result.current.constraints).toEqual(LAYOUT_CONSTRAINTS.tablet);
    expect(result.current.viewport).toEqual({ width: 1024, height: 768 });
    expect(result.current.isTablet).toBe(true);
    expect(result.current.isMobile).toBe(false);
    expect(result.current.isDesktop).toBe(false);
  });

  test('should update device type on window resize', async () => {
    mockWindow(1024, 768);
    const { result } = renderHook(() => useDeviceDetection(50)); // Short debounce for testing
    
    expect(result.current.deviceType).toBe(DEVICE_TYPES.TABLET);
    
    // Resize to mobile
    act(() => {
      mockResizeEvent(600, 800);
    });
    
    // Wait for debounced update
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });
    
    expect(result.current.deviceType).toBe(DEVICE_TYPES.MOBILE);
    expect(result.current.viewport).toEqual({ width: 600, height: 800 });
    expect(result.current.isMobile).toBe(true);
    expect(result.current.isTablet).toBe(false);
  });

  test('should handle orientation changes', async () => {
    mockWindow(1024, 1366); // iPad Pro Portrait
    const { result } = renderHook(() => useDeviceDetection(50));
    
    expect(result.current.deviceType).toBe(DEVICE_TYPES.TABLET);
    
    // Simulate orientation change to landscape
    act(() => {
      mockWindow(1366, 1024);
      window.dispatchEvent(new Event('orientationchange'));
    });
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });
    
    expect(result.current.deviceType).toBe(DEVICE_TYPES.TABLET);
    expect(result.current.viewport).toEqual({ width: 1366, height: 1024 });
  });

  test('should debounce resize events', async () => {
    const { result } = renderHook(() => useDeviceDetection(100));
    
    const initialViewport = result.current.viewport;
    
    // Trigger multiple rapid resize events
    act(() => {
      mockResizeEvent(800, 600);
      mockResizeEvent(900, 700);
      mockResizeEvent(1000, 800);
    });
    
    // Should not update immediately due to debouncing
    expect(result.current.viewport).toEqual(initialViewport);
    
    // Wait for debounced update
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 150));
    });
    
    // Should update to the last resize event
    expect(result.current.viewport).toEqual({ width: 1000, height: 800 });
  });

  test('should clean up event listeners on unmount', () => {
    const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');
    
    const { unmount } = renderHook(() => useDeviceDetection());
    
    unmount();
    
    expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith('orientationchange', expect.any(Function));
    
    removeEventListenerSpy.mockRestore();
  });

  test('should handle different device types correctly', () => {
    // Test mobile
    mockWindow(400, 600);
    const { result: mobileResult } = renderHook(() => useDeviceDetection());
    expect(mobileResult.current.isMobile).toBe(true);
    expect(mobileResult.current.isTablet).toBe(false);
    expect(mobileResult.current.isDesktop).toBe(false);
    
    // Test tablet
    mockWindow(1024, 768);
    const { result: tabletResult } = renderHook(() => useDeviceDetection());
    expect(tabletResult.current.isMobile).toBe(false);
    expect(tabletResult.current.isTablet).toBe(true);
    expect(tabletResult.current.isDesktop).toBe(false);
    
    // Test desktop
    mockWindow(1920, 1080);
    const { result: desktopResult } = renderHook(() => useDeviceDetection());
    expect(desktopResult.current.isMobile).toBe(false);
    expect(desktopResult.current.isTablet).toBe(false);
    expect(desktopResult.current.isDesktop).toBe(true);
  });
});