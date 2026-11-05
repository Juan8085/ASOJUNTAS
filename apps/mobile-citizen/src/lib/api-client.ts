import { useAuthStore } from "./auth-store";
import Constants from "expo-constants";
import { Platform } from "react-native";

declare const process: any;

export function getApiBaseUrl(): string {
  // 1. Extraer dinámicamente la IP de la máquina anfitriona desde Expo Go (hostUri: "192.168.x.x:8081")
  // Esto previene que cambios de IP por DHCP en Windows rompan la conexión en el celular físico.
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const hostIp = hostUri.split(":")[0];
    if (hostIp && hostIp !== "localhost" && hostIp !== "127.0.0.1") {
      return `http://${hostIp}:4000/api/v1`;
    }
  }

  // 2. Variable de entorno explícita (e.g. EXPO_PUBLIC_API_URL en .env o compilación de producción)
  const envUrl =
    (typeof process !== "undefined" && process.env?.EXPO_PUBLIC_API_URL) ||
    Constants.expoConfig?.extra?.apiUrl;
  if (envUrl) return envUrl;

  // 3. Fallbacks: emulador Android (10.0.2.2), iOS/Web (localhost)
  const defaultHost = Platform.OS === "android" ? "http://10.0.2.2:4000" : "http://localhost:4000";
  return `${defaultHost}/api/v1`;
}

export interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { tokens, currentMembership, logout } = useAuthStore.getState();

  const baseUrl = getApiBaseUrl();
  let url = endpoint.startsWith("http")
    ? endpoint
    : `${baseUrl}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

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
