import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuthStore } from "../../lib/auth-store";
import { apiClient } from "../../lib/api-client";
import { ShieldCheck, LogIn, UserPlus, KeyRound, Eye, EyeOff } from "lucide-react-native";

export default function LoginScreen() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!identifier.trim() || !password.trim()) {
      Alert.alert("Campos requeridos", "Por favor ingresa tu número de cédula y tu PIN de acceso.");
      return;
    }

    try {
      setIsLoading(true);
      const res = await apiClient.post<any>("/auth/login", {
        identifier: identifier.trim(),
        password: password.trim(),
      });

      if (!res.tokens?.accessToken) {
        throw new Error("Respuesta inválida del servidor");
      }

      await setAuth(res.user, res.memberships || [], res.tokens);
      router.replace("/(tabs)");
    } catch (err: any) {
      Alert.alert(
        "Error de autenticación",
        err.message || "Credenciales incorrectas. Verifica tu número de cédula y PIN de acceso (por defecto son los últimos 4 dígitos de tu documento)."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-slate-900"
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
        className="px-6 py-12"
      >
        {/* Brand header */}
        <View className="items-center mb-8">
          <View className="w-16 h-16 rounded-2xl bg-emerald-500 items-center justify-center mb-4 shadow-lg shadow-emerald-500/30">
            <ShieldCheck color="#ffffff" size={36} />
          </View>
          <Text className="text-3xl font-extrabold text-white tracking-tight">
            Conecta<Text className="text-emerald-400">JAC</Text>
          </Text>
          <Text className="text-emerald-200 text-xs mt-1 font-semibold uppercase tracking-widest">
            Portal Ciudadano Veredal
          </Text>
          <Text className="text-slate-400 text-sm text-center mt-2 px-4">
            Consulta tu carnet de afiliado Ley 2166, tramita certificados de residencia y participa en mingas.
          </Text>
        </View>

        {/* Card */}
        <View className="bg-slate-800/90 rounded-3xl p-6 border border-slate-700/80 shadow-2xl">
          <Text className="text-white text-lg font-bold mb-1">Iniciar Sesión</Text>
          <Text className="text-slate-400 text-xs mb-6">
            Ingresa con tu documento de identidad y tu PIN asignado por tu JAC.
          </Text>

          <View className="space-y-4">
            <View>
              <Text className="text-slate-300 text-xs font-semibold mb-1.5 uppercase tracking-wider">
                Cédula de Ciudadanía
              </Text>
              <TextInput
                value={identifier}
                onChangeText={setIdentifier}
                placeholder="Ej. 1098123456"
                placeholderTextColor="#64748b"
                keyboardType="numeric"
                className="bg-slate-900/90 border border-slate-700 rounded-xl px-4 py-3 text-white text-base"
              />
            </View>

            <View className="mt-4">
              <View className="flex-row items-center justify-between mb-1.5">
                <Text className="text-slate-300 text-xs font-semibold uppercase tracking-wider">
                  PIN de Acceso Móvil
                </Text>
                <Text className="text-emerald-400 text-[11px]">
                  (Últimos 4 dígitos de tu cédula)
                </Text>
              </View>
              <View className="flex-row items-center bg-slate-900/90 border border-slate-700 rounded-xl px-4 py-1">
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Ej. 3456"
                  placeholderTextColor="#64748b"
                  keyboardType="numeric"
                  secureTextEntry={!showPin}
                  className="flex-1 py-2 text-white text-base"
                />
                <TouchableOpacity
                  onPress={() => setShowPin(!showPin)}
                  className="p-2 ml-1"
                >
                  {showPin ? (
                    <EyeOff color="#94a3b8" size={20} />
                  ) : (
                    <Eye color="#94a3b8" size={20} />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              onPress={handleLogin}
              disabled={isLoading}
              className="bg-emerald-600 active:bg-emerald-700 rounded-xl py-3.5 mt-6 flex-row items-center justify-center space-x-2"
            >
              {isLoading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <>
                  <LogIn color="#ffffff" size={20} />
                  <Text className="text-white font-bold text-base ml-2">Ingresar a mi JAC</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Register CTA */}
        <View className="mt-8 items-center">
          <Text className="text-slate-400 text-sm">¿Aún no estás en el libro de afiliados?</Text>
          <TouchableOpacity
            onPress={() => router.push("/(auth)/register")}
            className="flex-row items-center mt-2 px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 active:bg-slate-700"
          >
            <UserPlus color="#10b981" size={18} />
            <Text className="text-emerald-400 font-bold text-sm ml-2">Radicar Afiliación Ciudadana</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

