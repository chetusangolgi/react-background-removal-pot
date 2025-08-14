import { useState, useEffect, useCallback } from 'react';

// Device type constants
export const DEVICE_TYPES = {
  MOBILE: 'mobile',
  TABLET: 'tablet',
  DESKTOP: 'desktop'
};

// Layout constraints for different device types
export const LAYOUT_CONSTRAINTS = {
  [DEVICE_TYPES.MOBILE]: {
    maxWidth: '95vw',
    maxHeight: '70vh',
    minWidth: '280px',
    bottomSpacing: '120px',
    breakpoint: { min: 0, max: 768 }
  },
  [DEVICE_TYPES.TABLET]: {
    maxWidth: '75vw',
    maxHeight: '85vh',
    minWidth: '400px',
    bottomSpacing: '120px',
    breakpoint: { min: 768, max: 1366 }
  },
  [DEVICE_TYPES.DESKTOP]: {
    maxWidth: '80vw',
    maxHeight: '80vh',
    minWidth: '500px',
    bottomSpacing: '160px',
    breakpoint: { min: 1367, max: Infinity }
  }
};

/**
 * Determines device type based on viewport dimensions
 * @param {number} width - Viewport width
 * @param {number} height - Viewport height
 * @returns {string} Device type (mobile, tablet, desktop)
 */
export const getDeviceType = (width = window.innerWidth, height = window.innerHeight) => {
  // Mobile devices
  if (width <= 768) {
    return DEVICE_TYPES.MOBILE;
  }
  
  // Tablet devices (including iPad Pro)
  // iPad Pro Portrait: 1024×1366, iPad Pro Landscape: 1366×1024
  // Regular iPad: 768×1024, 1024×768
  // Broader tablet detection for all iPad variants
  if (width <= 1366) {
    return DEVICE_TYPES.TABLET;
  }
  
  // Desktop devices (large screens)
  return DEVICE_TYPES.DESKTOP;
};

/**
 * Gets layout constraints for a specific device type
 * @param {string} deviceType - The device type
 * @returns {Object} Layout constraints object
 */
export const getLayoutConstraints = (deviceType) => {
  return LAYOUT_CONSTRAINTS[deviceType] || LAYOUT_CONSTRAINTS[DEVICE_TYPES.DESKTOP];
};

/**
 * Debounce utility function
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * Custom hook for device detection with responsive updates
 * @param {number} debounceMs - Debounce time for resize events (default: 250ms)
 * @returns {Object} - { deviceType, constraints, viewport }
 */
export const useDeviceDetection = (debounceMs = 250) => {
  const [viewport, setViewport] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768
  });

  const [deviceType, setDeviceType] = useState(() => 
    getDeviceType(viewport.width, viewport.height)
  );

  const updateViewport = useCallback(() => {
    const newViewport = {
      width: window.innerWidth,
      height: window.innerHeight
    };
    
    setViewport(newViewport);
    setDeviceType(getDeviceType(newViewport.width, newViewport.height));
  }, []);

  const debouncedUpdateViewport = useCallback(
    debounce(updateViewport, debounceMs),
    [updateViewport, debounceMs]
  );

  useEffect(() => {
    // Initial setup
    updateViewport();

    // Add resize listener
    window.addEventListener('resize', debouncedUpdateViewport);
    window.addEventListener('orientationchange', debouncedUpdateViewport);

    // Cleanup
    return () => {
      window.removeEventListener('resize', debouncedUpdateViewport);
      window.removeEventListener('orientationchange', debouncedUpdateViewport);
    };
  }, [debouncedUpdateViewport, updateViewport]);

  const constraints = getLayoutConstraints(deviceType);

  return {
    deviceType,
    constraints,
    viewport,
    isTablet: deviceType === DEVICE_TYPES.TABLET,
    isMobile: deviceType === DEVICE_TYPES.MOBILE,
    isDesktop: deviceType === DEVICE_TYPES.DESKTOP
  };
};

export default useDeviceDetection;