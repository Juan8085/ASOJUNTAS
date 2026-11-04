import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | string): string {
  const numeric = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(numeric || 0);
}

export function formatDate(dateStr: string | Date): string {
  if (!dateStr) return "-";
  const date = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

/**
 * Descarga una tabla de datos como archivo CSV con BOM UTF-8 y delimitador estándar (;),
 * abriéndose directamente con formato de columnas impecable en Microsoft Excel en español.
 */
export function downloadCsv(filename: string, headers: string[], rows: (string | number | undefined | null)[][]) {
  const bom = "\uFEFF";
  const csvContent = [
    headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(";"),
    ...rows.map((row) =>
      row
        .map((cell) => {
          const str = cell === null || cell === undefined ? "" : String(cell);
          return `"${str.replace(/"/g, '""')}"`;
        })
        .join(";")
    ),
  ].join("\r\n");

  const blob = new Blob([bom + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename.endsWith(".csv") ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}


