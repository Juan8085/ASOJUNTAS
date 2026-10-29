import AsyncStorage from "@react-native-async-storage/async-storage";
import { QueryClient } from "@tanstack/react-query";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";

/**
 * Persistencia Offline de TanStack Query para zonas rurales de baja conectividad
 * Almacena en AsyncStorage/MMKV los datos de noticias, certificados y mercado campesino
 * Permite que los habitantes consulten datos previamente sincronizados sin conexión
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24 * 7, // 7 días de retención en caché local para veredas
      staleTime: 1000 * 60 * 5,         // 5 minutos de frescura antes de reintentar sync
      retry: 2,
      networkMode: "offlineFirst",     // Prioriza devolver datos de caché antes de fallar por red
    },
    mutations: {
      networkMode: "offlineFirst",
      retry: 3,
    },
  },
});

export const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: "CONECTAJAC_OFFLINE_CACHE_V1",
  throttleTime: 1000,
});
