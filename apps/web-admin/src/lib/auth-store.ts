"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { UserRole } from "@conectajac/shared";

export interface AuthUser {
  id: string;
  identificationType: string;
  identificationNumber: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone: string;
  avatarUrl?: string | null;
}

export interface UserMembership {
  id: string;
  jacId: string;
  jacName: string;
  role: string;
  status: string;
  bookNumber: number;
  folioNumber: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

interface AuthState {
  user: AuthUser | null;
  tokens: AuthTokens | null;
  memberships: UserMembership[];
  currentJacId: string | null;
  isSuperAdmin: boolean;
  setAuth: (payload: {
    user: AuthUser;
    tokens: AuthTokens;
    memberships: UserMembership[];
    currentJacId?: string;
  }) => void;
  switchJac: (jacId: string) => void;
  logout: () => void;
  getCurrentMembership: () => UserMembership | undefined;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      tokens: null,
      memberships: [],
      currentJacId: null,
      isSuperAdmin: false,

      setAuth: (payload) => {
        const isSuperAdmin = payload.memberships.some(
          (m) => m.role === UserRole.SUPER_ADMIN
        );
        const currentJacId =
          payload.currentJacId ||
          payload.memberships[0]?.jacId ||
          null;

        set({
          user: payload.user,
          tokens: payload.tokens,
          memberships: payload.memberships,
          currentJacId,
          isSuperAdmin,
        });
      },

      switchJac: (jacId: string) => {
        set({ currentJacId: jacId });
      },

      logout: () => {
        set({
          user: null,
          tokens: null,
          memberships: [],
          currentJacId: null,
          isSuperAdmin: false,
        });
      },

      getCurrentMembership: () => {
        const { memberships, currentJacId } = get();
        return memberships.find((m) => m.jacId === currentJacId) || memberships[0];
      },
    }),
    {
      name: "conectajac-auth-storage",
    }
  )
);

