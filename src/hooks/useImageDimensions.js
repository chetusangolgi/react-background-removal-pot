import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook to load an image and extract its natural dimensions
 * @param {string} imageSrc - The source URL or data URL of the image
 * @returns {Object} - { dimensions, isLoading, error, retry }
 */
export const useImageDimensions = (imageSrc) => {
  const [dimensions, setDimensions] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadImageDimensions = useCallback(() => {
    if (!imageSrc) {
      setError('No image source provided');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    setDimensions(null);

    const startTime = performance.now();
    const img = new Image();
    
    const handleLoad = () => {
      const endTime = performance.now();
      const loadTime = endTime - startTime;
      
      // Log performance metrics in development
      if (process.env.NODE_ENV === 'development') {
        console.log(`Image dimensions loaded in ${loadTime.toFixed(2)}ms`);
      }

      const naturalWidth = img.naturalWidth;
      const naturalHeight = img.naturalHeight;
      const aspectRatio = naturalWidth / naturalHeight;

      setDimensions({
        width: naturalWidth,
        height: naturalHeight,
        aspectRatio,
        naturalWidth,
        naturalHeight
      });
      setIsLoading(false);
      setError(null);
    };

    const handleError = () => {
      setError('Failed to load image dimensions');
      setIsLoading(false);
      setDimensions(null);
    };

    img.addEventListener('load', handleLoad);
    img.addEventListener('error', handleError);

    // Start loading the image
    img.src = imageSrc;

    // Cleanup function
    return () => {
      img.removeEventListener('load', handleLoad);
      img.removeEventListener('error', handleError);
      // Clear the src to stop any ongoing loading
      img.src = '';
    };
  }, [imageSrc]);

  useEffect(() => {
    const cleanup = loadImageDimensions();
    return cleanup;
  }, [loadImageDimensions]);

  // Retry function for error recovery
  const retry = useCallback(() => {
    loadImageDimensions();
  }, [loadImageDimensions]);

  return {
    dimensions,
    isLoading,
    error,
    retry
  };
};

export default useImageDimensions;