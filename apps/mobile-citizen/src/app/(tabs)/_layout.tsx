import { Tabs } from "expo-router";
import {
  Home,
  CreditCard,
  ShoppingBag,
  Users2,
  QrCode,
} from "lucide-react-native";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: "#059669" },
        headerTintColor: "#ffffff",
        headerTitleStyle: { fontWeight: "bold" },
        tabBarActiveTintColor: "#059669",
        tabBarInactiveTintColor: "#64748b",
        tabBarStyle: {
          backgroundColor: "#ffffff",
          borderTopColor: "#e2e8f0",
          height: 60,
          paddingBottom: 8,
          paddingTop: 6,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Inicio",
          tabBarLabel: "Inicio",
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="carnet"
        options={{
          title: "Carnet Ley 2166",
          tabBarLabel: "Mi Carnet",
          tabBarIcon: ({ color, size }) => <QrCode color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="marketplace"
        options={{
          title: "Mercado Campesino",
          tabBarLabel: "Mercado",
          tabBarIcon: ({ color, size }) => <ShoppingBag color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="payments"
        options={{
          title: "Cuotas & Recaudo",
          tabBarLabel: "Cuotas",
          tabBarIcon: ({ color, size }) => <CreditCard color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="comunidad"
        options={{
          title: "Mingas & Asambleas",
          tabBarLabel: "Comunidad",
          tabBarIcon: ({ color, size }) => <Users2 color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}

