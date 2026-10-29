import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../lib/api-client";
import { useAuthStore } from "../../lib/auth-store";
import {
  Vote,
  Calendar,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Lock,
  AlertCircle,
} from "lucide-react-native";

interface MotionItem {
  id: string;
  title: string;
  description: string;
  status: "DRAFT" | "OPEN_FOR_VOTING" | "CLOSED";
  results?: {
    inFavor: number;
    against: number;
    blank: number;
    totalVotes: number;
  };
}

interface AssemblyDetails {
  id: string;
  title: string;
  type: string;
  scheduledAt: string;
  secondCallAt?: string;
  agenda: string;
  status: string;
  quorumReached: boolean;
  motions: MotionItem[];
}

export default function AssemblyDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [selectedChoices, setSelectedChoices] = useState<Record<string, "IN_FAVOR" | "AGAINST" | "BLANK">>({});

  const { data: assembly, isLoading } = useQuery<AssemblyDetails>({
    queryKey: ["assembly-detail", id],
    queryFn: () => apiClient.get(`/assemblies/${id}`),
    enabled: !!id,
  });

  const voteMutation = useMutation({
    mutationFn: ({ motionId, choice }: { motionId: string; choice: "IN_FAVOR" | "AGAINST" | "BLANK" }) =>
      apiClient.post(`/assemblies/${id}/vote`, {
        motionId,
        choice,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assembly-detail", id] });
      Alert.alert(
        "¡Voto Criptográfico Asentado!",
        "Tu voto secreto fue cifrado con AES-256 e incorporado al acta oficial. No es posible asociar tu identidad al sentido de tu voto."
      );
    },
    onError: (err: any) => {
      Alert.alert(
        "Error al votar",
        err.message || "No fue posible registrar el voto o ya has ejercido el derecho para esta proposición."
      );
    },
  });

  const handleCastVote = (motionId: string) => {
    const choice = selectedChoices[motionId];
    if (!choice) {
      Alert.alert("Selecciona tu decisión", "Debes seleccionar A Favor, En Contra o En Blanco.");
      return;
    }

    voteMutation.mutate({ motionId, choice });
  };

  if (isLoading || !assembly) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <ActivityIndicator color="#059669" size="large" />
      </View>
    );
  }

  const isVoting = assembly.status === "VOTING" || assembly.status === "IN_SESSION";

  return (
    <ScrollView className="flex-1 bg-slate-50" contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
      {/* Header Info */}
      <View className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm mb-4">
        <View className="flex-row items-center justify-between mb-2">
          <View className="bg-emerald-50 px-2.5 py-1 rounded-full">
            <Text className="text-emerald-800 text-xs font-bold">
              ASAMBLEA {assembly.type}
            </Text>
          </View>
          <View className="bg-slate-100 px-2.5 py-1 rounded-full">
            <Text className="text-slate-700 text-xs font-bold">
              {assembly.status}
            </Text>
          </View>
        </View>

        <Text className="text-xl font-black text-slate-900 mt-1">{assembly.title}</Text>

        <View className="flex-row items-center space-x-3 mt-3 pt-3 border-t border-slate-100">
          <Calendar color="#64748b" size={16} />
          <Text className="text-xs text-slate-600 ml-1">
            {new Date(assembly.scheduledAt).toLocaleString("es-CO")}
          </Text>
        </View>

        <View className="mt-4 bg-slate-50 rounded-2xl p-4 border border-slate-200">
          <Text className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
            Orden del Día / Temario:
          </Text>
          <Text className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
            {assembly.agenda}
          </Text>
        </View>
      </View>

      {/* Secret Ballot Voting Motions */}
      <View className="flex-row items-center space-x-2 mb-3">
        <Lock color="#059669" size={18} />
        <Text className="text-slate-900 font-bold text-base ml-1">
          Proposiciones para Votación Secreta
        </Text>
      </View>

      {assembly.motions.length === 0 ? (
        <View className="bg-white rounded-2xl p-6 border border-slate-200/80 items-center">
          <Vote color="#94a3b8" size={32} />
          <Text className="text-slate-600 text-xs mt-2 text-center">
            No se han habilitado proposiciones de votación en esta sesión.
          </Text>
        </View>
      ) : (
        assembly.motions.map((motion) => {
          const currentChoice = selectedChoices[motion.id];
          return (
            <View
              key={motion.id}
              className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm mb-4"
            >
              <Text className="text-base font-bold text-slate-900 mb-1">{motion.title}</Text>
              <Text className="text-xs text-slate-500 mb-4">{motion.description}</Text>

              {/* Voting Options */}
              <View className="space-y-2 mb-4">
                {[
                  { id: "IN_FAVOR", label: "A Favor (Sí)", color: "text-emerald-700", border: "border-emerald-500", bg: "bg-emerald-50" },
                  { id: "AGAINST", label: "En Contra (No)", color: "text-rose-700", border: "border-rose-500", bg: "bg-rose-50" },
                  { id: "BLANK", label: "Voto en Blanco", color: "text-slate-700", border: "border-slate-400", bg: "bg-slate-100" },
                ].map((opt) => {
                  const isSelected = currentChoice === opt.id;
                  return (
                    <TouchableOpacity
                      key={opt.id}
                      onPress={() =>
                        setSelectedChoices({
                          ...selectedChoices,
                          [motion.id]: opt.id as any,
                        })
                      }
                      className={`p-3 rounded-xl border flex-row items-center justify-between ${
                        isSelected ? `${opt.border} ${opt.bg}` : "border-slate-200 bg-slate-50"
                      }`}
                    >
                      <Text className={`text-xs font-bold ${isSelected ? opt.color : "text-slate-700"}`}>
                        {opt.label}
                      </Text>
                      {isSelected && <CheckCircle2 color="#059669" size={16} />}
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TouchableOpacity
                onPress={() => handleCastVote(motion.id)}
                disabled={voteMutation.isPending}
                className="bg-emerald-600 active:bg-emerald-700 py-3 rounded-xl flex-row items-center justify-center space-x-1.5 shadow-sm"
              >
                {voteMutation.isPending ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <>
                    <Vote color="#ffffff" size={18} />
                    <Text className="text-white font-bold text-xs ml-1.5">
                      Depositar Voto Secreto Encriptado
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

