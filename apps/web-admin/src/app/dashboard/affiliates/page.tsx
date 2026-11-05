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
  Download,
  RefreshCw,
  AlertTriangle,
  Eye,
  EyeOff,
  KeyRound,
  Receipt,
  Printer,
  FileText,
  DollarSign,
  Phone,
  Mail,
  Calendar,
  Sparkles,
  UserCheck,
  UserX,
  MessageCircle,
} from "lucide-react";
import { IdentificationType, UserRole, MembershipStatus } from "@conectajac/shared";
import { downloadCsv, formatDate, formatCurrency } from "@/lib/utils";

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
  observations?: string;
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

interface AffiliateStatementResponse {
  affiliate: {
    membershipId: string;
    folioNumber: number;
    bookNumber: number;
    affiliationDate: string;
    role: string;
    status: string;
    observations?: string;
    address: string;
    veredaOrBarrio: string;
    occupation?: string;
    hasLandOrFarm: boolean;
    farmName?: string;
    latitude?: number;
    longitude?: number;
    user: {
      id: string;
      firstName: string;
      lastName: string;
      fullName: string;
      identificationType: string;
      identificationNumber: string;
      phone: string;
      email?: string;
      accessPin?: string;
    };
    jac: {
      id: string;
      name: string;
      personeriaJuridica?: string;
      nit?: string;
      municipality?: string;
      department?: string;
    };
  };
  summary: {
    totalDebt: number;
    totalPaidHistorically: number;
    isUpToDate: boolean;
    overdueCount: number;
    advanceCount: number;
    isSeverelyOverdue: boolean;
  };
  obligations: Array<{
    id: string;
    period: string;
    feeName: string;
    feeType?: string;
    amount: number;
    paidAmount: number;
    pendingBalance: number;
    dueDate: string;
    status: string;
    isAdvance: boolean;
  }>;
  payments: Array<{
    id: string;
    receiptNumber: string;
    amount: number;
    paymentMethod: string;
    paidAt: string;
    notes: string;
    quotasPaidCount: number;
    accountName: string;
    registeredByName: string;
    isAdvance: boolean;
    advancePeriods: string[];
  }>;
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

  // Affiliate Profile & Statement Modal State
  const [selectedMembershipIdForStatement, setSelectedMembershipIdForStatement] = useState<string | null>(null);
  const [statementTab, setStatementTab] = useState<"profile" | "statement" | "receipts">("profile");
  const [viewingReceipt, setViewingReceipt] = useState<AffiliateStatementResponse["payments"][0] | null>(null);
  const [showPin, setShowPin] = useState(false);
  const [isResetPinModalOpen, setIsResetPinModalOpen] = useState(false);
  const [customPinInput, setCustomPinInput] = useState("");
  const [pinFeedbackMessage, setPinFeedbackMessage] = useState<string | null>(null);

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

