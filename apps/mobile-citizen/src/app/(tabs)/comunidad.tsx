import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { apiClient } from "../../lib/api-client";
import { useAuthStore } from "../../lib/auth-store";
import { PqrsdType } from "@conectajac/shared";
import {
  Shovel,
  Vote,
  Inbox,
  Calendar,
  MapPin,
  CheckCircle2,
  Users,
  ChevronRight,
  Clock,
  Plus,
  X,
  Send,
  ShieldCheck,
} from "lucide-react-native";

export default function ComunidadScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { currentMembership } = useAuthStore();
  const [activeTab, setActiveTab] = useState<"MINGAS" | "ASSEMBLIES" | "PQRSD">("MINGAS");

  // PQRSD Modal State
  const [isPqrsdModalOpen, setIsPqrsdModalOpen] = useState(false);
  const [newPqrsd, setNewPqrsd] = useState({
    type: PqrsdType.PETITION,
    subject: "",
    description: "",
    isAnonymous: false,
  });

  // Mingas query
  const { data: mingasData, isLoading: loadingMingas, refetch: refetchMingas } = useQuery<{
    data: any[];
  }>({
    queryKey: ["mingas-list", currentMembership?.jacId],
    queryFn: () => apiClient.get("/mingas"),
    enabled: !!currentMembership?.jacId && activeTab === "MINGAS",
  });

  // Assemblies query
  const { data: assembliesData, isLoading: loadingAssemblies, refetch: refetchAssemblies } = useQuery<{
    data: any[];
  }>({
    queryKey: ["assemblies-list", currentMembership?.jacId],
    queryFn: () => apiClient.get("/assemblies"),
    enabled: !!currentMembership?.jacId && activeTab === "ASSEMBLIES",
  });

  // PQRSD query
  const { data: pqrsdData, isLoading: loadingPqrsd, refetch: refetchPqrsd } = useQuery<{
    data: any[];
  }>({
    queryKey: ["pqrsd-citizen", currentMembership?.jacId],
    queryFn: () => apiClient.get("/pqrsd/my-tickets"),
    enabled: !!currentMembership?.jacId && activeTab === "PQRSD",
  });

  // Attendance confirmation mutation
  const confirmMingaMutation = useMutation({
    mutationFn: (mingaId: string) =>
      apiClient.post(`/mingas/${mingaId}/confirm-attendance`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mingas-list"] });
      Alert.alert(
        "¡Participación Confirmada!",
        "Tu asistencia a la minga comunitaria ha sido pre-registrada. Recuerda llevar tus herramientas de trabajo."
      );
    },
    onError: (err: any) => {
      Alert.alert("Error", err.message || "No se pudo confirmar la asistencia.");
    },
  });

  // Create PQRSD mutation
  const createPqrsdMutation = useMutation({
    mutationFn: (payload: typeof newPqrsd) =>
      apiClient.post<any>("/pqrsd", {
        ...payload,
        jacId: currentMembership?.jacId,
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["pqrsd-citizen"] });
      setIsPqrsdModalOpen(false);
      setNewPqrsd({
        type: PqrsdType.PETITION,
        subject: "",
        description: "",
        isAnonymous: false,
      });
      Alert.alert(
        "¡Radicado Oficial Creado!",
        `Tu solicitud ha sido registrada con el número ${res.ticketNumber}. La Mesa Directiva emitirá respuesta conforme a los términos legales.`
      );
    },
    onError: (err: any) => {
      Alert.alert("Error al radicar", err.message || "No fue posible registrar la solicitud.");
    },
  });

  const handlePqrsdSubmit = () => {
    if (!newPqrsd.subject.trim() || !newPqrsd.description.trim()) {
      Alert.alert("Campos requeridos", "Por favor completa el asunto y la descripción detallada.");
      return;
    }
    createPqrsdMutation.mutate(newPqrsd);
  };

  const mingas = mingasData?.data || [];
  const assemblies = assembliesData?.data || [];
  const tickets = pqrsdData?.data || [];

  const pqrsdTypeLabels: Record<string, string> = {
    PETITION: "Petición",
    COMPLAINT: "Queja",
    CLAIM: "Reclamo",
    SUGGESTION: "Sugerencia",
    REPORT: "Denuncia Comunal",
  };

  return (
    <View className="flex-1 bg-slate-50">
      {/* Top Segmented Control */}
      <View className="bg-white p-2 border-b border-slate-200 flex-row">
        <TouchableOpacity
          onPress={() => setActiveTab("MINGAS")}
          className={`flex-1 py-2.5 rounded-xl items-center flex-row justify-center space-x-1.5 ${
            activeTab === "MINGAS" ? "bg-emerald-600" : "bg-transparent"
          }`}
        >
          <Shovel color={activeTab === "MINGAS" ? "#ffffff" : "#64748b"} size={16} />
          <Text
            className={`text-xs font-bold ml-1 ${
              activeTab === "MINGAS" ? "text-white" : "text-slate-600"
            }`}
          >
            Mingas
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab("ASSEMBLIES")}
          className={`flex-1 py-2.5 rounded-xl items-center flex-row justify-center space-x-1.5 ml-1 ${
            activeTab === "ASSEMBLIES" ? "bg-emerald-600" : "bg-transparent"
          }`}
        >
          <Vote color={activeTab === "ASSEMBLIES" ? "#ffffff" : "#64748b"} size={16} />
          <Text
            className={`text-xs font-bold ml-1 ${
              activeTab === "ASSEMBLIES" ? "text-white" : "text-slate-600"
            }`}
          >
            Asambleas
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab("PQRSD")}
          className={`flex-1 py-2.5 rounded-xl items-center flex-row justify-center space-x-1.5 ml-1 ${
            activeTab === "PQRSD" ? "bg-emerald-600" : "bg-transparent"
          }`}
        >
          <Inbox color={activeTab === "PQRSD" ? "#ffffff" : "#64748b"} size={16} />
          <Text
            className={`text-xs font-bold ml-1 ${
              activeTab === "PQRSD" ? "text-white" : "text-slate-600"
            }`}
          >
            PQRSD
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        className="flex-1 px-4 py-4"
        refreshControl={
          <RefreshControl
            refreshing={loadingMingas || loadingAssemblies || loadingPqrsd}
            onRefresh={() => {
              if (activeTab === "MINGAS") refetchMingas();
              else if (activeTab === "ASSEMBLIES") refetchAssemblies();
              else refetchPqrsd();
            }}
          />
        }
      >
        {activeTab === "MINGAS" && (
          <View className="space-y-3 pb-20">
            <Text className="text-slate-900 font-bold text-base mb-1">
              Convocatorias de Trabajo Comunitario
            </Text>
            <Text className="text-slate-500 text-xs mb-3">
              Conforme a los estatutos veredales, la asistencia a las mingas es solidaria.
            </Text>

            {loadingMingas ? (
              <ActivityIndicator color="#059669" className="py-8" />
            ) : mingas.length === 0 ? (
              <View className="bg-white rounded-2xl p-6 border border-slate-200/80 items-center">
                <Shovel color="#059669" size={32} />
                <Text className="text-slate-800 font-bold text-sm mt-2">
                  No hay mingas programadas
                </Text>
                <Text className="text-slate-400 text-xs text-center mt-1">
                  Cuando la Junta convoque a mantenimiento de vías o acueducto aparecerá aquí.
                </Text>
              </View>
            ) : (
              mingas.map((minga) => (
                <View
                  key={minga.id}
                  className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm mb-3"
                >
                  <View className="flex-row justify-between items-start mb-2">
                    <View className="flex-1 mr-2">
                      <Text className="text-base font-bold text-slate-900">{minga.title}</Text>
                      <View className="flex-row items-center space-x-1.5 mt-1">
                        <MapPin color="#64748b" size={14} />
                        <Text className="text-xs text-slate-600 ml-1">{minga.location}</Text>
                      </View>
                    </View>
                    <View className="bg-emerald-50 px-2.5 py-1 rounded-full">
                      <Text className="text-emerald-700 font-bold text-[11px]">
                        {minga.status || "PROGRAMADA"}
                      </Text>
                    </View>
                  </View>

                  <Text className="text-xs text-slate-500 leading-relaxed mb-3">
                    {minga.description}
                  </Text>

                  {minga.toolsRequired && (
                    <View className="bg-amber-50 rounded-xl p-2.5 mb-3">
                      <Text className="text-[11px] font-bold text-amber-900 uppercase">
                        Herramientas requeridas:
                      </Text>
                      <Text className="text-xs text-amber-800 mt-0.5">
                        {minga.toolsRequired}
                      </Text>
                    </View>
                  )}

                  <TouchableOpacity
                    onPress={() => confirmMingaMutation.mutate(minga.id)}
                    disabled={confirmMingaMutation.isPending}
                    className="bg-emerald-600 active:bg-emerald-700 py-2.5 rounded-xl flex-row items-center justify-center space-x-2"
                  >
                    <CheckCircle2 color="#ffffff" size={16} />
                    <Text className="text-white font-bold text-xs ml-1.5">
                      Confirmar Asistencia
                    </Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        )}

        {activeTab === "ASSEMBLIES" && (
          <View className="space-y-3 pb-20">
            <Text className="text-slate-900 font-bold text-base mb-1">
              Asambleas Generales de Afiliados
            </Text>
            <Text className="text-slate-500 text-xs mb-3">
              Máximo órgano de decisión comunal según la Ley 2166. Votaciones secretas encriptadas.
            </Text>

            {loadingAssemblies ? (
              <ActivityIndicator color="#059669" className="py-8" />
            ) : assemblies.length === 0 ? (
              <View className="bg-white rounded-2xl p-6 border border-slate-200/80 items-center">
                <Vote color="#059669" size={32} />
                <Text className="text-slate-800 font-bold text-sm mt-2">
                  No hay asambleas convocadas
                </Text>
                <Text className="text-slate-400 text-xs text-center mt-1">
                  Las citaciones formales a asamblea ordinaria o extraordinaria se notificarán por aquí.
                </Text>
              </View>
            ) : (
              assemblies.map((assembly) => (
                <TouchableOpacity
                  key={assembly.id}
                  onPress={() => router.push(`/assemblies/${assembly.id}`)}
                  className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm mb-3 flex-row justify-between items-center"
                >
                  <View className="flex-1 mr-3">
                    <View className="flex-row items-center space-x-2 mb-1">
                      <Text className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md">
                        {assembly.type || "ORDINARIA"}
                      </Text>
                      <Text className="text-slate-400 text-xs">
                        {new Date(assembly.scheduledDate || assembly.scheduledAt).toLocaleDateString("es-CO")}
                      </Text>
                    </View>
                    <Text className="text-sm font-bold text-slate-900">{assembly.title}</Text>
                    <Text className="text-xs text-slate-500 mt-0.5" numberOfLines={2}>
                      {assembly.description || assembly.agenda}
                    </Text>
                  </View>
                  <ChevronRight color="#94a3b8" size={18} />
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {activeTab === "PQRSD" && (
          <View className="space-y-3 pb-24">
            <Text className="text-slate-900 font-bold text-base mb-1">
              Buzón Ciudadano PQRSD
            </Text>
            <Text className="text-slate-500 text-xs mb-3">
              Radica peticiones, quejas, reclamos o denuncias ante la Mesa Directiva de tu JAC.
            </Text>

            {loadingPqrsd ? (
              <ActivityIndicator color="#059669" className="py-8" />
            ) : tickets.length === 0 ? (
              <View className="bg-white rounded-2xl p-6 border border-slate-200/80 items-center">
                <Inbox color="#059669" size={32} />
                <Text className="text-slate-800 font-bold text-sm mt-2">
                  No tienes radicados registrados
                </Text>
                <Text className="text-slate-400 text-xs text-center mt-1">
                  Puedes radicar solicitudes directamente para que la directiva las tramite formalmente.
                </Text>
              </View>
            ) : (
              tickets.map((t) => (
                <View
                  key={t.id}
                  className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm mb-3"
                >
                  <View className="flex-row justify-between items-center mb-1">
                    <Text className="font-mono text-xs font-bold text-emerald-700">
                      {t.ticketNumber || t.radicadoNumber}
                    </Text>
                    <View className="bg-slate-100 px-2 py-0.5 rounded-md">
                      <Text className="text-[10px] font-bold text-slate-700">
                        {t.status}
                      </Text>
                    </View>
                  </View>
                  <Text className="text-sm font-bold text-slate-900">{t.subject}</Text>
                  <Text className="text-xs text-slate-600 mt-1">{t.description}</Text>
                  {t.responseText && (
                    <View className="mt-2.5 p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                      <Text className="text-[11px] font-bold text-emerald-950 uppercase tracking-wider">
                        Respuesta Oficial de la JAC:
                      </Text>
                      <Text className="text-xs text-emerald-800 mt-0.5 leading-relaxed">
                        {t.responseText}
                      </Text>
                    </View>
                  )}
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* Floating CTA button for PQRSD */}
      {activeTab === "PQRSD" && (
        <TouchableOpacity
          onPress={() => setIsPqrsdModalOpen(true)}
          className="absolute bottom-6 right-6 bg-emerald-600 active:bg-emerald-700 rounded-full px-5 py-3.5 flex-row items-center shadow-lg shadow-emerald-600/40"
        >
          <Plus color="#ffffff" size={20} />
          <Text className="text-white font-bold text-sm ml-2">Radicar PQRSD</Text>
        </TouchableOpacity>
      )}

      {/* Modal: Create PQRSD */}
      <Modal visible={isPqrsdModalOpen} animationType="slide" transparent>
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-white rounded-t-3xl p-6 space-y-4 max-h-[90%]">
            <View className="flex-row justify-between items-center pb-2 border-b border-slate-100">
              <View>
                <Text className="text-lg font-bold text-slate-900">
                  Radicar Solicitud Comunal
                </Text>
                <Text className="text-xs text-slate-400">
                  Ley 2166 • Trámite directo ante la Mesa Directiva
                </Text>
              </View>
              <TouchableOpacity onPress={() => setIsPqrsdModalOpen(false)}>
                <X color="#64748b" size={22} />
              </TouchableOpacity>
            </View>

            <ScrollView className="space-y-3">
              {/* Type selection */}
              <View>
                <Text className="text-xs font-semibold text-slate-700 mb-1">
                  Tipo de Solicitud *
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row py-1">
                  {[
                    { type: PqrsdType.PETITION, label: "Petición" },
                    { type: PqrsdType.COMPLAINT, label: "Queja" },
                    { type: PqrsdType.CLAIM, label: "Reclamo" },
                    { type: PqrsdType.SUGGESTION, label: "Sugerencia" },
                    { type: PqrsdType.REPORT, label: "Denuncia" },
                  ].map((item) => {
                    const isSelected = newPqrsd.type === item.type;
                    return (
                      <TouchableOpacity
                        key={item.type}
                        onPress={() => setNewPqrsd({ ...newPqrsd, type: item.type })}
                        className={`mr-2 px-3.5 py-1.5 rounded-full border ${
                          isSelected
                            ? "bg-emerald-600 border-emerald-600"
                            : "bg-slate-50 border-slate-200"
                        }`}
                      >
                        <Text
                          className={`text-xs font-bold ${
                            isSelected ? "text-white" : "text-slate-700"
                          }`}
                        >
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Subject */}
              <View className="mt-2">
                <Text className="text-xs font-semibold text-slate-700 mb-1">
                  Asunto de la Solicitud *
                </Text>
                <TextInput
                  value={newPqrsd.subject}
                  onChangeText={(val) => setNewPqrsd({ ...newPqrsd, subject: val })}
                  placeholder="Ej. Arreglo de luminaria frente a la escuela"
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900"
                />
              </View>

              {/* Description */}
              <View className="mt-2">
                <Text className="text-xs font-semibold text-slate-700 mb-1">
                  Descripción Detallada *
                </Text>
                <TextInput
                  multiline
                  numberOfLines={4}
                  value={newPqrsd.description}
                  onChangeText={(val) => setNewPqrsd({ ...newPqrsd, description: val })}
                  placeholder="Explique claramente los hechos, lugar y solicitud concreta a la Junta..."
                  className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-900 h-24"
                  textAlignVertical="top"
                />
              </View>

              {/* Anonymous option */}
              <TouchableOpacity
                onPress={() => setNewPqrsd({ ...newPqrsd, isAnonymous: !newPqrsd.isAnonymous })}
                className="flex-row items-center space-x-2 p-3 bg-slate-50 rounded-xl border border-slate-200 mt-2"
              >
                <View
                  className={`w-5 h-5 rounded-md border items-center justify-center ${
                    newPqrsd.isAnonymous
                      ? "bg-emerald-600 border-emerald-600"
                      : "border-slate-300 bg-white"
                  }`}
                >
                  {newPqrsd.isAnonymous && <CheckCircle2 color="#ffffff" size={14} />}
                </View>
                <Text className="text-xs text-slate-700 ml-2 font-medium">
                  Radicar de forma anónima (no revelará mi nombre en el radicado)
                </Text>
              </TouchableOpacity>

              {/* Submit Button */}
              <TouchableOpacity
                onPress={handlePqrsdSubmit}
                disabled={createPqrsdMutation.isPending}
                className="bg-emerald-600 active:bg-emerald-700 py-3.5 rounded-2xl flex-row items-center justify-center space-x-2 mt-4 shadow-sm"
              >
                {createPqrsdMutation.isPending ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <>
                    <Send color="#ffffff" size={18} />
                    <Text className="text-white font-bold text-base ml-2">
                      Enviar y Generar Radicado Oficial
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
