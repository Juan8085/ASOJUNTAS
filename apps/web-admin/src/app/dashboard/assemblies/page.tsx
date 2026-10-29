"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth-store";
import { formatDate } from "@/lib/utils";
import {
  Vote,
  PlusCircle,
  Users,
  CheckCircle2,
  Calendar,
  MapPin,
  AlertCircle,
  X,
  FileText,
} from "lucide-react";
import { AssemblyType, AssemblyStatus } from "@conectajac/shared";

interface AssemblyItem {
  id: string;
  title: string;
  description?: string;
  type: string;
  scheduledDate: string;
  location: string;
  status: string;
  quorumPercentageRequired: number;
  quorumReached: boolean;
  minutesPdfUrl?: string;
  _count?: { topics: number };
}

export default function AssembliesPage() {
  const queryClient = useQueryClient();
  const { currentJacId } = useAuthStore();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: AssemblyType.ORDINARY,
    scheduledDate: "",
    location: "Salón Comunal Principal",
    quorumPercentageRequired: 50,
  });

  const { data: assemblies, isLoading } = useQuery<AssemblyItem[]>({
    queryKey: ["assemblies", currentJacId],
    queryFn: () => apiClient("/assemblies"),
    enabled: Boolean(currentJacId),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      apiClient("/assemblies", {
        method: "POST",
        body: JSON.stringify({
          ...formData,
          jacId: currentJacId,
          scheduledDate: new Date(formData.scheduledDate).toISOString(),
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assemblies"] });
      setStatusMessage("Convocatoria a Asamblea General programada exitosamente.");
      setIsCreateModalOpen(false);
      setFormData({
        title: "",
        description: "",
        type: AssemblyType.ORDINARY,
        scheduledDate: "",
        location: "Salón Comunal Principal",
        quorumPercentageRequired: 50,
      });
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Asambleas Generales & Voto Electrónico
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 text-xs font-bold border border-purple-200">
              Órgano Máximo
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Convocatorias estatutarias, control de quórum y votaciones secretas para decisiones comunales.
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-sm rounded-xl shadow-sm transition"
        >
          <PlusCircle className="w-4 h-4" /> Convocar Asamblea
        </button>
      </div>

      {statusMessage && (
        <div className="p-4 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-between text-purple-900 text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-purple-600" />
            <span>{statusMessage}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-purple-700 hover:text-purple-900 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Assembly List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="bg-white p-12 text-center text-slate-400 rounded-2xl border">
            Cargando asambleas convocadas...
          </div>
        ) : assemblies && assemblies.length > 0 ? (
          assemblies.map((assembly) => (
            <div
              key={assembly.id}
              className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider">
                      Asamblea {assembly.type}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        assembly.status === "SCHEDULED"
                          ? "bg-blue-50 text-blue-700 border border-blue-200"
                          : assembly.status === "IN_PROGRESS"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200 animate-pulse"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {assembly.status}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {assembly.title}
                  </h3>
                </div>

                <div className="text-sm text-slate-500 flex items-center gap-4">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    {formatDate(assembly.scheduledDate)}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    {assembly.location}
                  </span>
                </div>
              </div>

              {assembly.description && (
                <p className="text-xs text-slate-600 leading-relaxed">
                  {assembly.description}
                </p>
              )}

              <div className="flex items-center justify-between pt-2 text-xs text-slate-500">
                <div className="flex items-center gap-4">
                  <span className="font-semibold text-slate-700 flex items-center gap-1">
                    <Users className="w-4 h-4 text-emerald-600" /> Quórum estatutario: {assembly.quorumPercentageRequired}%
                  </span>
                  <span>Temas en orden del día: {assembly._count?.topics || 0}</span>
                </div>

                {assembly.minutesPdfUrl && (
                  <a
                    href={assembly.minutesPdfUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-purple-700 font-bold hover:underline"
                  >
                    <FileText className="w-4 h-4" /> Ver Acta Oficial PDF
                  </a>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white p-12 text-center text-slate-400 rounded-2xl border">
            No hay asambleas programadas. Haga clic en &quot;Convocar Asamblea&quot; para crear la primera citación.
          </div>
        )}
      </div>

      {/* Create Assembly Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-4 border-b">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                  <Vote className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Convocar Asamblea General
                  </h2>
                  <p className="text-xs text-slate-500">
                    Citación oficial a todos los afiliados activos de la JAC
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {createMutation.isError && (
              <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{(createMutation.error as Error).message}</span>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate();
              }}
              className="mt-6 space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Título de la Convocatoria *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Primera Asamblea General Ordinaria de Rendición de Cuentas 2026"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tipo de Asamblea *
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({ ...formData, type: e.target.value as AssemblyType })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  >
                    <option value={AssemblyType.ORDINARY}>Ordinaria</option>
                    <option value={AssemblyType.EXTRAORDINARY}>Extraordinaria</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Porcentaje de Quórum Requerido (%)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={formData.quorumPercentageRequired}
                    onChange={(e) =>
                      setFormData({ ...formData, quorumPercentageRequired: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Fecha y Hora Programada *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.scheduledDate}
                    onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Lugar o Sede *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Orden del Día o Descripción
                </label>
                <textarea
                  rows={3}
                  placeholder="1. Verificación del quórum. 2. Informe del Presidente y Tesorero. 3. Elección comités..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || !formData.title || !formData.scheduledDate}
                  className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold text-sm transition disabled:opacity-50"
                >
                  {createMutation.isPending ? "Convocando..." : "Convocar Asamblea"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

