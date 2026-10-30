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
  MapPin,
  Navigation,
  Globe,
  Compass,
  ExternalLink,
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
  latitude?: number;
  longitude?: number;
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

  const [viewMode, setViewMode] = useState<"table" | "map">("table");
  const [isCapturingGps, setIsCapturingGps] = useState(false);
  const [gpsStatusText, setGpsStatusText] = useState<string | null>(null);

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
    latitude: undefined as number | undefined,
    longitude: undefined as number | undefined,
    role: UserRole.CITIZEN,
  });

  const captureGps = () => {
    if (!navigator.geolocation) {
      setGpsStatusText("Geolocalización no soportada en este navegador.");
      return;
    }
    setIsCapturingGps(true);
    setGpsStatusText("Obteniendo coordenadas satelitales GPS...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = Number(position.coords.latitude.toFixed(6));
        const lng = Number(position.coords.longitude.toFixed(6));
        setFormData((prev) => ({
          ...prev,
          latitude: lat,
          longitude: lng,
        }));
        setIsCapturingGps(false);
        setGpsStatusText(`¡Coordenadas GPS capturadas con éxito! (${lat}, ${lng})`);
      },
      (error) => {
        setIsCapturingGps(false);
        setGpsStatusText(`Error GPS: ${error.message}`);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

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
    onSuccess: (res: { message: string; folioNumber: number }) => {
      queryClient.invalidateQueries({ queryKey: ["affiliates-book"] });
      setEnrollSuccessMessage(
        `¡Afiliado inscrito con éxito! Asignado formalmente al Folio #${res.folioNumber} del Libro Comunal.`
      );
      setIsEnrollModalOpen(false);
      setGpsStatusText(null);
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
        latitude: undefined,
        longitude: undefined,
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

      {/* View Mode Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200">
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode("table")}
            className={`py-2.5 px-4 text-xs font-bold border-b-2 transition flex items-center gap-2 ${
              viewMode === "table"
                ? "border-emerald-600 text-emerald-800"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Users className="w-4 h-4" /> Tabla Oficial Foliada
          </button>
          <button
            onClick={() => setViewMode("map")}
            className={`py-2.5 px-4 text-xs font-bold border-b-2 transition flex items-center gap-2 ${
              viewMode === "map"
                ? "border-emerald-600 text-emerald-800"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <MapPin className="w-4 h-4 text-emerald-600" /> Georreferenciación & Mapa Satelital
          </button>
        </div>

        <span className="text-xs text-slate-400 font-medium hidden sm:inline-block">
          {data?.pagination.total || 0} afiliados registrados
        </span>
      </div>

      {/* Affiliates Content: Table View */}
      {viewMode === "table" && (
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
                  <th className="py-3.5 px-4">Ubicación GPS</th>
                  <th className="py-3.5 px-4">Rol Comunal</th>
                  <th className="py-3.5 px-4">Estado</th>
                  <th className="py-3.5 px-4">Fecha Afiliación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-slate-400">
                      Cargando Libro de Afiliados...
                    </td>
                  </tr>
                ) : isError ? (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-red-500">
                      Error al cargar el libro comunal.
                    </td>
                  </tr>
                ) : data?.data && data.data.length > 0 ? (
                  data.data.map((item: AffiliateItem) => (
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
                        {item.latitude && item.longitude ? (
                          <a
                            href={`https://www.google.com/maps?q=${item.latitude},${item.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Abrir ubicación satelital en Google Maps"
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 text-xs font-semibold transition"
                          >
                            <MapPin className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                            <span>{item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}</span>
                            <ExternalLink className="w-3 h-3 text-emerald-500 opacity-70" />
                          </a>
                        ) : (
                          <span className="text-slate-400 text-xs italic flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-300" />
                            Sin GPS
                          </span>
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
                    <td colSpan={9} className="text-center py-12 text-slate-400">
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
      )}

      {/* Affiliates Content: Map / Geolocation View */}
      {viewMode === "map" && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Compass className="w-5 h-5 text-emerald-600" />
                  Censo Satelital y Georreferenciación Comunal
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Visualización de predios, fincas y viviendas rurales geolocalizadas bajo la Ley 2166 de 2021.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200">
                  {data?.data.filter((a: AffiliateItem) => a.latitude && a.longitude).length || 0} con Coordenadas GPS
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-6">
              {data?.data && data.data.length > 0 ? (
                data.data.map((item: AffiliateItem) => (
                  <div
                    key={item.membershipId}
                    className={`p-4 rounded-2xl border transition hover:shadow-md ${
                      item.latitude && item.longitude
                        ? "bg-emerald-50/40 border-emerald-200"
                        : "bg-slate-50/60 border-slate-200"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-bold font-mono text-emerald-700 bg-white px-2 py-0.5 rounded-md border border-emerald-200">
                          Folio #{item.folioNumber}
                        </span>
                        <h3 className="font-extrabold text-slate-900 text-sm mt-1.5">
                          {item.user.firstName} {item.user.lastName}
                        </h3>
                        <p className="text-xs text-slate-500 font-medium">
                          {item.veredaOrBarrio} {item.farmName ? `• 🚜 ${item.farmName}` : ""}
                        </p>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-white font-semibold text-slate-600 border">
                        {item.role}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 mt-2 truncate">
                      📍 {item.address}
                    </p>

                    <div className="mt-3 pt-3 border-t border-slate-200/60 flex items-center justify-between">
                      {item.latitude && item.longitude ? (
                        <a
                          href={`https://www.google.com/maps?q=${item.latitude},${item.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition shadow-sm"
                        >
                          <Navigation className="w-3.5 h-3.5" />
                          <span>Ver en Google Maps ({item.latitude.toFixed(3)}, {item.longitude.toFixed(3)})</span>
                        </a>
                      ) : (
                        <div className="w-full text-center py-1 text-slate-400 text-xs italic flex items-center justify-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-300" />
                          Sin coordenadas satelitales
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full py-12 text-center text-slate-400">
                  No hay afiliados para mostrar en el censo territorial.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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

              {/* Georreferenciación GPS del Afiliado */}
              <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-emerald-600" />
                    Geolocalización del Predio / Residencia
                  </span>
                  <button
                    type="button"
                    onClick={captureGps}
                    disabled={isCapturingGps}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50 shadow-sm"
                  >
                    <Compass className="w-3.5 h-3.5" />
                    {isCapturingGps ? "Localizando..." : "📍 Capturar GPS Actual"}
                  </button>
                </div>

                {gpsStatusText && (
                  <p className="text-[11px] font-medium text-emerald-800 bg-white/90 p-2 rounded-lg border border-emerald-200">
                    {gpsStatusText}
                  </p>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Latitud GPS
                    </label>
                    <input
                      type="number"
                      step="any"
                      placeholder="Ej: 4.570868"
                      value={formData.latitude ?? ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          latitude: e.target.value ? parseFloat(e.target.value) : undefined,
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Longitud GPS
                    </label>
                    <input
                      type="number"
                      step="any"
                      placeholder="Ej: -74.297333"
                      value={formData.longitude ?? ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          longitude: e.target.value ? parseFloat(e.target.value) : undefined,
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 bg-white"
                    />
                  </div>
                </div>
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

