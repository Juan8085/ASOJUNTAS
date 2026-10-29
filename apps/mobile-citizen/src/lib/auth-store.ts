import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { UserRole } from "@conectajac/shared";

export interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone: string;
  identificationType: string;
  identificationNumber: string;
}

export interface UserMembership {
  id: string;
  jacId: string;
  role: UserRole;
  status: string;
  folioNumber: number;
  bookNumber: number;
  veredaOrBarrio: string;
  jac: {
    id: string;
    name: string;
    legalPersonhoodNumber: string;
    veredaOrBarrio: string;
    logoUrl?: string;
    officialSealUrl?: string;
    primaryColor?: string;
    municipality?: {
      name: string;
      department: string;
    };
  };
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

interface AuthState {
  user: UserProfile | null;
  memberships: UserMembership[];
  currentMembership: UserMembership | null;
  tokens: AuthTokens | null;
  isLoading: boolean;
  setAuth: (user: UserProfile, memberships: UserMembership[], tokens: AuthTokens) => Promise<void>;
  setCurrentMembership: (membership: UserMembership) => Promise<void>;
  loadAuth: () => Promise<void>;
  logout: () => Promise<void>;
}

const STORAGE_KEY = "@conectajac_auth_state_v1";

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  memberships: [],
  currentMembership: null,
  tokens: null,
  isLoading: true,

  setAuth: async (user, memberships, tokens) => {
    const active = memberships[0] || null;
    const newState = { user, memberships, currentMembership: active, tokens, isLoading: false };
    set(newState);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ user, memberships, currentMembership: active, tokens }));
  },

  setCurrentMembership: async (membership) => {
    set({ currentMembership: membership });
    const current = await AsyncStorage.getItem(STORAGE_KEY);
    if (current) {
      const parsed = JSON.parse(current);
      parsed.currentMembership = membership;
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
    }
  },

  loadAuth: async () => {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        set({
          user: parsed.user,
          memberships: parsed.memberships || [],
          currentMembership: parsed.currentMembership || parsed.memberships?.[0] || null,
          tokens: parsed.tokens,
          isLoading: false,
        });
        return;
      }
    } catch {
      // Ignorar fallas de lectura
    }
    set({ isLoading: false });
  },

  logout: async () => {
    set({ user: null, memberships: [], currentMembership: null, tokens: null, isLoading: false });
    await AsyncStorage.removeItem(STORAGE_KEY);
  },
}));
