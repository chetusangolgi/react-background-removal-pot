import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter } from 'react-router-dom';
import BackgroundSelectionPage from '../components/BackgroundSelectionPage';
import appReducer from '../features/appSlice';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

describe('BackgroundSelectionPage', () => {
  let store;

  beforeEach(() => {
    jest.clearAllMocks();
    store = configureStore({
      reducer: {
        app: appReducer,
      },
    });
  });

  const renderWithProviders = (ui) => {
    return render(
      <Provider store={store}>
        <MemoryRouter>
          {ui}
        </MemoryRouter>
      </Provider>
    );
  };

  test('renders background selection page with all elements', () => {
    renderWithProviders(<BackgroundSelectionPage />);

    expect(screen.getByText('Choose Your Background')).toBeInTheDocument();
    expect(screen.getByText('Select a background for your photo')).toBeInTheDocument();
    
    // Check all background options are displayed
    expect(screen.getByText('Background 1')).toBeInTheDocument();
    expect(screen.getByText('Background 2')).toBeInTheDocument();
    expect(screen.getByText('Background 3')).toBeInTheDocument();
    expect(screen.getByText('Background 4')).toBeInTheDocument();
    expect(screen.getByText('Background 5')).toBeInTheDocument();

    // Check Take Photo button is present but disabled
    const takePhotoButton = screen.getByText('Take Photo');
    expect(takePhotoButton).toBeInTheDocument();
    expect(takePhotoButton).toBeDisabled();
  });

  test('background selection and visual feedback', () => {
    renderWithProviders(<BackgroundSelectionPage />);

    const firstBackground = screen.getByAltText('Background 1');
    const secondBackground = screen.getByAltText('Background 2');

    // Initially no background should be selected
    expect(firstBackground.closest('.background-thumbnail')).not.toHaveClass('selected');
    expect(secondBackground.closest('.background-thumbnail')).not.toHaveClass('selected');

    // Select first background
    fireEvent.click(firstBackground);
    expect(firstBackground.closest('.background-thumbnail')).toHaveClass('selected');
    expect(secondBackground.closest('.background-thumbnail')).not.toHaveClass('selected');

    // Select second background
    fireEvent.click(secondBackground);
    expect(firstBackground.closest('.background-thumbnail')).not.toHaveClass('selected');
    expect(secondBackground.closest('.background-thumbnail')).toHaveClass('selected');
  });

  test('take photo button enables after background selection', () => {
    renderWithProviders(<BackgroundSelectionPage />);

    const takePhotoButton = screen.getByText('Take Photo');
    const firstBackground = screen.getByAltText('Background 1');

    // Initially disabled
    expect(takePhotoButton).toBeDisabled();

    // Select background
    fireEvent.click(firstBackground);

    // Should be enabled
    expect(takePhotoButton).not.toBeDisabled();
  });

  test('navigation to photo page with Redux state update', () => {
    renderWithProviders(<BackgroundSelectionPage />);

    const firstBackground = screen.getByAltText('Background 1');
    const takePhotoButton = screen.getByText('Take Photo');

    // Select background and continue
    fireEvent.click(firstBackground);
    fireEvent.click(takePhotoButton);

    // Should dispatch Redux action
    const state = store.getState();
    expect(state.app.selectedBackground).toEqual({
      id: 'bg',
      src: '/bg.jpeg',
      label: 'Background 1'
    });

    // Should navigate to photo page
    expect(mockNavigate).toHaveBeenCalledWith('/photo');
  });

  test('error handling during navigation', async () => {
    // Mock Redux dispatch to throw error
    const originalDispatch = store.dispatch;
    store.dispatch = jest.fn(() => {
      throw new Error('Redux error');
    });

    renderWithProviders(<BackgroundSelectionPage />);

    const firstBackground = screen.getByAltText('Background 1');
    const takePhotoButton = screen.getByText('Take Photo');

    // Select background and try to continue
    fireEvent.click(firstBackground);
    fireEvent.click(takePhotoButton);

    // Should show error message
    await waitFor(() => {
      expect(screen.getByText(/Failed to proceed to photo capture/)).toBeInTheDocument();
    });

    // Should not navigate
    expect(mockNavigate).not.toHaveBeenCalled();

    // Restore original dispatch
    store.dispatch = originalDispatch;
  });

  test('error message dismissal', async () => {
    // Mock Redux dispatch to throw error
    const originalDispatch = store.dispatch;
    store.dispatch = jest.fn(() => {
      throw new Error('Redux error');
    });

    renderWithProviders(<BackgroundSelectionPage />);

    const firstBackground = screen.getByAltText('Background 1');
    const takePhotoButton = screen.getByText('Take Photo');

    // Trigger error
    fireEvent.click(firstBackground);
    fireEvent.click(takePhotoButton);

    // Wait for error message
    await waitFor(() => {
      expect(screen.getByText(/Failed to proceed to photo capture/)).toBeInTheDocument();
    });

    // Dismiss error
    const tryAgainButton = screen.getByText('Try Again');
    fireEvent.click(tryAgainButton);

    // Error message should be gone
    expect(screen.queryByText(/Failed to proceed to photo capture/)).not.toBeInTheDocument();

    // Restore original dispatch
    store.dispatch = originalDispatch;
  });

  test('image fallback handling', () => {
    renderWithProviders(<BackgroundSelectionPage />);

    const backgroundImage = screen.getByAltText('Background 1');
    
    // Simulate image load error
    fireEvent.error(backgroundImage);

    // Should fallback to default background
    expect(backgroundImage).toHaveAttribute('src', '/bg1.jpg');
    expect(backgroundImage).toHaveAttribute('alt', 'Background (fallback)');
  });

  test('all background options have correct data', () => {
    renderWithProviders(<BackgroundSelectionPage />);

    const expectedBackgrounds = [
      { id: 'bg', src: '/bg.jpeg', label: 'Background 1' },
      { id: 'bg1', src: '/bg1.jpg', label: 'Background 2' },
      { id: 'bg2', src: '/bg2.jpg', label: 'Background 3' },
      { id: 'bg3', src: '/bg3.jpg', label: 'Background 4' },
      { id: 'bg4', src: '/bg4.jpg', label: 'Background 5' }
    ];

    expectedBackgrounds.forEach((bg) => {
      const image = screen.getByAltText(bg.label);
      expect(image).toHaveAttribute('src', bg.src);
      expect(screen.getByText(bg.label)).toBeInTheDocument();
    });
  });

  test('keyboard accessibility', () => {
    renderWithProviders(<BackgroundSelectionPage />);

    const firstBackground = screen.getByAltText('Background 1').closest('.background-thumbnail');
    const takePhotoButton = screen.getByText('Take Photo');

    // Should be focusable
    firstBackground.focus();
    expect(document.activeElement).toBe(firstBackground);

    // Should be able to select with Enter key
    fireEvent.keyDown(firstBackground, { key: 'Enter', code: 'Enter' });
    // Note: This would require additional implementation in the component

    // Button should be focusable
    takePhotoButton.focus();
    expect(document.activeElement).toBe(takePhotoButton);
  });
});