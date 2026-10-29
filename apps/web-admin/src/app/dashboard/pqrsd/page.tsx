"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth-store";
import { formatDate } from "@/lib/utils";
import {
  Inbox,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  User,
  Clock,
  X,
} from "lucide-react";
import { PqrsdStatus, PqrsdType } from "@conectajac/shared";

interface PqrsdTicketItem {
  id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  type: string;
  status: string;
  isAnonymous: boolean;
  responseText?: string;
  respondedAt?: string;
  createdAt: string;
  user?: { firstName: string; lastName: string; phone: string; email?: string };
}

export default function PqrsdPage() {
  const queryClient = useQueryClient();
  const { currentJacId } = useAuthStore();
  const [selectedTicket, setSelectedTicket] = useState<PqrsdTicketItem | null>(null);
  const [responseText, setResponseText] = useState("");
  const [newStatus, setNewStatus] = useState<PqrsdStatus>(PqrsdStatus.RESOLVED);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const { data: tickets, isLoading } = useQuery<PqrsdTicketItem[]>({
    queryKey: ["pqrsd-tickets", currentJacId],
    queryFn: () => apiClient("/pqrsd"),
    enabled: Boolean(currentJacId),
  });

  const respondMutation = useMutation({
    mutationFn: () =>
      apiClient("/pqrsd/respond", {
        method: "POST",
        body: JSON.stringify({
          ticketId: selectedTicket?.id,
          status: newStatus,
          responseText: responseText.trim(),
          notifyViaWhatsApp: true,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pqrsd-tickets"] });
      setStatusMessage("Respuesta formal registrada y ticket actualizado.");
      setSelectedTicket(null);
      setResponseText("");
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Bandeja de Entrada PQRSD Comunal
          </h1>
          <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 text-xs font-bold border border-slate-200">
            Atención al Ciudadano
          </span>
        </div>
        <p className="text-sm text-slate-500 mt-1">
          Peticiones, quejas, reclamos y sugerencias radicadas por los habitantes de la vereda o barrio.
        </p>
      </div>

      {statusMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-emerald-800 text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span>{statusMessage}</span>
          </div>
          <button onClick={() => setStatusMessage(null)}>✕</button>
        </div>
      )}

      {/* Tickets List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="bg-white p-12 text-center text-slate-400 rounded-2xl border">
            Cargando solicitudes PQRSD...
          </div>
        ) : tickets && tickets.length > 0 ? (
          tickets.map((ticket) => (
            <div
              key={ticket.id}
              className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
                    {ticket.ticketNumber}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">
                    {ticket.type}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      ticket.status === "RESOLVED"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : ticket.status === "RECEIVED"
                        ? "bg-amber-50 text-amber-700 border border-amber-200"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {ticket.status}
                  </span>
                </div>

                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> {formatDate(ticket.createdAt)}
                </span>
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900 mb-1">
                  {ticket.subject}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {ticket.description}
                </p>
              </div>

              {ticket.responseText && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 text-xs space-y-1">
                  <span className="font-bold text-emerald-800 block">
                    Respuesta Oficial de la JAC:
                  </span>
                  <p className="text-slate-700">{ticket.responseText}</p>
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  {ticket.isAnonymous
                    ? "Radicado Anónimo"
                    : ticket.user
                    ? `${ticket.user.firstName} ${ticket.user.lastName} • ${ticket.user.phone}`
                    : "Ciudadano"}
                </span>

                <button
                  onClick={() => setSelectedTicket(ticket)}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold flex items-center gap-1.5 transition"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  {ticket.responseText ? "Actualizar Respuesta" : "Dar Respuesta"}
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white p-12 text-center text-slate-400 rounded-2xl border">
            No hay solicitudes PQRSD radicadas en esta JAC.
          </div>
        )}
      </div>

      {/* Response Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border space-y-4">
            <div className="flex items-center justify-between pb-3 border-b">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Respuesta Oficial a Solicitud
                </h2>
                <p className="text-xs text-slate-500 font-mono">
                  {selectedTicket.ticketNumber} — {selectedTicket.subject}
                </p>
              </div>
              <button onClick={() => setSelectedTicket(null)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                respondMutation.mutate();
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nuevo Estado de la Solicitud *
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as PqrsdStatus)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value={PqrsdStatus.RESOLVED}>Resuelto (Solución o trámite culminado)</option>
                  <option value={PqrsdStatus.IN_PROGRESS}>En Trámite (Gestión en curso ante alcaldía/entidad)</option>
                  <option value={PqrsdStatus.REJECTED}>No Procedente (Fuera de competencia comunal)</option>
                  <option value={PqrsdStatus.CLOSED}>Cerrado</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Texto de Respuesta y Fundamentación *
                </label>
                <textarea
                  required
                  rows={5}
                  placeholder="Detalle la decisión de la directiva, actuaciones realizadas o concepto emitido..."
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t">
                <button
                  type="button"
                  onClick={() => setSelectedTicket(null)}
                  className="px-4 py-2 text-sm text-slate-600"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={respondMutation.isPending || !responseText.trim()}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-sm transition disabled:opacity-50"
                >
                  {respondMutation.isPending ? "Registrando..." : "Guardar Respuesta Oficial"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

