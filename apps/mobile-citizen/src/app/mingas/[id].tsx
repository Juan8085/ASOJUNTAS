import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../lib/api-client";
import {
  Shovel,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  Users,
  AlertCircle,
} from "lucide-react-native";

interface MingaDetail {
  id: string;
  title: string;
  description: string;
  location: string;
  meetingTime: string;
  toolsRequired?: string;
  status: string;
  penaltyFeeAmount?: number;
  attendeesCount?: number;
  myAttendanceConfirmed?: boolean;
}

export default function MingaDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();

  const { data: minga, isLoading } = useQuery<MingaDetail>({
    queryKey: ["minga-detail", id],
    queryFn: () => apiClient.get(`/mingas/${id}`),
    enabled: !!id,
  });

  const confirmMutation = useMutation({
    mutationFn: () => apiClient.post(`/mingas/${id}/confirm-attendance`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["minga-detail", id] });
      Alert.alert(
        "¡Participación Confirmada!",
        "Tu asistencia ha sido confirmada en la planilla veredal de la minga."
      );
    },
    onError: (err: any) => {
      Alert.alert("Error", err.message || "No se pudo registrar la asistencia.");
    },
  });

  if (isLoading || !minga) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <ActivityIndicator color="#059669" size="large" />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-slate-50" contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
      <View className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm mb-4 space-y-4">
        <View className="flex-row items-center justify-between">
          <View className="bg-emerald-50 px-2.5 py-1 rounded-full">
            <Text className="text-emerald-800 text-xs font-bold">
              {minga.status || "PROGRAMADA"}
            </Text>
          </View>
          <View className="flex-row items-center space-x-1">
            <Users color="#64748b" size={14} />
            <Text className="text-xs text-slate-500 ml-1">
              {minga.attendeesCount || 0} confirmados
            </Text>
          </View>
        </View>

        <Text className="text-xl font-black text-slate-900">{minga.title}</Text>

        <View className="space-y-2 pt-2 border-t border-slate-100">
          <View className="flex-row items-center space-x-2">
            <MapPin color="#059669" size={18} />
            <Text className="text-sm font-semibold text-slate-800 ml-1">
              Punto de Encuentro: {minga.location}
            </Text>
          </View>

          <View className="flex-row items-center space-x-2">
            <Calendar color="#059669" size={18} />
            <Text className="text-xs text-slate-600 ml-1">
              {new Date(minga.meetingTime).toLocaleString("es-CO")}
            </Text>
          </View>
        </View>

        <View className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
          <Text className="text-xs font-bold text-slate-700 uppercase mb-1">
            Objetivo de la Jornada Comunal:
          </Text>
          <Text className="text-xs text-slate-600 leading-relaxed">
            {minga.description}
          </Text>
        </View>

        {minga.toolsRequired && (
          <View className="bg-amber-50 rounded-2xl p-4 border border-amber-200">
            <Text className="text-xs font-bold text-amber-900 uppercase mb-1">
              Herramientas y Elementos a Llevar:
            </Text>
            <Text className="text-xs text-amber-800 leading-relaxed">
              {minga.toolsRequired}
            </Text>
          </View>
        )}

        {minga.penaltyFeeAmount && minga.penaltyFeeAmount > 0 && (
          <View className="bg-rose-50 rounded-2xl p-4 border border-rose-200 flex-row items-start space-x-2">
            <AlertCircle color="#e11d48" size={18} />
            <View className="flex-1 ml-2">
              <Text className="text-xs font-bold text-rose-900 uppercase">
                Multa Reglamentaria por Inasistencia
              </Text>
              <Text className="text-xs text-rose-800 mt-0.5">
                La inasistencia injustificada generará un cobro automático de $
                {Number(minga.penaltyFeeAmount).toLocaleString("es-CO")} COP en la tesorería comunal según los estatutos aprobados por la Asamblea.
              </Text>
            </View>
          </View>
        )}

        <TouchableOpacity
          onPress={() => confirmMutation.mutate()}
          disabled={confirmMutation.isPending}
          className="bg-emerald-600 active:bg-emerald-700 py-3.5 rounded-2xl flex-row items-center justify-center space-x-2 mt-2 shadow-sm"
        >
          {confirmMutation.isPending ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <CheckCircle2 color="#ffffff" size={20} />
              <Text className="text-white font-bold text-base ml-2">
                Confirmar mi Participación
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
