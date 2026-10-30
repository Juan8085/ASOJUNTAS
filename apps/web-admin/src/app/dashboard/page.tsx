"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth-store";
import { formatCurrency } from "@/lib/utils";
import {
  Users,
  Landmark,
  FileCheck,
  Vote,
  Shovel,
  ArrowRight,
  TrendingUp,
  Calendar,
  AlertTriangle,
} from "lucide-react";

interface FinancialSummary {
  totalBalance: number;
  accounts: Array<{ id: string; name: string; type: string; balance: number }>;
  obligationsSummary: {
    pendingCount: number;
    paidCount: number;
    collectionRate: number;
  };
}

interface AffiliatesResponse {
  pagination: { total: number };
}

interface AssemblyItem {
  id: string;
  title: string;
  scheduledDate: string;
  status: string;
  location: string;
}

export default function DashboardOverviewPage() {
  const router = useRouter();
  const { currentJacId, user, isSuperAdmin } = useAuthStore();

  useEffect(() => {
    if (isSuperAdmin) {
      router.replace("/dashboard/asojuntas");
    }
  }, [isSuperAdmin, router]);

  const { data: treasurySummary, isLoading: isLoadingTreasury } = useQuery<FinancialSummary>({
    queryKey: ["treasury-summary", currentJacId],
    queryFn: () => apiClient("/treasury/summary"),
    enabled: Boolean(currentJacId),
  });

  const { data: affiliatesData, isLoading: isLoadingAffiliates } = useQuery<AffiliatesResponse>({
    queryKey: ["affiliates-count", currentJacId],
    queryFn: () => apiClient("/affiliates/book", { params: { limit: 1 } }),
    enabled: Boolean(currentJacId),
  });

  const { data: assemblies } = useQuery<AssemblyItem[]>({
    queryKey: ["assemblies-recent", currentJacId],
    queryFn: () => apiClient("/assemblies"),
    enabled: Boolean(currentJacId),
  });

  const nextAssembly = assemblies?.find(
    (a) => a.status === "SCHEDULED" || a.status === "IN_PROGRESS"
  );

  return (
    <div className="space-y-8">
      {/* Welcome banner */}
      <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-2xl space-y-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-200 text-xs font-semibold border border-emerald-400/30">
            Junta de Acción Comunal • Ley 2166 de 2021
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Bienvenido, {user?.firstName} {user?.lastName}
          </h1>
          <p className="text-emerald-100 text-sm leading-relaxed">
            Panel de control para la administración del Libro de Afiliados, recaudo de cuotas, emisión de certificados oficiales y articulación comunal.
          </p>
        </div>
        <div className="absolute right-0 bottom-0 translate-x-8 translate-y-8 opacity-10 pointer-events-none">
          <Landmark className="w-80 h-80 text-white" />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Afiliados */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Afiliados Inscritos
            </span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900">
            {isLoadingAffiliates ? "..." : affiliatesData?.pagination.total || 0}
          </div>
          <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
            <span className="text-emerald-600 font-semibold">Folios activos</span> en Libro Digital
          </p>
        </div>

        {/* Saldo en Tesorería */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Fondos en Tesorería
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Landmark className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600 truncate">
            {isLoadingTreasury
              ? "..."
              : formatCurrency(treasurySummary?.totalBalance || 0)}
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Saldo acumulado en cuentas comunales
          </p>
        </div>

        {/* Tasa de Recaudo */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Efectividad de Recaudo
            </span>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900">
            {isLoadingTreasury
              ? "..."
              : `${treasurySummary?.obligationsSummary.collectionRate || 0}%`}
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-3 overflow-hidden">
            <div
              className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
              style={{
                width: `${treasurySummary?.obligationsSummary.collectionRate || 0}%`,
              }}
            />
          </div>
        </div>

        {/* Próxima Asamblea */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Próxima Asamblea
            </span>
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Vote className="w-5 h-5" />
            </div>
          </div>
          <div className="text-sm font-bold text-slate-900 truncate">
            {nextAssembly ? nextAssembly.title : "No hay convocatorias"}
          </div>
          <p className="text-xs text-slate-500 mt-2 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-purple-500" />
            {nextAssembly
              ? new Date(nextAssembly.scheduledDate).toLocaleDateString("es-CO", {
                  dateStyle: "medium",
                })
              : "Verificar estatutos"}
          </p>
        </div>
      </div>

      {/* Quick Access Matrix */}
      <div>
        <h2 className="text-lg font-bold text-slate-900 mb-4 tracking-tight">
          Acciones Operativas Inmediatas
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/dashboard/affiliates"
            className="p-5 bg-white border border-slate-200/90 rounded-2xl shadow-sm hover:border-emerald-500 hover:shadow-md transition flex items-start gap-4 group"
          >
            <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm group-hover:text-emerald-600 transition flex items-center gap-1">
                Libro de Afiliados <ArrowRight className="w-3.5 h-3.5" />
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Inscribir nuevo habitante, consultar número de folio y actualizar datos socioeconómicos.
              </p>
            </div>
          </Link>

          <Link
            href="/dashboard/certificates"
            className="p-5 bg-white border border-slate-200/90 rounded-2xl shadow-sm hover:border-emerald-500 hover:shadow-md transition flex items-start gap-4 group"
          >
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm group-hover:text-emerald-600 transition flex items-center gap-1">
                Certificados con QR <ArrowRight className="w-3.5 h-3.5" />
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Expedir certificados oficiales de residencia o paz y salvo comunal con token anti-fraude.
              </p>
            </div>
          </Link>

          <Link
            href="/dashboard/treasury"
            className="p-5 bg-white border border-slate-200/90 rounded-2xl shadow-sm hover:border-emerald-500 hover:shadow-md transition flex items-start gap-4 group"
          >
            <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm group-hover:text-emerald-600 transition flex items-center gap-1">
                Recaudo & Gastos <ArrowRight className="w-3.5 h-3.5" />
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Asentar recibos de cuotas ordinarias en efectivo y registrar compras de la JAC.
              </p>
            </div>
          </Link>
        </div>
      </div>

      {/* Account Balances Preview */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Desglose de Cuentas de Tesorería
          </h2>
          <Link
            href="/dashboard/treasury"
            className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
          >
            Ver Libro Completo →
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {treasurySummary?.accounts && treasurySummary.accounts.length > 0 ? (
            treasurySummary.accounts.map((acc) => (
              <div
                key={acc.id}
                className="p-4 rounded-xl bg-slate-50 border border-slate-200/60"
              >
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                  <span>{acc.name}</span>
                  <span className="font-mono text-[10px] bg-slate-200 px-1.5 py-0.5 rounded">
                    {acc.type}
                  </span>
                </div>
                <div className="text-xl font-bold text-slate-900">
                  {formatCurrency(acc.balance)}
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full py-8 text-center text-slate-400 text-xs">
              <AlertTriangle className="w-6 h-6 mx-auto mb-2 text-slate-300" />
              No hay cuentas registradas. Ingrese a Tesorería para configurar la Caja Menor o Cuenta Bancaria.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

