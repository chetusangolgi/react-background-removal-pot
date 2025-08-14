import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  name: '',
  photo: null,
  processedPhoto: null,
  presetImage: null,
  finalImageUrl: '',
  selectedBackground: null,
};

export const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    setName: (state, action) => {
      state.name = action.payload;
    },
    setPhoto: (state, action) => {
      state.photo = action.payload;
    },
    setProcessedPhoto: (state, action) => {
      state.processedPhoto = action.payload;
    },
    setPresetImage: (state, action) => {
      state.presetImage = action.payload;
    },
    setFinalImageUrl: (state, action) => {
      state.finalImageUrl = action.payload;
    },
    setSelectedBackground: (state, action) => {
      state.selectedBackground = action.payload;
    },
    clearSelectedBackground: (state) => {
      state.selectedBackground = null;
    },
  },
});

export const { setName, setPhoto, setProcessedPhoto, setPresetImage, setFinalImageUrl, setSelectedBackground, clearSelectedBackground } = appSlice.actions;

export default appSlice.reducer;
