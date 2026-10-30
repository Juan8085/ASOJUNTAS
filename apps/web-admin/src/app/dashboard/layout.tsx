"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/lib/auth-store";
import {
  LayoutDashboard,
  Users,
  FileCheck,
  Landmark,
  Vote,
  Shovel,
  Megaphone,
  Inbox,
  Settings,
  LogOut,
  Building,
  ChevronDown,
  Menu,
  X,
} from "lucide-react";

const jacNavItems = [
  { name: "Resumen Veredal", href: "/dashboard", icon: LayoutDashboard },
  { name: "Libro de Afiliados", href: "/dashboard/affiliates", icon: Users },
  { name: "Certificados con QR", href: "/dashboard/certificates", icon: FileCheck },
  { name: "Tesorería & Cuotas", href: "/dashboard/treasury", icon: Landmark },
  { name: "Asambleas & Votos", href: "/dashboard/assemblies", icon: Vote },
  { name: "Mingas Veredales", href: "/dashboard/mingas", icon: Shovel },
  { name: "Cartelera & Alertas", href: "/dashboard/posts", icon: Megaphone },
  { name: "PQRSD Comunal", href: "/dashboard/pqrsd", icon: Inbox },
  { name: "Configuración JAC", href: "/dashboard/settings", icon: Settings },
];

const asojuntasNavItems = [
  { name: "Panel Municipal Asojuntas", href: "/dashboard/asojuntas", icon: Building },
  { name: "Censo Comunal de Afiliados", href: "/dashboard/affiliates", icon: Users },
  { name: "Certificados Oficiales & QR", href: "/dashboard/certificates", icon: FileCheck },
  { name: "Tesorería Comunal", href: "/dashboard/treasury", icon: Landmark },
  { name: "Asambleas Municipales", href: "/dashboard/assemblies", icon: Vote },
  { name: "Mingas y Proyectos", href: "/dashboard/mingas", icon: Shovel },
  { name: "Circulares & Comunicados", href: "/dashboard/posts", icon: Megaphone },
  { name: "PQRSD Municipal", href: "/dashboard/pqrsd", icon: Inbox },
  { name: "Configuración Asojuntas", href: "/dashboard/settings", icon: Settings },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, memberships, currentJacId, switchJac, logout, isSuperAdmin } = useAuthStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!user) {
      router.push("/auth/login");
    }
  }, [user, router]);

  if (!mounted || !user) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium">Cargando sesión...</span>
        </div>
      </div>
    );
  }

  const activeMembership =
    memberships.find((m) => m.jacId === currentJacId) || memberships[0];

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Mobile sidebar overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 z-50 w-64 bg-slate-900 text-white flex flex-col transition-transform duration-200 ease-in-out ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Brand */}
        <div className="h-16 px-6 flex items-center justify-between border-b border-slate-800">
          <Link
            href={isSuperAdmin ? "/dashboard/asojuntas" : "/dashboard"}
            className="flex items-center gap-3"
          >
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white shadow-md ${
                isSuperAdmin
                  ? "bg-blue-600 shadow-blue-600/30"
                  : "bg-emerald-500 shadow-emerald-500/20"
              }`}
            >
              {isSuperAdmin ? "AJ" : "CJ"}
            </div>
            <div>
              <span className="font-bold text-lg text-white tracking-tight">
                Conecta
                <span className={isSuperAdmin ? "text-blue-400" : "text-emerald-400"}>
                  {isSuperAdmin ? "Asojuntas" : "JAC"}
                </span>
              </span>
              <span
                className={`text-[10px] block -mt-1 font-semibold uppercase tracking-wider ${
                  isSuperAdmin ? "text-blue-300" : "text-emerald-400"
                }`}
              >
                {isSuperAdmin ? "Federación Municipal" : "Directivos JAC"}
              </span>
            </div>
          </Link>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* JAC Context Selector */}
        <div className="p-4 border-b border-slate-800/60">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
            {isSuperAdmin ? "JAC en Supervisión / Auditoría" : "Contexto Activo de JAC"}
          </label>
          <div className="relative">
            <select
              value={currentJacId || ""}
              onChange={(e) => switchJac(e.target.value)}
              className={`w-full bg-slate-800/90 hover:bg-slate-800 border border-slate-700/80 rounded-xl py-2 px-3 text-xs font-semibold focus:outline-none appearance-none pr-8 cursor-pointer transition ${
                isSuperAdmin
                  ? "text-blue-300 focus:ring-1 focus:ring-blue-500"
                  : "text-emerald-300 focus:ring-1 focus:ring-emerald-500"
              }`}
            >
              {memberships.map((m) => (
                <option key={m.id} value={m.jacId}>
                  {m.jacName}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
            <span>Rol Activo:</span>
            <span
              className={`px-2 py-0.5 rounded-full font-semibold border ${
                isSuperAdmin
                  ? "bg-blue-950/80 text-blue-300 border-blue-800/50"
                  : "bg-emerald-950/80 text-emerald-300 border-emerald-800/40"
              }`}
            >
              {isSuperAdmin ? "SUPER_ADMIN (Asojuntas)" : activeMembership?.role || "DIRECTIVO"}
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {(isSuperAdmin ? asojuntasNavItems : jacNavItems).map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" &&
                item.href !== "/dashboard/asojuntas" &&
                pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                  isActive
                    ? isSuperAdmin
                      ? "bg-blue-600 text-white shadow-md shadow-blue-600/30 font-semibold"
                      : "bg-emerald-600 text-white shadow-md shadow-emerald-600/20 font-semibold"
                    : "text-slate-300 hover:bg-slate-800/70 hover:text-white"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-slate-400"}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* User profile & logout footer */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center font-bold text-xs text-white flex-shrink-0">
              {user.firstName[0]}
              {user.lastName[0]}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-[10px] text-slate-400 truncate">
                CC: {user.identificationNumber}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              logout();
              router.push("/auth/login");
            }}
            title="Cerrar sesión"
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 text-slate-600 hover:text-slate-900 rounded-lg"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="hidden sm:flex items-center gap-2 text-slate-500 text-xs">
              <Building
                className={`w-4 h-4 ${isSuperAdmin ? "text-blue-600" : "text-emerald-600"}`}
              />
              <span className="font-semibold text-slate-800">
                {isSuperAdmin
                  ? "Asojuntas Municipal • Nivel Central"
                  : activeMembership?.jacName || "Junta de Acción Comunal"}
              </span>
              <span>•</span>
              <span>
                {isSuperAdmin
                  ? `JAC Activa: ${activeMembership?.jacName || "Consolidado"}`
                  : `Libro Digital #${activeMembership?.bookNumber || 1}`}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden md:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              MongoDB Atlas Cloud (En Línea)
            </span>
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border ${
                isSuperAdmin
                  ? "bg-blue-100 text-blue-800 border-blue-200"
                  : "bg-emerald-100 text-emerald-800 border-emerald-200"
              }`}
            >
              {user.firstName[0]}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}

