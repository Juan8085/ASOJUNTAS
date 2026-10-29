import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { queryClient, asyncStoragePersister } from "../lib/offline-sync";
import { useAuthStore } from "../lib/auth-store";

export default function RootLayout() {
  const loadAuth = useAuthStore((state) => state.loadAuth);

  useEffect(() => {
    loadAuth();
  }, [loadAuth]);

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister: asyncStoragePersister }}
    >
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: "#059669" },
          headerTintColor: "#ffffff",
          headerTitleStyle: { fontWeight: "bold" },
          headerBackTitle: "Volver",
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="(auth)/login"
          options={{ title: "Ingreso Ciudadano", headerShown: false }}
        />
        <Stack.Screen
          name="(auth)/register"
          options={{ title: "Afiliación Ciudadana", presentation: "modal" }}
        />
        <Stack.Screen
          name="certificates/index"
          options={{ title: "Certificados con QR" }}
        />
        <Stack.Screen
          name="mingas/[id]"
          options={{ title: "Detalle de Minga Comunal" }}
        />
        <Stack.Screen
          name="assemblies/[id]"
          options={{ title: "Asamblea & Voto Secreto" }}
        />
      </Stack>
    </PersistQueryClientProvider>
  );
}
