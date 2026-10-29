import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  Share,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import QRCode from "react-native-qrcode-svg";
import { apiClient } from "../../lib/api-client";
import { useAuthStore } from "../../lib/auth-store";
import { CertificateType } from "@conectajac/shared";
import {
  FileCheck2,
  Plus,
  QrCode,
  ShieldCheck,
  Calendar,
  Share2,
  X,
  AlertCircle,
} from "lucide-react-native";

interface CertificateItem {
  id: string;
  type: CertificateType;
  verificationCode: string;
  pdfUrl?: string;
  issuedAt: string;
  expiresAt: string;
  isValid: boolean;
  tamperProofToken: string;
  user: {
    firstName: string;
    lastName: string;
    identificationNumber: string;
  };
}

export default function CertificatesScreen() {
  const queryClient = useQueryClient();
  const { currentMembership } = useAuthStore();
  const [selectedCertificate, setSelectedCertificate] = useState<CertificateItem | null>(null);
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<CertificateType>(CertificateType.RESIDENCE);

  const { data: certsData, isLoading, refetch } = useQuery<{
    data: CertificateItem[];
  }>({
    queryKey: ["my-certificates", currentMembership?.id],
    queryFn: () => apiClient.get("/certificates/my-certificates"),
    enabled: !!currentMembership?.id,
  });

  const certificates = certsData?.data || [];

  const requestMutation = useMutation({
    mutationFn: (type: CertificateType) =>
      apiClient.post<CertificateItem>("/certificates/issue", {
        type,
        membershipId: currentMembership?.id,
      }),
    onSuccess: (newCert) => {
      queryClient.invalidateQueries({ queryKey: ["my-certificates"] });
      setRequestModalOpen(false);
      setSelectedCertificate(newCert);
      Alert.alert(
        "¡Certificado Generado Exitosamente!",
        `Certificado emitido con código verificable ${newCert.verificationCode}. Válido por 90 días conforme a la Ley 2166.`
      );
    },
    onError: (err: any) => {
      Alert.alert(
        "No se pudo generar el certificado",
        err.message || "Verifica que estés al día con la tesorería comunal."
      );
    },
  });

  const certificateTypeLabels: Record<string, string> = {
    RESIDENCE: "Certificado de Residencia Veredal",
    AFFILIATION: "Certificado de Afiliación Comunal",
    GOOD_STANDING: "Certificado de Paz y Salvo",
  };

  const handleShareCertificate = async (cert: CertificateItem) => {
    try {
      const verifyUrl = `https://conectajac.org/certificados/verificar/${cert.verificationCode}`;
      await Share.share({
        message: `Certificado Oficial ConectaJAC (${certificateTypeLabels[cert.type]}): Código de verificación: ${cert.verificationCode}. Verifica su autenticidad en: ${verifyUrl}`,
      });
    } catch {
      // Ignorar cancelaciones
    }
  };

  return (
    <View className="flex-1 bg-slate-50">
      <ScrollView className="flex-1 px-4 py-4" contentContainerStyle={{ paddingBottom: 60 }}>
        {/* Info Banner */}
        <View className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 mb-4 flex-row items-start space-x-2.5">
          <ShieldCheck color="#059669" size={22} />
          <View className="flex-1 ml-2">
            <Text className="text-emerald-950 font-bold text-xs uppercase tracking-wider">
              Autenticidad Digital Garantizada
            </Text>
            <Text className="text-emerald-800 text-xs mt-0.5 leading-relaxed">
              Cada certificado cuenta con un token criptográfico SHA-256 y un código QR que permite a cualquier entidad pública validar su legalidad en tiempo real.
            </Text>
          </View>
        </View>

        {/* Certificates List */}
        <Text className="text-slate-900 font-bold text-base mb-3">Mis Certificados Emitidos</Text>

        {isLoading ? (
          <ActivityIndicator color="#059669" className="py-8" />
        ) : certificates.length === 0 ? (
          <View className="bg-white rounded-2xl p-8 border border-slate-200/80 items-center text-center">
            <FileCheck2 color="#059669" size={36} />
            <Text className="text-slate-800 font-bold text-sm mt-3">
              No tienes certificados vigentes
            </Text>
            <Text className="text-slate-400 text-xs text-center mt-1">
              Tramita tu certificado de residencia o afiliación de forma instantánea.
            </Text>
          </View>
        ) : (
          certificates.map((cert) => (
            <TouchableOpacity
              key={cert.id}
              onPress={() => setSelectedCertificate(cert)}
              className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm mb-3 flex-row justify-between items-center"
            >
              <View className="flex-1 mr-3">
                <View className="flex-row items-center space-x-1.5 mb-1">
                  <Text className="text-emerald-800 bg-emerald-50 text-[10px] font-bold px-2 py-0.5 rounded-md">
                    {cert.isValid ? "VIGENTE (90 DÍAS)" : "EXPIRADO"}
                  </Text>
                </View>
                <Text className="text-sm font-bold text-slate-900">
                  {certificateTypeLabels[cert.type] || cert.type}
                </Text>
                <Text className="text-xs font-mono font-semibold text-slate-600 mt-1">
                  Código: {cert.verificationCode}
                </Text>
                <Text className="text-[11px] text-slate-400 mt-0.5">
                  Emitido: {new Date(cert.issuedAt).toLocaleDateString("es-CO")}
                </Text>
              </View>

              <View className="bg-emerald-50 p-2.5 rounded-xl">
                <QrCode color="#059669" size={24} />
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Floating CTA to Request Certificate */}
      <TouchableOpacity
        onPress={() => setRequestModalOpen(true)}
        className="absolute bottom-6 right-6 bg-emerald-600 active:bg-emerald-700 rounded-full px-5 py-3.5 flex-row items-center shadow-lg shadow-emerald-600/40"
      >
        <Plus color="#ffffff" size={20} />
        <Text className="text-white font-bold text-sm ml-2">Tramitar Certificado</Text>
      </TouchableOpacity>

      {/* Request Modal */}
      <Modal visible={requestModalOpen} animationType="slide" transparent>
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl p-6 space-y-4">
            <View className="flex-row justify-between items-center pb-2 border-b border-slate-100">
              <Text className="text-lg font-bold text-slate-900">
                Nuevo Trámite de Certificado
              </Text>
              <TouchableOpacity onPress={() => setRequestModalOpen(false)}>
                <X color="#64748b" size={20} />
              </TouchableOpacity>
            </View>

            <Text className="text-xs text-slate-500">
              Selecciona el tipo de documento comunal que requieres presentar:
            </Text>

            <View className="space-y-2.5">
              {[
                {
                  type: CertificateType.RESIDENCE,
                  title: "Certificado de Residencia",
                  desc: "Para trámites ante alcaldías, subsidios, empleo rural o juzgados.",
                },
                {
                  type: CertificateType.AFFILIATION,
                  title: "Certificado de Afiliación Comunal",
                  desc: "Acredita inscripción activa en el libro de la JAC.",
                },
                {
                  type: CertificateType.GOOD_STANDING,
                  title: "Certificado de Paz y Salvo",
                  desc: "Certifica que te encuentras a paz y salvo con la tesorería comunal.",
                },
              ].map((item) => {
                const isSelected = selectedType === item.type;
                return (
                  <TouchableOpacity
                    key={item.type}
                    onPress={() => setSelectedType(item.type)}
                    className={`p-3.5 rounded-2xl border ${
                      isSelected
                        ? "bg-emerald-50 border-emerald-500"
                        : "bg-slate-50 border-slate-200"
                    }`}
                  >
                    <Text
                      className={`text-sm font-bold ${
                        isSelected ? "text-emerald-900" : "text-slate-800"
                      }`}
                    >
                      {item.title}
                    </Text>
                    <Text className="text-xs text-slate-500 mt-0.5">{item.desc}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              onPress={() => requestMutation.mutate(selectedType)}
              disabled={requestMutation.isPending}
              className="bg-emerald-600 active:bg-emerald-700 py-3.5 rounded-2xl flex-row items-center justify-center space-x-2 mt-3 shadow-sm"
            >
              {requestMutation.isPending ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <>
                  <FileCheck2 color="#ffffff" size={20} />
                  <Text className="text-white font-bold text-base ml-2">
                    Generar y Firmar Digitalmente
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Certificate Viewer Modal with QR */}
      <Modal visible={!!selectedCertificate} animationType="slide" transparent>
        <View className="flex-1 bg-black/70 justify-center px-4">
          <View className="bg-white rounded-3xl p-6 shadow-2xl space-y-4">
            <View className="flex-row justify-between items-start pb-2 border-b border-slate-100">
              <View className="flex-1 mr-2">
                <Text className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                  Certificado Verificado
                </Text>
                <Text className="text-base font-bold text-slate-900">
                  {selectedCertificate &&
                    (certificateTypeLabels[selectedCertificate.type] || selectedCertificate.type)}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedCertificate(null)}>
                <X color="#64748b" size={20} />
              </TouchableOpacity>
            </View>

            {/* QR Code Presentation */}
            {selectedCertificate && (
              <View className="items-center py-4 bg-slate-50 rounded-2xl border border-slate-200">
                <QRCode
                  value={`https://conectajac.org/certificados/verificar/${selectedCertificate.verificationCode}`}
                  size={180}
                  color="#0f172a"
                  backgroundColor="#f8fafc"
                />
                <Text className="font-mono text-sm font-bold text-slate-800 mt-3">
                  {selectedCertificate.verificationCode}
                </Text>
                <Text className="text-[10px] text-slate-400 mt-0.5">
                  Código de Verificación Pública
                </Text>
              </View>
            )}

            <View className="bg-emerald-50 rounded-xl p-3 border border-emerald-200">
              <Text className="text-xs text-emerald-900 font-semibold">
                Validez Legal: 90 días calendario a partir de su emisión.
              </Text>
              <Text className="text-[11px] text-emerald-700 mt-0.5">
                Cualquier entidad gubernamental o banco puede escanear este código QR para comprobar la firma digital del Presidente y Secretario de la JAC.
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => selectedCertificate && handleShareCertificate(selectedCertificate)}
              className="bg-emerald-600 active:bg-emerald-700 py-3 rounded-2xl flex-row items-center justify-center space-x-2"
            >
              <Share2 color="#ffffff" size={18} />
              <Text className="text-white font-bold text-sm ml-2">Compartir Enlace Oficial</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

