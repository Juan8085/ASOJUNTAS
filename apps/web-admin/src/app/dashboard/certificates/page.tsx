"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth-store";
import {
  FileCheck,
  QrCode,
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Printer,
  Download,
  ShieldCheck,
  Building,
} from "lucide-react";
import { CertificateType, CertificateStatus } from "@conectajac/shared";

interface CertificateResponse {
  message: string;
  certificate: {
    id: string;
    verificationCode: string;
    type: string;
    status: string;
    issuedAt: string;
    validUntil: string;
    metadata: {
      jacName: string;
      legalPersonhoodNumber: string;
      citizenName: string;
      identificationType: string;
      identificationNumber: string;
      residenceAddress: string;
      bookNumber: number;
      folioNumber: number;
      purpose: string;
      validUntil: string;
    };
    qrCodeDataUrl: string;
  };
}

interface VerificationResult {
  isValid: boolean;
  status: string;
  message?: string;
  verificationCode?: string;
  issuedAt?: string;
  validUntil?: string;
  metadata?: {
    jacName: string;
    legalPersonhoodNumber: string;
    citizenName: string;
    identificationNumber: string;
    residenceAddress: string;
    purpose: string;
    type: string;
  };
  jac?: {
    name: string;
    legalPersonhoodNumber: string;
    veredaOrBarrio: string;
  };
}

