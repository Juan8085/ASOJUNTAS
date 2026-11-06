import React, { useRef, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Share, ActivityIndicator, Alert, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import QRCode from "react-native-qrcode-svg";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { apiClient } from "../../lib/api-client";
import { useAuthStore } from "../../lib/auth-store";
import {
  ShieldCheck,
  Share2,
  Award,
  Calendar,
  MapPin,
  Hash,
  QrCode,
  Inbox,
  Clock,
  MessageSquare,
  PlusCircle,
  ChevronRight,
} from "lucide-react-native";

export default function CarnetScreen() {
  const router = useRouter();
  const { user, currentMembership } = useAuthStore();
  const qrSvgRef = useRef<any>(null);
  const [isSharing, setIsSharing] = useState(false);

  const { data: ticketsData, isLoading: loadingTickets, refetch: refetchTickets } = useQuery<any>({
    queryKey: ["my-pqrsd-tickets", user?.id],
    queryFn: () => apiClient.get("/pqrsd/my-tickets"),
    enabled: !!user?.id,
  });

  const myTickets: any[] = Array.isArray(ticketsData)
    ? ticketsData
    : (ticketsData?.data || []);

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
    const textMessage = `Carnet de Afiliado JAC - ${user.firstName} ${user.lastName} | Folio #${currentMembership.folioNumber} - ${jac?.name || "JAC"} (Ley 2166 de 2021)`;

    try {
      setIsSharing(true);
      if (qrSvgRef.current) {
        qrSvgRef.current.toDataURL(async (base64Data: string) => {
          try {
            const filename = `Carnet_QR_${user.identificationNumber}.png`;
            const file = new File(Paths.cache, filename);
            await file.write(base64Data, { encoding: "base64" });

            const isSharingAvailable = await Sharing.isAvailableAsync();
            if (isSharingAvailable) {
              await Sharing.shareAsync(file.uri, {
                mimeType: "image/png",
                dialogTitle: `Carnet Oficial de Afiliado - ${user.firstName} ${user.lastName}`,
                UTI: "public.png",
              });
            } else {
              await Share.share({ message: textMessage });
            }
          } catch (e) {
            console.error("Error al compartir QR de carnet:", e);
            await Share.share({ message: textMessage });
          } finally {
            setIsSharing(false);
          }
        });
      } else {
        await Share.share({ message: textMessage });
        setIsSharing(false);
      }
    } catch {
      setIsSharing(false);
    }
  };

  return (
    <ScrollView
      className="flex-1 bg-slate-900"
      contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
      refreshControl={<RefreshControl refreshing={loadingTickets} onRefresh={refetchTickets} tintColor="#34d399" />}
    >
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
            getRef={(c) => {
              qrSvgRef.current = c;
            }}
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
        disabled={isSharing}
        className="mt-6 bg-emerald-600 active:bg-emerald-700 rounded-2xl py-3.5 flex-row items-center justify-center space-x-2 shadow-lg shadow-emerald-600/30"
      >
        {isSharing ? (
          <ActivityIndicator color="#ffffff" size="small" />
        ) : (
          <>
            <Share2 color="#ffffff" size={18} />
            <Text className="text-white font-bold text-sm ml-2">Compartir Carnet Oficial con QR</Text>
          </>
        )}
      </TouchableOpacity>

      {/* Section: Mis Solicitudes y PQRSD Radicados */}
      <View className="mt-8">
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center">
            <View className="w-8 h-8 rounded-xl bg-emerald-500/20 items-center justify-center">
              <Inbox color="#34d399" size={17} />
            </View>
            <View className="ml-2.5">
              <Text className="text-white font-bold text-base">
                Mis Solicitudes y PQRSD
              </Text>
              <Text className="text-slate-400 text-[11px]">
                Trámites ciudadanos radicados ante la JAC
              </Text>
            </View>
          </View>
          {myTickets.length > 0 && (
            <View className="bg-emerald-500/20 border border-emerald-500/40 px-2.5 py-0.5 rounded-full">
              <Text className="text-emerald-300 font-bold text-xs">
                {myTickets.length} radicado(s)
              </Text>
            </View>
          )}
        </View>

        {loadingTickets ? (
          <ActivityIndicator color="#34d399" className="py-6" />
        ) : myTickets.length === 0 ? (
          <View className="bg-slate-800/90 rounded-2xl border border-slate-700/80 p-5 items-center text-center">
            <Inbox color="#64748b" size={28} />
            <Text className="text-slate-300 font-bold text-xs mt-2">
              No tienes solicitudes PQRSD radicadas
            </Text>
            <Text className="text-slate-500 text-[11px] text-center mt-1 leading-relaxed">
              Puedes radicar peticiones, quejas, reclamos o sugerencias formales ante la Mesa Directiva de tu JAC.
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/(tabs)/comunidad")}
              className="mt-3.5 bg-emerald-600/90 active:bg-emerald-700 px-4 py-2.5 rounded-xl flex-row items-center space-x-1.5"
            >
              <PlusCircle color="#ffffff" size={14} />
              <Text className="text-white font-bold text-xs ml-1">Radicar Solicitud PQRSD</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View className="space-y-3">
            {myTickets.map((ticket: any) => (
              <View
                key={ticket.id}
                className="bg-slate-800 rounded-2xl border border-slate-700/80 p-4 shadow-md"
              >
                <View className="flex-row justify-between items-center mb-1.5">
                  <View className="flex-row items-center space-x-2">
                    <Text className="font-mono text-xs font-black text-emerald-400">
                      {ticket.ticketNumber || ticket.radicadoNumber}
                    </Text>
                    <View className="bg-slate-700/80 px-2 py-0.5 rounded-md ml-1.5">
                      <Text className="text-[10px] font-bold text-slate-300 uppercase">
                        {ticket.type === "PETITION"
                          ? "Petición"
                          : ticket.type === "COMPLAINT"
                          ? "Queja"
                          : ticket.type === "CLAIM"
                          ? "Reclamo"
                          : ticket.type === "SUGGESTION"
                          ? "Sugerencia"
                          : "Denuncia"}
                      </Text>
                    </View>
                  </View>

                  <View
                    className={`px-2.5 py-0.5 rounded-full ${
                      ticket.status === "RESOLVED"
                        ? "bg-emerald-500/20 border border-emerald-500/40"
                        : ticket.status === "IN_REVIEW"
                        ? "bg-amber-500/20 border border-amber-500/40"
                        : "bg-blue-500/20 border border-blue-500/40"
                    }`}
                  >
                    <Text
                      className={`text-[10px] font-black uppercase ${
                        ticket.status === "RESOLVED"
                          ? "text-emerald-300"
                          : ticket.status === "IN_REVIEW"
                          ? "text-amber-300"
                          : "text-blue-300"
                      }`}
                    >
                      {ticket.status === "RECEIVED"
                        ? "Recibido"
                        : ticket.status === "IN_REVIEW"
                        ? "En Trámite"
                        : ticket.status === "RESOLVED"
                        ? "Resuelto"
                        : ticket.status}
                    </Text>
                  </View>
                </View>

                <Text className="text-sm font-bold text-white mb-1">
                  {ticket.subject}
                </Text>
                <Text className="text-xs text-slate-300 leading-relaxed">
                  {ticket.description}
                </Text>

                {ticket.createdAt && (
                  <View className="flex-row items-center mt-2.5 pt-2 border-t border-slate-700/60">
                    <Clock color="#94a3b8" size={11} />
                    <Text className="text-slate-400 text-[10px] ml-1">
                      Radicado el {new Date(ticket.createdAt).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </Text>
                  </View>
                )}

                {ticket.responseText && (
                  <View className="mt-3 p-3 rounded-xl bg-emerald-950/70 border border-emerald-500/40">
                    <View className="flex-row items-center mb-1">
                      <MessageSquare color="#34d399" size={13} />
                      <Text className="text-[10px] font-black text-emerald-300 uppercase tracking-wider ml-1.5">
                        Respuesta Oficial de la JAC:
                      </Text>
                    </View>
                    <Text className="text-xs text-emerald-100 leading-relaxed">
                      {ticket.responseText}
                    </Text>
                    {ticket.respondedAt && (
                      <Text className="text-[9px] text-emerald-400/80 mt-1">
                        Respondido el {new Date(ticket.respondedAt).toLocaleDateString("es-CO")}
                      </Text>
                    )}
                  </View>
                )}
              </View>
            ))}

            <TouchableOpacity
              onPress={() => router.push("/(tabs)/comunidad")}
              className="mt-2 py-2.5 rounded-xl border border-dashed border-slate-700 items-center justify-center flex-row space-x-1.5"
            >
              <PlusCircle color="#34d399" size={14} />
              <Text className="text-emerald-400 font-bold text-xs ml-1">
                Radicar otra PQRSD ante la JAC
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

