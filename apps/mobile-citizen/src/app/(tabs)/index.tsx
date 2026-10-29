import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../../lib/auth-store";
import { apiClient } from "../../lib/api-client";
import {
  ShieldCheck,
  QrCode,
  FileCheck2,
  Shovel,
  ShoppingBag,
  Bell,
  AlertTriangle,
  ChevronRight,
  LogIn,
} from "lucide-react-native";

export default function HomeScreen() {
  const router = useRouter();
  const { user, currentMembership, isLoading: authLoading } = useAuthStore();

  const { data: postsData, isLoading: loadingPosts, refetch } = useQuery<{
    data: any[];
  }>({
    queryKey: ["community-posts", currentMembership?.jacId],
    queryFn: () => apiClient.get("/posts?limit=5"),
    enabled: !!currentMembership?.jacId,
  });

  const posts = postsData?.data || [];

  if (authLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <ActivityIndicator color="#059669" size="large" />
      </View>
    );
  }

  // Si no ha iniciado sesión, pantalla de bienvenida informativa
  if (!user || !currentMembership) {
    return (
      <ScrollView className="flex-1 bg-slate-50">
        <View className="bg-emerald-600 px-6 pt-10 pb-12 rounded-b-[36px] shadow-sm items-center">
          <View className="w-16 h-16 rounded-2xl bg-white/20 items-center justify-center mb-4">
            <ShieldCheck color="#ffffff" size={36} />
          </View>
          <Text className="text-white text-2xl font-black text-center tracking-tight">
            ConectaJAC Veredal
          </Text>
          <Text className="text-emerald-100 text-xs text-center mt-1 uppercase tracking-widest font-semibold">
            Plataforma Comunal Ley 2166 de 2021
          </Text>
        </View>

        <View className="p-6 -mt-6">
          <View className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 items-center text-center">
            <Text className="text-slate-900 font-bold text-lg text-center mb-2">
              Bienvenido a tu Espacio Comunal
            </Text>
            <Text className="text-slate-500 text-sm text-center leading-relaxed mb-6">
              Accede a tu carnet digital de afiliado, descarga certificados con código QR verificable y participa en las decisiones de tu vereda.
            </Text>

            <TouchableOpacity
              onPress={() => router.push("/(auth)/login")}
              className="w-full bg-emerald-600 active:bg-emerald-700 py-3.5 rounded-2xl flex-row items-center justify-center space-x-2 shadow-sm mb-3"
            >
              <LogIn color="#ffffff" size={20} />
              <Text className="text-white font-bold text-base ml-2">Iniciar Sesión</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push("/(auth)/register")}
              className="w-full bg-slate-100 active:bg-slate-200 py-3.5 rounded-2xl flex-row items-center justify-center space-x-2"
            >
              <Text className="text-slate-700 font-bold text-base">Afiliarme a mi JAC</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-slate-50"
      refreshControl={<RefreshControl refreshing={loadingPosts} onRefresh={refetch} />}
    >
      {/* Vereda Header */}
      <View className="bg-emerald-600 px-6 pt-5 pb-9 rounded-b-[32px] shadow-sm">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-emerald-100 text-xs font-semibold uppercase tracking-wider">
              {currentMembership.jac?.municipality?.name || "Municipio"}
            </Text>
            <Text className="text-white text-xl font-black mt-0.5 tracking-tight">
              {currentMembership.jac?.name || "Mi Junta de Acción Comunal"}
            </Text>
            <Text className="text-emerald-50 text-xs mt-0.5">
              PJ: {currentMembership.jac?.legalPersonhoodNumber || "Registrada"} • Vereda {currentMembership.veredaOrBarrio}
            </Text>
          </View>
        </View>
      </View>

      <View className="px-5 -mt-6 space-y-4">
        {/* Affiliation Status Card */}
        <TouchableOpacity
          onPress={() => router.push("/(tabs)/carnet")}
          className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200/80 flex-row items-center justify-between"
        >
          <View className="flex-row items-center space-x-3">
            <View className="w-12 h-12 rounded-xl bg-emerald-100 items-center justify-center mr-3">
              <QrCode color="#059669" size={24} />
            </View>
            <View>
              <Text className="text-xs text-slate-400">Afiliado(a)</Text>
              <Text className="text-slate-900 font-bold text-sm">
                {user.firstName} {user.lastName}
              </Text>
              <Text className="text-emerald-700 text-xs font-semibold">
                Folio #{currentMembership.folioNumber} • Libro {currentMembership.bookNumber || 1}
              </Text>
            </View>
          </View>
          <View className="items-end">
            <View className="bg-emerald-100 px-2.5 py-1 rounded-full mb-1">
              <Text className="text-emerald-800 text-[11px] font-bold">Activo</Text>
            </View>
            <ChevronRight color="#94a3b8" size={16} />
          </View>
        </TouchableOpacity>

        {/* Quick Actions Grid */}
        <Text className="text-slate-900 font-bold text-base mt-2">Trámites y Servicios</Text>
        <View className="flex-row flex-wrap justify-between gap-y-3">
          {/* Certificados */}
          <TouchableOpacity
            onPress={() => router.push("/certificates")}
            className="w-[48%] bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm"
          >
            <View className="w-10 h-10 rounded-xl bg-emerald-50 items-center justify-center mb-2">
              <FileCheck2 color="#059669" size={22} />
            </View>
            <Text className="font-bold text-slate-900 text-sm">Certificados QR</Text>
            <Text className="text-xs text-slate-400 mt-0.5">Residencia y Paz y Salvo</Text>
          </TouchableOpacity>

          {/* Mercado Campesino */}
          <TouchableOpacity
            onPress={() => router.push("/(tabs)/marketplace")}
            className="w-[48%] bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm"
          >
            <View className="w-10 h-10 rounded-xl bg-amber-50 items-center justify-center mb-2">
              <ShoppingBag color="#d97706" size={22} />
            </View>
            <Text className="font-bold text-slate-900 text-sm">Mercado Campesino</Text>
            <Text className="text-xs text-slate-400 mt-0.5">Cosechas de vecinos</Text>
          </TouchableOpacity>

          {/* Mingas Veredales */}
          <TouchableOpacity
            onPress={() => router.push("/(tabs)/comunidad")}
            className="w-[48%] bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm"
          >
            <View className="w-10 h-10 rounded-xl bg-blue-50 items-center justify-center mb-2">
              <Shovel color="#2563eb" size={22} />
            </View>
            <Text className="font-bold text-slate-900 text-sm">Mingas y Votos</Text>
            <Text className="text-xs text-slate-400 mt-0.5">Trabajo y Asambleas</Text>
          </TouchableOpacity>

          {/* Pagos Comunales */}
          <TouchableOpacity
            onPress={() => router.push("/(tabs)/payments")}
            className="w-[48%] bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm"
          >
            <View className="w-10 h-10 rounded-xl bg-purple-50 items-center justify-center mb-2">
              <ShieldCheck color="#7c3aed" size={22} />
            </View>
            <Text className="font-bold text-slate-900 text-sm">Cuotas Comunales</Text>
            <Text className="text-xs text-slate-400 mt-0.5">Recaudo PSE / Nequi</Text>
          </TouchableOpacity>
        </View>

        {/* Community Board / Posts */}
        <View className="mt-4 mb-8">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-slate-900 font-bold text-base">Cartelera Veredal</Text>
            <Bell color="#64748b" size={18} />
          </View>

          {loadingPosts ? (
            <ActivityIndicator color="#059669" className="py-4" />
          ) : posts.length === 0 ? (
            <View className="bg-white p-6 rounded-2xl border border-slate-200/80 items-center">
              <Text className="text-xs text-slate-400 text-center">
                No hay comunicados ni avisos oficiales vigentes.
              </Text>
            </View>
          ) : (
            posts.map((post) => (
              <View
                key={post.id}
                className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm mb-3"
              >
                {post.priority === "URGENT" && (
                  <View className="flex-row items-center space-x-1.5 bg-rose-50 px-2 py-1 rounded-md self-start mb-2">
                    <AlertTriangle color="#e11d48" size={14} />
                    <Text className="text-rose-700 text-[11px] font-bold ml-1 uppercase">
                      Alerta Urgente
                    </Text>
                  </View>
                )}
                <Text className="text-sm font-bold text-slate-900 mb-1">{post.title}</Text>
                <Text className="text-xs text-slate-600 leading-relaxed mb-2">
                  {post.content}
                </Text>
                <Text className="text-[10px] text-slate-400">
                  Publicado por {post.author?.name || "Directiva JAC"}
                </Text>
              </View>
            ))
          )}
        </View>
      </View>
    </ScrollView>
  );
}