export default function CertificatesPage() {
  const { currentJacId } = useAuthStore();
  const [activeTab, setActiveTab] = useState<"issue" | "verify">("issue");

  // Issue state
  const [certType, setCertType] = useState<CertificateType>(CertificateType.RESIDENCE);
  const [selectedAffiliateId, setSelectedAffiliateId] = useState("");
  const [purpose, setPurpose] = useState("");
  const [issuedCert, setIssuedCert] = useState<CertificateResponse["certificate"] | null>(null);

  // List of affiliates in current JAC to issue certificates to
  const { data: affiliatesData } = useQuery<{
    data: Array<{
      membershipId: string;
      folioNumber: number;
      veredaOrBarrio: string;
      user: {
        id: string;
        firstName: string;
        lastName: string;
        identificationType: string;
        identificationNumber: string;
      };
    }>;
  }>({
    queryKey: ["affiliates-for-certs", currentJacId],
    queryFn: () => apiClient("/affiliates/book", { params: { limit: 100 } }),
    enabled: Boolean(currentJacId),
  });

  // Verification state
  const [verifyCode, setVerifyCode] = useState("");
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const issueMutation = useMutation({
    mutationFn: () =>
      apiClient<CertificateResponse>("/certificates/request", {
        method: "POST",
        body: JSON.stringify({
          jacId: currentJacId,
          targetUserId: selectedAffiliateId || undefined,
          type: certType,
          purpose: purpose.trim(),
          deliveryMethod: "DIGITAL_DOWNLOAD",
        }),
      }),
    onSuccess: (data: CertificateResponse) => {
      setIssuedCert(data.certificate);
      setPurpose("");
    },
  });

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyCode.trim()) return;
    setIsVerifying(true);
    setVerificationResult(null);

    try {
      const res = await apiClient<VerificationResult>(
        `/certificates/verify/${encodeURIComponent(verifyCode.trim())}`
      );
      setVerificationResult(res);
    } catch {
      setVerificationResult({
        isValid: false,
        status: "ERROR",
        message: "No se pudo consultar el código de verificación",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Certificados Comunales Oficiales
          </h1>
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200">
            QR Verificable
          </span>
        </div>
        <p className="text-sm text-slate-500 mt-1">
          Emisión de certificados de residencia, afiliación comunal y paz y salvo con sello criptográfico anti-adulteración.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab("issue")}
          className={`py-3 px-6 text-sm font-semibold border-b-2 transition flex items-center gap-2 ${
            activeTab === "issue"
              ? "border-emerald-600 text-emerald-700"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <FileCheck className="w-4 h-4" /> Expedir Certificado
        </button>
        <button
          onClick={() => setActiveTab("verify")}
          className={`py-3 px-6 text-sm font-semibold border-b-2 transition flex items-center gap-2 ${
            activeTab === "verify"
              ? "border-emerald-600 text-emerald-700"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <QrCode className="w-4 h-4" /> Validar Autenticidad QR
        </button>
      </div>

      {/* Tab: Issue */}
      {activeTab === "issue" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Issue Form Card */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-sm space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Formulario de Expedición
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Validez legal estándar de 90 días conforme al estatuto comunal.
              </p>
            </div>

            {issueMutation.isError && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{(issueMutation.error as Error).message}</span>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                issueMutation.mutate();
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Habitante o Afiliado Titular *
                </label>
                <select
                  value={selectedAffiliateId}
                  onChange={(e) => setSelectedAffiliateId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 bg-white"
                >
                  <option value="">👤 Mi usuario directivo actual</option>
                  {affiliatesData?.data?.map((item) => (
                    <option key={item.user.id} value={item.user.id}>
                      Folio #{item.folioNumber} - {item.user.firstName} {item.user.lastName} ({item.user.identificationType} {item.user.identificationNumber} - {item.veredaOrBarrio})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Seleccione el miembro de la comunidad para quien se emitirá la constancia oficial.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Tipo de Certificado *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {[
                    { type: CertificateType.RESIDENCE, label: "Residencia" },
                    { type: CertificateType.AFFILIATION, label: "Afiliación" },
                    { type: CertificateType.GOOD_STANDING, label: "Paz y Salvo" },
                  ].map((item) => (
                    <button
                      key={item.type}
                      type="button"
                      onClick={() => setCertType(item.type)}
                      className={`p-3 rounded-xl border text-xs font-bold text-center transition ${
                        certType === item.type
                          ? "bg-emerald-50 border-emerald-500 text-emerald-800 shadow-sm"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
                {certType === CertificateType.GOOD_STANDING && (
                  <p className="text-[11px] text-amber-600 bg-amber-50 p-2 rounded-lg mt-2 flex items-center gap-1.5 border border-amber-200">
                    <ShieldCheck className="w-4 h-4 flex-shrink-0" />
                    El sistema valida automáticamente que el afiliado no registre cuotas en mora en Tesorería.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Propósito o Destino del Certificado *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Ej: Para postulación a subsidio de vivienda rural municipal o trámite bancario..."
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <button
                type="submit"
                disabled={issueMutation.isPending || !purpose.trim()}
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm shadow-md shadow-emerald-600/20 transition disabled:opacity-50"
              >
                {issueMutation.isPending
                  ? "Generando con firma digital..."
                  : "Expedir Certificado con Código QR"}
              </button>
            </form>
          </div>

          {/* Certificate Preview Card */}
          <div>
            {issuedCert ? (
              <div className="bg-white p-6 sm:p-8 rounded-3xl border-2 border-emerald-500/40 shadow-xl space-y-6 relative overflow-hidden print:border-none">
                <div className="flex items-center justify-between border-b pb-4">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">
                      República de Colombia
                    </span>
                    <h3 className="font-extrabold text-slate-900 text-base">
                      {issuedCert.metadata.jacName}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Personería Jurídica: {issuedCert.metadata.legalPersonhoodNumber}
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                </div>

                <div className="text-center py-2">
                  <h4 className="text-lg font-black text-slate-800 uppercase tracking-tight">
                    Certificado de {issuedCert.type}
                  </h4>
                  <div className="inline-block mt-1 font-mono text-xs bg-slate-100 text-slate-700 px-3 py-1 rounded-full font-bold border border-slate-200">
                    Cód: {issuedCert.verificationCode}
                  </div>
                </div>

                <div className="text-xs text-slate-600 space-y-2 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p>
                    La Junta de Acción Comunal hace constar que el(la) ciudadano(a){" "}
                    <strong className="text-slate-900">{issuedCert.metadata.citizenName}</strong>, identificado(a) con{" "}
                    <strong>{issuedCert.metadata.identificationType} {issuedCert.metadata.identificationNumber}</strong>, reside en la dirección{" "}
                    <strong>{issuedCert.metadata.residenceAddress}</strong> y se encuentra formalmente inscrito(a) en el Libro Digital de Afiliados en el{" "}
                    <strong className="text-emerald-700">Folio #{issuedCert.metadata.folioNumber}</strong> (Libro #{issuedCert.metadata.bookNumber}).
                  </p>
                  <p className="pt-2 text-slate-500 italic">
                    Expedido para fines de: {issuedCert.metadata.purpose}
                  </p>
                </div>

                {/* QR Section */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100">
                  <div className="space-y-1 text-center sm:text-left">
                    <p className="text-xs font-bold text-slate-800 flex items-center justify-center sm:justify-start gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      Verificación Digital en Tiempo Real
                    </p>
                    <p className="text-[11px] text-slate-500 max-w-xs">
                      Escanee el código QR con cualquier smartphone o haga clic en el botón de verificación para abrir el registro oficial.
                    </p>
                    <p className="text-[11px] font-semibold text-emerald-700">
                      Válido hasta: {new Date(issuedCert.validUntil).toLocaleDateString("es-CO")}
                    </p>
                  </div>
                  <div className="flex flex-col items-center gap-1.5">
                    <a
                      href={`/verify/${issuedCert.verificationCode}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Clic para verificar directamente este certificado"
                      className="group relative block"
                    >
                      <img
                        src={issuedCert.qrCodeDataUrl}
                        alt="Código QR de Verificación"
                        className="w-28 h-28 rounded-xl border border-emerald-300 p-1.5 bg-white shadow-md group-hover:scale-105 transition"
                      />
                      <span className="absolute inset-0 bg-emerald-900/10 rounded-xl opacity-0 group-hover:opacity-100 flex items-center justify-center text-[10px] font-bold text-emerald-950 transition">
                        Abrir ↗
                      </span>
                    </a>
                    <span className="text-[9px] font-mono text-slate-400">
                      {issuedCert.verificationCode}
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t flex flex-wrap items-center justify-end gap-2 print:hidden">
                  <a
                    href={`/verify/${issuedCert.verificationCode}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Probar Validación QR ↗
                  </a>
                  <a
                    href={issuedCert.qrCodeDataUrl}
                    download={`QR-${issuedCert.verificationCode}.png`}
                    className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5" /> Descargar QR
                  </a>
                  <button
                    onClick={() => window.print()}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
                  >
                    <Printer className="w-3.5 h-3.5" /> Imprimir Certificado
                  </button>
                </div>
              </div>
            ) : (
              <div className="h-full min-h-[300px] border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center p-8 text-center text-slate-400">
                <FileCheck className="w-12 h-12 text-slate-300 mb-3" />
                <h3 className="text-sm font-bold text-slate-700">
                  Vista Previa del Certificado
                </h3>
                <p className="text-xs text-slate-400 max-w-xs mt-1">
                  Diligencie el formulario para generar el certificado firmado con su código QR verificable.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Verify */}
      {activeTab === "verify" && (
        <div className="max-w-xl mx-auto space-y-6">
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-sm space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Verificación Pública de Autenticidad
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Ingrese el código alfanumérico que figura en el documento físico o escaneado.
              </p>
            </div>

            <form onSubmit={handleVerify} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Código de Verificación
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="Ej: JAC-041-A8F2"
                    value={verifyCode}
                    onChange={(e) => setVerifyCode(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isVerifying}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-sm transition"
              >
                {isVerifying ? "Consultando registro..." : "Verificar Autenticidad"}
              </button>
            </form>
          </div>

          {/* Verification Result Card */}
          {verificationResult && (
            <div
              className={`p-6 rounded-3xl border shadow-sm space-y-4 ${
                verificationResult.isValid
                  ? "bg-emerald-50/60 border-emerald-300"
                  : "bg-red-50/60 border-red-300"
              }`}
            >
              <div className="flex items-center gap-3">
                {verificationResult.isValid ? (
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 flex-shrink-0" />
                ) : (
                  <XCircle className="w-8 h-8 text-red-600 flex-shrink-0" />
                )}
                <div>
                  <h3
                    className={`font-black text-base ${
                      verificationResult.isValid ? "text-emerald-900" : "text-red-900"
                    }`}
                  >
                    {verificationResult.isValid
                      ? "Certificado Oficial Auténtico y Válido"
                      : "Certificado No Válido o No Encontrado"}
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Estado: <span className="font-bold">{verificationResult.status}</span>
                  </p>
                </div>
              </div>

              {verificationResult.isValid && verificationResult.metadata && (
                <div className="bg-white/90 p-4 rounded-2xl border border-emerald-200/80 text-xs space-y-1.5 text-slate-700">
                  <p>
                    <span className="text-slate-400">Junta de Acción Comunal:</span>{" "}
                    <strong>{verificationResult.jac?.name}</strong>
                  </p>
                  <p>
                    <span className="text-slate-400">Titular del Certificado:</span>{" "}
                    <strong>{verificationResult.metadata.citizenName}</strong>
                  </p>
                  <p>
                    <span className="text-slate-400">Identificación:</span>{" "}
                    <strong>{verificationResult.metadata.identificationNumber}</strong>
                  </p>
                  <p>
                    <span className="text-slate-400">Vigencia hasta:</span>{" "}
                    <strong className="text-emerald-700">
                      {new Date(verificationResult.validUntil || "").toLocaleDateString("es-CO")}
                    </strong>
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

