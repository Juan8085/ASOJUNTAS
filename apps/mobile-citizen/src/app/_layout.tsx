import { Stack } from "expo-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { queryClient, asyncStoragePersister } from "../lib/offline-sync";

export default function RootLayout() {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister: asyncStoragePersister }}
    >
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: "#059669" },
          headerTintColor: "#fff",
          headerTitleStyle: { fontWeight: "bold" },
        }}
      >
        <Stack.Screen name="index" options={{ title: "ConectaJAC Veredal" }} />
      </Stack>
    </PersistQueryClientProvider>
  );
}
