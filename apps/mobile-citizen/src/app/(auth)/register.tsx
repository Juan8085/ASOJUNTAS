import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../lib/api-client";
import { useAuthStore } from "../../lib/auth-store";
import { IdentificationType } from "@conectajac/shared";
import { CheckCircle2, Building, ShieldCheck } from "lucide-react-native";

interface JacItem {
  id: string;
  name: string;
  legalPersonhoodNumber: string;
  veredaOrBarrio: string;
  municipality?: {
    name: string;
  };
}

export default function RegisterScreen() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);

  const [formData, setFormData] = useState({
    jacId: "",
    identificationType: IdentificationType.CC,
    identificationNumber: "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    veredaOrBarrio: "",
    password: "",
  });

  const [isLoading, setIsLoading] = useState(false);

  // Consultar JACs disponibles para afiliarse
  const { data: jacsResponse, isLoading: loadingJacs } = useQuery<{
    data: JacItem[];
  }>({
    queryKey: ["available-jacs"],
    queryFn: () => apiClient.get("/jacs?isActive=true"),
  });

  const jacs = jacsResponse?.data || [];

  const handleRegister = async () => {
    if (!formData.jacId) {
      Alert.alert("Selecciona tu JAC", "Debes seleccionar la Junta de Acción Comunal de tu vereda o barrio.");
      return;
    }
    if (
      !formData.identificationNumber.trim() ||
      !formData.firstName.trim() ||
      !formData.lastName.trim() ||
      !formData.phone.trim() ||
      !formData.password.trim()
    ) {
      Alert.alert("Campos requeridos", "Por favor completa todos los campos obligatorios.");
      return;
    }

    try {
      setIsLoading(true);
      const res = await apiClient.post<any>("/auth/register-citizen", {
        ...formData,
        email: formData.email.trim() || undefined,
      });

      Alert.alert(
        "¡Solicitud de Afiliación Registrada!",
        `Has sido registrado satisfactoriamente en el libro de afiliados. Folio asignado: #${res.folioNumber || 1}.`,
        [
          {
            text: "Continuar al Portal",
            onPress: async () => {
              if (res.tokens?.accessToken) {
                await setAuth(res.user, res.memberships || [], res.tokens);
                router.replace("/(tabs)");
              } else {
                router.replace("/(auth)/login");
              }
            },
          },
        ]
      );
    } catch (err: any) {
      Alert.alert(
        "Error en la afiliación",
        err.message || "No fue posible registrar la afiliación. Revisa los datos ingresados."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-slate-50" contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
      {/* Informative Alert */}
      <View className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 mb-6 flex-row items-start space-x-3">
        <ShieldCheck color="#059669" size={24} />
        <View className="flex-1 ml-2">
          <Text className="text-emerald-900 font-bold text-sm">
            Afiliación Comunal Legal (Ley 2166 de 2021)
          </Text>
          <Text className="text-emerald-700 text-xs mt-0.5 leading-relaxed">
            Tu registro se asentará directamente en el Libro Digital de Afiliados con número consecutivo de folio legal.
          </Text>
        </View>
      </View>

      {/* Form Card */}
      <View className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-4">
        {/* JAC Selector */}
        <View>
          <Text className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            1. Selecciona tu JAC Veredal / Barrial *
          </Text>
          {loadingJacs ? (
            <ActivityIndicator color="#059669" className="py-2" />
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row py-1">
              {jacs.map((jac) => {
                const isSelected = formData.jacId === jac.id;
                return (
                  <TouchableOpacity
                    key={jac.id}
                    onPress={() =>
                      setFormData({
                        ...formData,
                        jacId: jac.id,
                        veredaOrBarrio: jac.veredaOrBarrio,
                      })
                    }
                    className={`mr-3 p-3 rounded-2xl border ${
                      isSelected
                        ? "bg-emerald-50 border-emerald-500"
                        : "bg-slate-50 border-slate-200"
                    } min-w-[200px]`}
                  >
                    <View className="flex-row items-center justify-between mb-1">
                      <Building color={isSelected ? "#059669" : "#64748b"} size={18} />
                      {isSelected && <CheckCircle2 color="#059669" size={16} />}
                    </View>
                    <Text
                      numberOfLines={1}
                      className={`font-bold text-xs ${
                        isSelected ? "text-emerald-900" : "text-slate-800"
                      }`}
                    >
                      {jac.name}
                    </Text>
                    <Text className="text-[11px] text-slate-500 mt-0.5">
                      {jac.municipality?.name} • PJ: {jac.legalPersonhoodNumber}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* Identification */}
        <View className="mt-4">
          <Text className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            2. Tipo y Número de Documento *
          </Text>
          <View className="flex-row space-x-2">
            <View className="w-24">
              <TextInput
                value={formData.identificationType}
                editable={false}
                className="bg-slate-100 border border-slate-200 rounded-xl px-3 py-2.5 text-center font-bold text-slate-700 text-sm"
              />
            </View>
            <View className="flex-1 ml-2">
              <TextInput
                value={formData.identificationNumber}
                onChangeText={(val) => setFormData({ ...formData, identificationNumber: val })}
                placeholder="Número de cédula"
                keyboardType="numeric"
                className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 text-sm"
              />
            </View>
          </View>
        </View>

        {/* Name & Lastname */}
        <View className="mt-4 flex-row space-x-2">
          <View className="flex-1">
            <Text className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Nombres *
            </Text>
            <TextInput
              value={formData.firstName}
              onChangeText={(val) => setFormData({ ...formData, firstName: val })}
              placeholder="Ej. Pedro José"
              className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 text-sm"
            />
          </View>
          <View className="flex-1 ml-2">
            <Text className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Apellidos *
            </Text>
            <TextInput
              value={formData.lastName}
              onChangeText={(val) => setFormData({ ...formData, lastName: val })}
              placeholder="Ej. Gómez Silva"
              className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 text-sm"
            />
          </View>
        </View>

        {/* Contact Info */}
        <View className="mt-4">
          <Text className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Teléfono Móvil (WhatsApp) *
          </Text>
          <TextInput
            value={formData.phone}
            onChangeText={(val) => setFormData({ ...formData, phone: val })}
            placeholder="Ej. 3101234567"
            keyboardType="phone-pad"
            className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 text-sm"
          />
        </View>

        <View className="mt-4">
          <Text className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Correo Electrónico (Opcional)
          </Text>
          <TextInput
            value={formData.email}
            onChangeText={(val) => setFormData({ ...formData, email: val })}
            placeholder="correo@ejemplo.com"
            keyboardType="email-address"
            autoCapitalize="none"
            className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 text-sm"
          />
        </View>

        {/* Location Info */}
        <View className="mt-4">
          <Text className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Finca, Parcela o Dirección de Residencia *
          </Text>
          <TextInput
            value={formData.address}
            onChangeText={(val) => setFormData({ ...formData, address: val })}
            placeholder="Ej. Finca La Esperanza, Sector El Mirador"
            className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 text-sm"
          />
        </View>

        {/* Password */}
        <View className="mt-4">
          <Text className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Crea tu Contraseña de Acceso *
          </Text>
          <TextInput
            value={formData.password}
            onChangeText={(val) => setFormData({ ...formData, password: val })}
            placeholder="Mínimo 6 caracteres"
            secureTextEntry
            className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 text-sm"
          />
        </View>

        {/* Submit */}
        <TouchableOpacity
          onPress={handleRegister}
          disabled={isLoading}
          className="bg-emerald-600 active:bg-emerald-700 rounded-2xl py-3.5 mt-6 flex-row items-center justify-center space-x-2 shadow-sm"
        >
          {isLoading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <CheckCircle2 color="#ffffff" size={20} />
              <Text className="text-white font-bold text-base ml-2">Radicar Solicitud de Afiliación</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
