"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth-store";
import {
  Building2,
  Save,
  Palette,
  ShieldCheck,
  CreditCard,
  Plus,
  Trash2,
  Users,
  AlertCircle,
  CheckCircle2,
  Mail,
  Phone,
  MapPin,
  ExternalLink,
} from "lucide-react";

interface BankAccount {
  bankName: string;
  accountType: string;
  accountNumber: string;
  holderName: string;
  holderNit: string;
}

interface Directivo {
  id: string;
  role: string;
  folioNumber: number;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    avatarUrl?: string;
  };
}

interface JacDetails {
  id: string;
  name: string;
  nit?: string;
  legalPersonhoodNumber: string;
  codeRup?: string;
  veredaOrBarrio: string;
  address?: string;
  phone?: string;
  email?: string;
  logoUrl?: string;
  officialSealUrl?: string;
  primaryColor?: string;
  bankAccounts?: BankAccount[];
  municipality?: {
    name: string;
    department: string;
  };
  memberships?: Directivo[];
  _count?: {
    memberships: number;
    certificates: number;
    posts: number;
  };
}

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { currentJacId } = useAuthStore();
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    nit: "",
    address: "",
    phone: "",
    email: "",
    logoUrl: "",
    officialSealUrl: "",
    primaryColor: "#059669",
    bankAccounts: [] as BankAccount[],
  });

  const { data: jac, isLoading } = useQuery<JacDetails>({
    queryKey: ["jac-settings", currentJacId],
    queryFn: async () => {
      return apiClient.get<JacDetails>(`/jacs/${currentJacId}`);
    },
    enabled: !!currentJacId,
  });

  useEffect(() => {
    if (jac) {
      setFormData({
        name: jac.name || "",
        nit: jac.nit || "",
        address: jac.address || "",
        phone: jac.phone || "",
        email: jac.email || "",
        logoUrl: jac.logoUrl || "",
        officialSealUrl: jac.officialSealUrl || "",
        primaryColor: jac.primaryColor || "#059669",
        bankAccounts: jac.bankAccounts || [],
      });
    }
  }, [jac]);

  const updateMutation = useMutation({
    mutationFn: async (payload: typeof formData) => {
      return apiClient.patch(`/jacs/${currentJacId}/settings`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jac-settings", currentJacId] });
      setSaveSuccess(true);
      setErrorMessage("");
      setTimeout(() => setSaveSuccess(false), 4000);
    },
    onError: (err: any) => {
      setErrorMessage(
        err?.response?.data?.message || "Error al actualizar la configuración de la JAC."
      );
    },
  });

  const handleAddBankAccount = () => {
    setFormData((prev) => ({
      ...prev,
      bankAccounts: [
        ...prev.bankAccounts,
        {
          bankName: "Banco Agrario de Colombia",
          accountType: "Ahorros",
          accountNumber: "",
          holderName: formData.name || "JAC",
          holderNit: formData.nit || "",
        },
      ],
    }));
  };

  const handleRemoveBankAccount = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      bankAccounts: prev.bankAccounts.filter((_, i) => i !== index),
    }));
  };

  const handleBankAccountChange = (index: number, field: keyof BankAccount, value: string) => {
    setFormData((prev) => {
      const updated = [...prev.bankAccounts];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, bankAccounts: updated };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const roleLabels: Record<string, string> = {
    JAC_PRESIDENT: "Presidente(a)",
    JAC_VICE_PRESIDENT: "Vicepresidente(a)",
    JAC_SECRETARY: "Secretario(a)",
    JAC_TREASURER: "Tesorero(a)",
    JAC_FISCAL: "Fiscal",
    JAC_ADMIN: "Administrador del Sistema",
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Configuración Institucional
          </h1>
          <p className="text-sm text-slate-500">
            Identidad legal (Ley 2166), sellos oficiales, imagen corporativa y cuentas bancarias de recaudo.
          </p>
        </div>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={updateMutation.isPending}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm transition disabled:opacity-50"
        >
          {updateMutation.isPending ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Guardar Cambios
        </button>
      </div>

      {saveSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <p className="text-sm font-medium">Configuración institucional guardada exitosamente.</p>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <p className="text-sm font-medium">{errorMessage}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Card 1: Legal & Territorial Information */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Información Legal y Personería Jurídica
              </h2>
              <p className="text-xs text-slate-400">
                Datos oficiales registrados ante el Ministerio del Interior o Secretaría de Gobierno.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Nombre de la Junta de Acción Comunal
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="Ej. JAC Vereda El Salado"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                NIT Comunal
              </label>
              <input
                type="text"
                value={formData.nit}
                onChange={(e) => setFormData({ ...formData, nit: e.target.value })}
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="Ej. 900.123.456-7"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Número de Personería Jurídica
              </label>
              <input
                type="text"
                disabled
                value={jac?.legalPersonhoodNumber || "Sin registrar"}
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-200 bg-slate-50 text-slate-500 cursor-not-allowed"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Asignado por Asojuntas / Entidad de Inspección y Vigilancia.
              </span>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Código RUP (Registro Único Comunal)
              </label>
              <input
                type="text"
                disabled
                value={jac?.codeRup || "En trámite"}
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-200 bg-slate-50 text-slate-500 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Municipio y Departamento
              </label>
              <div className="px-3.5 py-2 text-sm rounded-lg border border-slate-200 bg-slate-50 text-slate-600 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-slate-400" />
                {jac?.municipality?.name}, {jac?.municipality?.department}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Vereda o Sector Comunal
              </label>
              <input
                type="text"
                disabled
                value={jac?.veredaOrBarrio || ""}
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-200 bg-slate-50 text-slate-500 cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        {/* Card 2: Contact Information */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Canales de Contacto y Sede Comunal
              </h2>
              <p className="text-xs text-slate-400">
                Datos visibles en los certificados digitales y en la cartelera ciudadana.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Dirección / Sede Comunal
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full pl-9 pr-3.5 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Ej. Casa Comunal Frente a la Cancha"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Teléfono de Contacto
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full pl-9 pr-3.5 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Ej. +57 310 123 4567"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Correo Institucional JAC
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full pl-9 pr-3.5 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="jac.vereda@conectajac.org"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Institutional Branding (Logo, Seal, Colors) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Imagen Institucional y Sellos de Autenticidad
              </h2>
              <p className="text-xs text-slate-400">
                Personalice los sellos que se imprimen en los certificados de residencia oficiales.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Color Institucional
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={formData.primaryColor}
                  onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                  className="w-10 h-10 rounded-lg cursor-pointer border border-slate-200 p-0.5"
                />
                <input
                  type="text"
                  value={formData.primaryColor}
                  onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                  className="w-28 px-3 py-2 text-sm font-mono uppercase rounded-lg border border-slate-200"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                URL del Escudo o Logo
              </label>
              <input
                type="url"
                value={formData.logoUrl}
                onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="https://..."
              />
              {formData.logoUrl && (
                <div className="mt-2 flex items-center gap-2">
                  <img
                    src={formData.logoUrl}
                    alt="Logo"
                    className="w-12 h-12 object-contain rounded-lg border border-slate-200 bg-slate-50 p-1"
                  />
                  <span className="text-xs text-slate-400">Vista previa logo</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                URL del Sello Oficial de la JAC
              </label>
              <input
                type="url"
                value={formData.officialSealUrl}
                onChange={(e) => setFormData({ ...formData, officialSealUrl: e.target.value })}
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="https://..."
              />
              {formData.officialSealUrl && (
                <div className="mt-2 flex items-center gap-2">
                  <img
                    src={formData.officialSealUrl}
                    alt="Sello"
                    className="w-12 h-12 object-contain rounded-lg border border-slate-200 bg-slate-50 p-1"
                  />
                  <span className="text-xs text-slate-400">Sello que estampa el certificado</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Card 4: Bank Accounts for Recaudo */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Cuentas Bancarias de Recaudo
                </h2>
                <p className="text-xs text-slate-400">
                  Cuentas habilitadas para transferencias directas, PSE o corresponsales bancarios veredales.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleAddBankAccount}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
            >
              <Plus className="w-3.5 h-3.5" /> Agregar Cuenta
            </button>
          </div>

          {formData.bankAccounts.length === 0 ? (
            <div className="text-center py-6 text-sm text-slate-400">
              No hay cuentas bancarias configuradas. Los pagos solo se registrarán en caja menor física.
            </div>
          ) : (
            <div className="space-y-4">
              {formData.bankAccounts.map((acc, index) => (
                <div
                  key={index}
                  className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-center p-3.5 rounded-xl border border-slate-200 bg-slate-50/50"
                >
                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 mb-0.5">
                      Banco
                    </label>
                    <input
                      type="text"
                      value={acc.bankName}
                      onChange={(e) => handleBankAccountChange(index, "bankName", e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white"
                      placeholder="Banco Agrario, Daviplata..."
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 mb-0.5">
                      Tipo de Cuenta
                    </label>
                    <select
                      value={acc.accountType}
                      onChange={(e) => handleBankAccountChange(index, "accountType", e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white"
                    >
                      <option value="Ahorros">Ahorros</option>
                      <option value="Corriente">Corriente</option>
                      <option value="Digital">Billetera Digital (Nequi/Daviplata)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 mb-0.5">
                      Número de Cuenta
                    </label>
                    <input
                      type="text"
                      value={acc.accountNumber}
                      onChange={(e) => handleBankAccountChange(index, "accountNumber", e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white font-mono"
                      placeholder="000-000000-00"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 mb-0.5">
                      Titular y NIT
                    </label>
                    <input
                      type="text"
                      value={acc.holderName}
                      onChange={(e) => handleBankAccountChange(index, "holderName", e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white"
                      placeholder="Titular"
                    />
                  </div>

                  <div className="flex items-end justify-between sm:justify-end gap-2 pt-2 sm:pt-4">
                    <button
                      type="button"
                      onClick={() => handleRemoveBankAccount(index)}
                      className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition"
                      title="Eliminar cuenta"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Card 5: Directiva Comunal Actual (Read-only list of Directivos from JAC memberships) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="p-2.5 rounded-xl bg-teal-50 text-teal-600">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Mesa Directiva Registrada (Ley 2166)
              </h2>
              <p className="text-xs text-slate-400">
                Dignatarios con firmas autorizadas y acceso administrativo al sistema comunal.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {jac?.memberships && jac.memberships.length > 0 ? (
              jac.memberships.map((m) => (
                <div
                  key={m.id}
                  className="p-4 rounded-xl border border-slate-200/80 bg-slate-50 flex items-start gap-3"
                >
                  <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-sm shrink-0">
                    {m.user.firstName[0]}
                    {m.user.lastName[0]}
                  </div>
                  <div className="overflow-hidden">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md inline-block mb-1">
                      {roleLabels[m.role] || m.role}
                    </span>
                    <h3 className="text-sm font-semibold text-slate-900 truncate">
                      {m.user.firstName} {m.user.lastName}
                    </h3>
                    <p className="text-xs text-slate-500 truncate">{m.user.email}</p>
                    <p className="text-xs text-slate-400 mt-1">Folio #{m.folioNumber}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 col-span-3">
                No hay dignatarios con rol directivo registrados aún.
              </p>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
