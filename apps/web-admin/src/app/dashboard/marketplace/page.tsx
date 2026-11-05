"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth-store";
import {
  ShoppingBag,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Trash2,
  ShieldCheck,
  MessageCircle,
  MapPin,
  ExternalLink,
  Package,
  Store,
  Eye,
  X,
  FileSpreadsheet,
  ClipboardList,
  Clock,
  Truck,
} from "lucide-react";
import { formatCurrency, formatDate, downloadCsv } from "@/lib/utils";

interface AdminMarketProduct {
  id: string;
  title: string;
  description: string;
  price: number;
  unit: string;
  stockQuantity: number;
  isAvailable: boolean;
  isOrganic: boolean;
  images: any;
  createdAt: string;
  category?: {
    name: string;
    slug: string;
  };
  producer: {
    id: string;
    farmName: string;
    veredaName: string;
    whatsappContact: string;
    user: {
      firstName: string;
      lastName: string;
      identificationNumber: string;
      phone: string;
    };
  };
  _count?: {
    orderItems: number;
  };
}

export default function MarketplaceAdminPage() {
  const queryClient = useQueryClient();
  const { currentJacId } = useAuthStore();

  const [viewTab, setViewTab] = useState<"products" | "orders">("products");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "suspended">("all");
  const [selectedProductForDetail, setSelectedProductForDetail] = useState<AdminMarketProduct | null>(null);

  // Consultar productos del mercado campesino para la JAC activa
  const {
    data: products = [],
    isLoading,
    refetch,
  } = useQuery<AdminMarketProduct[]>({
    queryKey: ["admin-marketplace-products", currentJacId, search, statusFilter],
    queryFn: () =>
      apiClient.get(
        `/marketplace/admin/products?search=${encodeURIComponent(search)}&status=${statusFilter}`
      ),
    enabled: Boolean(currentJacId),
  });

  // Consultar pedidos y encargos comunitarios de la JAC activa
  const {
    data: adminOrders = [],
    isLoading: loadingOrders,
    refetch: refetchOrders,
  } = useQuery<any[]>({
    queryKey: ["admin-marketplace-orders", currentJacId],
    queryFn: () => apiClient.get("/marketplace/admin/orders"),
    enabled: Boolean(currentJacId),
  });

  // Mutación para moderar estado del producto (Aprobar o Suspender)
  const toggleStatusMutation = useMutation({
    mutationFn: ({ productId, isAvailable }: { productId: string; isAvailable: boolean }) =>
      apiClient.patch(`/marketplace/admin/products/${productId}/status`, { isAvailable }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-marketplace-products"] });
      if (selectedProductForDetail) {
        setSelectedProductForDetail((prev) =>
          prev ? { ...prev, isAvailable: !prev.isAvailable } : null
        );
      }
    },
    onError: (err: any) => {
      alert(err.message || "No fue posible actualizar el estado del producto.");
    },
  });

  // Mutación para eliminar producto
  const deleteMutation = useMutation({
    mutationFn: (productId: string) =>
      apiClient.delete(`/marketplace/admin/products/${productId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-marketplace-products"] });
      setSelectedProductForDetail(null);
    },
    onError: (err: any) => {
      alert(err.message || "No fue posible eliminar el producto.");
    },
  });

  // Métricas
  const totalProducts = products.length;
  const activeProducts = products.filter((p: AdminMarketProduct) => p.isAvailable).length;
  const suspendedProducts = products.filter((p: AdminMarketProduct) => !p.isAvailable).length;
  const uniqueProducers = new Set(products.map((p: AdminMarketProduct) => p.producer?.id)).size;

  const totalOrdersAmount = adminOrders.reduce((acc, o) => acc + (Number(o.totalAmount) || 0), 0);
  const pendingOrders = adminOrders.filter((o) => o.status === "PENDING_CONFIRMATION").length;

  const handleExportExcel = () => {
    if (products.length === 0) return;
    const headers = [
      "ID",
      "Producto",
      "Descripción",
      "Categoría",
      "Precio ($ COP)",
      "Unidad",
      "Stock Disponible",
      "Estado",
      "Productor",
      "Cédula",
      "Finca / Predio",
      "Vereda",
      "Teléfono WhatsApp",
      "Fecha Publicación",
    ];
    const rows = products.map((p: AdminMarketProduct) => [
      p.id,
      p.title,
      p.description || "",
      p.category?.name || "General",
      p.price,
      p.unit,
      p.stockQuantity,
      p.isAvailable ? "Activo" : "Suspendido",
      `${p.producer?.user?.firstName || ""} ${p.producer?.user?.lastName || ""}`,
      p.producer?.user?.identificationNumber || "",
      p.producer?.farmName || "",
      p.producer?.veredaName || "",
      p.producer?.whatsappContact || "",
      formatDate(p.createdAt),
    ]);
    downloadCsv("Catalogo_Mercado_Campesino_JAC.csv", headers, rows);
  };

  const handleExportOrdersExcel = () => {
    if (adminOrders.length === 0) return;
    const headers = [
      "Pedido #",
      "Fecha",
      "Comprador",
      "Teléfono Comprador",
      "Productor / Campesino",
      "Finca",
      "Vereda",
      "Teléfono Campesino",
      "Productos / Cosechas",
      "Valor Total ($ COP)",
      "Método de Entrega",
      "Estado",
    ];
    const rows = adminOrders.map((o: any) => [
      o.orderNumber,
      formatDate(o.createdAt),
      o.buyerName,
      o.buyerPhone,
      `${o.producer?.user?.firstName || ""} ${o.producer?.user?.lastName || ""}`,
      o.producer?.farmName || "",
      o.producer?.veredaName || "",
      o.producer?.whatsappContact || "",
      o.items?.map((it: any) => `${it.quantity}x ${it.productTitle}`).join("; "),
      o.totalAmount,
      o.deliveryMethod === "PICKUP_AT_FARM" ? "Recoger en finca" : "Entrega en vereda",
      o.status,
    ]);
    downloadCsv("Libro_Encargos_Mercado_Campesino.csv", headers, rows);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Mercado Campesino & Soberanía Alimentaria
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-black border border-amber-300">
              Ley 2166 de 2021
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Supervisión, verificación estatutaria y moderación legal de cosechas y productos ofertados por los afiliados de la vereda.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {viewTab === "products" ? (
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={products.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold border border-slate-200 shadow-sm transition disabled:opacity-50"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Exportar Catálogo</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleExportOrdersExcel}
              disabled={adminOrders.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold border border-slate-200 shadow-sm transition disabled:opacity-50"
            >
              <FileSpreadsheet className="w-4 h-4 text-amber-600" />
              <span>Exportar Encargos</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              refetch();
              refetchOrders();
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      {/* Legal & Sanitary Compliance Warning */}
      <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 flex items-start gap-3 shadow-sm">
        <ShieldCheck className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
        <div className="space-y-1 text-xs">
          <h4 className="font-bold">Potestad de Control y Verificación Legal de la JAC:</h4>
          <p className="text-amber-800 leading-relaxed">
            De conformidad con los estatutos comunales y la normatividad sanitaria de la República de Colombia, la directiva de la JAC tiene la facultad de <strong>suspender preventivamente o retirar del catálogo</strong> cualquier producto que no cumpla con los requisitos legales (licencias sanitarias mínimas, cadena de frío, productos cárnicos no autorizados, o artículos que no correspondan a la actividad agrícola y artesanal de la vereda).
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Total Productos
          </span>
          <span className="text-2xl font-black text-slate-900 mt-1 block">
            {totalProducts}
          </span>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Registrados en la JAC</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Encargos Realizados
          </span>
          <span className="text-2xl font-black text-amber-600 mt-1 block">
            {adminOrders.length}
          </span>
          <span className="text-[11px] text-amber-700 mt-0.5 block">
            {pendingOrders} por entregar
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Comercio Movilizado
          </span>
          <span className="text-2xl font-black text-emerald-600 mt-1 block">
            ${totalOrdersAmount.toLocaleString("es-CO")}
          </span>
          <span className="text-[11px] text-emerald-700 mt-0.5 block">Economía campesina veredal</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Productores Veredales
          </span>
          <span className="text-2xl font-black text-slate-800 mt-1 block">
            {uniqueProducers}
          </span>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Socios campesinos activos</span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          type="button"
          onClick={() => setViewTab("products")}
          className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition ${
            viewTab === "products"
              ? "border-emerald-600 text-emerald-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Store className="w-4 h-4" />
          <span>Catálogo de Cosechas & Productos ({totalProducts})</span>
        </button>

        <button
          type="button"
          onClick={() => setViewTab("orders")}
          className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition ${
            viewTab === "orders"
              ? "border-amber-600 text-amber-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <ClipboardList className="w-4 h-4" />
          <span>Libro de Encargos & Pedidos Comunales ({adminOrders.length})</span>
          {pendingOrders > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-black">
              {pendingOrders} por entregar
            </span>
          )}
        </button>
      </div>

      {viewTab === "orders" ? (
        /* Orders View */
        <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-3">
            <div>
              <h3 className="text-sm font-black text-slate-800">
                Registro de Encargos & Pedidos del Mercado Campesino
              </h3>
              <p className="text-xs text-slate-500">
                Supervisión comunal de solicitudes de cosechas realizadas entre afiliados y productores.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600">
                Total Acumulado:
              </span>
              <span className="px-3 py-1 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-black border border-emerald-200">
                ${totalOrdersAmount.toLocaleString("es-CO")} COP
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-200/80 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Pedido # & Fecha</th>
                  <th className="py-3 px-4">Comprador (Afiliado / Vecino)</th>
                  <th className="py-3 px-4">Campesino Productor</th>
                  <th className="py-3 px-4">Cosechas / Productos</th>
                  <th className="py-3 px-4 text-right">Valor Total ($ COP)</th>
                  <th className="py-3 px-4 text-center">Entrega</th>
                  <th className="py-3 px-4 text-center">Estado</th>
                  <th className="py-3 px-4 text-right">Canal WhatsApp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {adminOrders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      No hay pedidos registrados en el mercado campesino todavía.
                    </td>
                  </tr>
                ) : (
                  adminOrders.map((ord: any) => {
                    const farmerPhone = (ord.producer?.whatsappContact || ord.producer?.user?.phone || "").replace(/\D/g, "");
                    const buyerPhone = (ord.buyerPhone || "").replace(/\D/g, "");
                    const waFarmerUrl = farmerPhone ? `https://wa.me/57${farmerPhone.slice(-10)}` : null;
                    const waBuyerUrl = buyerPhone ? `https://wa.me/57${buyerPhone.slice(-10)}` : null;

                    const statusBadge =
                      ord.status === "PENDING_CONFIRMATION"
                        ? { label: "Pendiente", bg: "bg-amber-50 text-amber-700 border-amber-200" }
                        : ord.status === "CONFIRMED"
                        ? { label: "Confirmado", bg: "bg-blue-50 text-blue-700 border-blue-200" }
                        : ord.status === "DELIVERED"
                        ? { label: "Entregado", bg: "bg-emerald-50 text-emerald-700 border-emerald-200" }
                        : { label: ord.status, bg: "bg-slate-100 text-slate-700 border-slate-200" };

                    return (
                      <tr key={ord.id} className="hover:bg-slate-50/60 transition">
                        <td className="py-3 px-4">
                          <span className="font-extrabold text-slate-900 block">
                            #{ord.orderNumber}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {formatDate(ord.createdAt)}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-slate-800 block">{ord.buyerName}</span>
                          <span className="text-[11px] text-slate-400">{ord.buyerPhone}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-slate-800 block">
                            {ord.producer?.user?.firstName} {ord.producer?.user?.lastName}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            {ord.producer?.farmName} ({ord.producer?.veredaName})
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="space-y-0.5">
                            {ord.items?.map((it: any) => (
                              <span key={it.id} className="block text-slate-700">
                                <strong>{it.quantity}x</strong> {it.productTitle}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="font-black text-emerald-700 text-sm">
                            ${Number(ord.totalAmount).toLocaleString("es-CO")}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="text-[11px] font-medium text-slate-600 block">
                            {ord.deliveryMethod === "PICKUP_AT_FARM" ? "Recoger en Finca" : "Entrega en Vereda"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border inline-block ${statusBadge.bg}`}>
                            {statusBadge.label}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right space-x-1.5">
                          {waFarmerUrl && (
                            <a
                              href={waFarmerUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[11px] font-bold border border-emerald-200 transition"
                              title="Contactar Productor por WhatsApp"
                            >
                              <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Campesino</span>
                            </a>
                          )}
                          {waBuyerUrl && (
                            <a
                              href={waBuyerUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-bold border border-blue-200 transition"
                              title="Contactar Comprador por WhatsApp"
                            >
                              <MessageCircle className="w-3.5 h-3.5 text-blue-600" />
                              <span>Comprador</span>
                            </a>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Products Catalog View */
        <>
          {/* Filters & Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por producto, cosecha, productor o finca..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              statusFilter === "all"
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Todos ({totalProducts})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("active")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              statusFilter === "active"
                ? "bg-emerald-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Activos ({activeProducts})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("suspended")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              statusFilter === "suspended"
                ? "bg-rose-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Suspendidos ({suspendedProducts})
          </button>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200/80 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Producto & Cosecha</th>
                <th className="py-3 px-4">Productor & Finca</th>
                <th className="py-3 px-4">Categoría</th>
                <th className="py-3 px-4 text-right">Precio Unitario</th>
                <th className="py-3 px-4 text-center">Disponible</th>
                <th className="py-3 px-4 text-center">Estado Legal / Venta</th>
                <th className="py-3 px-4 text-right">Acciones de Directiva</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-emerald-600" />
                    Cargando catálogo del mercado campesino...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Package className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    No se encontraron productos publicados con los filtros aplicados.
                  </td>
                </tr>
              ) : (
                products.map((prod: AdminMarketProduct) => (
                  <tr key={prod.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 text-sm">{prod.title}</div>
                      {prod.description && (
                        <div className="text-[11px] text-slate-400 truncate max-w-xs mt-0.5">
                          {prod.description}
                        </div>
                      )}
                      <div className="text-[10px] text-slate-400 mt-1 font-mono">
                        Publicado: {formatDate(prod.createdAt)}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-800">
                        {prod.producer?.user?.firstName} {prod.producer?.user?.lastName}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-emerald-600" />
                        <span>{prod.producer?.farmName || "Finca Comunal"}</span> • Vereda {prod.producer?.veredaName}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                        CC: {prod.producer?.user?.identificationNumber}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-900 text-[11px] font-bold border border-amber-200 inline-block">
                        {prod.category?.name || "Campo y Granja"}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right font-black text-emerald-700 text-sm">
                      {formatCurrency(prod.price)}
                      <span className="text-[10px] font-normal text-slate-400 block">
                        por {prod.unit}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-center font-bold text-slate-800">
                      {prod.stockQuantity}{" "}
                      <span className="text-[10px] font-normal text-slate-400">
                        {prod.unit.toLowerCase()}s
                      </span>
                    </td>

                    <td className="py-3 px-4 text-center">
                      {prod.isAvailable ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Activo en Catálogo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 text-[11px] font-bold border border-rose-200">
                          <XCircle className="w-3 h-3 text-rose-600" />
                          Suspendido (Oculto)
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right space-x-1.5">
                      {/* Botón WhatsApp */}
                      {prod.producer?.whatsappContact && (
                        <a
                          href={`https://wa.me/57${prod.producer.whatsappContact.replace(/\D/g, "")}?text=${encodeURIComponent(
                            `Hola ${prod.producer.user.firstName}, te contactamos desde la directiva de la JAC sobre tu publicación de '${prod.title}' en el Mercado Campesino.`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-bold border border-emerald-200 transition"
                          title="Contactar al productor por WhatsApp"
                        >
                          <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                        </a>
                      )}

                      {/* Botón Moderar Estado */}
                      <button
                        type="button"
                        onClick={() =>
                          toggleStatusMutation.mutate({
                            productId: prod.id,
                            isAvailable: !prod.isAvailable,
                          })
                        }
                        className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition border ${
                          prod.isAvailable
                            ? "bg-rose-50 hover:bg-rose-100 text-rose-800 border-rose-200"
                            : "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200"
                        }`}
                        title={prod.isAvailable ? "Suspender por incumplimiento legal" : "Aprobar publicación"}
                      >
                        {prod.isAvailable ? (
                          <>
                            <XCircle className="w-3 h-3 text-rose-600" />
                            <span>Suspender</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Aprobar</span>
                          </>
                        )}
                      </button>

                      {/* Botón Eliminar */}
                      <button
                        type="button"
                        onClick={() => {
                          if (
                            confirm(
                              `¿Confirmas que deseas eliminar permanentemente el producto '${prod.title}' del Mercado Campesino?`
                            )
                          ) {
                            deleteMutation.mutate(prod.id);
                          }
                        }}
                        className="inline-flex items-center p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                        title="Eliminar producto"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )}
</div>
  );
}
