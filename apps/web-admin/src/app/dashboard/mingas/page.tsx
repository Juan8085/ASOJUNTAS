"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth-store";
import { formatDate, formatCurrency } from "@/lib/utils";
import {
  Shovel,
  PlusCircle,
  Calendar,
  MapPin,
  CheckCircle2,
  Users,
  AlertTriangle,
  X,
  FileCheck2,
  DollarSign,
} from "lucide-react";
import { PostPriority, PostScope, PostType } from "@conectajac/shared";

interface MingaItem {
  id: string;
  title: string;
  slug: string;
  content: string;
  eventDate: string;
  location: string;
  priority: string;
  author: string;
  totalConfirmed: number;
  totalAttended: number;
  createdAt: string;
}

interface MingaAttendee {
  id: string;
  attending: boolean;
  attended: boolean;
  notes?: string;
  user: {
    id: string;
    identificationNumber: string;
    firstName: string;
    lastName: string;
    phone: string;
  };
}

export default function MingasPage() {
  const queryClient = useQueryClient();
  const { currentJacId } = useAuthStore();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedMingaForAttendance, setSelectedMingaForAttendance] = useState<MingaItem | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // New Minga form
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    eventDate: "",
    location: "Vía principal vereda",
    priority: PostPriority.NORMAL,
  });

  // Fine penalty state
  const [fineAmount, setFineAmount] = useState("45000");

  const { data: mingas, isLoading } = useQuery<MingaItem[]>({
    queryKey: ["mingas", currentJacId],
    queryFn: () => apiClient("/mingas"),
    enabled: Boolean(currentJacId),
  });

  const { data: attendeesList, refetch: refetchAttendees } = useQuery<MingaAttendee[]>({
    queryKey: ["minga-attendees", selectedMingaForAttendance?.id],
    queryFn: () => apiClient(`/mingas/${selectedMingaForAttendance?.id}/attendees`),
    enabled: Boolean(selectedMingaForAttendance?.id),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      apiClient("/mingas", {
        method: "POST",
        body: JSON.stringify({
          ...formData,
          jacId: currentJacId,
          scope: PostScope.JAC_LOCAL,
          type: PostType.COMMUNAL_WORK,
          eventDate: new Date(formData.eventDate).toISOString(),
          requiresAttendanceConfirmation: true,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mingas"] });
      setStatusMessage("Convocatoria a Minga comunitaria publicada exitosamente.");
      setIsCreateModalOpen(false);
      setFormData({
        title: "",
        content: "",
        eventDate: "",
        location: "Vía principal vereda",
        priority: PostPriority.NORMAL,
      });
    },
  });

  const penaltyMutation = useMutation({
    mutationFn: (postId: string) =>
      apiClient(`/mingas/${postId}/penalties`, {
        method: "POST",
        body: JSON.stringify({
          fineAmount: Number(fineAmount),
        }),
      }),
    onSuccess: () => {
      setStatusMessage(
        `Compensaciones monetarias (${formatCurrency(fineAmount)}) cargadas en Tesorería para los afiliados ausentes.`
      );
      setSelectedMingaForAttendance(null);
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Mingas & Trabajos Comunitarios
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-bold border border-amber-200">
              Tradición & Desarrollo
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Convocatorias a jornadas de aseo, mantenimiento de vías veredales y planillas de asistencia con compensación estatutaria.
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-sm rounded-xl shadow-sm transition"
        >
          <PlusCircle className="w-4 h-4" /> Convocar Minga
        </button>
      </div>

      {statusMessage && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between text-amber-900 text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-amber-600" />
            <span>{statusMessage}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-amber-700 hover:text-amber-900 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Mingas Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {isLoading ? (
          <div className="col-span-full bg-white p-12 text-center text-slate-400 rounded-2xl border">
            Cargando mingas convocadas...
          </div>
        ) : mingas && mingas.length > 0 ? (
          mingas.map((minga) => (
            <div
              key={minga.id}
              className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="flex items-center gap-1 font-semibold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                    <Shovel className="w-3.5 h-3.5" /> Trabajo Comunal
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {formatDate(minga.eventDate)}
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-900 leading-snug">
                  {minga.title}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                  {minga.content}
                </p>
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>{minga.location}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3 text-xs text-slate-600">
                  <span>Confirmados: <strong className="text-slate-900">{minga.totalConfirmed}</strong></span>
                  <span>•</span>
                  <span>Asistieron: <strong className="text-emerald-700">{minga.totalAttended}</strong></span>
                </div>

                <button
                  onClick={() => setSelectedMingaForAttendance(minga)}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <FileCheck2 className="w-3.5 h-3.5" /> Planilla
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full bg-white p-12 text-center text-slate-400 rounded-2xl border">
            No se han registrado convocatorias de mingas. Haga clic en &quot;Convocar Minga&quot;.
          </div>
        )}
      </div>

      {/* Attendance & Penalty Sheet Modal */}
      {selectedMingaForAttendance && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto space-y-6">
            <div className="flex items-center justify-between pb-4 border-b">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Planilla de Asistencia & Compensaciones
                </h2>
                <p className="text-xs text-slate-500 truncate max-w-md">
                  {selectedMingaForAttendance.title} • {formatDate(selectedMingaForAttendance.eventDate)}
                </p>
              </div>
              <button
                onClick={() => setSelectedMingaForAttendance(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Attendance Table */}
            <div className="border rounded-2xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b font-bold text-slate-500 uppercase">
                  <tr>
                    <th className="py-2.5 px-3">Afiliado</th>
                    <th className="py-2.5 px-3">Cédula</th>
                    <th className="py-2.5 px-3">Confirmó</th>
                    <th className="py-2.5 px-3">Asistió en Campo</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-slate-700">
                  {attendeesList && attendeesList.length > 0 ? (
                    attendeesList.map((att) => (
                      <tr key={att.id} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-semibold">
                          {att.user.firstName} {att.user.lastName}
                        </td>
                        <td className="py-2 px-3 font-mono text-slate-500">
                          {att.user.identificationNumber}
                        </td>
                        <td className="py-2 px-3">
                          {att.attending ? (
                            <span className="text-emerald-700 font-bold">Sí</span>
                          ) : (
                            <span className="text-slate-400">No</span>
                          )}
                        </td>
                        <td className="py-2 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full font-bold ${
                              att.attended
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {att.attended ? "Presente" : "Ausente"}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-slate-400">
                        Aún no hay confirmaciones registradas en la app para esta minga.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Monetary Compensation for Absents */}
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-3">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-xs uppercase tracking-wider">
                <DollarSign className="w-4 h-4 text-amber-600" />
                Cargar Compensación por Inasistencia en Tesorería
              </div>
              <p className="text-xs text-amber-800 leading-relaxed">
                Aplica la tarifa compensatoria aprobada por la asamblea a todos los afiliados que no asistieron ni justificaron su ausencia.
              </p>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  value={fineAmount}
                  onChange={(e) => setFineAmount(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-amber-300 text-sm font-bold text-slate-800 w-36 bg-white"
                />
                <button
                  onClick={() => penaltyMutation.mutate(selectedMingaForAttendance.id)}
                  disabled={penaltyMutation.isPending}
                  className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-bold shadow-sm transition disabled:opacity-50"
                >
                  {penaltyMutation.isPending
                    ? "Generando cargos..."
                    : "Aplicar Cargos a Tesorería"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Minga Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-4 border-b">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                  <Shovel className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Convocar Jornada de Minga
                  </h2>
                  <p className="text-xs text-slate-500">
                    Notifica a la vereda sobre el trabajo comunitario
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

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate();
              }}
              className="mt-6 space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Título de la Minga *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Limpieza de cunetas y alcantarillas sector El Roble"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Fecha y Hora de Encuentro *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.eventDate}
                    onChange={(e) => setFormData({ ...formData, eventDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Punto de Encuentro *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Descripción y Herramientas Necesarias *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Se solicita llevar pala, machete y botas pantaneras. La JAC suministrará refrigerio comunal..."
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20"
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
                  disabled={createMutation.isPending || !formData.title || !formData.eventDate}
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-semibold text-sm transition disabled:opacity-50"
                >
                  {createMutation.isPending ? "Convocando..." : "Publicar Convocatoria"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

