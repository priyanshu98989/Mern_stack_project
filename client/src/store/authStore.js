import { create } from 'zustand';
import { setAccessToken } from '../lib/api';

export const useAuthStore = create((set) => ({
  user: null,
  accessToken: null,
  ready: false,
  setReady: (v) => set({ ready: v }),
  setAuth: (user, accessToken) => {
    setAccessToken(accessToken);
    set({ user, accessToken, ready: true });
  },
  clear: () => {
    setAccessToken(null);
    set({ user: null, accessToken: null, ready: true });
  },
}));
