import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
  Linking,
  Image,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import QRCode from "react-native-qrcode-svg";
import { apiClient } from "../../lib/api-client";
import { useAuthStore } from "../../lib/auth-store";
import {
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Landmark,
  ShieldCheck,
  ExternalLink,
  QrCode,
  Copy,
  MessageCircle,
  X,
  Smartphone,
  Building,
} from "lucide-react-native";

function buildNequiEmvcoQR(phone: string, name: string, amount?: number): string {
  const cleanPhone = phone.replace(/\D/g, "");
  const cleanName = (name || "JAC COMUNAL")
    .substring(0, 25)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9 ]/g, "")
    .toUpperCase();

  const sub00 = "0014co.com.nequi";
  const sub01 = `01${cleanPhone.length.toString().padStart(2, "0")}${cleanPhone}`;
  const len26 = (sub00.length + sub01.length).toString().padStart(2, "0");
  const tag26 = `26${len26}${sub00}${sub01}`;

  const nameLen = cleanName.length.toString().padStart(2, "0");
  let payload = `000201010211${tag26}520400005303170`;
  if (amount && amount > 0) {
    const amtStr = String(Math.round(amount));
    payload = `000201010212${tag26}52040000530317054${amtStr.length.toString().padStart(2, "0")}${amtStr}`;
  }
  payload += `5802CO59${nameLen}${cleanName}6008COLOMBIA6304`;

  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  const crcHex = crc.toString(16).toUpperCase().padStart(4, "0");
  return payload + crcHex;
}

interface ObligationItem {
  id: string;
  amount: number;
  paidAmount?: number;
  pendingBalance?: number;
  dueDate: string;
  status: "PENDING" | "PAID" | "OVERDUE" | "EXEMPT" | "PARTIALLY_PAID";
  periodName?: string;
  configuration?: {
    name: string;
    type: string;
    amount: number;
  };
}

interface BankAccountInfo {
  bankName: string;
  accountType: string;
  accountNumber: string;
  holderName: string;
  isDigital?: boolean;
  qrImageUrl?: string;
}

interface MyObligationsResponse {
  data: ObligationItem[];
  summary: {
    totalDebt: number;
    isUpToDate: boolean;
    overdueCount: number;
    advanceCount: number;
  };
  jac: {
    id: string;
    name: string;
    vereda: string;
    nit?: string;
    phone?: string;
  };
  bankAccounts: BankAccountInfo[];
  nequiAccount: BankAccountInfo;
}

