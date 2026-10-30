"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  Copy,
  Check,
  ExternalLink,
  Eye,
  User,
  Calendar,
  X,
  Plus,
  RefreshCw,
} from "lucide-react";
import { CertificateType, CertificateStatus } from "@conectajac/shared";

interface CertificateResponse {
  message: string;
  certificate: {
    id: string;
    verificationCode: string;
    verificationUrl?: string;
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

interface JacCertificateItem {
  id: string;
  verificationCode: string;
  verificationUrl: string;
  qrCodeDataUrl: string;
  type: string;
  status: string;
  purpose: string;
  issuedAt: string;
  validUntil: string;
  metadata?: {
    jacName?: string;
    legalPersonhoodNumber?: string;
    citizenName?: string;
    identificationType?: string;
    identificationNumber?: string;
    residenceAddress?: string;
    bookNumber?: number;
    folioNumber?: number;
    purpose?: string;
  };
  user: {
    id: string;
    firstName: string;
    lastName: string;
    identificationType: string;
    identificationNumber: string;
  };
  jac: {
    id: string;
    name: string;
    veredaOrBarrio: string;
    legalPersonhoodNumber: string;
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
  const queryClient = useQueryClient();
  const { currentJacId, isSuperAdmin } = useAuthStore();
  const [activeTab, setActiveTab] = useState<"list" | "issue" | "verify">("list");

  // Search & filter for issued certificates list
  const [listSearch, setListSearch] = useState("");

  // Inspect modal state
  const [inspectCert, setInspectCert] = useState<JacCertificateItem | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Issue state
  const [certType, setCertType] = useState<CertificateType>(CertificateType.RESIDENCE);
  const [selectedAffiliateId, setSelectedAffiliateId] = useState("");
  const [purpose, setPurpose] = useState("");
  const [issuedCert, setIssuedCert] = useState<CertificateResponse["certificate"] | null>(null);

  // Verification state
  const [verifyCode, setVerifyCode] = useState("");
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // Query: All certificates issued in the JAC
  const {
    data: certList = [],
    isLoading: isLoadingList,
    refetch: refetchList,
  } = useQuery<JacCertificateItem[]>({
    queryKey: ["jac-certificates", currentJacId],
    queryFn: () => apiClient("/certificates/jac-certificates"),
  });

  // Query: Affiliates in current JAC (for the selector)
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
      queryClient.invalidateQueries({ queryKey: ["jac-certificates"] });
      queryClient.invalidateQueries({ queryKey: ["asojuntas-overview"] });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (certId: string) =>
      apiClient(`/certificates/${certId}/revoke`, { method: "PATCH" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jac-certificates"] });
      if (inspectCert) {
        setInspectCert({ ...inspectCert, status: CertificateStatus.REVOKED });
      }
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

  const copyToClipboard = (text: string) => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(text);
      setCopiedCode(text);
      setTimeout(() => setCopiedCode(null), 2000);
    }
  };

  const filteredCertList = certList.filter((cert) => {
    if (!listSearch.trim()) return true;
    const term = listSearch.toLowerCase();
    const code = cert.verificationCode.toLowerCase();
    const name = `${cert.user.firstName} ${cert.user.lastName}`.toLowerCase();
    const doc = cert.user.identificationNumber.toLowerCase();
    const purpose = (cert.purpose || "").toLowerCase();
    return (
      code.includes(term) ||
      name.includes(term) ||
      doc.includes(term) ||
      purpose.includes(term)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Certificados Comunales Oficiales
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200">
              Ley 2166 de 2021
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Emisión, custodia y validación en tiempo real de certificados con código criptográfico y QR verificable.
          </p>
        </div>

        <button
          onClick={() => setActiveTab("issue")}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold text-sm rounded-xl shadow-sm transition"
        >
          <Plus className="w-4 h-4" /> Expedir Nuevo Certificado
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200">
        <div className="flex">
          <button
            onClick={() => setActiveTab("list")}
            className={`py-3 px-6 text-sm font-semibold border-b-2 transition flex items-center gap-2 ${
              activeTab === "list"
                ? "border-emerald-600 text-emerald-700 font-bold"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <FileCheck className="w-4 h-4" /> Certificados Emitidos ({certList.length})
          </button>
          <button
            onClick={() => setActiveTab("issue")}
            className={`py-3 px-6 text-sm font-semibold border-b-2 transition flex items-center gap-2 ${
              activeTab === "issue"
                ? "border-emerald-600 text-emerald-700 font-bold"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Plus className="w-4 h-4" /> Expedir Certificado
          </button>
          <button
            onClick={() => setActiveTab("verify")}
            className={`py-3 px-6 text-sm font-semibold border-b-2 transition flex items-center gap-2 ${
              activeTab === "verify"
                ? "border-emerald-600 text-emerald-700 font-bold"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <QrCode className="w-4 h-4" /> Validar Código QR
          </button>
        </div>

        <button
          onClick={() => refetchList()}
          title="Actualizar listado de certificados"
          className="hidden sm:inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 p-2 rounded-lg"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Actualizar
        </button>
      </div>

      {/* Tab 1: Certificados Emitidos List */}
      {activeTab === "list" && (
        <div className="space-y-4">
          {/* Search bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por código (ej: JAC-...), nombre del habitante o cédula..."
                value={listSearch}
                onChange={(e) => setListSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm"
              />
            </div>
            {listSearch && (
              <button
                onClick={() => setListSearch("")}
                className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1"
              >
                Limpiar
              </button>
            )}
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Código de Verificación</th>
                    <th className="py-3.5 px-4">Titular / Afiliado</th>
                    <th className="py-3.5 px-4">Modalidad</th>
                    <th className="py-3.5 px-4">Propósito</th>
                    <th className="py-3.5 px-4">Fecha Emisión</th>
                    <th className="py-3.5 px-4">Estado</th>
                    <th className="py-3.5 px-4 text-center">Código QR</th>
                    <th className="py-3.5 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {isLoadingList ? (
                    <tr>
                      <td colSpan={8} className="text-center py-12 text-slate-400">
                        Cargando certificados emitidos...
                      </td>
                    </tr>
                  ) : filteredCertList.length > 0 ? (
                    filteredCertList.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-xs bg-slate-100 text-slate-800 px-2.5 py-1 rounded-lg border border-slate-200">
                              {item.verificationCode}
                            </span>
                            <button
                              onClick={() => copyToClipboard(item.verificationCode)}
                              title="Copiar código de verificación"
                              className="p-1 text-slate-400 hover:text-emerald-600 rounded transition"
                            >
                              {copiedCode === item.verificationCode ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-900">
                          <div>
                            {item.user.firstName} {item.user.lastName}
                          </div>
                          <span className="text-[11px] text-slate-400 font-normal">
                            {item.user.identificationType}: {item.user.identificationNumber}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-semibold text-xs border border-emerald-200">
                            {item.type}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-600 max-w-xs truncate" title={item.purpose}>
                          {item.purpose}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-500">
                          {new Date(item.issuedAt).toLocaleDateString("es-CO")}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              item.status === CertificateStatus.VALID
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : item.status === CertificateStatus.EXPIRED
                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                : "bg-red-50 text-red-700 border border-red-200"
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={() => setInspectCert(item)}
                            title="Ver código QR oficial"
                            className="inline-block p-1 bg-white rounded-lg border border-slate-200 hover:border-emerald-500 shadow-sm transition hover:scale-105"
                          >
                            <img
                              src={item.qrCodeDataUrl}
                              alt="QR"
                              className="w-8 h-8 rounded"
                            />
                          </button>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setInspectCert(item)}
                              className="px-2.5 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition flex items-center gap-1"
                              title="Ver ficha completa y QR"
                            >
                              <Eye className="w-3.5 h-3.5" /> Ver
                            </button>
                            <a
                              href={`/verify/${item.verificationCode}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2.5 py-1 text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg transition flex items-center gap-1"
                              title="Abrir página pública de verificación"
                            >
                              <ExternalLink className="w-3.5 h-3.5" /> Validar
                            </a>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="text-center py-12 text-slate-400">
                        {listSearch
                          ? "No se encontraron certificados con los criterios de búsqueda."
                          : "Aún no se han emitido certificados en esta Junta de Acción Comunal."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Issue Certificate Form */}
      {activeTab === "issue" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Issue Form Card */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-sm space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Formulario de Expedición
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Validez legal estándar de 90 días conforme al estatuto comunal y Ley 2166 de 2021.
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
                  {affiliatesData?.data?.map((item: any) => (
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
                  placeholder="Ej: Para postulación a subsidio de vivienda rural municipal, trámite bancario o constancia de vecindad..."
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
                      República de Colombia • Ley 2166 de 2021
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
                  {/* Highlighted verification code */}
                  <div className="mt-2 inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-4 py-1.5 rounded-xl">
                    <span className="text-xs text-slate-500 font-semibold">Código Oficial:</span>
                    <strong className="font-mono text-sm font-black text-emerald-900">
                      {issuedCert.verificationCode}
                    </strong>
                    <button
                      onClick={() => copyToClipboard(issuedCert.verificationCode)}
                      title="Copiar código oficial"
                      className="text-emerald-700 hover:text-emerald-900 ml-1"
                    >
                      {copiedCode === issuedCert.verificationCode ? (
                        <Check className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
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
              <div className="h-full min-h-[350px] border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center p-8 text-center text-slate-400">
                <FileCheck className="w-12 h-12 text-slate-300 mb-3" />
                <h3 className="text-sm font-bold text-slate-700">
                  Vista Previa del Certificado
                </h3>
                <p className="text-xs text-slate-400 max-w-xs mt-1">
                  Diligencie el formulario para generar el certificado firmado con su código alfanumérico y código QR verificable.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Validate QR Tab */}
      {activeTab === "verify" && (
        <div className="max-w-xl mx-auto space-y-6">
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-sm space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Verificación Pública de Autenticidad
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Ingrese el código alfanumérico que figura en el documento físico o digital emitido.
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
                {isVerifying ? "Consultando registro comunal..." : "Verificar Autenticidad"}
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
                  <p className="text-xs text-slate-500">
                    Código: <strong className="font-mono">{verificationResult.verificationCode || verifyCode}</strong>
                  </p>
                </div>
              </div>

              {verificationResult.isValid && verificationResult.metadata ? (
                <div className="text-xs text-slate-700 space-y-1.5 pt-2 border-t border-emerald-200">
                  <p>
                    <strong>JAC Emisora:</strong> {verificationResult.metadata.jacName} (PJ: {verificationResult.metadata.legalPersonhoodNumber})
                  </p>
                  <p>
                    <strong>Ciudadano:</strong> {verificationResult.metadata.citizenName} ({verificationResult.metadata.identificationNumber})
                  </p>
                  <p>
                    <strong>Modalidad:</strong> Certificado de {verificationResult.metadata.type}
                  </p>
                  <p>
                    <strong>Propósito:</strong> {verificationResult.metadata.purpose}
                  </p>
                  <p className="text-emerald-800 font-semibold pt-1">
                    Válido hasta: {verificationResult.validUntil ? new Date(verificationResult.validUntil).toLocaleDateString("es-CO") : "-"}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-red-700">
                  {verificationResult.message || "El código no corresponde a ningún certificado válido emitido en el sistema."}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Inspect Modal: Detail of an issued certificate */}
      {inspectCert && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-6 relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b pb-4">
              <div>
                <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
                  Constancia Comunal Oficial • Ley 2166
                </span>
                <h3 className="text-base font-extrabold text-slate-900">
                  Certificado de {inspectCert.type}
                </h3>
                <p className="text-xs text-slate-500">
                  {inspectCert.jac.name} (Vereda {inspectCert.jac.veredaOrBarrio})
                </p>
              </div>
              <button
                onClick={() => setInspectCert(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Verification Code Box */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-slate-500 block">
                  Código Único de Verificación
                </span>
                <strong className="font-mono text-base font-black text-slate-900 tracking-wider">
                  {inspectCert.verificationCode}
                </strong>
              </div>
              <button
                onClick={() => copyToClipboard(inspectCert.verificationCode)}
                className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-emerald-50 hover:text-emerald-800 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
              >
                {copiedCode === inspectCert.verificationCode ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" /> ¡Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" /> Copiar Código
                  </>
                )}
              </button>
            </div>

            {/* QR Code */}
            <div className="text-center space-y-2">
              <a
                href={`/verify/${inspectCert.verificationCode}`}
                target="_blank"
                rel="noopener noreferrer"
                title="Abrir página pública de verificación"
                className="inline-block group relative"
              >
                <img
                  src={inspectCert.qrCodeDataUrl}
                  alt="QR Oficial"
                  className="w-36 h-36 mx-auto rounded-2xl border-2 border-emerald-300 p-2 bg-white shadow-md group-hover:scale-105 transition"
                />
                <span className="text-[11px] text-emerald-700 font-semibold block mt-1">
                  Abrir enlace de verificación ↗
                </span>
              </a>
              <p className="text-[11px] text-slate-400">
                Escanee con la cámara de cualquier teléfono para validar autenticidad.
              </p>
            </div>

            {/* Metadata Summary */}
            <div className="text-xs text-slate-600 bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-1.5">
              <p>
                <strong>Titular:</strong> {inspectCert.user.firstName} {inspectCert.user.lastName} ({inspectCert.user.identificationType} {inspectCert.user.identificationNumber})
              </p>
              <p>
                <strong>Propósito:</strong> {inspectCert.purpose}
              </p>
              <p>
                <strong>Fecha de Expedición:</strong> {new Date(inspectCert.issuedAt).toLocaleDateString("es-CO")}
              </p>
              <p>
                <strong>Válido Hasta:</strong> {new Date(inspectCert.validUntil).toLocaleDateString("es-CO")}
              </p>
              <p>
                <strong>Estado Actual:</strong>{" "}
                <span
                  className={`font-bold ${
                    inspectCert.status === CertificateStatus.VALID
                      ? "text-emerald-700"
                      : "text-red-700"
                  }`}
                >
                  {inspectCert.status}
                </span>
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t">
              <a
                href={inspectCert.qrCodeDataUrl}
                download={`QR-${inspectCert.verificationCode}.png`}
                className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
              >
                <Download className="w-3.5 h-3.5" /> Descargar QR
              </a>
              <a
                href={`/verify/${inspectCert.verificationCode}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Validar en Línea ↗
              </a>
              {inspectCert.status === CertificateStatus.VALID && (
                <button
                  onClick={() => {
                    if (confirm("¿Está seguro de revocar este certificado comunal?")) {
                      revokeMutation.mutate(inspectCert.id);
                    }
                  }}
                  disabled={revokeMutation.isPending}
                  className="px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-semibold transition"
                >
                  Revocar
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
