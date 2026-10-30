"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Building,
  User,
  Calendar,
  FileText,
  MapPin,
  Printer,
  Copy,
  ExternalLink,
  ArrowLeft,
} from "lucide-react";

interface VerificationResponse {
  isValid: boolean;
  status: "VALID" | "EXPIRED" | "REVOKED" | "NOT_FOUND" | "ERROR";
  message?: string;
  verificationCode?: string;
  verificationUrl?: string;
  qrCodeDataUrl?: string;
  issuedAt?: string;
  validUntil?: string;
  metadata?: {
    jacName: string;
    legalPersonhoodNumber: string;
    nit?: string;
    veredaOrBarrio: string;
    citizenName: string;
    identificationType: string;
    identificationNumber: string;
    residenceAddress: string;
    bookNumber: number;
    folioNumber: number;
    purpose: string;
    type: string;
    issuedAt: string;
    validUntil: string;
    verificationUrl?: string;
  };
  jac?: {
    id: string;
    name: string;
    legalPersonhoodNumber: string;
    nit?: string;
    veredaOrBarrio: string;
    logoUrl?: string;
    officialSealUrl?: string;
  };
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

export default function CertificateVerifyPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const resolvedParams = use(params);
  const code = decodeURIComponent(resolvedParams.code);

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<VerificationResponse | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function verify() {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/certificates/verify/${encodeURIComponent(code)}`);
        const json = await res.json();
        setData(json);
      } catch (err) {
        setData({
          isValid: false,
          status: "ERROR",
          message: "No fue posible comunicarse con el servicio comunal de verificación.",
        });
      } finally {
        setLoading(false);
      }
    }
    verify();
  }, [code]);

  const copyUrl = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/80 py-10 px-4 sm:px-6 font-sans">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Navigation & Header */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
          >
            <ArrowLeft className="w-4 h-4" /> Volver a ConectaJAC
          </Link>
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-white px-3 py-1 rounded-full border border-slate-200">
            Ley 2166 de 2021 • República de Colombia
          </span>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-3xl p-12 text-center shadow-sm border border-slate-200">
            <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <h2 className="text-base font-bold text-slate-800">
              Verificando autenticidad en tiempo real...
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Consultando Libro Digital y firma criptográfica comunal...
            </p>
          </div>
        )}

        {/* Not Found / Error State */}
        {!loading && (!data || !data.isValid) && (
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-red-200 space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center flex-shrink-0">
                <XCircle className="w-8 h-8" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-red-600">
                  Verificación Fallida
                </span>
                <h1 className="text-xl font-black text-slate-900">
                  {data?.status === "EXPIRED"
                    ? "Certificado Expirado"
                    : data?.status === "REVOKED"
                    ? "Certificado Revocado"
                    : "Certificado No Válido"}
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Código de consulta: <strong className="font-mono">{code}</strong>
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-red-50/80 border border-red-200/60 text-xs text-red-700 leading-relaxed">
              {data?.message ||
                "El código proporcionado no corresponde a ningún certificado activo en el registro del Libro Digital de Afiliados."}
            </div>

            <div className="pt-2 text-center text-xs text-slate-400">
              Si considera que esto es un error, por favor contacte a la directiva de la Junta de Acción Comunal correspondiente.
            </div>
          </div>
        )}

        {/* Valid Certificate State */}
        {!loading && data && data.isValid && data.metadata && (
          <div className="bg-white rounded-3xl p-6 sm:p-10 shadow-xl border-2 border-emerald-500/30 space-y-8 relative overflow-hidden print:border-none print:shadow-none print:p-0">
            {/* Top Seal & Status */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-600/20">
                  <ShieldCheck className="w-7 h-7" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-emerald-700 tracking-wider uppercase block">
                    Validación Criptográfica Exitosa
                  </span>
                  <h1 className="text-lg font-black text-slate-900">
                    Certificado Comunal Oficial y Válido
                  </h1>
                  <p className="text-xs text-slate-500">
                    Expedido en conformidad con la Ley 2166 de 2021
                  </p>
                </div>
              </div>

              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200 self-start sm:self-center">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>ESTADO: VIGENTE</span>
              </div>
            </div>

            {/* Document Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Entidad Emisora */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
                  <Building className="w-4 h-4 text-emerald-600" />
                  Junta de Acción Comunal Emisora
                </div>
                <div className="text-xs text-slate-600 space-y-1">
                  <p className="text-sm font-extrabold text-slate-900">
                    {data.metadata.jacName}
                  </p>
                  <p>
                    <span className="text-slate-400">Personería Jurídica:</span>{" "}
                    <strong className="text-slate-800">{data.metadata.legalPersonhoodNumber}</strong>
                  </p>
                  {data.metadata.nit && (
                    <p>
                      <span className="text-slate-400">NIT:</span>{" "}
                      <strong className="text-slate-800">{data.metadata.nit}</strong>
                    </p>
                  )}
                  <p>
                    <span className="text-slate-400">Vereda / Barrio:</span>{" "}
                    <strong className="text-slate-800">{data.metadata.veredaOrBarrio}</strong>
                  </p>
                </div>
              </div>

              {/* Ciudadano Beneficiario */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
                  <User className="w-4 h-4 text-emerald-600" />
                  Ciudadano(a) Titular
                </div>
                <div className="text-xs text-slate-600 space-y-1">
                  <p className="text-sm font-extrabold text-slate-900">
                    {data.metadata.citizenName}
                  </p>
                  <p>
                    <span className="text-slate-400">Documento:</span>{" "}
                    <strong className="text-slate-800">
                      {data.metadata.identificationType} {data.metadata.identificationNumber}
                    </strong>
                  </p>
                  <p>
                    <span className="text-slate-400">Dirección Veredal:</span>{" "}
                    <strong className="text-slate-800">{data.metadata.residenceAddress}</strong>
                  </p>
                  <p>
                    <span className="text-slate-400">Libro Digital:</span>{" "}
                    <span className="font-semibold text-emerald-700">
                      Folio #{data.metadata.folioNumber} (Libro #{data.metadata.bookNumber})
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* Certificate Purpose & Validity Banner */}
            <div className="p-5 rounded-2xl bg-emerald-50/50 border border-emerald-100 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-bold text-emerald-900 uppercase tracking-wide">
                  Modalidad: Certificado de {data.metadata.type}
                </span>
                <span className="font-mono text-xs font-bold text-slate-700 bg-white px-2.5 py-1 rounded-lg border border-emerald-200">
                  {data.verificationCode}
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                <strong className="text-slate-800">Propósito declarado:</strong>{" "}
                {data.metadata.purpose}
              </p>
              <div className="flex items-center gap-6 pt-2 border-t border-emerald-100/80 text-[11px] text-slate-500">
                <span>
                  <strong>Fecha de Expedición:</strong>{" "}
                  {new Date(data.metadata.issuedAt).toLocaleDateString("es-CO", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
                <span>
                  <strong>Válido Hasta:</strong>{" "}
                  {new Date(data.metadata.validUntil).toLocaleDateString("es-CO", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              </div>
            </div>

            {/* QR Code and Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-4 border-t border-slate-100">
              <div className="flex items-center gap-4">
                {data.qrCodeDataUrl && (
                  <img
                    src={data.qrCodeDataUrl}
                    alt="Código QR Oficial"
                    className="w-24 h-24 rounded-xl border p-1 bg-white shadow-sm flex-shrink-0"
                  />
                )}
                <div className="text-xs text-slate-500 space-y-1">
                  <p className="font-bold text-slate-800">
                    Firma Electrónica y Sello Comunal
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Este documento puede ser presentado ante alcaldías, gobernaciones, entidades bancarias, notarías y el Ministerio del Interior.
                  </p>
                  <p className="font-mono text-[10px] text-emerald-700 truncate max-w-xs">
                    {data.verificationUrl || `http://localhost:3000/verify/${data.verificationCode}`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 print:hidden w-full sm:w-auto">
                <button
                  onClick={copyUrl}
                  className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                >
                  <Copy className="w-3.5 h-3.5" />
                  {copied ? "¡Enlace Copiado!" : "Copiar Enlace"}
                </button>
                <button
                  onClick={() => window.print()}
                  className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition shadow-sm"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Imprimir Constancia
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
