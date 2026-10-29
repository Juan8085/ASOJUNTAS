import { useAuthStore } from "./auth-store";
import Constants from "expo-constants";
import { Platform } from "react-native";

declare const process: any;

// En emulador Android se usa 10.0.2.2, en iOS y Web se usa localhost
const DEFAULT_HOST = Platform.OS === "android" ? "http://10.0.2.2:4000" : "http://localhost:4000";
const API_BASE_URL =
  Constants.expoConfig?.extra?.apiUrl ||
  (typeof process !== "undefined" && (process as any).env?.EXPO_PUBLIC_API_URL) ||
  `${DEFAULT_HOST}/api/v1`;

export interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { tokens, currentMembership, logout } = useAuthStore.getState();

  let url = endpoint.startsWith("http")
    ? endpoint
    : `${API_BASE_URL}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

  if (options.params) {
    const searchParams = new URLSearchParams();
    Object.entries(options.params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes("?") ? "&" : "?") + queryString;
    }
  }

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (!headers["Content-Type"] && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  if (tokens?.accessToken) {
    headers["Authorization"] = `Bearer ${tokens.accessToken}`;
  }

  if (currentMembership?.jacId) {
    headers["x-tenant-id"] = currentMembership.jacId;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    await logout();
    throw new Error("Sesión expirada");
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const errorMessage =
      errorBody.message || errorBody.error || `Error ${response.status}: ${response.statusText}`;
    throw new Error(Array.isArray(errorMessage) ? errorMessage.join(", ") : errorMessage);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

apiClient.get = <T>(endpoint: string, options?: RequestOptions) =>
  apiClient<T>(endpoint, { ...options, method: "GET" });

apiClient.post = <T>(endpoint: string, body?: any, options?: RequestOptions) =>
  apiClient<T>(endpoint, {
    ...options,
    method: "POST",
    body: body instanceof FormData ? body : JSON.stringify(body),
  });

apiClient.patch = <T>(endpoint: string, body?: any, options?: RequestOptions) =>
  apiClient<T>(endpoint, {
    ...options,
    method: "PATCH",
    body: body instanceof FormData ? body : JSON.stringify(body),
  });

apiClient.delete = <T>(endpoint: string, options?: RequestOptions) =>
  apiClient<T>(endpoint, { ...options, method: "DELETE" });
