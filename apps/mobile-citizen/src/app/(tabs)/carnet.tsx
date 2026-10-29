import React from "react";
import { View, Text, ScrollView, TouchableOpacity, Share } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { useAuthStore } from "../../lib/auth-store";
import { ShieldCheck, Share2, Award, Calendar, MapPin, Hash } from "lucide-react-native";

export default function CarnetScreen() {
  const { user, currentMembership } = useAuthStore();

  if (!user || !currentMembership) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50 p-6">
        <Text className="text-slate-500 text-sm text-center">
          Debes iniciar sesión para consultar tu carnet digital de afiliado.
        </Text>
      </View>
    );
  }

  const jac = currentMembership.jac;
  const qrPayload = JSON.stringify({
    app: "ConectaJAC",
    type: "AFFILIATE_ID",
    userId: user.id,
    doc: user.identificationNumber,
    jacId: currentMembership.jacId,
    folio: currentMembership.folioNumber,
    book: currentMembership.bookNumber || 1,
    status: currentMembership.status,
  });

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Carnet de Afiliado JAC - ${user.firstName} ${user.lastName} | Folio #${currentMembership.folioNumber} - ${jac?.name || "JAC"} (Ley 2166 de 2021)`,
      });
    } catch {
      // Ignorar cancelaciones
    }
  };

  return (
    <ScrollView className="flex-1 bg-slate-900" contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
      {/* Title */}
      <View className="items-center mb-6">
        <View className="flex-row items-center space-x-1.5 bg-emerald-500/20 border border-emerald-500/30 px-3 py-1 rounded-full mb-2">
          <ShieldCheck color="#34d399" size={14} />
          <Text className="text-emerald-300 text-[11px] font-bold uppercase tracking-wider ml-1">
            República de Colombia • Ley 2166 de 2021
          </Text>
        </View>
        <Text className="text-white text-xl font-black text-center">
          Carnet Oficial de Afiliado
        </Text>
        <Text className="text-slate-400 text-xs text-center mt-0.5">
          Libro Digital de Afiliados y Registro Comunal
        </Text>
      </View>

      {/* Official ID Card (Carnet) */}
      <View className="bg-gradient-to-b from-slate-800 to-slate-850 rounded-3xl border border-slate-700/80 p-6 shadow-2xl relative overflow-hidden">
        {/* Institutional Header inside Carnet */}
        <View className="border-b border-slate-700 pb-4 mb-4">
          <View className="flex-row justify-between items-start">
            <View className="flex-1 mr-3">
              <Text className="text-emerald-400 text-[10px] font-bold uppercase tracking-widest">
                Junta de Acción Comunal
              </Text>
              <Text className="text-white font-extrabold text-base leading-tight mt-0.5">
                {jac?.name || "JAC Comunal"}
              </Text>
              <Text className="text-slate-400 text-[11px] mt-0.5">
                PJ: {jac?.legalPersonhoodNumber || "En trámite"} • {jac?.municipality?.name || "Colombia"}
              </Text>
            </View>
            <View className="w-10 h-10 rounded-xl bg-emerald-600 items-center justify-center">
              <Award color="#ffffff" size={20} />
            </View>
          </View>
        </View>

        {/* Affiliate Main Data */}
        <View className="space-y-3 mb-6">
          <View>
            <Text className="text-[10px] text-slate-400 uppercase font-semibold">
              Nombre del Afiliado(a)
            </Text>
            <Text className="text-white font-black text-lg tracking-wide uppercase">
              {user.firstName} {user.lastName}
            </Text>
          </View>

          <View className="flex-row justify-between">
            <View>
              <Text className="text-[10px] text-slate-400 uppercase font-semibold">
                Documento de Identidad
              </Text>
              <Text className="text-white font-mono font-bold text-sm">
                {user.identificationType} {user.identificationNumber}
              </Text>
            </View>

            <View className="items-end">
              <Text className="text-[10px] text-slate-400 uppercase font-semibold">
                Estado Legal
              </Text>
              <View className="bg-emerald-500/20 border border-emerald-500/40 px-2.5 py-0.5 rounded-full mt-0.5">
                <Text className="text-emerald-300 font-bold text-xs">ACTIVO / VIGENTE</Text>
              </View>
            </View>
          </View>

          {/* Vereda & Folio */}
          <View className="bg-slate-900/80 rounded-2xl p-3 border border-slate-700/60 flex-row justify-between items-center mt-2">
            <View className="flex-row items-center space-x-2">
              <Hash color="#34d399" size={16} />
              <View className="ml-1">
                <Text className="text-[10px] text-slate-400">Folio de Registro</Text>
                <Text className="text-white font-black text-sm">#{currentMembership.folioNumber}</Text>
              </View>
            </View>
            <View className="h-6 w-[1px] bg-slate-700" />
            <View className="flex-row items-center space-x-2">
              <MapPin color="#38bdf8" size={16} />
              <View className="ml-1">
                <Text className="text-[10px] text-slate-400">Sector / Vereda</Text>
                <Text className="text-white font-bold text-xs truncate max-w-[120px]">
                  {currentMembership.veredaOrBarrio}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* QR Code Container */}
        <View className="bg-white rounded-2xl p-5 items-center justify-center shadow-lg my-2">
          <QRCode
            value={qrPayload}
            size={180}
            color="#0f172a"
            backgroundColor="#ffffff"
          />
          <Text className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-3">
            Código QR de Verificación de Quórum
          </Text>
          <Text className="text-[9px] text-slate-400 text-center mt-0.5">
            Escanear durante Asambleas Generales para control automático de asistencia
          </Text>
        </View>

        {/* Footer */}
        <View className="mt-4 pt-3 border-t border-slate-700/60 flex-row items-center justify-between">
          <View className="flex-row items-center space-x-1.5">
            <Calendar color="#94a3b8" size={13} />
            <Text className="text-slate-400 text-[10px] ml-1">
              Libro #{currentMembership.bookNumber || 1} • Folio #{currentMembership.folioNumber}
            </Text>
          </View>
          <Text className="text-emerald-400 text-[10px] font-bold">
            ConectaJAC Digital
          </Text>
        </View>
      </View>

      {/* Share action */}
      <TouchableOpacity
        onPress={handleShare}
        className="mt-6 bg-slate-800 border border-slate-700 active:bg-slate-700 rounded-2xl py-3.5 flex-row items-center justify-center space-x-2"
      >
        <Share2 color="#ffffff" size={18} />
        <Text className="text-white font-bold text-sm ml-2">Compartir Carnet Oficial</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
