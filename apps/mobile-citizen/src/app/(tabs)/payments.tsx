import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../lib/api-client";
import { useAuthStore } from "../../lib/auth-store";
import {
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Landmark,
  ShieldCheck,
  ExternalLink,
} from "lucide-react-native";

interface ObligationItem {
  id: string;
  amount: number;
  dueDate: string;
  status: "PENDING" | "PAID" | "OVERDUE" | "EXEMPT";
  periodName?: string;
  configuration: {
    name: string;
    type: string;
    amount: number;
  };
}

export default function PaymentsScreen() {
  const queryClient = useQueryClient();
  const { user, currentMembership } = useAuthStore();
  const [payingId, setPayingId] = useState<string | null>(null);

  const { data: obligationsData, isLoading, refetch } = useQuery<{
    data: ObligationItem[];
  }>({
    queryKey: ["my-obligations", currentMembership?.id],
    queryFn: () => apiClient.get("/treasury/my-obligations"),
    enabled: !!currentMembership?.id,
  });

  const obligations = obligationsData?.data || [];
  const pendingObligations = obligations.filter((o) => o.status === "PENDING" || o.status === "OVERDUE");
  const totalDebt = pendingObligations.reduce((sum, o) => sum + Number(o.amount), 0);

  // Wompi checkout mutation
  const checkoutMutation = useMutation({
    mutationFn: (obligationId: string) =>
      apiClient.post<{ checkoutUrl?: string; reference: string }>("/payments/initiate-wompi", {
        obligationId,
      }),
    onSuccess: (res) => {
      setPayingId(null);
      Alert.alert(
        "Pasarela Wompi / PSE Habilitada",
        `Se ha generado la referencia de pago #${res.reference}. Puedes pagar con Nequi, Daviplata o PSE.`
      );
      queryClient.invalidateQueries({ queryKey: ["my-obligations"] });
    },
    onError: (err: any) => {
      setPayingId(null);
      Alert.alert("Error de pago", err.message || "No fue posible conectar con la pasarela.");
    },
  });

  const handlePay = (obligation: ObligationItem) => {
    setPayingId(obligation.id);
    checkoutMutation.mutate(obligation.id);
  };

  return (
    <ScrollView
      className="flex-1 bg-slate-50"
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
      contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
    >
      {/* Treasury Status Banner */}
      <View
        className={`rounded-3xl p-6 border shadow-sm mb-6 ${
          totalDebt === 0
            ? "bg-emerald-600 border-emerald-500"
            : "bg-slate-900 border-slate-800"
        }`}
      >
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center space-x-2">
            <Landmark color={totalDebt === 0 ? "#ecfdf5" : "#38bdf8"} size={22} />
            <Text
              className={`text-xs font-bold uppercase tracking-wider ml-1.5 ${
                totalDebt === 0 ? "text-emerald-100" : "text-slate-400"
              }`}
            >
              Tesorería Comunal
            </Text>
          </View>
          <View
            className={`px-3 py-1 rounded-full ${
              totalDebt === 0 ? "bg-white/20" : "bg-rose-500/20 border border-rose-500/40"
            }`}
          >
            <Text
              className={`text-xs font-extrabold ${
                totalDebt === 0 ? "text-white" : "text-rose-300"
              }`}
            >
              {totalDebt === 0 ? "PAZ Y SALVO" : "SALDO PENDIENTE"}
            </Text>
          </View>
        </View>

        <Text
          className={`text-xs ${
            totalDebt === 0 ? "text-emerald-100" : "text-slate-400"
          }`}
        >
          Total a pagar a la JAC
        </Text>
        <Text className="text-white text-3xl font-black mt-1">
          ${totalDebt.toLocaleString("es-CO")} <Text className="text-base font-normal">COP</Text>
        </Text>

        {totalDebt === 0 ? (
          <View className="flex-row items-center mt-3 pt-3 border-t border-emerald-500/50">
            <CheckCircle2 color="#a7f3d0" size={16} />
            <Text className="text-emerald-50 text-xs ml-2 font-medium">
              Cumples los requisitos para solicitar Certificado de Residencia y Paz y Salvo.
            </Text>
          </View>
        ) : (
          <View className="flex-row items-center mt-3 pt-3 border-t border-slate-800">
            <AlertCircle color="#fb7185" size={16} />
            <Text className="text-rose-200 text-xs ml-2 font-medium">
              Tienes {pendingObligations.length} cuota(s) o multas pendientes de pago.
            </Text>
          </View>
        )}
      </View>

      {/* Pending Obligations */}
      <Text className="text-slate-900 font-bold text-base mb-3">
        Cuotas y Obligaciones Veredales
      </Text>

      {isLoading ? (
        <ActivityIndicator color="#059669" className="py-6" />
      ) : obligations.length === 0 ? (
        <View className="bg-white rounded-2xl p-6 border border-slate-200/80 items-center">
          <ShieldCheck color="#059669" size={32} />
          <Text className="text-slate-800 font-bold text-sm mt-2">
            No tienes cuotas registradas
          </Text>
          <Text className="text-slate-400 text-xs text-center mt-1">
            La tesorería de tu JAC aún no ha emitido cuotas periódicas para tu folio.
          </Text>
        </View>
      ) : (
        <View className="space-y-3">
          {obligations.map((item) => {
            const isPaid = item.status === "PAID";
            return (
              <View
                key={item.id}
                className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex-row justify-between items-center mb-3"
              >
                <View className="flex-1 mr-3">
                  <View className="flex-row items-center space-x-1.5 mb-1">
                    <Text
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${
                        isPaid
                          ? "bg-emerald-50 text-emerald-800"
                          : "bg-rose-50 text-rose-800"
                      }`}
                    >
                      {isPaid ? "Pagado" : "Pendiente"}
                    </Text>
                    {item.periodName && (
                      <Text className="text-slate-400 text-xs">• {item.periodName}</Text>
                    )}
                  </View>
                  <Text className="text-sm font-bold text-slate-900">
                    {item.configuration?.name || "Cuota Comunal"}
                  </Text>
                  <Text className="text-emerald-700 font-extrabold text-base mt-1">
                    ${Number(item.amount).toLocaleString("es-CO")} COP
                  </Text>
                </View>

                {!isPaid && (
                  <TouchableOpacity
                    onPress={() => handlePay(item)}
                    disabled={payingId === item.id}
                    className="bg-emerald-600 active:bg-emerald-700 px-4 py-2.5 rounded-xl flex-row items-center space-x-1.5 shadow-sm"
                  >
                    {payingId === item.id ? (
                      <ActivityIndicator color="#ffffff" size="small" />
                    ) : (
                      <>
                        <CreditCard color="#ffffff" size={16} />
                        <Text className="text-white font-bold text-xs ml-1">Pagar</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>
      )}

      {/* Manual Bank Transfer Info */}
      <View className="bg-slate-100 rounded-2xl p-4 mt-6 border border-slate-200/80">
        <Text className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
          Pagos en Efectivo o Transferencia Veredal
        </Text>
        <Text className="text-xs text-slate-500 leading-relaxed">
          También puedes realizar tu pago directamente en efectivo ante el Tesorero de la JAC en la sede comunal o mediante transferencia al Banco Agrario. El tesorero asentará el folio en el libro de caja menor.
        </Text>
      </View>
    </ScrollView>
  );
}

