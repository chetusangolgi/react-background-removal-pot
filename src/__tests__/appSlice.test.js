import appReducer, { 
  setSelectedBackground, 
  clearSelectedBackground,
  setName,
  setPhoto,
  setProcessedPhoto,
  setPresetImage,
  setFinalImageUrl
} from '../features/appSlice';

describe('appSlice', () => {
  const initialState = {
    name: '',
    photo: null,
    processedPhoto: null,
    presetImage: null,
    finalImageUrl: '',
    selectedBackground: null,
  };

  test('should return the initial state', () => {
    expect(appReducer(undefined, { type: undefined })).toEqual(initialState);
  });

  describe('background selection actions', () => {
    test('should handle setSelectedBackground', () => {
      const backgroundData = {
        id: 'bg1',
        src: '/bg1.jpg',
        label: 'Background 2'
      };

      const actual = appReducer(initialState, setSelectedBackground(backgroundData));
      expect(actual.selectedBackground).toEqual(backgroundData);
    });

    test('should handle clearSelectedBackground', () => {
      const stateWithBackground = {
        ...initialState,
        selectedBackground: {
          id: 'bg2',
          src: '/bg2.jpg',
          label: 'Background 3'
        }
      };

      const actual = appReducer(stateWithBackground, clearSelectedBackground());
      expect(actual.selectedBackground).toBeNull();
    });

    test('should handle updating selectedBackground', () => {
      const firstBackground = {
        id: 'bg1',
        src: '/bg1.jpg',
        label: 'Background 2'
      };

      const secondBackground = {
        id: 'bg3',
        src: '/bg3.jpg',
        label: 'Background 4'
      };

      let state = appReducer(initialState, setSelectedBackground(firstBackground));
      expect(state.selectedBackground).toEqual(firstBackground);

      state = appReducer(state, setSelectedBackground(secondBackground));
      expect(state.selectedBackground).toEqual(secondBackground);
    });
  });

  describe('existing actions compatibility', () => {
    test('should handle setName', () => {
      const actual = appReducer(initialState, setName('John Doe'));
      expect(actual.name).toEqual('John Doe');
    });

    test('should handle setPhoto', () => {
      const photoData = 'data:image/jpeg;base64,mockPhoto';
      const actual = appReducer(initialState, setPhoto(photoData));
      expect(actual.photo).toEqual(photoData);
    });

    test('should handle setProcessedPhoto', () => {
      const processedPhotoData = 'data:image/png;base64,mockProcessedPhoto';
      const actual = appReducer(initialState, setProcessedPhoto(processedPhotoData));
      expect(actual.processedPhoto).toEqual(processedPhotoData);
    });

    test('should handle setPresetImage', () => {
      const presetImageData = 'data:image/jpeg;base64,mockPresetImage';
      const actual = appReducer(initialState, setPresetImage(presetImageData));
      expect(actual.presetImage).toEqual(presetImageData);
    });

    test('should handle setFinalImageUrl', () => {
      const finalImageUrl = 'https://example.com/final-image.jpg';
      const actual = appReducer(initialState, setFinalImageUrl(finalImageUrl));
      expect(actual.finalImageUrl).toEqual(finalImageUrl);
    });
  });

  describe('state immutability', () => {
    test('should not mutate the original state', () => {
      const backgroundData = {
        id: 'bg1',
        src: '/bg1.jpg',
        label: 'Background 2'
      };

      const originalState = { ...initialState };
      const newState = appReducer(initialState, setSelectedBackground(backgroundData));

      expect(initialState).toEqual(originalState);
      expect(newState).not.toBe(initialState);
      expect(newState.selectedBackground).toEqual(backgroundData);
    });

    test('should preserve other state properties when updating selectedBackground', () => {
      const stateWithData = {
        ...initialState,
        name: 'John Doe',
        photo: 'data:image/jpeg;base64,mockPhoto',
        finalImageUrl: 'https://example.com/image.jpg'
      };

      const backgroundData = {
        id: 'bg2',
        src: '/bg2.jpg',
        label: 'Background 3'
      };

      const newState = appReducer(stateWithData, setSelectedBackground(backgroundData));

      expect(newState.name).toEqual('John Doe');
      expect(newState.photo).toEqual('data:image/jpeg;base64,mockPhoto');
      expect(newState.finalImageUrl).toEqual('https://example.com/image.jpg');
      expect(newState.selectedBackground).toEqual(backgroundData);
    });
  });

  describe('edge cases', () => {
    test('should handle null background data', () => {
      const actual = appReducer(initialState, setSelectedBackground(null));
      expect(actual.selectedBackground).toBeNull();
    });

    test('should handle undefined background data', () => {
      const actual = appReducer(initialState, setSelectedBackground(undefined));
      expect(actual.selectedBackground).toBeUndefined();
    });

    test('should handle partial background data', () => {
      const partialBackgroundData = {
        id: 'bg1',
        src: '/bg1.jpg'
        // missing label
      };

      const actual = appReducer(initialState, setSelectedBackground(partialBackgroundData));
      expect(actual.selectedBackground).toEqual(partialBackgroundData);
    });
  });
});