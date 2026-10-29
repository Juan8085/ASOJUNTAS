"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth-store";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  Landmark,
  PlusCircle,
  Receipt,
  ArrowDownRight,
  ArrowUpRight,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Wallet,
  Settings,
} from "lucide-react";
import {
  TreasuryAccountType,
  TreasuryTransactionType,
  TreasuryCategory,
  FeeType,
  FeePeriodicity,
} from "@conectajac/shared";

interface TreasuryAccountItem {
  id: string;
  name: string;
  type: string;
  balance: number;
}

interface TreasuryMovementItem {
  id: string;
  accountId: string;
  type: TreasuryTransactionType;
  category: TreasuryCategory;
  amount: number;
  balanceAfter: number;
  description: string;
  voucherUrl?: string;
  transactionDate: string;
  account: { name: string; type: string };
  registeredBy: { firstName: string; lastName: string };
}

interface MovementsResponse {
  data: TreasuryMovementItem[];
  pagination: { total: number; page: number; totalPages: number };
}

interface FeeConfigItem {
  id: string;
  name: string;
  type: string;
  periodicity: string;
  amount: number;
  dueDateDay: number;
  isActive: boolean;
}

export default function TreasuryPage() {
  const queryClient = useQueryClient();
  const { currentJacId } = useAuthStore();
  const [activeTab, setActiveTab] = useState<"movements" | "cash" | "movement_form" | "fees">("movements");

  // Cash payment form state
  const [cashForm, setCashForm] = useState({
    feeObligationId: "",
    amount: "",
    receiptNumber: "",
    notes: "",
  });

  // General movement form state
  const [movementForm, setMovementForm] = useState({
    accountId: "",
    type: TreasuryTransactionType.EXPENSE,
    category: TreasuryCategory.MAINTENANCE,
    amount: "",
    description: "",
  });

  // Success message
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Queries
  const { data: accounts } = useQuery<TreasuryAccountItem[]>({
    queryKey: ["treasury-accounts", currentJacId],
    queryFn: () => apiClient("/treasury/accounts"),
    enabled: Boolean(currentJacId),
  });

  const { data: movementsData, isLoading: isLoadingMovements } = useQuery<MovementsResponse>({
    queryKey: ["treasury-movements", currentJacId],
    queryFn: () => apiClient("/treasury/movements"),
    enabled: Boolean(currentJacId),
  });

  const { data: feeConfigs } = useQuery<FeeConfigItem[]>({
    queryKey: ["fee-configs", currentJacId],
    queryFn: () => apiClient("/treasury/fees"),
    enabled: Boolean(currentJacId),
  });

  // Mutations
  const movementMutation = useMutation({
    mutationFn: () =>
      apiClient("/treasury/movements", {
        method: "POST",
        body: JSON.stringify({
          jacId: currentJacId,
          accountId: movementForm.accountId,
          type: movementForm.type,
          category: movementForm.category,
          amount: Number(movementForm.amount),
          description: movementForm.description.trim(),
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["treasury-movements"] });
      queryClient.invalidateQueries({ queryKey: ["treasury-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["treasury-summary"] });
      setStatusMessage("Movimiento asentado en el Libro de Tesorería exitosamente.");
      setActiveTab("movements");
      setMovementForm({
        accountId: "",
        type: TreasuryTransactionType.EXPENSE,
        category: TreasuryCategory.MAINTENANCE,
        amount: "",
        description: "",
      });
    },
  });

  const totalFunds = accounts?.reduce((sum, acc) => sum + Number(acc.balance), 0) || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Tesorería Comunal & Libro Contable
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200">
              Partida Doble
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Custodiado por el Tesorero(a) y fiscalizado internamente conforme a los estatutos.
          </p>
        </div>

        <div className="text-right bg-white px-5 py-2.5 rounded-2xl border border-slate-200/80 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Fondos Totales Disponibles
          </span>
          <span className="text-xl font-black text-emerald-600">
            {formatCurrency(totalFunds)}
          </span>
        </div>
      </div>

      {statusMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-emerald-800 text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span>{statusMessage}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-emerald-700 hover:text-emerald-900 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Accounts Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {accounts?.map((acc) => (
          <div
            key={acc.id}
            className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm"
          >
            <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
              <span className="font-semibold text-slate-700">{acc.name}</span>
              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-[10px] font-mono">
                {acc.type}
              </span>
            </div>
            <div className="text-2xl font-black text-slate-900">
              {formatCurrency(acc.balance)}
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto">
        <button
          onClick={() => setActiveTab("movements")}
          className={`py-3 px-5 text-sm font-semibold border-b-2 transition whitespace-nowrap flex items-center gap-2 ${
            activeTab === "movements"
              ? "border-emerald-600 text-emerald-700"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Landmark className="w-4 h-4" /> Libro de Tesorería (Movimientos)
        </button>
        <button
          onClick={() => setActiveTab("movement_form")}
          className={`py-3 px-5 text-sm font-semibold border-b-2 transition whitespace-nowrap flex items-center gap-2 ${
            activeTab === "movement_form"
              ? "border-emerald-600 text-emerald-700"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <PlusCircle className="w-4 h-4" /> Registrar Ingreso / Gasto
        </button>
        <button
          onClick={() => setActiveTab("fees")}
          className={`py-3 px-5 text-sm font-semibold border-b-2 transition whitespace-nowrap flex items-center gap-2 ${
            activeTab === "fees"
              ? "border-emerald-600 text-emerald-700"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Settings className="w-4 h-4" /> Configuración de Cuotas
        </button>
      </div>

      {/* Tab: Movements Ledger */}
      {activeTab === "movements" && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Fecha</th>
                  <th className="py-3.5 px-4">Tipo</th>
                  <th className="py-3.5 px-4">Categoría</th>
                  <th className="py-3.5 px-4">Descripción</th>
                  <th className="py-3.5 px-4">Cuenta</th>
                  <th className="py-3.5 px-4">Monto</th>
                  <th className="py-3.5 px-4">Saldo Posterior</th>
                  <th className="py-3.5 px-4">Registrado Por</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {isLoadingMovements ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-slate-400">
                      Cargando Libro de Tesorería...
                    </td>
                  </tr>
                ) : movementsData?.data && movementsData.data.length > 0 ? (
                  movementsData.data.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3.5 px-4 text-xs text-slate-500 whitespace-nowrap">
                        {formatDate(m.transactionDate)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            m.type === TreasuryTransactionType.INCOME
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-red-50 text-red-700 border border-red-200"
                          }`}
                        >
                          {m.type === TreasuryTransactionType.INCOME ? (
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          ) : (
                            <ArrowDownRight className="w-3.5 h-3.5" />
                          )}
                          {m.type === TreasuryTransactionType.INCOME ? "Ingreso" : "Egreso"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs font-medium text-slate-700">
                        {m.category}
                      </td>
                      <td className="py-3.5 px-4 text-slate-800 font-medium">
                        {m.description}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-500">
                        {m.account.name}
                      </td>
                      <td
                        className={`py-3.5 px-4 font-bold ${
                          m.type === TreasuryTransactionType.INCOME
                            ? "text-emerald-700"
                            : "text-red-700"
                        }`}
                      >
                        {m.type === TreasuryTransactionType.INCOME ? "+" : "-"}
                        {formatCurrency(m.amount)}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-600 font-semibold">
                        {formatCurrency(m.balanceAfter)}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-500">
                        {m.registeredBy.firstName} {m.registeredBy.lastName}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-slate-400">
                      No hay movimientos asentados en este periodo.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: New Movement Form */}
      {activeTab === "movement_form" && (
        <div className="max-w-xl mx-auto bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-sm space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Asentar Movimiento en Tesorería
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Registra entradas o salidas con actualización atómica del saldo contable.
            </p>
          </div>

          {movementMutation.isError && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{(movementMutation.error as Error).message}</span>
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              movementMutation.mutate();
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Cuenta de Tesorería Afectada *
              </label>
              <select
                required
                value={movementForm.accountId}
                onChange={(e) => setMovementForm({ ...movementForm, accountId: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="">Seleccione una cuenta...</option>
                {accounts?.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} — Saldo: {formatCurrency(acc.balance)}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tipo de Movimiento *
                </label>
                <select
                  value={movementForm.type}
                  onChange={(e) =>
                    setMovementForm({ ...movementForm, type: e.target.value as TreasuryTransactionType })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value={TreasuryTransactionType.EXPENSE}>Egreso (Gasto)</option>
                  <option value={TreasuryTransactionType.INCOME}>Ingreso</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Categoría *
                </label>
                <select
                  value={movementForm.category}
                  onChange={(e) =>
                    setMovementForm({ ...movementForm, category: e.target.value as TreasuryCategory })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value={TreasuryCategory.MAINTENANCE}>Mantenimiento de Sedes/Vías</option>
                  <option value={TreasuryCategory.OFFICE_SUPPLIES}>Papelería y Libros</option>
                  <option value={TreasuryCategory.COMMUNAL_WORKS}>Materiales de Minga</option>
                  <option value={TreasuryCategory.EVENT_PROCEEDS}>Actividades / Bazar</option>
                  <option value={TreasuryCategory.DONATION}>Donación</option>
                  <option value={TreasuryCategory.MONTHLY_FEE}>Cuotas Comunales</option>
                  <option value={TreasuryCategory.OTHER}>Otros</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Monto en Pesos Colombianos (COP) *
              </label>
              <input
                type="number"
                required
                min={1}
                placeholder="Ej: 150000"
                value={movementForm.amount}
                onChange={(e) => setMovementForm({ ...movementForm, amount: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Descripción / Concepto *
              </label>
              <textarea
                required
                rows={3}
                placeholder="Ej: Compra de cemento y mangueras para reparación del acueducto veredal..."
                value={movementForm.description}
                onChange={(e) => setMovementForm({ ...movementForm, description: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <button
              type="submit"
              disabled={movementMutation.isPending || !movementForm.accountId || !movementForm.amount}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm transition disabled:opacity-50"
            >
              {movementMutation.isPending ? "Asentando..." : "Asentar en Libro de Tesorería"}
            </button>
          </form>
        </div>
      )}

      {/* Tab: Fee Configurations */}
      {activeTab === "fees" && (
        <div className="space-y-4">
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
            <h2 className="text-base font-bold text-slate-900 mb-3">
              Cuotas Vigentes Aprobadas por Asamblea
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {feeConfigs?.map((fee) => (
                <div
                  key={fee.id}
                  className="p-4 rounded-xl border border-slate-200/70 bg-slate-50 space-y-2"
                >
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="font-semibold text-slate-800">{fee.name}</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                      {fee.type}
                    </span>
                  </div>
                  <div className="text-xl font-black text-slate-900">
                    {formatCurrency(fee.amount)}
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center justify-between">
                    <span>Periodicidad: {fee.periodicity}</span>
                    <span>Vence día: {fee.dueDateDay}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

