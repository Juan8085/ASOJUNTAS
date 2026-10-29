"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth-store";
import { formatDate } from "@/lib/utils";
import {
  Megaphone,
  PlusCircle,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  X,
  FileText,
  Trash2,
} from "lucide-react";
import { PostPriority, PostScope, PostType } from "@conectajac/shared";

interface PostItem {
  id: string;
  title: string;
  slug: string;
  content: string;
  type: string;
  priority: string;
  scope: string;
  coverImageUrl?: string;
  publishedAt: string;
  author: { firstName: string; lastName: string };
}

interface PostsResponse {
  data: PostItem[];
}

export default function PostsPage() {
  const queryClient = useQueryClient();
  const { currentJacId } = useAuthStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    content: "",
    type: PostType.NEWS,
    priority: PostPriority.NORMAL,
    scope: PostScope.JAC_LOCAL,
  });

  const { data: postsData, isLoading } = useQuery<PostsResponse>({
    queryKey: ["posts-feed", currentJacId],
    queryFn: () => apiClient("/posts", { params: { jacId: currentJacId || undefined } }),
    enabled: Boolean(currentJacId),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      apiClient("/posts", {
        method: "POST",
        body: JSON.stringify({
          ...formData,
          jacId: currentJacId,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts-feed"] });
      setStatusMessage("Publicación emitida en la cartelera comunal exitosamente.");
      setIsModalOpen(false);
      setFormData({
        title: "",
        content: "",
        type: PostType.NEWS,
        priority: PostPriority.NORMAL,
        scope: PostScope.JAC_LOCAL,
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient(`/posts/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts-feed"] });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Cartelera Comunal & Alertas Tempranas
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs font-bold border border-blue-200">
              Comunicación Directa
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Circulares oficiales de Asojuntas, noticias locales y alertas urgentes para la comunidad.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl shadow-sm transition"
        >
          <PlusCircle className="w-4 h-4" /> Emitir Comunicado
        </button>
      </div>

      {statusMessage && (
        <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-between text-blue-900 text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-blue-600" />
            <span>{statusMessage}</span>
          </div>
          <button onClick={() => setStatusMessage(null)}>✕</button>
        </div>
      )}

      {/* Feed List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="bg-white p-12 text-center text-slate-400 rounded-2xl border">
            Cargando cartelera comunal...
          </div>
        ) : postsData?.data && postsData.data.length > 0 ? (
          postsData.data.map((post) => (
            <div
              key={post.id}
              className={`p-6 rounded-2xl border transition shadow-sm ${
                post.priority === "URGENT"
                  ? "bg-red-50/50 border-red-300"
                  : "bg-white border-slate-200/80"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    {post.priority === "URGENT" && (
                      <span className="px-2.5 py-0.5 rounded-full bg-red-600 text-white text-[11px] font-black uppercase flex items-center gap-1 animate-pulse">
                        <AlertTriangle className="w-3.5 h-3.5" /> ALERTA URGENTE
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-bold">
                      {post.type}
                    </span>
                    <span className="text-xs text-slate-400">
                      • {formatDate(post.publishedAt)}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 leading-snug">
                    {post.title}
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {post.content}
                  </p>
                  <p className="text-[11px] text-slate-400 pt-1">
                    Por: {post.author.firstName} {post.author.lastName}
                  </p>
                </div>

                <button
                  onClick={() => deleteMutation.mutate(post.id)}
                  title="Eliminar publicación"
                  className="p-2 text-slate-300 hover:text-red-500 rounded-lg hover:bg-slate-100 transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white p-12 text-center text-slate-400 rounded-2xl border">
            No hay publicaciones en la cartelera comunal.
          </div>
        )}
      </div>

      {/* Modal New Post */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border">
            <div className="flex items-center justify-between pb-4 border-b">
              <h2 className="text-lg font-bold text-slate-900">
                Emitir Comunicado o Alerta
              </h2>
              <button onClick={() => setIsModalOpen(false)}>
                <X className="w-5 h-5 text-slate-400" />
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
                  Título del Comunicado *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Aviso preventivo por cierre de vía terciaria..."
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tipo *
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as PostType })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                  >
                    <option value={PostType.NEWS}>Noticia Local</option>
                    <option value={PostType.OFFICIAL_CIRCULAR}>Circular Oficial</option>
                    <option value={PostType.EMERGENCY_ALERT}>Alerta de Emergencia</option>
                    <option value={PostType.EVENT}>Evento Comunal</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Prioridad *
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as PostPriority })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                  >
                    <option value={PostPriority.NORMAL}>Normal</option>
                    <option value={PostPriority.HIGH}>Alta</option>
                    <option value={PostPriority.URGENT}>Urgente (Alerta Destacada)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Contenido del Mensaje *
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Detalle de la circular o información para los habitantes..."
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-600"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || !formData.title || !formData.content}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm transition disabled:opacity-50"
                >
                  {createMutation.isPending ? "Publicando..." : "Publicar Comunicado"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