  // Query for selected affiliate statement
  const {
    data: statementData,
    isLoading: isLoadingStatement,
    isError: isErrorStatement,
  } = useQuery<AffiliateStatementResponse>({
    queryKey: ["affiliate-statement", selectedMembershipIdForStatement],
    queryFn: () => apiClient(`/affiliates/book/${selectedMembershipIdForStatement}/statement`),
    enabled: Boolean(selectedMembershipIdForStatement),
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

  const checkMorosityMutation = useMutation({
    mutationFn: () =>
      apiClient<{ message: string }>("/treasury/affiliates/check-morosity-suspensions", {
        method: "POST",
      }),
    onSuccess: (res: { message: string }) => {
      queryClient.invalidateQueries({ queryKey: ["affiliates-book"] });
      queryClient.invalidateQueries({ queryKey: ["treasury-portfolio"] });
      if (selectedMembershipIdForStatement) {
        queryClient.invalidateQueries({
          queryKey: ["affiliate-statement", selectedMembershipIdForStatement],
        });
      }
      setEnrollSuccessMessage(res.message || "Auditoría de mora comunal aplicada con éxito.");
    },
  });

  const resetPinMutation = useMutation({
    mutationFn: ({ membershipId, pin }: { membershipId: string; pin?: string }) =>
      apiClient.patch<{ message: string; pin: string; affiliateName: string }>(
        `/affiliates/book/${membershipId}/reset-pin`,
        { pin }
      ),
    onSuccess: (res: { message: string; pin: string; affiliateName: string }) => {
      queryClient.invalidateQueries({
        queryKey: ["affiliate-statement", selectedMembershipIdForStatement],
      });
      setPinFeedbackMessage(`¡PIN de acceso restablecido con éxito a: ${res.pin}!`);
      setIsResetPinModalOpen(false);
      setCustomPinInput("");
      setShowPin(true);
      setTimeout(() => setPinFeedbackMessage(null), 6000);
    },
    onError: (err: any) => {
      alert(err.message || "No fue posible restablecer el PIN");
    },
  });

  const handleExportBookExcel = () => {
    if (!data?.data || data.data.length === 0) return;
    const headers = [
      "Folio",
      "Tipo Documento",
      "Número Documento",
      "Nombres",
      "Apellidos",
      "Teléfono Móvil",
      "Correo Electrónico",
      "Dirección / Residencia",
      "Vereda / Barrio",
      "Finca / Predio",
      "Ocupación",
      "Rol Comunal",
      "Estado Comunal",
      "Fecha de Afiliación",
      "Observaciones",
    ];

    const rows = data.data.map((item: AffiliateItem) => [
      item.folioNumber,
      item.user.identificationType,
      item.user.identificationNumber,
      item.user.firstName,
      item.user.lastName,
      item.user.phone,
      item.user.email || "",
      item.address,
      item.veredaOrBarrio,
      item.farmName || "",
      item.occupation || "",
      item.role,
      item.status === MembershipStatus.ACTIVE
        ? "Activo"
        : item.status === MembershipStatus.SUSPENDED
        ? "Suspendido por Mora (>3 meses)"
        : "Inactivo",
      item.affiliationDate ? formatDate(item.affiliationDate) : "",
      item.observations || "",
    ]);

    downloadCsv(`Libro_Oficial_Afiliados_${new Date().toISOString().slice(0, 10)}`, headers, rows);
  };

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

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportBookExcel}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl shadow-sm transition border border-slate-200"
            title="Descargar libro en formato Excel/CSV"
          >
            <Download className="w-4 h-4 text-emerald-600" /> Exportar Libro Excel
          </button>

          <button
            onClick={() => checkMorosityMutation.mutate()}
            disabled={checkMorosityMutation.isPending}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-900 active:bg-slate-950 text-white font-bold text-xs rounded-xl shadow-sm transition disabled:opacity-50"
            title="Suspende a afiliados con más de 3 cuotas impagas según la Ley 2166"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${checkMorosityMutation.isPending ? "animate-spin" : ""}`} />
            Auditar Mora (Ley 2166)
          </button>

          <button
            onClick={() => setIsEnrollModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold text-xs rounded-xl shadow-sm transition"
          >
            <UserPlus className="w-4 h-4" /> Inscribir Afiliado
          </button>
        </div>
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
                  <th className="py-3.5 px-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {isLoading ? (
                  <tr>
                    <td colSpan={10} className="text-center py-12 text-slate-400">
                      Cargando Libro de Afiliados...
                    </td>
                  </tr>
                ) : isError ? (
                  <tr>
                    <td colSpan={10} className="text-center py-12 text-red-500">
                      Error al cargar el libro comunal.
                    </td>
                  </tr>
                ) : data?.data && data.data.length > 0 ? (
                  data.data.map((item: AffiliateItem) => (
                    <tr key={item.membershipId} className="hover:bg-slate-50/70 transition">
                      <td
                        onClick={() => {
                          setSelectedMembershipIdForStatement(item.membershipId);
                          setStatementTab("profile");
                        }}
                        className="py-3.5 px-4 font-mono font-bold text-emerald-700 cursor-pointer hover:underline"
                        title="Clic para ver ficha integral y estado de cuenta"
                      >
                        #{item.folioNumber}
                      </td>
                      <td
                        onClick={() => {
                          setSelectedMembershipIdForStatement(item.membershipId);
                          setStatementTab("profile");
                        }}
                        className="py-3.5 px-4 font-semibold text-slate-900 cursor-pointer hover:text-emerald-700 transition"
                        title="Clic para ver ficha integral y estado de cuenta"
                      >
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
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            item.status === MembershipStatus.ACTIVE
                              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                              : item.status === MembershipStatus.SUSPENDED
                              ? "bg-rose-50 text-rose-800 border border-rose-200 font-black"
                              : "bg-slate-100 text-slate-700 border border-slate-200"
                          }`}
                        >
                          {item.status === MembershipStatus.ACTIVE
                            ? "Activo"
                            : item.status === MembershipStatus.SUSPENDED
                            ? "Suspendido (Mora >3m)"
                            : "Inactivo"}
                        </span>
                        {item.status === MembershipStatus.SUSPENDED && item.observations && (
                          <span className="block text-[10px] text-rose-500 mt-0.5 max-w-xs truncate" title={item.observations}>
                            {item.observations}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 text-xs">
                        {new Date(item.affiliationDate).toLocaleDateString("es-CO")}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => {
                            setSelectedMembershipIdForStatement(item.membershipId);
                            setStatementTab("profile");
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 text-slate-700 font-bold text-xs transition border border-slate-200 hover:border-emerald-300 shadow-sm"
                          title="Consultar ficha integral y estado de cuenta del afiliado"
                        >
                          <Eye className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Ficha & Cuenta</span>
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={10} className="text-center py-12 text-slate-400">
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
                    className={`p-4 rounded-2xl border transition hover:shadow-md flex flex-col justify-between ${
                      item.latitude && item.longitude
                        ? "bg-emerald-50/40 border-emerald-200"
                        : "bg-slate-50/60 border-slate-200"
                    }`}
                  >
                    <div>
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
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-200/60 space-y-2">
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

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedMembershipIdForStatement(item.membershipId);
                          setStatementTab("profile");
                        }}
                        className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200 rounded-xl text-xs font-bold transition shadow-sm"
                      >
                        <Eye className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Ficha Integral & Estado de Cuenta</span>
                      </button>
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

      {/* ================= MODAL: FICHA INTEGRAL DEL AFILIADO & ESTADO DE CUENTA ================= */}
      {selectedMembershipIdForStatement && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-200 max-h-[92vh] flex flex-col overflow-hidden print:p-0 print:border-none print:shadow-none print:max-h-none">
            {/* Header */}
            <div className="p-5 sm:p-6 border-b border-slate-100 bg-gradient-to-r from-emerald-50/60 via-white to-slate-50 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-emerald-700 text-white flex items-center justify-center font-black text-lg shadow-sm flex-shrink-0">
                  {statementData?.affiliate?.user?.firstName?.[0] || "A"}
                  {statementData?.affiliate?.user?.lastName?.[0] || ""}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-black text-slate-900">
                      {statementData?.affiliate?.user?.fullName || "Ficha del Afiliado"}
                    </h2>
                    {statementData?.affiliate && (
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-mono text-xs font-black border border-emerald-200">
                        Folio #{statementData.affiliate.folioNumber} • Libro #{statementData.affiliate.bookNumber}
                      </span>
                    )}
                  </div>
                  {statementData?.affiliate && (
                    <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-500">
                      <span className="font-mono font-medium">
                        {statementData.affiliate.user.identificationType}: {statementData.affiliate.user.identificationNumber}
                      </span>
                      <span>•</span>
                      <span>{statementData.affiliate.veredaOrBarrio || "Vereda Central"}</span>
                      <span>•</span>
                      <span className="font-bold text-emerald-800">
                        {statementData.affiliate.role}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 print:hidden">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 border border-slate-200"
                  title="Imprimir Ficha y Estado de Cuenta"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Imprimir Ficha</span>
                </button>
                <button
                  onClick={() => {
                    setSelectedMembershipIdForStatement(null);
                    setViewingReceipt(null);
                  }}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 font-bold"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Loading / Error States */}
            {isLoadingStatement ? (
              <div className="py-24 text-center text-slate-400 text-sm">
                Cargando ficha oficial y estado de cuenta...
              </div>
            ) : isErrorStatement || !statementData ? (
              <div className="py-20 text-center text-red-500 text-sm">
                Error al cargar el estado de cuenta del afiliado.
              </div>
            ) : (
              <>
                {/* Solvency & Suspension Alert Bar */}
                <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 font-medium">Estado Comunal:</span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full font-bold ${
                        statementData.affiliate.status === MembershipStatus.ACTIVE
                          ? "bg-emerald-100 text-emerald-800"
                          : statementData.affiliate.status === MembershipStatus.SUSPENDED
                          ? "bg-rose-100 text-rose-800 font-black"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {statementData.affiliate.status === MembershipStatus.ACTIVE
                        ? "Activo en el Libro"
                        : statementData.affiliate.status === MembershipStatus.SUSPENDED
                        ? "Suspendido por Mora (>3 meses)"
                        : "Inactivo"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 font-medium">Situación Financiera:</span>
                    {statementData.summary.isUpToDate ? (
                      statementData.summary.advanceCount > 0 ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-900 font-black border border-purple-200 flex items-center gap-1">
                          ✨ Al Día (+{statementData.summary.advanceCount} cuotas adelantadas)
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
                          ✅ Al Día (Paz y Salvo)
                        </span>
                      )
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold border border-rose-200">
                        ❌ En Mora ({statementData.summary.overdueCount} cuotas vencidas • Deuda: {formatCurrency(statementData.summary.totalDebt)})
                      </span>
                    )}
                  </div>
                </div>

                {/* Tabs Selector */}
                <div className="flex border-b border-slate-200 px-6 bg-white print:hidden">
                  <button
                    onClick={() => setStatementTab("profile")}
                    className={`py-3 px-4 text-xs font-bold border-b-2 transition flex items-center gap-2 ${
                      statementTab === "profile"
                        ? "border-emerald-600 text-emerald-800"
                        : "border-transparent text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" /> Ficha Oficial & Predio
                  </button>
                  <button
                    onClick={() => setStatementTab("statement")}
                    className={`py-3 px-4 text-xs font-bold border-b-2 transition flex items-center gap-2 ${
                      statementTab === "statement"
                        ? "border-emerald-600 text-emerald-800"
                        : "border-transparent text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <DollarSign className="w-3.5 h-3.5" /> Estado de Cuenta & Cuotas
                    {statementData.summary.totalDebt > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-800 text-[10px] font-black">
                        Mora
                      </span>
                    )}
                    {statementData.summary.advanceCount > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full bg-purple-100 text-purple-900 text-[10px] font-black">
                        +{statementData.summary.advanceCount}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => setStatementTab("receipts")}
                    className={`py-3 px-4 text-xs font-bold border-b-2 transition flex items-center gap-2 ${
                      statementTab === "receipts"
                        ? "border-emerald-600 text-emerald-800"
                        : "border-transparent text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <Receipt className="w-3.5 h-3.5" /> Recaudos & Pagos
                    <span className="px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold">
                      {statementData.payments.length}
                    </span>
                  </button>
                </div>

                {/* Modal Body / Tab Content */}
                <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
                  {/* TAB 1: FICHA OFICIAL & PREDIO */}
                  {statementTab === "profile" && (
                    <div className="space-y-6">
                      {/* Credenciales y Acceso Móvil a la App */}
                      <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/90 space-y-3">
                        <div className="flex items-center justify-between border-b border-emerald-200/80 pb-2">
                          <h4 className="font-bold text-emerald-950 text-sm flex items-center gap-2">
                            <KeyRound className="w-4 h-4 text-emerald-700" />
                            Credenciales de Acceso a la App Móvil (Ciudadano)
                          </h4>
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black tracking-wide border border-emerald-300">
                            PIN Móvil
                          </span>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-3.5 rounded-xl border border-emerald-100 shadow-sm">
                          <div>
                            <span className="text-slate-500 block text-[11px] font-medium">PIN de Acceso Asignado:</span>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="font-mono text-2xl font-black tracking-widest text-emerald-900 bg-emerald-50/50 px-3 py-0.5 rounded-lg border border-emerald-200">
                                {showPin
                                  ? (statementData.affiliate.user.accessPin || statementData.affiliate.user.identificationNumber.slice(-4))
                                  : "••••"}
                              </span>
                              <button
                                type="button"
                                onClick={() => setShowPin(!showPin)}
                                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition"
                                title={showPin ? "Ocultar PIN" : "Ver PIN"}
                              >
                                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            </div>
                            <span className="text-[11px] text-slate-500 mt-1 block">
                              El habitante ingresa a la app móvil con su cédula <strong className="text-slate-700">{statementData.affiliate.user.identificationNumber}</strong> y este PIN.
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                const defaultPin = statementData.affiliate.user.identificationNumber.slice(-4);
                                setCustomPinInput(defaultPin);
                                setIsResetPinModalOpen(true);
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                              <span>Restablecer PIN</span>
                            </button>

                            {statementData.affiliate.user.phone && (
                              <a
                                href={`https://wa.me/57${statementData.affiliate.user.phone.replace(/\D/g, "")}?text=${encodeURIComponent(
                                  `Hola ${statementData.affiliate.user.firstName}, te compartimos tu PIN de acceso para la aplicación móvil ConectaJAC de tu vereda ${statementData.affiliate.veredaOrBarrio}. Tu PIN es: ${
                                    statementData.affiliate.user.accessPin ||
                                    statementData.affiliate.user.identificationNumber.slice(-4)
                                  }. Puedes ingresar con tu número de documento ${statementData.affiliate.user.identificationNumber}.`
                                )}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs border border-emerald-300 transition"
                                title="Enviar credenciales por WhatsApp al afiliado"
                              >
                                <MessageCircle className="w-3.5 h-3.5 text-emerald-700" />
                                <span>Enviar por WhatsApp</span>
                              </a>
                            )}
                          </div>
                        </div>

                        {pinFeedbackMessage && (
                          <div className="p-2.5 bg-emerald-100 border border-emerald-300 rounded-xl text-emerald-900 text-xs font-bold flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                            <span>{pinFeedbackMessage}</span>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Datos de Identificación */}
                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                          <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b pb-2">
                            <Users className="w-4 h-4 text-emerald-600" />
                            Datos Personales & Contacto
                          </h4>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <span className="text-slate-400 block text-[11px]">Nombres:</span>
                              <span className="font-semibold text-slate-800">{statementData.affiliate.user.firstName}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[11px]">Apellidos:</span>
                              <span className="font-semibold text-slate-800">{statementData.affiliate.user.lastName}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[11px]">Documento:</span>
                              <span className="font-mono font-bold text-slate-800">
                                {statementData.affiliate.user.identificationType} {statementData.affiliate.user.identificationNumber}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[11px]">Celular Móvil:</span>
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-slate-800">📱 {statementData.affiliate.user.phone}</span>
                                {statementData.affiliate.user.phone && (
                                  <a
                                    href={`https://wa.me/57${statementData.affiliate.user.phone.replace(/\D/g, "")}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-emerald-600 hover:text-emerald-700 font-bold"
                                    title="Escribir por WhatsApp"
                                  >
                                    <MessageCircle className="w-3.5 h-3.5" />
                                  </a>
                                )}
                              </div>
                            </div>
                            <div className="col-span-2">
                              <span className="text-slate-400 block text-[11px]">Correo Electrónico:</span>
                              <span className="text-slate-700">{statementData.affiliate.user.email || "No registrado"}</span>
                            </div>
                          </div>
                        </div>

                        {/* Ubicación y Territorio */}
                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                          <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b pb-2">
                            <MapPin className="w-4 h-4 text-emerald-600" />
                            Ubicación Territorial Comunal
                          </h4>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <span className="text-slate-400 block text-[11px]">Vereda / Barrio:</span>
                              <span className="font-semibold text-slate-800">{statementData.affiliate.veredaOrBarrio}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[11px]">Ocupación / Oficio:</span>
                              <span className="text-slate-700">{statementData.affiliate.occupation || "No especificado"}</span>
                            </div>
                            <div className="col-span-2">
                              <span className="text-slate-400 block text-[11px]">Dirección / Descripción Vivienda:</span>
                              <span className="text-slate-800 font-medium">{statementData.affiliate.address}</span>
                            </div>
                            <div className="col-span-2">
                              <span className="text-slate-400 block text-[11px]">Predio Rural / Finca:</span>
                              <span className="font-bold text-slate-900">
                                {statementData.affiliate.hasLandOrFarm && statementData.affiliate.farmName
                                  ? `🚜 ${statementData.affiliate.farmName}`
                                  : "Sin predio agrícola registrado"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Georreferenciación GPS & Registro Comunal */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* GPS */}
                        <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 space-y-3">
                          <h4 className="font-bold text-emerald-950 text-sm flex items-center gap-2 border-b border-emerald-200/80 pb-2">
                            <Compass className="w-4 h-4 text-emerald-600" />
                            Georreferenciación Satelital (Ley 2166)
                          </h4>
                          {statementData.affiliate.latitude && statementData.affiliate.longitude ? (
                            <div className="space-y-2.5">
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <span className="text-emerald-700 block text-[11px]">Latitud GPS:</span>
                                  <span className="font-mono font-bold text-slate-800">{statementData.affiliate.latitude}</span>
                                </div>
                                <div>
                                  <span className="text-emerald-700 block text-[11px]">Longitud GPS:</span>
                                  <span className="font-mono font-bold text-slate-800">{statementData.affiliate.longitude}</span>
                                </div>
                              </div>
                              <a
                                href={`https://www.google.com/maps?q=${statementData.affiliate.latitude},${statementData.affiliate.longitude}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition shadow-sm"
                              >
                                <Navigation className="w-3.5 h-3.5" />
                                <span>Ver Predio en Google Maps Satelital</span>
                              </a>
                            </div>
                          ) : (
                            <div className="text-center py-4 text-slate-500 italic">
                              <MapPin className="w-5 h-5 text-slate-400 mx-auto mb-1" />
                              Este afiliado no cuenta con coordenadas GPS satelitales registradas.
                            </div>
                          )}
                        </div>

                        {/* Registro Estatutario */}
                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                          <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b pb-2">
                            <FileText className="w-4 h-4 text-emerald-600" />
                            Estatutos y Registro en el Libro
                          </h4>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <span className="text-slate-400 block text-[11px]">Fecha de Afiliación:</span>
                              <span className="font-bold text-slate-800">
                                {formatDate(statementData.affiliate.affiliationDate)}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[11px]">Rol Asignado:</span>
                              <span className="font-bold text-slate-800">{statementData.affiliate.role}</span>
                            </div>
                            <div className="col-span-2">
                              <span className="text-slate-400 block text-[11px]">Observaciones Estatutarias:</span>
                              <p className="text-slate-700 mt-0.5 bg-white p-2.5 rounded-xl border border-slate-200">
                                {statementData.affiliate.observations || "Sin observaciones registradas."}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: ESTADO DE CUENTA & CUOTAS */}
                  {statementTab === "statement" && (
                    <div className="space-y-5">
                      {/* KPI Metrics */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                            Deuda Pendiente
                          </span>
                          <span
                            className={`text-lg font-black mt-1 block ${
                              statementData.summary.totalDebt > 0 ? "text-rose-600" : "text-emerald-600"
                            }`}
                          >
                            {formatCurrency(statementData.summary.totalDebt)}
                          </span>
                        </div>
                        <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                            Total Aportado Histórico
                          </span>
                          <span className="text-lg font-black text-slate-900 mt-1 block">
                            {formatCurrency(statementData.summary.totalPaidHistorically)}
                          </span>
                        </div>
                        <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                            Cuotas en Mora
                          </span>
                          <span
                            className={`text-lg font-black mt-1 block ${
                              statementData.summary.overdueCount > 0 ? "text-rose-600" : "text-slate-700"
                            }`}
                          >
                            {statementData.summary.overdueCount} {statementData.summary.isSeverelyOverdue ? "(⚠️ >3m)" : ""}
                          </span>
                        </div>
                        <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                            Cuotas Adelantadas
                          </span>
                          <span className="text-lg font-black text-purple-600 mt-1 block">
                            ✨ {statementData.summary.advanceCount} a favor
                          </span>
                        </div>
                      </div>

                      {statementData.summary.isSeverelyOverdue && (
                        <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 flex items-start gap-2.5">
                          <AlertTriangle className="w-4 h-4 text-rose-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <span className="font-bold">Suspensión conforme a la Ley 2166 de 2021:</span>
                            <p className="text-[11px] text-rose-800 mt-0.5">
                              Este afiliado acumula más de 3 meses en mora. Los estatutos comunales y la ley contemplan la suspensión provisional de sus derechos comunales hasta subsanar el saldo adeudado.
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Obligations Table */}
                      <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm">
                        <div className="p-3 bg-slate-50 border-b border-slate-200/80 font-bold text-slate-700 flex items-center justify-between">
                          <span>Histórico Cronológico de Cuotas y Obligaciones</span>
                          <span className="text-slate-400 font-normal">
                            {statementData.obligations.length} cuotas registradas
                          </span>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-slate-50/50 border-b border-slate-200/60 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                <th className="py-2.5 px-3">Periodo</th>
                                <th className="py-2.5 px-3">Concepto</th>
                                <th className="py-2.5 px-3 text-right">Valor Cuota</th>
                                <th className="py-2.5 px-3 text-right">Pagado</th>
                                <th className="py-2.5 px-3 text-right">Saldo Pendiente</th>
                                <th className="py-2.5 px-3">Fecha Vencimiento</th>
                                <th className="py-2.5 px-3 text-center">Estado</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-xs">
                              {statementData.obligations.length === 0 ? (
                                <tr>
                                  <td colSpan={7} className="py-8 text-center text-slate-400">
                                    No hay obligaciones de cuotas registradas para este afiliado.
                                  </td>
                                </tr>
                              ) : (
                                statementData.obligations.map((obl: any) => (
                                  <tr key={obl.id} className="hover:bg-slate-50/70">
                                    <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                                      {obl.period}
                                    </td>
                                    <td className="py-2.5 px-3 font-medium text-slate-700">
                                      {obl.feeName}
                                    </td>
                                    <td className="py-2.5 px-3 text-right font-semibold text-slate-800">
                                      {formatCurrency(obl.amount)}
                                    </td>
                                    <td className="py-2.5 px-3 text-right font-semibold text-emerald-600">
                                      {formatCurrency(obl.paidAmount)}
                                    </td>
                                    <td className="py-2.5 px-3 text-right font-black text-slate-900">
                                      {formatCurrency(obl.pendingBalance)}
                                    </td>
                                    <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">
                                      {formatDate(obl.dueDate)}
                                    </td>
                                    <td className="py-2.5 px-3 text-center">
                                      {obl.isAdvance ? (
                                        <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-900 text-[10px] font-black border border-purple-200 inline-flex items-center gap-1">
                                          ✨ Pagada por Adelantado
                                        </span>
                                      ) : obl.status === "PAID" ? (
                                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                                          ✅ Pagada
                                        </span>
                                      ) : obl.status === "PARTIALLY_PAID" ? (
                                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                                          ⚠️ Abono Parcial
                                        </span>
                                      ) : obl.status === "OVERDUE" ? (
                                        <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-black">
                                          ❌ En Mora
                                        </span>
                                      ) : (
                                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold">
                                          ⏱️ Pendiente
                                        </span>
                                      )}
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 3: RECAUDOS & PAGOS REGISTRADOS */}
                  {statementTab === "receipts" && (
                    <div className="space-y-4">
                      <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm">
                        <div className="p-3 bg-slate-50 border-b border-slate-200/80 font-bold text-slate-700 flex items-center justify-between">
                          <span>Historial de Recaudos y Comprobantes de Pago</span>
                          <span className="text-slate-400 font-normal">
                            {statementData.payments.length} comprobantes emitidos
                          </span>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-slate-50/50 border-b border-slate-200/60 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                <th className="py-2.5 px-3">Recibo #</th>
                                <th className="py-2.5 px-3">Fecha y Hora</th>
                                <th className="py-2.5 px-3 text-right">Monto</th>
                                <th className="py-2.5 px-3">Forma de Pago</th>
                                <th className="py-2.5 px-3">Detalle / Cuotas</th>
                                <th className="py-2.5 px-3">Registrado Por</th>
                                <th className="py-2.5 px-3 text-right">Comprobante</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-xs">
                              {statementData.payments.length === 0 ? (
                                <tr>
                                  <td colSpan={7} className="py-8 text-center text-slate-400">
                                    No se han registrado pagos para este afiliado aún.
                                  </td>
                                </tr>
                              ) : (
                                statementData.payments.map((p: any) => (
                                  <tr key={p.id} className="hover:bg-slate-50/70">
                                    <td className="py-2.5 px-3 font-mono font-bold text-emerald-700">
                                      {p.receiptNumber}
                                    </td>
                                    <td className="py-2.5 px-3 text-slate-600 font-mono text-[11px]">
                                      {formatDate(p.paidAt)}
                                    </td>
                                    <td className="py-2.5 px-3 text-right font-black text-emerald-600">
                                      {formatCurrency(p.amount)}
                                    </td>
                                    <td className="py-2.5 px-3 text-slate-700 font-medium">
                                      {p.paymentMethod === "CASH" ? "Efectivo (Caja General)" : "En Cuenta Bancaria"}
                                    </td>
                                    <td className="py-2.5 px-3">
                                      {p.isAdvance && p.advancePeriods && p.advancePeriods.length > 0 ? (
                                        <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-900 text-[10px] font-black border border-purple-200">
                                          ✨ Adelanto ({p.advancePeriods.join(", ")})
                                        </span>
                                      ) : (
                                        <span className="text-slate-600">
                                          {p.quotasPaidCount} cuota(s) ordinarias
                                        </span>
                                      )}
                                      {p.notes && (
                                        <span className="block text-[10px] text-slate-400 truncate max-w-xs" title={p.notes}>
                                          {p.notes}
                                        </span>
                                      )}
                                    </td>
                                    <td className="py-2.5 px-3 text-slate-600">
                                      {p.registeredByName}
                                    </td>
                                    <td className="py-2.5 px-3 text-right">
                                      <button
                                        type="button"
                                        onClick={() => setViewingReceipt(p)}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-[11px] border border-emerald-200 shadow-sm transition"
                                      >
                                        <Eye className="w-3 h-3 text-emerald-600" />
                                        <span>Ver Recibo</span>
                                      </button>
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer Actions */}
                <div className="p-4 px-6 border-t border-slate-100 flex items-center justify-between bg-slate-50 print:hidden">
                  <div className="text-slate-500 text-xs">
                    Junta de Acción Comunal: <strong>{statementData.affiliate.jac.name}</strong>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedMembershipIdForStatement(null);
                        setViewingReceipt(null);
                      }}
                      className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-white transition text-xs"
                    >
                      Cerrar
                    </button>
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold transition shadow-sm text-xs flex items-center gap-1.5"
                    >
                      <Printer className="w-3.5 h-3.5" /> Imprimir Ficha Completa
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ================= SUB-MODAL: COMPROBANTE OFICIAL DE RECAUDO ================= */}
      {viewingReceipt && statementData && (
        <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-5 print:p-0 print:border-none print:shadow-none">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  Comprobante Oficial de Ingreso
                </span>
                <h3 className="text-base font-black text-slate-900 mt-1">
                  Recibo de Tesorería Comunal
                </h3>
                <p className="text-xs font-mono text-emerald-700 font-bold">
                  {viewingReceipt.receiptNumber}
                </p>
              </div>
              <button
                onClick={() => setViewingReceipt(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 font-bold print:hidden"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Fecha y Hora de Recaudo:</span>
                <span className="font-semibold text-slate-800 font-mono">
                  {formatDate(viewingReceipt.paidAt)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Afiliado Titular:</span>
                <span className="font-bold text-slate-900">
                  {statementData.affiliate.user.fullName} (Folio #{statementData.affiliate.folioNumber})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Documento de Identidad:</span>
                <span className="font-mono text-slate-800">
                  {statementData.affiliate.user.identificationType} {statementData.affiliate.user.identificationNumber}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Sector / Vereda:</span>
                <span className="text-slate-800">
                  {statementData.affiliate.veredaOrBarrio || "Vereda Central"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Forma de Pago:</span>
                <span className="font-bold text-slate-800">
                  {viewingReceipt.paymentMethod === "CASH" ? "Efectivo (Caja General)" : "En Cuenta Bancaria"} ({viewingReceipt.accountName})
                </span>
              </div>
              <div className="flex justify-between border-t border-slate-200/80 pt-2 text-sm">
                <span className="font-bold text-slate-900">Monto Recaudado:</span>
                <span className="font-black text-emerald-600 text-base">
                  {formatCurrency(viewingReceipt.amount)}
                </span>
              </div>
              {viewingReceipt.isAdvance && (
                <div className="p-2 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 text-[11px] font-semibold">
                  ✨ Incluye pago por adelantado de {viewingReceipt.advancePeriods?.length || 1} cuota(s) (Periodos: {viewingReceipt.advancePeriods?.join(", ")})
                </div>
              )}
              {viewingReceipt.notes && (
                <div className="text-[11px] text-slate-500 border-t border-slate-200/80 pt-2">
                  <strong>Observaciones:</strong> {viewingReceipt.notes}
                </div>
              )}
              <div className="flex justify-between text-[11px] text-slate-400 border-t border-slate-200/80 pt-2">
                <span>Registrado formalmente por:</span>
                <span className="font-semibold text-slate-700">{viewingReceipt.registeredByName}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 print:hidden">
              <button
                type="button"
                onClick={() => setViewingReceipt(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition text-xs"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold transition shadow-sm text-xs flex items-center justify-center gap-1.5"
              >
                <Printer className="w-4 h-4" /> Imprimir Comprobante
              </button>
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

      {/* Modal para Restablecer PIN Móvil */}
      {isResetPinModalOpen && statementData && (
        <div className="fixed inset-0 z-[70] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2 text-emerald-800">
                <KeyRound className="w-5 h-5 text-emerald-600" />
                <h3 className="font-extrabold text-base">Restablecer PIN de Acceso Móvil</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsResetPinModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Asigna un nuevo PIN numérico de 4 dígitos para que el afiliado{" "}
              <strong className="text-slate-900">{statementData.affiliate.user.fullName}</strong> pueda ingresar a la aplicación móvil con su número de documento.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Nuevo PIN de Acceso (4 dígitos)
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={customPinInput}
                  onChange={(e) => setCustomPinInput(e.target.value.replace(/\D/g, ""))}
                  placeholder="Ej. 1234"
                  className="w-full text-center text-3xl font-mono tracking-widest font-extrabold py-2.5 px-4 bg-slate-50 border-2 border-emerald-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const defaultPin = statementData.affiliate.user.identificationNumber.slice(-4);
                    setCustomPinInput(defaultPin);
                  }}
                  className="flex-1 py-2 px-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-semibold text-slate-700 transition"
                >
                  Últimos 4 de cédula
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const randomPin = Math.floor(1000 + Math.random() * 9000).toString();
                    setCustomPinInput(randomPin);
                  }}
                  className="flex-1 py-2 px-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-semibold text-slate-700 transition"
                >
                  Generar Aleatorio
                </button>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsResetPinModalOpen(false)}
                  className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-xs text-slate-700 transition"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={customPinInput.length < 4 || resetPinMutation.isPending}
                  onClick={() => {
                    resetPinMutation.mutate({
                      membershipId: statementData.affiliate.membershipId,
                      pin: customPinInput,
                    });
                  }}
                  className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs shadow-md transition flex items-center justify-center gap-1.5"
                >
                  {resetPinMutation.isPending ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Guardar PIN</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
