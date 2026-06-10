const state = {
  app: {
    view: "home",
    initialized: false
  },
  canvas: {
    zoom: 0.5,
    pan: { x: -900, y: -600 },
    selectedIds: []
  },
  agent: {
    enabled: false,
    status: "idle",
    lastSuggestion: null
  },
  ai: {
    provider: "mock"
  }
};

export function getState() {
  return state;
}

export function patchState(section, patch) {
  state[section] = {
    ...state[section],
    ...patch
  };
  return state[section];
}

export function replaceState(section, value) {
  state[section] = value;
  return state[section];
}

export const appState = {
  getState,
  patchState,
  replaceState
};
