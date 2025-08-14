import { useMemo } from 'react';
import { useDeviceDetection } from './useDeviceDetection';

/**
 * Converts CSS unit values to pixels for calculation
 * @param {string} value - CSS value (e.g., '95vw', '400px')
 * @param {Object} viewport - Viewport dimensions
 * @returns {number} Value in pixels
 */
const convertToPixels = (value, viewport) => {
  if (typeof value === 'number') return value;
  
  if (value.endsWith('px')) {
    return parseFloat(value);
  }
  
  if (value.endsWith('vw')) {
    return (parseFloat(value) / 100) * viewport.width;
  }
  
  if (value.endsWith('vh')) {
    return (parseFloat(value) / 100) * viewport.height;
  }
  
  // Default fallback
  return parseFloat(value) || 0;
};

/**
 * Calculates optimal image dimensions based on aspect ratio and constraints
 * @param {Object} imageDimensions - Image dimensions from useImageDimensions
 * @param {Object} constraints - Layout constraints from device detection
 * @param {Object} viewport - Current viewport dimensions
 * @returns {Object} Calculated responsive dimensions
 */
const calculateResponsiveDimensions = (imageDimensions, constraints, viewport, deviceType) => {
  if (!imageDimensions) {
    // Return default dimensions when image dimensions are not available
    return {
      displayWidth: constraints.minWidth,
      displayHeight: 'auto',
      containerWidth: constraints.minWidth,
      containerHeight: 'auto',
      scale: 1
    };
  }

  const { aspectRatio, naturalWidth, naturalHeight } = imageDimensions;
  
  // Convert constraint values to pixels
  let maxWidthPx = convertToPixels(constraints.maxWidth, viewport);
  let maxHeightPx = convertToPixels(constraints.maxHeight, viewport);
  const minWidthPx = convertToPixels(constraints.minWidth, viewport);
  
  // For horizontal layout (non-mobile), reserve space for QR code and controls
  if (deviceType !== 'mobile') {
    // Reserve space for QR code (200px) + gap (40px) + button width (~80px) + padding (40px)
    const reservedWidth = 200 + 40 + 80 + 40; // 360px (reduced from 430px)
    maxWidthPx = Math.max(minWidthPx, viewport.width - reservedWidth);
    
    // Reserve space for padding and ensure content fits in viewport - be more conservative
    maxHeightPx = Math.min(maxHeightPx, viewport.height - 80); // 80px total padding for safety
  } else {
    // For mobile, reserve space for QR code and button below the image
    const reservedHeight = 150 + 20 + 60 + 40 + 20; // QR + gap + button + padding + extra safety
    maxHeightPx = Math.max(200, viewport.height - reservedHeight);
  }
  
  // Calculate dimensions based on aspect ratio and constraints
  // Always ensure we fit within both width and height constraints
  let displayWidth, displayHeight;
  
  // Calculate both width-constrained and height-constrained dimensions
  const widthConstrainedWidth = Math.min(maxWidthPx, naturalWidth);
  const widthConstrainedHeight = widthConstrainedWidth / aspectRatio;
  
  const heightConstrainedHeight = Math.min(maxHeightPx, naturalHeight);
  const heightConstrainedWidth = heightConstrainedHeight * aspectRatio;
  
  // Choose the smaller scaling to ensure both constraints are met
  if (widthConstrainedHeight <= maxHeightPx && widthConstrainedWidth >= minWidthPx) {
    // Width constraint works and fits within height
    displayWidth = widthConstrainedWidth;
    displayHeight = widthConstrainedHeight;
  } else if (heightConstrainedWidth >= minWidthPx) {
    // Height constraint works and meets minimum width
    displayWidth = heightConstrainedWidth;
    displayHeight = heightConstrainedHeight;
  } else {
    // Use minimum width and calculate height, then check if it fits
    displayWidth = minWidthPx;
    displayHeight = displayWidth / aspectRatio;
    
    // If still too tall, use max height and recalculate width
    if (displayHeight > maxHeightPx) {
      displayHeight = maxHeightPx;
      displayWidth = displayHeight * aspectRatio;
    }
  }
  
  // Calculate scale factor
  const scale = displayWidth / naturalWidth;
  
  return {
    displayWidth: `${Math.round(displayWidth)}px`,
    displayHeight: `${Math.round(displayHeight)}px`,
    containerWidth: `${Math.round(displayWidth)}px`,
    containerHeight: `${Math.round(displayHeight)}px`,
    scale
  };
};

/**
 * Custom hook for calculating responsive image sizes
 * @param {Object} imageDimensions - Image dimensions from useImageDimensions hook
 * @returns {Object} Responsive size calculations and container styles
 */
export const useResponsiveImageSize = (imageDimensions) => {
  const { constraints, viewport, deviceType } = useDeviceDetection();
  
  const responsiveSize = useMemo(() => {
    return calculateResponsiveDimensions(imageDimensions, constraints, viewport, deviceType);
  }, [imageDimensions, constraints, viewport, deviceType]);
  
  const containerStyle = useMemo(() => {
    return {
      width: responsiveSize.containerWidth,
      height: responsiveSize.containerHeight,
      maxWidth: '100%',
      maxHeight: '100%',
      minWidth: constraints.minWidth,
      margin: '0',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      flexShrink: 0
    };
  }, [responsiveSize, constraints]);
  
  const imageStyle = useMemo(() => {
    return {
      width: responsiveSize.displayWidth,
      height: responsiveSize.displayHeight,
      objectFit: 'contain',
      maxWidth: '100%',
      maxHeight: '100%'
    };
  }, [responsiveSize]);
  
  // Calculate bottom container dimensions based on image size and device constraints
  const bottomContainerStyle = useMemo(() => {
    const bottomSpacingPx = convertToPixels(constraints.bottomSpacing, viewport);
    
    return {
      width: responsiveSize.containerWidth,
      minHeight: `${bottomSpacingPx}px`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '20px',
      flexDirection: deviceType === 'mobile' ? 'column' : 'row'
    };
  }, [responsiveSize, constraints, viewport, deviceType]);
  
  return {
    ...responsiveSize,
    containerStyle,
    imageStyle,
    bottomContainerStyle,
    deviceType,
    constraints,
    viewport
  };
};

// Export utility functions for testing
export { calculateResponsiveDimensions, convertToPixels };

export default useResponsiveImageSize;