export default function PaymentsScreen() {
  const queryClient = useQueryClient();
  const { user, currentMembership } = useAuthStore();

  const [payingId, setPayingId] = useState<string | null>(null);
  const [nequiModalOpen, setNequiModalOpen] = useState(false);
  const [selectedObligationForNequi, setSelectedObligationForNequi] = useState<ObligationItem | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const { data: responseData, isLoading, refetch } = useQuery<MyObligationsResponse>({
    queryKey: ["my-obligations", currentMembership?.jacId],
    queryFn: () => apiClient.get("/treasury/my-obligations"),
    enabled: !!currentMembership?.jacId,
  });

  const obligations = responseData?.data || [];
  const totalDebt = responseData?.summary?.totalDebt ?? 0;
  const jacInfo = responseData?.jac;
  const bankAccounts = responseData?.bankAccounts || [];
  const nequiAccount = responseData?.nequiAccount || {
    bankName: "Nequi Comunal",
    accountType: "Billetera Digital",
    accountNumber: jacInfo?.phone || "3100000000",
    holderName: jacInfo?.name || "JAC Comunal",
    isDigital: true,
  };

  const pendingObligations = obligations.filter(
    (o) => o.status === "PENDING" || o.status === "OVERDUE" || o.status === "PARTIALLY_PAID"
  );

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

  const handlePayOnline = (obligation: ObligationItem) => {
    setPayingId(obligation.id);
    checkoutMutation.mutate(obligation.id);
  };

  const handleCopyAccount = (number: string) => {
    setCopiedText(number);
    Alert.alert("Número Copiado", `El número ${number} ha sido copiado.`);
    setTimeout(() => setCopiedText(null), 3000);
  };

  const handleOpenNequi = () => {
    const nequiUrl = "nequi://";
    Linking.canOpenURL(nequiUrl)
      .then((supported) => {
        if (supported) {
          Linking.openURL(nequiUrl);
        } else {
          Linking.openURL("https://www.nequi.com.co");
        }
      })
      .catch(() => {
        Linking.openURL("https://www.nequi.com.co");
      });
  };

  const handleReportPaymentWhatsApp = () => {
    const amountToReport = selectedObligationForNequi
      ? selectedObligationForNequi.pendingBalance || selectedObligationForNequi.amount
      : totalDebt;

    const treasurerPhone = jacInfo?.phone || nequiAccount.accountNumber;
    const cleanPhone = treasurerPhone.replace(/\D/g, "");

    const msg = `Hola Tesorero(a) de la JAC ${jacInfo?.name || ""}. Te comparto el comprobante de mi pago de cuota comunal por valor de $${Number(
      amountToReport
    ).toLocaleString("es-CO")} COP realizado a través de Nequi. Mi nombre es ${user?.firstName} ${
      user?.lastName
    }, CC ${user?.identificationNumber}.`;

    Linking.openURL(`https://wa.me/57${cleanPhone}?text=${encodeURIComponent(msg)}`).catch(() => {
      Alert.alert("WhatsApp", "No se pudo abrir WhatsApp en este dispositivo.");
    });
  };

  // QR Payload para Nequi (EMVCo estándar para Colombia / Nequi / Bancolombia)
  const amountToPay =
    selectedObligationForNequi?.pendingBalance ||
    selectedObligationForNequi?.amount ||
    totalDebt ||
    10000;

  const qrNequiValue = buildNequiEmvcoQR(
    nequiAccount.accountNumber,
    nequiAccount.holderName,
    amountToPay
  );

  return (
    <ScrollView
      className="flex-1 bg-slate-50"
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
      contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
    >
      {/* Treasury Status Banner */}
      <View
        className={`rounded-3xl p-6 border shadow-sm mb-5 ${
          totalDebt === 0 ? "bg-emerald-600 border-emerald-500" : "bg-slate-900 border-slate-800"
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
              Tesorería Comunal • {jacInfo?.name || "JAC"}
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

        <Text className={`text-xs ${totalDebt === 0 ? "text-emerald-100" : "text-slate-400"}`}>
          Total por pagar a la JAC
        </Text>
        <Text className="text-white text-3xl font-black mt-1">
          ${totalDebt.toLocaleString("es-CO")} <Text className="text-base font-normal">COP</Text>
        </Text>

        {totalDebt === 0 ? (
          <View className="flex-row items-center mt-3 pt-3 border-t border-emerald-500/50">
            <CheckCircle2 color="#a7f3d0" size={16} />
            <Text className="text-emerald-50 text-xs ml-2 font-medium">
              Te encuentras al día. Cumples con los requisitos para certificados y votaciones.
            </Text>
          </View>
        ) : (
          <View className="flex-row items-center mt-3 pt-3 border-t border-slate-800">
            <AlertCircle color="#fb7185" size={16} />
            <Text className="text-rose-200 text-xs ml-2 font-medium">
              Tienes {pendingObligations.length} cuota(s) u obligaciones pendientes de pago.
            </Text>
          </View>
        )}
      </View>

      {/* NEQUI QUICK PAY CARD */}
      <View className="bg-purple-950 rounded-3xl p-5 border border-purple-800/60 shadow-md mb-5">
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center space-x-2">
            <View className="w-8 h-8 rounded-xl bg-fuchsia-600 items-center justify-center">
              <QrCode color="#ffffff" size={18} />
            </View>
            <View className="ml-2">
              <Text className="text-white font-black text-base">Pagar con Nequi</Text>
              <Text className="text-purple-300 text-xs">Escanea el código QR o transfiere al número</Text>
            </View>
          </View>
          <View className="bg-fuchsia-500/20 px-2.5 py-1 rounded-full border border-fuchsia-500/40">
            <Text className="text-fuchsia-300 font-extrabold text-[10px]">QR ACTIVO</Text>
          </View>
        </View>

        <View className="bg-purple-900/60 p-3.5 rounded-2xl border border-purple-700/50 flex-row items-center justify-between mb-4">
          <View>
            <Text className="text-purple-300 text-[11px] font-semibold">Número de Cuenta Nequi:</Text>
            <Text className="text-white font-mono font-black text-lg mt-0.5">
              📱 {nequiAccount.accountNumber}
            </Text>
            <Text className="text-purple-200 text-[11px] mt-0.5">
              Titular: {nequiAccount.holderName}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => handleCopyAccount(nequiAccount.accountNumber)}
            className="p-2.5 rounded-xl bg-purple-800 active:bg-purple-700 border border-purple-600"
            title="Copiar número Nequi"
          >
            <Copy color="#ffffff" size={18} />
          </TouchableOpacity>
        </View>

        <View className="flex-row space-x-2">
          <TouchableOpacity
            onPress={() => {
              setSelectedObligationForNequi(null);
              setNequiModalOpen(true);
            }}
            className="flex-1 bg-fuchsia-600 active:bg-fuchsia-700 py-3 rounded-2xl flex-row items-center justify-center space-x-2 shadow-sm"
          >
            <QrCode color="#ffffff" size={18} />
            <Text className="text-white font-bold text-xs ml-1.5">Ver QR de Nequi</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleOpenNequi}
            className="flex-1 bg-purple-800 active:bg-purple-700 py-3 rounded-2xl flex-row items-center justify-center space-x-2 border border-purple-600 ml-2 shadow-sm"
          >
            <Smartphone color="#ffffff" size={18} />
            <Text className="text-purple-100 font-bold text-xs ml-1.5">Abrir App Nequi</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* JAC BANK ACCOUNTS SECTION */}
      <View className="mb-6">
        <Text className="text-slate-900 font-bold text-base mb-2">
          Cuentas Bancarias de la JAC
        </Text>
        <Text className="text-slate-500 text-xs mb-3">
          Cuentas oficiales autorizadas para transferencias, consignaciones o corresponsales veredales.
        </Text>

        {bankAccounts.length === 0 ? (
          <View className="p-4 bg-white rounded-2xl border border-slate-200">
            <Text className="text-slate-500 text-xs text-center">
              La JAC aún no ha registrado cuentas adicionales. Puedes pagar en efectivo ante el tesorero o por Nequi.
            </Text>
          </View>
        ) : (
          <View className="space-y-3">
            {bankAccounts.map((acc, index) => (
              <View
                key={index}
                className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex-row items-center justify-between mb-2.5"
              >
                <View className="flex-1 mr-2">
                  <View className="flex-row items-center space-x-1.5 mb-1">
                    <Building color="#059669" size={16} />
                    <Text className="text-slate-900 font-bold text-xs ml-1">{acc.bankName}</Text>
                    <Text className="text-slate-400 text-[11px]">• {acc.accountType}</Text>
                  </View>
                  <Text className="text-slate-800 font-mono font-bold text-sm">
                    {acc.accountNumber}
                  </Text>
                  <Text className="text-slate-400 text-[11px] mt-0.5">Titular: {acc.holderName}</Text>
                </View>

                <TouchableOpacity
                  onPress={() => handleCopyAccount(acc.accountNumber)}
                  className="px-3 py-2 rounded-xl bg-slate-100 active:bg-slate-200 flex-row items-center space-x-1"
                >
                  <Copy color="#64748b" size={14} />
                  <Text className="text-slate-700 font-bold text-[11px] ml-1">Copiar</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* OBLIGATIONS LIST */}
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
                        isPaid ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"
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
                  <View className="flex-row space-x-1.5">
                    <TouchableOpacity
                      onPress={() => {
                        setSelectedObligationForNequi(item);
                        setNequiModalOpen(true);
                      }}
                      className="bg-purple-900 active:bg-purple-800 px-3 py-2.5 rounded-xl flex-row items-center space-x-1 shadow-sm mr-1.5"
                      title="Pagar cuota con Nequi"
                    >
                      <QrCode color="#ffffff" size={14} />
                      <Text className="text-white font-bold text-xs ml-1">Nequi</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => handlePayOnline(item)}
                      disabled={payingId === item.id}
                      className="bg-emerald-600 active:bg-emerald-700 px-3.5 py-2.5 rounded-xl flex-row items-center space-x-1.5 shadow-sm"
                    >
                      {payingId === item.id ? (
                        <ActivityIndicator color="#ffffff" size="small" />
                      ) : (
                        <>
                          <CreditCard color="#ffffff" size={14} />
                          <Text className="text-white font-bold text-xs ml-1">Pagar</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      )}

      {/* Information Footer */}
      <View className="bg-slate-100 rounded-2xl p-4 mt-6 border border-slate-200/80">
        <Text className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
          Pagos en Efectivo o Caja Menor
        </Text>
        <Text className="text-xs text-slate-500 leading-relaxed">
          También puedes pagar directamente en efectivo ante el Tesorero de la JAC en la sede comunal. El tesorero asentará el folio en el libro de caja menor y te emitirá el recibo oficial con paz y salvo.
        </Text>
      </View>

      {/* NEQUI PAYMENT MODAL WITH QR */}
      <Modal visible={nequiModalOpen} animationType="slide" transparent>
        <View className="flex-1 bg-black/60 justify-center items-center p-4">
          <View className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl space-y-4">
            <View className="flex-row justify-between items-center pb-3 border-b border-slate-100">
              <View className="flex-row items-center space-x-2">
                <View className="w-8 h-8 rounded-xl bg-purple-900 items-center justify-center">
                  <QrCode color="#ffffff" size={18} />
                </View>
                <Text className="text-base font-black text-purple-950 ml-2">
                  Código QR de Nequi
                </Text>
              </View>
              <TouchableOpacity onPress={() => setNequiModalOpen(false)}>
                <X color="#64748b" size={20} />
              </TouchableOpacity>
            </View>

            {/* QR Code */}
            <View className="bg-purple-50 rounded-2xl p-4 items-center justify-center border border-purple-200 shadow-inner">
              {nequiAccount.qrImageUrl ? (
                <Image
                  source={{ uri: nequiAccount.qrImageUrl }}
                  style={{ width: 170, height: 170, borderRadius: 12 }}
                  resizeMode="contain"
                />
              ) : (
                <QRCode
                  value={qrNequiValue}
                  size={170}
                  color="#200020"
                  backgroundColor="#ffffff"
                />
              )}
              <Text className="text-[11px] font-bold text-purple-900 mt-3">
                {nequiAccount.qrImageUrl ? "QR Oficial de Nequi" : "Escanea desde la App Nequi"}
              </Text>
              <Text className="text-[10px] text-purple-700 text-center mt-0.5">
                Usa la opción [Código QR] en tu app Nequi o Bancolombia
              </Text>
            </View>

            {/* Payment Info */}
            <View className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-1.5">
              <View className="flex-row justify-between items-center">
                <Text className="text-[11px] text-slate-500">Número Nequi:</Text>
                <TouchableOpacity
                  onPress={() => handleCopyAccount(nequiAccount.accountNumber)}
                  className="flex-row items-center space-x-1 bg-purple-100 px-2 py-0.5 rounded-md"
                >
                  <Text className="font-mono font-black text-purple-950 text-sm">
                    {nequiAccount.accountNumber}
                  </Text>
                  <Copy color="#581c87" size={12} />
                  {copiedText === nequiAccount.accountNumber && (
                    <Text className="text-[10px] font-bold text-emerald-700 ml-1">¡Copiado!</Text>
                  )}
                </TouchableOpacity>
              </View>
              <View className="flex-row justify-between items-center">
                <Text className="text-[11px] text-slate-500">Titular:</Text>
                <Text className="font-bold text-slate-800 text-xs">
                  {nequiAccount.holderName}
                </Text>
              </View>
              <View className="flex-row justify-between items-center pt-1 border-t border-slate-200">
                <Text className="text-[11px] font-bold text-slate-700">Monto a pagar:</Text>
                <Text className="font-black text-emerald-700 text-base">
                  ${amountToPay.toLocaleString("es-CO")} COP
                </Text>
              </View>
            </View>

            {/* Instruction Tip */}
            <View className="p-2.5 bg-purple-50 rounded-xl border border-purple-200/60">
              <Text className="text-[10px] text-purple-900 leading-relaxed text-center font-medium">
                💡 Si estás en el mismo celular: copia el número, abre tu Nequi, ve a <Text className="font-bold">Envía &gt; A Nequi</Text> y pega el número para transferir.
              </Text>
            </View>

            {/* Action Buttons */}
            <View className="space-y-2 pt-1">
              <TouchableOpacity
                onPress={() => handleCopyAccount(nequiAccount.accountNumber)}
                className="w-full bg-purple-100 active:bg-purple-200 py-2.5 rounded-2xl flex-row items-center justify-center space-x-2 border border-purple-300"
              >
                <Copy color="#581c87" size={15} />
                <Text className="text-purple-950 font-bold text-xs ml-1.5">
                  Copiar Número Nequi ({nequiAccount.accountNumber})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleOpenNequi}
                className="w-full bg-purple-900 active:bg-purple-950 py-3 rounded-2xl flex-row items-center justify-center space-x-2"
              >
                <Smartphone color="#ffffff" size={16} />
                <Text className="text-white font-bold text-xs ml-1.5">Abrir App Nequi para Pagar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleReportPaymentWhatsApp}
                className="w-full bg-emerald-600 active:bg-emerald-700 py-3 rounded-2xl flex-row items-center justify-center space-x-2"
              >
                <MessageCircle color="#ffffff" size={16} />
                <Text className="text-white font-bold text-xs ml-1.5">
                  Reportar Pago al Tesorero por WhatsApp
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
