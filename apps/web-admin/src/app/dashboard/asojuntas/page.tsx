"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth-store";
import { IdentificationType, UserRole } from "@conectajac/shared";
import {
  Building2,
  Users,
  FileCheck,
  Megaphone,
  Plus,
  Search,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  X,
  MapPin,
  Phone,
  Mail,
  Landmark,
} from "lucide-react";

interface JacItem {
  id: string;
  name: string;
  veredaOrBarrio: string;
  legalPersonhoodNumber: string;
  nit?: string;
  codeRup?: string;
  phone?: string;
  email?: string;
  logoUrl?: string;
  primaryColor?: string;
  isActive: boolean;
  municipality: {
    id: string;
    name: string;
    department: string;
  };
  _count: {
    memberships: number;
  };
}

interface MunicipalityItem {
  id: string;
  name: string;
  department: string;
  daneCode: string;
  _count: {
    jacs: number;
  };
}

interface AsojuntasOverview {
  totalJacs: number;
  activeJacs: number;
  inactiveJacs: number;
  totalAffiliates: number;
  totalCertificates: number;
  totalPosts: number;
}

export default function AsojuntasDashboardPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { switchJac, isSuperAdmin } = useAuthStore();

  const [search, setSearch] = useState("");
  const [selectedMunicipality, setSelectedMunicipality] = useState<string>("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCircularModalOpen, setIsCircularModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // New JAC Form State
  const [newJacForm, setNewJacForm] = useState({
    municipalityId: "",
    name: "",
    legalPersonhoodNumber: "",
    nit: "",
    codeRup: "",
    veredaOrBarrio: "",
    address: "",
    phone: "",
    email: "",
    adminUser: {
      identificationType: IdentificationType.CC,
      identificationNumber: "",
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      password: "Password123!",
    },
  });

  // Circular Form State
  const [circularForm, setCircularForm] = useState({
    title: "",
    content: "",
    priority: "NORMAL",
    type: "OFFICIAL_CIRCULAR",
  });

  // Queries
  const { data: overview, isLoading: loadingOverview } = useQuery<AsojuntasOverview>({
    queryKey: ["asojuntas-overview", selectedMunicipality],
    queryFn: () =>
      apiClient.get(
        `/jacs/overview/asojuntas${
          selectedMunicipality ? `?municipalityId=${selectedMunicipality}` : ""
        }`
      ),
  });

  const { data: municipalities = [] } = useQuery<MunicipalityItem[]>({
    queryKey: ["municipalities-list"],
    queryFn: () => apiClient.get("/jacs/municipalities"),
  });

  const { data: jacs = [], isLoading: loadingJacs } = useQuery<JacItem[]>({
    queryKey: ["jacs-directory", selectedMunicipality, search],
    queryFn: () =>
      apiClient.get(
        `/jacs?${new URLSearchParams({
          ...(selectedMunicipality ? { municipalityId: selectedMunicipality } : {}),
          ...(search ? { search } : {}),
        }).toString()}`
      ),
  });

  // Mutations
  const createJacMutation = useMutation({
    mutationFn: (payload: typeof newJacForm) => apiClient.post("/jacs", payload),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ["jacs-directory"] });
      queryClient.invalidateQueries({ queryKey: ["asojuntas-overview"] });
      setIsCreateModalOpen(false);
      setSuccessMessage(
        `JAC "${res.jac?.name || "creada"}" registrada exitosamente. Administrador fundador asignado con Folio #1.`
      );
      setErrorMessage(null);
      // Reset form
      setNewJacForm({
        municipalityId: municipalities[0]?.id || "",
        name: "",
        legalPersonhoodNumber: "",
        nit: "",
        codeRup: "",
        veredaOrBarrio: "",
        address: "",
        phone: "",
        email: "",
        adminUser: {
          identificationType: IdentificationType.CC,
          identificationNumber: "",
          firstName: "",
          lastName: "",
          email: "",
          phone: "",
          password: "Password123!",
        },
      });
      setTimeout(() => setSuccessMessage(null), 5000);
    },
    onError: (err: any) => {
      setErrorMessage(err.message || "Error al registrar la JAC.");
    },
  });

  const broadcastCircularMutation = useMutation({
    mutationFn: (payload: typeof circularForm) =>
      apiClient.post("/posts", {
        ...payload,
        scope: "MUNICIPAL_ASOJUNTAS",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["asojuntas-overview"] });
      setIsCircularModalOpen(false);
      setSuccessMessage("Circular normativa municipal difundida a todas las JACs exitosamente.");
      setCircularForm({
        title: "",
        content: "",
        priority: "NORMAL",
        type: "OFFICIAL_CIRCULAR",
      });
      setTimeout(() => setSuccessMessage(null), 5000);
    },
    onError: (err: any) => {
      setErrorMessage(err.message || "Error al emitir la circular municipal.");
    },
  });

  const handleCreateJacSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newJacForm.municipalityId && municipalities.length > 0) {
      newJacForm.municipalityId = municipalities[0].id;
    }
    createJacMutation.mutate(newJacForm);
  };

  const handleBroadcastCircularSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    broadcastCircularMutation.mutate(circularForm);
  };

  const handleSwitchToJac = (jac: JacItem) => {
    switchJac(jac.id);
    router.push("/dashboard");
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-bold uppercase tracking-wider mb-2">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            Asojuntas Municipal • Segundo Grado Comunal (Ley 2166)
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Consolidación y Censo Municipal de JACs
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Supervisión territorial, censo unificado de afiliados, habilitación de nuevas juntas y circulares normativas.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsCircularModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm shadow-sm transition"
          >
            <Megaphone className="w-4 h-4 text-blue-600" />
            Circular Municipal
          </button>

          <button
            onClick={() => {
              if (municipalities.length > 0 && !newJacForm.municipalityId) {
                setNewJacForm((prev) => ({ ...prev, municipalityId: municipalities[0].id }));
              }
              setIsCreateModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-md shadow-blue-500/20 transition"
          >
            <Plus className="w-4 h-4" />
            Registrar Nueva JAC
          </button>
        </div>
      </div>

      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center gap-3 shadow-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <p className="text-sm font-medium">{successMessage}</p>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl flex items-center gap-3 shadow-sm">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <p className="text-sm font-medium">{errorMessage}</p>
        </div>
      )}

      {/* KPI Overview Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total JACs */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              JACs Registradas
            </span>
            <span className="text-2xl font-black text-slate-900 mt-1 block">
              {loadingOverview ? "..." : overview?.totalJacs ?? 0}
            </span>
            <span className="text-[11px] text-emerald-600 font-medium">
              {overview?.activeJacs ?? 0} activas en el municipio
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Building2 className="w-6 h-6" />
          </div>
        </div>

        {/* Total Affiliates (Censo) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              Censo Comunal Total
            </span>
            <span className="text-2xl font-black text-slate-900 mt-1 block">
              {loadingOverview ? "..." : (overview?.totalAffiliates ?? 0).toLocaleString("es-CO")}
            </span>
            <span className="text-[11px] text-slate-400">
              Afiliados con folio legal activo
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Certificates */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              Certificados con QR
            </span>
            <span className="text-2xl font-black text-slate-900 mt-1 block">
              {loadingOverview ? "..." : overview?.totalCertificates ?? 0}
            </span>
            <span className="text-[11px] text-slate-400">
              Expedidos por las JACs
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <FileCheck className="w-6 h-6" />
          </div>
        </div>

        {/* Circulares */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              Avisos y Alertas
            </span>
            <span className="text-2xl font-black text-slate-900 mt-1 block">
              {loadingOverview ? "..." : overview?.totalPosts ?? 0}
            </span>
            <span className="text-[11px] text-slate-400">
              Difusiones normativas activas
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Megaphone className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Directory Section */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
        {/* Table Filters Bar */}
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Directorio Municipal de Juntas de Acción Comunal
            </h2>
            <p className="text-xs text-slate-400">
              Organizaciones comunales registradas ante la entidad de inspección, vigilancia y control.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            {/* Municipality Filter */}
            <select
              value={selectedMunicipality}
              onChange={(e) => setSelectedMunicipality(e.target.value)}
              className="w-full sm:w-auto px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos los Municipios</option>
              {municipalities.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.department})
                </option>
              ))}
            </select>

            {/* Search */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por vereda o JAC..."
                className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-100">
              <tr>
                <th className="py-3.5 px-4">Junta de Acción Comunal</th>
                <th className="py-3.5 px-4">Ubicación / Vereda</th>
                <th className="py-3.5 px-4">Personería Jurídica</th>
                <th className="py-3.5 px-4">NIT / RUP</th>
                <th className="py-3.5 px-4 text-center">Censo Afiliados</th>
                <th className="py-3.5 px-4 text-center">Estado</th>
                <th className="py-3.5 px-4 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loadingJacs ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Cargando directorio comunal...
                  </td>
                </tr>
              ) : jacs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No se encontraron Juntas de Acción Comunal con los criterios aplicados.
                  </td>
                </tr>
              ) : (
                jacs.map((jac) => (
                  <tr key={jac.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-white text-xs shrink-0"
                          style={{ backgroundColor: jac.primaryColor || "#059669" }}
                        >
                          {jac.name[0]}
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 block">{jac.name}</span>
                          <span className="text-[11px] text-slate-400">
                            {jac.email || "Sin correo"}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 font-medium text-slate-800">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>Vereda {jac.veredaOrBarrio}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 block ml-5">
                        {jac.municipality?.name}, {jac.municipality?.department}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-800">
                      {jac.legalPersonhoodNumber}
                    </td>

                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600">
                      <div>NIT: {jac.nit || "En trámite"}</div>
                      {jac.codeRup && (
                        <div className="text-slate-400">RUP: {jac.codeRup}</div>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full text-xs">
                        <Users className="w-3 h-3" />
                        {jac._count?.memberships ?? 0}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          jac.isActive
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {jac.isActive ? "Activa" : "Inactiva"}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleSwitchToJac(jac)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 font-semibold text-xs transition"
                        title="Cambiar al panel directivo de esta JAC"
                      >
                        Administrar <ExternalLink className="w-3.5 h-3.5 ml-0.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Register New JAC */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-6 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Registro de Nueva Junta de Acción Comunal
                  </h3>
                  <p className="text-xs text-slate-400">
                    Conforme a la Ley 2166 de 2021 y control de Asojuntas.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateJacSubmit} className="space-y-6">
              {/* Institutional Details */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  1. Información Institucional y Territorial
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Municipio de Jurisdicción *
                    </label>
                    <select
                      value={newJacForm.municipalityId}
                      onChange={(e) =>
                        setNewJacForm({ ...newJacForm, municipalityId: e.target.value })
                      }
                      required
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {municipalities.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.department})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Nombre de la JAC *
                    </label>
                    <input
                      type="text"
                      required
                      value={newJacForm.name}
                      onChange={(e) =>
                        setNewJacForm({ ...newJacForm, name: e.target.value })
                      }
                      placeholder="Ej. JAC Vereda La Esmeralda"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Número de Personería Jurídica *
                    </label>
                    <input
                      type="text"
                      required
                      value={newJacForm.legalPersonhoodNumber}
                      onChange={(e) =>
                        setNewJacForm({
                          ...newJacForm,
                          legalPersonhoodNumber: e.target.value,
                        })
                      }
                      placeholder="Ej. PJ-0540-ST"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Vereda o Sector Comunal *
                    </label>
                    <input
                      type="text"
                      required
                      value={newJacForm.veredaOrBarrio}
                      onChange={(e) =>
                        setNewJacForm({ ...newJacForm, veredaOrBarrio: e.target.value })
                      }
                      placeholder="Ej. La Esmeralda"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      NIT Comunal (Opcional)
                    </label>
                    <input
                      type="text"
                      value={newJacForm.nit}
                      onChange={(e) =>
                        setNewJacForm({ ...newJacForm, nit: e.target.value })
                      }
                      placeholder="Ej. 900.888.999-1"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Código RUP (Registro Único Comunal)
                    </label>
                    <input
                      type="text"
                      value={newJacForm.codeRup}
                      onChange={(e) =>
                        setNewJacForm({ ...newJacForm, codeRup: e.target.value })
                      }
                      placeholder="Ej. RUP-68689-005"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Administrator User Section */}
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    2. Usuario Administrador / Directivo Fundador (Folio #1)
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Cédula de Ciudadanía *
                    </label>
                    <input
                      type="text"
                      required
                      value={newJacForm.adminUser.identificationNumber}
                      onChange={(e) =>
                        setNewJacForm({
                          ...newJacForm,
                          adminUser: {
                            ...newJacForm.adminUser,
                            identificationNumber: e.target.value,
                          },
                        })
                      }
                      placeholder="Ej. 1098123456"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Teléfono Móvil (WhatsApp) *
                    </label>
                    <input
                      type="text"
                      required
                      value={newJacForm.adminUser.phone}
                      onChange={(e) =>
                        setNewJacForm({
                          ...newJacForm,
                          adminUser: {
                            ...newJacForm.adminUser,
                            phone: e.target.value,
                          },
                        })
                      }
                      placeholder="Ej. +57 310 123 4567"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Nombres *
                    </label>
                    <input
                      type="text"
                      required
                      value={newJacForm.adminUser.firstName}
                      onChange={(e) =>
                        setNewJacForm({
                          ...newJacForm,
                          adminUser: {
                            ...newJacForm.adminUser,
                            firstName: e.target.value,
                          },
                        })
                      }
                      placeholder="Nombres del directivo"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Apellidos *
                    </label>
                    <input
                      type="text"
                      required
                      value={newJacForm.adminUser.lastName}
                      onChange={(e) =>
                        setNewJacForm({
                          ...newJacForm,
                          adminUser: {
                            ...newJacForm.adminUser,
                            lastName: e.target.value,
                          },
                        })
                      }
                      placeholder="Apellidos del directivo"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Correo Electrónico Directivo *
                    </label>
                    <input
                      type="email"
                      required
                      value={newJacForm.adminUser.email}
                      onChange={(e) =>
                        setNewJacForm({
                          ...newJacForm,
                          adminUser: {
                            ...newJacForm.adminUser,
                            email: e.target.value,
                          },
                        })
                      }
                      placeholder="directivo@conectajac.org"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={createJacMutation.isPending}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 transition disabled:opacity-50"
                >
                  {createJacMutation.isPending ? "Registrando JAC..." : "Registrar JAC y Asignar Folio #1"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Broadcast Municipal Circular */}
      {isCircularModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600">
                  <Megaphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Emitir Circular Municipal (Asojuntas)
                  </h3>
                  <p className="text-xs text-slate-400">
                    Se publicará en las carteleras de todas las veredas y barrios del municipio.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCircularModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleBroadcastCircularSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Título de la Circular o Comunicado *
                </label>
                <input
                  type="text"
                  required
                  value={circularForm.title}
                  onChange={(e) =>
                    setCircularForm({ ...circularForm, title: e.target.value })
                  }
                  placeholder="Ej. Circular 002: Directrices Elecciones de Dignatarios Comunal"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tipo de Comunicado
                  </label>
                  <select
                    value={circularForm.type}
                    onChange={(e) =>
                      setCircularForm({ ...circularForm, type: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="OFFICIAL_CIRCULAR">Circular Oficial</option>
                    <option value="EMERGENCY_ALERT">Alerta de Emergencia</option>
                    <option value="NEWS">Noticia Municipal</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Prioridad
                  </label>
                  <select
                    value={circularForm.priority}
                    onChange={(e) =>
                      setCircularForm({ ...circularForm, priority: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="NORMAL">Normal</option>
                    <option value="HIGH">Alta</option>
                    <option value="URGENT">Urgente (Notificación Push inmediata)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Contenido Normativo o Mensaje *
                </label>
                <textarea
                  rows={4}
                  required
                  value={circularForm.content}
                  onChange={(e) =>
                    setCircularForm({ ...circularForm, content: e.target.value })
                  }
                  placeholder="Escriba las instrucciones, plazos y disposiciones de Asojuntas..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCircularModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={broadcastCircularMutation.isPending}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 transition disabled:opacity-50"
                >
                  {broadcastCircularMutation.isPending ? "Difundiendo..." : "Publicar Circular Municipal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

