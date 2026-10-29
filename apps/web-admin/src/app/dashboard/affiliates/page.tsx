"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth-store";
import {
  Users,
  Search,
  UserPlus,
  Filter,
  CheckCircle2,
  XCircle,
  AlertCircle,
  X,
  Building,
} from "lucide-react";
import { IdentificationType, UserRole, MembershipStatus } from "@conectajac/shared";

interface AffiliateItem {
  membershipId: string;
  bookNumber: number;
  folioNumber: number;
  affiliationDate: string;
  role: string;
  status: string;
  address: string;
  veredaOrBarrio: string;
  occupation?: string;
  hasLandOrFarm: boolean;
  farmName?: string;
  user: {
    id: string;
    identificationType: string;
    identificationNumber: string;
    firstName: string;
    lastName: string;
    phone: string;
    email?: string;
  };
}

interface AffiliatesResponse {
  data: AffiliateItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export default function AffiliatesBookPage() {
  const queryClient = useQueryClient();
  const { currentJacId } = useAuthStore();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [enrollSuccessMessage, setEnrollSuccessMessage] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    identificationType: IdentificationType.CC,
    identificationNumber: "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    veredaOrBarrio: "",
    occupation: "",
    hasLandOrFarm: false,
    farmName: "",
    role: UserRole.CITIZEN,
  });

  const { data, isLoading, isError } = useQuery<AffiliatesResponse>({
    queryKey: ["affiliates-book", currentJacId, search, statusFilter, page],
    queryFn: () =>
      apiClient("/affiliates/book", {
        params: {
          search: search || undefined,
          status: statusFilter || undefined,
          page,
          limit: 15,
        },
      }),
    enabled: Boolean(currentJacId),
  });

  const enrollMutation = useMutation({
    mutationFn: (newAffiliate: typeof formData) =>
      apiClient<{ message: string; folioNumber: number }>("/affiliates/enroll", {
        method: "POST",
        body: JSON.stringify(newAffiliate),
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["affiliates-book"] });
      setEnrollSuccessMessage(
        `¡Afiliado inscrito con éxito! Asignado formalmente al Folio #${res.folioNumber} del Libro Comunal.`
      );
      setIsEnrollModalOpen(false);
      setFormData({
        identificationType: IdentificationType.CC,
        identificationNumber: "",
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        address: "",
        veredaOrBarrio: "",
        occupation: "",
        hasLandOrFarm: false,
        farmName: "",
        role: UserRole.CITIZEN,
      });
    },
  });

  const handleEnrollSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    enrollMutation.mutate(formData);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Libro Digital de Afiliados
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200">
              Ley 2166 de 2021
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Registro oficial foliado y custodiado por el Secretario(a) de la Junta de Acción Comunal.
          </p>
        </div>

        <button
          onClick={() => setIsEnrollModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold text-sm rounded-xl shadow-sm transition"
        >
          <UserPlus className="w-4 h-4" /> Inscribir Afiliado
        </button>
      </div>

      {enrollSuccessMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start justify-between text-emerald-800 text-sm">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span>{enrollSuccessMessage}</span>
          </div>
          <button
            onClick={() => setEnrollSuccessMessage(null)}
            className="text-emerald-600 hover:text-emerald-900"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por cédula, nombre, apellido o vereda..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-sm"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="">Todos los Estados</option>
            <option value={MembershipStatus.ACTIVE}>Activos</option>
            <option value={MembershipStatus.SUSPENDED}>Suspendidos</option>
            <option value={MembershipStatus.INACTIVE}>Inactivos</option>
          </select>
        </div>
      </div>

      {/* Affiliates Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Folio</th>
                <th className="py-3.5 px-4">Afiliado</th>
                <th className="py-3.5 px-4">Documento</th>
                <th className="py-3.5 px-4">Vereda / Barrio</th>
                <th className="py-3.5 px-4">Finca / Ocupación</th>
                <th className="py-3.5 px-4">Rol Comunal</th>
                <th className="py-3.5 px-4">Estado</th>
                <th className="py-3.5 px-4">Fecha Afiliación</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">
                    Cargando Libro de Afiliados...
                  </td>
                </tr>
              ) : isError ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-red-500">
                    Error al cargar el libro comunal.
                  </td>
                </tr>
              ) : data?.data && data.data.length > 0 ? (
                data.data.map((item) => (
                  <tr key={item.membershipId} className="hover:bg-slate-50/70 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-emerald-700">
                      #{item.folioNumber}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      {item.user.firstName} {item.user.lastName}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-mono text-xs">
                      {item.user.identificationType}: {item.user.identificationNumber}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700">
                      {item.veredaOrBarrio}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 text-xs">
                      {item.farmName ? (
                        <span className="font-medium text-slate-700">🚜 {item.farmName}</span>
                      ) : (
                        item.occupation || "-"
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-block px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
                        {item.role}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          item.status === MembershipStatus.ACTIVE
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : item.status === MembershipStatus.SUSPENDED
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-red-50 text-red-700 border border-red-200"
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 text-xs">
                      {new Date(item.affiliationDate).toLocaleDateString("es-CO")}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">
                    No se encontraron afiliados registrados con los filtros aplicados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data?.pagination && data.pagination.totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              Página {data.pagination.page} de {data.pagination.totalPages} (Total: {data.pagination.total} afiliados)
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1 rounded-lg border border-slate-200 disabled:opacity-40"
              >
                Anterior
              </button>
              <button
                disabled={page >= data.pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1 rounded-lg border border-slate-200 disabled:opacity-40"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Manual Enrollment Modal */}
      {isEnrollModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Inscripción en Libro Digital de Afiliados
                  </h2>
                  <p className="text-xs text-slate-500">
                    Asigna correlativamente el siguiente número de folio oficial (Ley 2166)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsEnrollModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {enrollMutation.isError && (
              <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{(enrollMutation.error as Error).message}</span>
              </div>
            )}

            <form onSubmit={handleEnrollSubmit} className="mt-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tipo de Identificación *
                  </label>
                  <select
                    value={formData.identificationType}
                    onChange={(e) =>
                      setFormData({ ...formData, identificationType: e.target.value as IdentificationType })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value={IdentificationType.CC}>Cédula de Ciudadanía (CC)</option>
                    <option value={IdentificationType.TI}>Tarjeta de Identidad (TI)</option>
                    <option value={IdentificationType.CE}>Cédula de Extranjería (CE)</option>
                    <option value={IdentificationType.PPT}>Permiso Protección Temporal (PPT)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Número de Documento *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: 1085241952"
                    value={formData.identificationNumber}
                    onChange={(e) => setFormData({ ...formData, identificationNumber: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nombres *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Carlos Alberto"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Apellidos *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Pérez Gómez"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Teléfono Celular *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="Ej: 3124567890"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Correo Electrónico (Opcional)
                  </label>
                  <input
                    type="email"
                    placeholder="afiliado@correo.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Vereda o Barrio *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Vereda El Salado"
                    value={formData.veredaOrBarrio}
                    onChange={(e) => setFormData({ ...formData, veredaOrBarrio: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Dirección o Descripción de Vivienda *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Finca La Esperanza, sector escuela"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Ocupación / Oficio
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Agricultor, Docente, Comerciante"
                    value={formData.occupation}
                    onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Rol Comunal Asignado
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value={UserRole.CITIZEN}>Afiliado / Habitante (CITIZEN)</option>
                    <option value={UserRole.JAC_PRESIDENT}>Presidente</option>
                    <option value={UserRole.JAC_VICE_PRESIDENT}>Vicepresidente</option>
                    <option value={UserRole.JAC_SECRETARY}>Secretario(a)</option>
                    <option value={UserRole.JAC_TREASURER}>Tesorero(a)</option>
                    <option value={UserRole.JAC_FISCAL}>Fiscal</option>
                  </select>
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={formData.hasLandOrFarm}
                    onChange={(e) => setFormData({ ...formData, hasLandOrFarm: e.target.checked })}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>¿Posee predio, finca o parcela agrícola en la vereda?</span>
                </label>
                {formData.hasLandOrFarm && (
                  <input
                    type="text"
                    placeholder="Nombre del predio o finca (Ej: Finca El Mirador)"
                    value={formData.farmName}
                    onChange={(e) => setFormData({ ...formData, farmName: e.target.value })}
                    className="mt-2 w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                )}
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEnrollModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={enrollMutation.isPending}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-sm shadow-sm transition disabled:opacity-50"
                >
                  {enrollMutation.isPending ? "Inscribiendo..." : "Completar Inscripción"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

