import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { ShoppingBag, Bell, CreditCard, FileCheck2 } from "lucide-react-native";

export default function HomeScreen() {
  return (
    <ScrollView className="flex-1 bg-slate-50">
      {/* Vereda Header */}
      <View className="bg-emerald-600 px-6 pt-6 pb-10 rounded-b-3xl shadow-sm">
        <Text className="text-emerald-100 text-xs font-semibold uppercase tracking-wider">
          Mi Comunidad Veredal
        </Text>
        <Text className="text-white text-2xl font-bold mt-1">
          JAC Vereda El Salado
        </Text>
        <Text className="text-emerald-50 text-sm mt-1">
          Asojuntas San Vicente de Chucurí
        </Text>
      </View>

      {/* Grid of Citizen Features */}
      <View className="px-5 -mt-6">
        <View className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-4 flex-row justify-between items-center">
          <View>
            <Text className="text-xs text-slate-500">Estado de Afiliación</Text>
            <Text className="text-emerald-700 font-bold text-base">Afiliado Activo • Folio #42</Text>
          </View>
          <View className="bg-emerald-100 px-3 py-1 rounded-full">
            <Text className="text-emerald-800 text-xs font-semibold">Al Día</Text>
          </View>
        </View>

        <Text className="text-slate-800 font-bold text-lg mb-3">Servicios para el Habitante</Text>
        
        <View className="flex-row flex-wrap justify-between gap-y-3">
          {/* Mercado Campesino */}
          <TouchableOpacity className="w-[48%] bg-white p-4 rounded-2xl border border-slate-100 shadow-sm items-center">
            <View className="w-12 h-12 rounded-xl bg-amber-50 items-center justify-center mb-2">
              <ShoppingBag color="#d97706" size={24} />
            </View>
            <Text className="font-bold text-slate-800 text-sm text-center">Mercado Campesino</Text>
            <Text className="text-xs text-slate-400 text-center mt-1">Cosechas y lácteos</Text>
          </TouchableOpacity>

          {/* Pagos de Cuotas */}
          <TouchableOpacity className="w-[48%] bg-white p-4 rounded-2xl border border-slate-100 shadow-sm items-center">
            <View className="w-12 h-12 rounded-xl bg-blue-50 items-center justify-center mb-2">
              <CreditCard color="#2563eb" size={24} />
            </View>
            <Text className="font-bold text-slate-800 text-sm text-center">Pagos Comunales</Text>
            <Text className="text-xs text-slate-400 text-center mt-1">PSE, Nequi y recibos</Text>
          </TouchableOpacity>

          {/* Certificados */}
          <TouchableOpacity className="w-[48%] bg-white p-4 rounded-2xl border border-slate-100 shadow-sm items-center">
            <View className="w-12 h-12 rounded-xl bg-emerald-50 items-center justify-center mb-2">
              <FileCheck2 color="#059669" size={24} />
            </View>
            <Text className="font-bold text-slate-800 text-sm text-center">Certificados QR</Text>
            <Text className="text-xs text-slate-400 text-center mt-1">Residencia inmediata</Text>
          </TouchableOpacity>

          {/* Avisos y Mingas */}
          <TouchableOpacity className="w-[48%] bg-white p-4 rounded-2xl border border-slate-100 shadow-sm items-center">
            <View className="w-12 h-12 rounded-xl bg-rose-50 items-center justify-center mb-2">
              <Bell color="#e11d48" size={24} />
            </View>
            <Text className="font-bold text-slate-800 text-sm text-center">Avisos y Mingas</Text>
            <Text className="text-xs text-slate-400 text-center mt-1">Alertas veredales</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}
