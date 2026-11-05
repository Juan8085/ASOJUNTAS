"use client";

import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth-store";
import { formatCurrency, formatDate, downloadCsv } from "@/lib/utils";
import QRCode from "qrcode";
import {
  Landmark,
  PlusCircle,
  Receipt,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Wallet,
  Settings,
  Users,
  Download,
  Upload,
  FileSpreadsheet,
  Search,
  DollarSign,
  AlertTriangle,
  Check,
  X,
  Clock,
  Edit3,
  RefreshCw,
  Building,
  CreditCard,
  UserCheck,
  UserX,
  Printer,
  Eye,
  QrCode,
  Smartphone,
} from "lucide-react";
import {
  TreasuryAccountType,
  TreasuryTransactionType,
  TreasuryCategory,
  FeeType,
  FeePeriodicity,
  IdentificationType,
} from "@conectajac/shared";

interface TreasuryAccountItem {
  id: string;
  name: string;
  type: string;
  balance: number;
}

interface PaymentReceiptItem {
  id: string;
  receiptNumber: string;
  paidAt: string;
  amount: number;
  paymentMethod: string;
  status: string;
  notes: string;
  quotasPaidCount: number;
  advancePeriods: string[];
  isAdvance: boolean;
  user: {
    id: string;
    fullName: string;
    identificationType: string;
    identificationNumber: string;
    folioNumber: number;
    veredaOrBarrio: string;
  };
  accountName: string;
  registeredByName: string;
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
  description?: string;
  type: string;
  periodicity: string;
  amount: number;
  dueDateDay: number;
  approvalDate?: string;
  expiryDate?: string;
  isActive: boolean;
  isExpired?: boolean;
  daysUntilExpiry?: number;
  isExpiringSoon?: boolean;
}

interface PortfolioAffiliate {
  membershipId: string;
  userId: string;
  folioNumber: number;
  bookNumber: number;
  firstName: string;
  lastName: string;
  fullName: string;
  identificationType: string;
  identificationNumber: string;
  phone: string;
  email?: string;
  address: string;
  veredaOrBarrio: string;
  membershipStatus: string;
  totalDebt: number;
  pendingQuotasCount: number;
  overdueQuotasCount: number;
  advanceQuotasCount?: number;
  advancePeriods?: string[];
  isUpToDate: boolean;
  isSeverelyOverdue: boolean;
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
  }>;
}

interface PortfolioResponse {
  summary: {
    totalPortfolioDebt: number;
    totalAffiliates: number;
    upToDateCount: number;
    inMoraCount: number;
    suspendedCount: number;
    advanceCount?: number;
  };
  affiliates: PortfolioAffiliate[];
}

export default function TreasuryPage() {
  const queryClient = useQueryClient();
  const { currentJacId } = useAuthStore();
  const [activeTab, setActiveTab] = useState<
    "portfolio" | "receipts" | "movements" | "movement_form" | "fees" | "nequi_qr"
  >("portfolio");

  // Notifications
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Search in portfolio
  const [portfolioSearch, setPortfolioSearch] = useState("");

  // Search & view in receipts
  const [receiptSearch, setReceiptSearch] = useState("");
  const [viewingReceipt, setViewingReceipt] = useState<PaymentReceiptItem | null>(null);

  // Payment Modal State
  const [paymentModalAffiliate, setPaymentModalAffiliate] = useState<PortfolioAffiliate | null>(null);
  const [paymentMethodType, setPaymentMethodType] = useState<"CASH" | "BANK_TRANSFER">("CASH");
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [receiptNumber, setReceiptNumber] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");

  // Edit Fee Modal State
  const [editingFee, setEditingFee] = useState<FeeConfigItem | null>(null);
  const [feeForm, setFeeForm] = useState({
    name: "",
    amount: "",
    dueDateDay: "15",
    approvalDate: "",
    expiryDate: "",
  });

  // Bulk Import Modal State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFileText, setImportFileText] = useState("");
  const [parsedImportRows, setParsedImportRows] = useState<any[]>([]);
  const [importFeedback, setImportFeedback] = useState<string | null>(null);

  // Nequi & QR Accounts State
  const [nequiForm, setNequiForm] = useState({
    phone: "",
    holderName: "",
    bankName: "Nequi",
  });
  const [bankAccountsList, setBankAccountsList] = useState<any[]>([]);
  const [nequiQrDataUrl, setNequiQrDataUrl] = useState<string>("");
  const [savingAccounts, setSavingAccounts] = useState(false);
  const [copiedNequi, setCopiedNequi] = useState(false);

  // General movement form state (non-fee)
  const [movementForm, setMovementForm] = useState({
    accountId: "",
    type: TreasuryTransactionType.EXPENSE,
    category: TreasuryCategory.MAINTENANCE,
    amount: "",
    description: "",
  });

  // Query JAC for Official Bank Accounts & Phone
  const { data: jacData, refetch: refetchJac } = useQuery<any>({
    queryKey: ["jac-treasury-details", currentJacId],
    queryFn: () => apiClient.get(`/jacs/${currentJacId}`),
    enabled: Boolean(currentJacId),
  });

  useEffect(() => {
    if (jacData) {
      const accounts: any[] = Array.isArray(jacData.bankAccounts) ? jacData.bankAccounts : [];
      const nequiAcc = accounts.find(
        (a) =>
          a.accountType === "Digital" ||
          a.bankName?.toLowerCase().includes("nequi") ||
          a.bankName?.toLowerCase().includes("daviplata")
      );
      const otherAccounts = accounts.filter((a) => a !== nequiAcc);

      setNequiForm({
        phone: nequiAcc?.accountNumber || jacData.phone || "",
        holderName: nequiAcc?.holderName || `JAC ${jacData.name} - Tesorería`,
        bankName: nequiAcc?.bankName || "Nequi",
      });
      setBankAccountsList(otherAccounts);
    }
  }, [jacData]);

  useEffect(() => {
    const rawNumber = nequiForm.phone.replace(/\D/g, "");
    if (rawNumber.length >= 7) {
      const qrPayload = `nequi://send?phone=${rawNumber}&amount=10000`;
      QRCode.toDataURL(qrPayload, {
        width: 350,
        margin: 2,
        color: {
          dark: "#200030",
          light: "#ffffff",
        },
      })
        .then((url) => setNequiQrDataUrl(url))
        .catch(() => setNequiQrDataUrl(""));
    } else {
      setNequiQrDataUrl("");
    }
  }, [nequiForm.phone]);

  const handleSaveAccounts = async () => {
    if (!currentJacId) return;
    try {
      setSavingAccounts(true);
      const cleanPhone = nequiForm.phone.trim();
      const updatedBankAccounts = [
        ...(cleanPhone
          ? [
              {
                bankName: nequiForm.bankName.trim() || "Nequi",
                accountType: "Digital",
                accountNumber: cleanPhone,
                holderName: nequiForm.holderName.trim() || jacData?.name || "Tesorero JAC",
                holderNit: jacData?.nit || "",
              },
            ]
          : []),
        ...bankAccountsList.filter((a) => a.accountNumber?.trim()),
      ];

      await apiClient.patch(`/jacs/${currentJacId}/settings`, {
        bankAccounts: updatedBankAccounts,
      });

      queryClient.invalidateQueries({ queryKey: ["jac-treasury-details", currentJacId] });
      queryClient.invalidateQueries({ queryKey: ["jac-settings", currentJacId] });
      refetchJac();
      setStatusMessage("¡Cuentas de recaudo y Código QR de Nequi actualizados exitosamente!");
      setTimeout(() => setStatusMessage(null), 5000);
    } catch (err: any) {
      setErrorMessage(err.message || "Error al guardar las cuentas de recaudo.");
    } finally {
      setSavingAccounts(false);
    }
  };

  // ================= QUERIES =================
  const { data: accounts } = useQuery<TreasuryAccountItem[]>({
    queryKey: ["treasury-accounts", currentJacId],
    queryFn: () => apiClient("/treasury/accounts"),
    enabled: Boolean(currentJacId),
  });

  const { data: portfolioData, isLoading: isLoadingPortfolio, refetch: refetchPortfolio } = useQuery<PortfolioResponse>({
    queryKey: ["treasury-portfolio", currentJacId, portfolioSearch],
    queryFn: () =>
      apiClient("/treasury/affiliates-portfolio", {
        params: portfolioSearch ? { search: portfolioSearch } : undefined,
      }),
    enabled: Boolean(currentJacId),
  });

  const { data: receiptsData, isLoading: isLoadingReceipts } = useQuery<PaymentReceiptItem[]>({
    queryKey: ["treasury-receipts", currentJacId, receiptSearch],
    queryFn: () =>
      apiClient("/treasury/receipts", {
        params: receiptSearch ? { search: receiptSearch } : undefined,
      }),
    enabled: Boolean(currentJacId),
  });

  const { data: movementsData, isLoading: isLoadingMovements } = useQuery<MovementsResponse>({
    queryKey: ["treasury-movements", currentJacId],
    queryFn: () => apiClient("/treasury/movements", { params: { excludeFees: "true" } }),
    enabled: Boolean(currentJacId),
  });

  const { data: feeConfigs, refetch: refetchFees } = useQuery<FeeConfigItem[]>({
    queryKey: ["fee-configs", currentJacId],
    queryFn: () => apiClient("/treasury/fees"),
    enabled: Boolean(currentJacId),
  });

  // Auto-select account when opening payment modal
  const handleOpenPaymentModal = (affiliate: PortfolioAffiliate) => {
    setPaymentModalAffiliate(affiliate);
    setPaymentAmount(affiliate.totalDebt > 0 ? String(affiliate.totalDebt) : "");
    setReceiptNumber("");
    setPaymentNotes("");
    setPaymentMethodType("CASH");

    // Preselect cash box or first account
    const cashAcc = accounts?.find(
      (a: TreasuryAccountItem) => a.type === "CASH_BOX" || a.name.toLowerCase().includes("caja")
    );
    if (cashAcc) {
      setSelectedAccountId(cashAcc.id);
    } else if (accounts && accounts.length > 0) {
      setSelectedAccountId(accounts[0].id);
    }
  };

  // Payment live calculation
  const defaultMonthlyFee = useMemo(() => {
    const monthly = feeConfigs?.find(
      (f: FeeConfigItem) => f.type === "ORDINARY" || f.name.toLowerCase().includes("ordinaria")
    );
    return monthly ? monthly.amount : 5000;
  }, [feeConfigs]);

  const paymentCalculation = useMemo(() => {
    if (!paymentModalAffiliate) return null;
    const entered = parseFloat(paymentAmount) || 0;
    const currentDebt = paymentModalAffiliate.totalDebt;
    const remainingDebt = Math.max(0, currentDebt - entered);
    const quotasPaid = entered > 0 ? Math.floor(entered / defaultMonthlyFee) : 0;
    const willBeUpToDate = remainingDebt === 0;
    const isAdvance = entered > currentDebt;
    const advanceAmount = isAdvance ? entered - currentDebt : 0;
    const advanceQuotas = advanceAmount > 0 ? Math.floor(advanceAmount / defaultMonthlyFee) : 0;

    return {
      entered,
      currentDebt,
      remainingDebt,
      quotasPaid,
      willBeUpToDate,
      isAdvance,
      advanceAmount,
      advanceQuotas,
    };
  }, [paymentModalAffiliate, paymentAmount, defaultMonthlyFee]);

  // ================= MUTATIONS =================
  const paymentMutation = useMutation({
    mutationFn: () => {
      if (!currentJacId || !paymentModalAffiliate || !selectedAccountId) {
        throw new Error("Datos incompletos para procesar el pago");
      }
      return apiClient("/treasury/register-affiliate-payment", {
        method: "POST",
        body: JSON.stringify({
          jacId: currentJacId,
          userId: paymentModalAffiliate.userId,
          accountId: selectedAccountId,
          amount: parseFloat(paymentAmount),
          paymentMethod: paymentMethodType,
          receiptNumber: receiptNumber.trim() || undefined,
          notes: paymentNotes.trim() || undefined,
        }),
      });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["treasury-portfolio"] });
      queryClient.invalidateQueries({ queryKey: ["treasury-receipts"] });
      queryClient.invalidateQueries({ queryKey: ["treasury-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["treasury-summary"] });
      queryClient.invalidateQueries({ queryKey: ["affiliates-book"] });
      queryClient.invalidateQueries({ queryKey: ["affiliate-statement"] });
      setStatusMessage(data.message || "Pago registrado exitosamente.");
      setPaymentModalAffiliate(null);
    },
    onError: (err: any) => {
      setErrorMessage(err.message || "Error al registrar el recaudo.");
    },
  });

  const checkMorosityMutation = useMutation({
    mutationFn: () => apiClient("/treasury/affiliates/check-morosity-suspensions", { method: "POST" }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["treasury-portfolio"] });
      queryClient.invalidateQueries({ queryKey: ["affiliates-book"] });
      setStatusMessage(data.message || "Auditoría de mora comunal aplicada.");
    },
  });

  const updateFeeMutation = useMutation({
    mutationFn: () => {
      if (!editingFee || !currentJacId) throw new Error("No hay cuota seleccionada");
      return apiClient(`/treasury/fees/${editingFee.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: feeForm.name.trim(),
          amount: parseFloat(feeForm.amount),
          dueDateDay: parseInt(feeForm.dueDateDay, 10),
          approvalDate: feeForm.approvalDate ? new Date(feeForm.approvalDate).toISOString() : null,
          expiryDate: feeForm.expiryDate ? new Date(feeForm.expiryDate).toISOString() : null,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fee-configs"] });
      setStatusMessage("Tarifa y vigencias actualizadas correctamente.");
      setEditingFee(null);
    },
    onError: (err: any) => {
      setErrorMessage(err.message || "Error al actualizar la configuración de cuota.");
    },
  });

  const bulkImportMutation = useMutation({
    mutationFn: () => {
      if (!currentJacId || parsedImportRows.length === 0) {
        throw new Error("No hay registros válidos para importar");
      }
      return apiClient("/treasury/affiliates/import-bulk", {
        method: "POST",
        body: JSON.stringify({
          jacId: currentJacId,
          affiliates: parsedImportRows,
        }),
      });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["treasury-portfolio"] });
      queryClient.invalidateQueries({ queryKey: ["treasury-receipts"] });
      queryClient.invalidateQueries({ queryKey: ["affiliates-book"] });
      setIsImportModalOpen(false);
      setParsedImportRows([]);
      setImportFileText("");
      setStatusMessage(data.message || "Importación masiva completada exitosamente.");
    },
    onError: (err: any) => {
      setImportFeedback(`Error al procesar la importación: ${err.message}`);
    },
  });

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
      setStatusMessage("Gasto/Ingreso general asentado en el Libro de Tesorería exitosamente.");
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

  // Export Portfolio to Excel
  const handleExportPortfolioExcel = () => {
    if (!portfolioData?.affiliates) return;
    const headers = [
      "Folio",
      "Tipo Documento",
      "Número Documento",
      "Nombres",
      "Apellidos",
      "Teléfono Móvil",
      "Correo",
      "Dirección / Vereda",
      "Estado Membresía",
      "Cuotas Pendientes",
      "Cuotas Adelantadas",
      "Total Adeudado (COP)",
      "Situación Financiera",
    ];

    const rows = portfolioData.affiliates.map((a: PortfolioAffiliate) => [
      a.folioNumber,
      a.identificationType,
      a.identificationNumber,
      a.firstName,
      a.lastName,
      a.phone,
      a.email || "",
      a.veredaOrBarrio || a.address,
      a.membershipStatus,
      a.pendingQuotasCount,
      a.advanceQuotasCount || 0,
      a.totalDebt,
      a.isUpToDate
        ? a.advanceQuotasCount && a.advanceQuotasCount > 0
          ? `Al Día (+${a.advanceQuotasCount} cuotas adelantadas)`
          : "Al Día"
        : a.isSeverelyOverdue
        ? "Mora Crítica (>3 meses)"
        : "En Mora",
    ]);

    downloadCsv(`Cartera_Cuotas_JAC_${new Date().toISOString().slice(0, 10)}`, headers, rows);
  };

  // Download official CSV template
  const handleDownloadTemplate = () => {
    const headers = [
      "Folio",
      "Tipo_Documento",
      "Numero_Documento",
      "Nombres",
      "Apellidos",
      "Telefono",
      "Correo",
      "Direccion_Vereda",
      "Cuotas_Pendientes",
      "Saldo_Pendiente_COP",
    ];

    const sampleRows = [
      [1, "CC", "1012345678", "Juan Carlos", "Pérez Gómez", "3101234567", "juan@ejemplo.com", "Vereda El Salado, Finca La Vega", 0, 0],
      [2, "CC", "1098765432", "María Elena", "Rodríguez Silva", "3119876543", "", "Sector Los Pinos, Casa 4", 2, 10000],
      [3, "CC", "52987123", "Pedro José", "Martínez López", "3123456789", "", "Vereda El Roble", 4, 20000],
    ];

    downloadCsv("Plantilla_Oficial_Afiliados_Cartera_JAC", headers, sampleRows);
  };

  // Parse CSV File in Browser
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setImportFileText(content);
      parseCsvContent(content);
    };
    reader.readAsText(file);
  };

  const parseCsvContent = (text: string) => {
    try {
      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length < 2) {
        setImportFeedback("El archivo parece vacío o no contiene filas de datos.");
        return;
      }

      const delimiter = lines[0].includes(";") ? ";" : ",";
      const rows: any[] = [];

      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i]
          .split(delimiter)
          .map((p) => p.replace(/^"|"$/g, "").trim());

        if (parts.length >= 6 && parts[2]) {
          rows.push({
            folioNumber: parseInt(parts[0], 10) || i,
            identificationType: (parts[1] as IdentificationType) || IdentificationType.CC,
            identificationNumber: parts[2],
            firstName: parts[3] || "Sin Nombre",
            lastName: parts[4] || "Sin Apellido",
            phone: parts[5] || "3000000000",
            email: parts[6] || undefined,
            address: parts[7] || "Vereda Central",
            veredaOrBarrio: parts[7] || "Vereda Central",
            pendingQuotasCount: parseInt(parts[8], 10) || 0,
            pendingAmount: parseFloat(parts[9]) || 0,
          });
        }
      }

      setParsedImportRows(rows);
      setImportFeedback(`✅ Archivo leído correctamente: ${rows.length} afiliado(s) listos para importar.`);
    } catch {
      setImportFeedback("Error al leer el archivo. Verifique que sea un archivo CSV válido.");
    }
  };

  // Check if any fee config is expired
  const expiredFeeAlert = useMemo(() => {
    return feeConfigs?.find((f: FeeConfigItem) => f.isExpired);
  }, [feeConfigs]);

  const totalFunds = accounts?.reduce((sum: number, acc: TreasuryAccountItem) => sum + Number(acc.balance), 0) || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Tesorería Comunal & Cartera de Cuotas
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200">
              Ley 2166 de 2021
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Gestión de cartera por afiliado, recaudo en efectivo o banco, adelantos de cuotas y libro de tesorería.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right bg-white px-5 py-2.5 rounded-2xl border border-slate-200/80 shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Fondos Totales Disponibles
            </span>
            <span className="text-xl font-black text-emerald-600">
              {formatCurrency(totalFunds)}
            </span>
          </div>
        </div>
      </div>

      {/* Expired Fee Warning Banner */}
      {expiredFeeAlert && (
        <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-300 text-amber-900 flex items-start gap-3.5 shadow-sm">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-xs">
            <h4 className="font-bold text-amber-950 text-sm">
              ⚠️ Vigencia Estatutaria Vencida: {expiredFeeAlert.name}
            </h4>
            <p className="mt-1 text-amber-800 leading-relaxed">
              La tarifa de esta cuota venció el{" "}
              <strong>{expiredFeeAlert.expiryDate ? formatDate(expiredFeeAlert.expiryDate) : "recientemente"}</strong>.
              Conforme al estatuto comunal y la Ley 2166 de 2021, la Junta debe citar a Asamblea General para ratificar o actualizar el monto aprobado de cuotas.
            </p>
          </div>
          <button
            onClick={() => {
              setActiveTab("fees");
              setEditingFee(expiredFeeAlert);
              setFeeForm({
                name: expiredFeeAlert.name,
                amount: String(expiredFeeAlert.amount),
                dueDateDay: String(expiredFeeAlert.dueDateDay || 15),
                approvalDate: expiredFeeAlert.approvalDate?.slice(0, 10) || "",
                expiryDate: expiredFeeAlert.expiryDate?.slice(0, 10) || "",
              });
            }}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs transition"
          >
            Ajustar Tarifa
          </button>
        </div>
      )}

      {/* Notifications */}
      {statusMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-emerald-800 text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span>{statusMessage}</span>
          </div>
          <button onClick={() => setStatusMessage(null)} className="text-emerald-700 hover:text-emerald-900 font-bold">
            ✕
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-center justify-between text-red-800 text-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-red-700 hover:text-red-900 font-bold">
            ✕
          </button>
        </div>
      )}

      {/* Accounts Overview Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {accounts?.map((acc: TreasuryAccountItem) => (
          <div key={acc.id} className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                {acc.type === "CASH_BOX" ? (
                  <Wallet className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Landmark className="w-3.5 h-3.5 text-blue-600" />
                )}
                <span className="font-semibold text-slate-700">{acc.name}</span>
              </div>
              <div className="text-2xl font-black text-slate-900">
                {formatCurrency(acc.balance)}
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-[10px] font-mono font-bold uppercase">
              {acc.type === "CASH_BOX" ? "Efectivo" : "Banco"}
            </span>
          </div>
        ))}
      </div>

      {/* Tabs Bar */}
      <div className="flex border-b border-slate-200 overflow-x-auto bg-white rounded-t-2xl px-2 pt-2 shadow-sm">
        <button
          onClick={() => setActiveTab("portfolio")}
          className={`py-3 px-5 text-sm font-bold border-b-2 transition whitespace-nowrap flex items-center gap-2 ${
            activeTab === "portfolio"
              ? "border-emerald-600 text-emerald-700"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Users className="w-4 h-4" /> Cartera de Afiliados
        </button>
        <button
          onClick={() => setActiveTab("receipts")}
          className={`py-3 px-5 text-sm font-bold border-b-2 transition whitespace-nowrap flex items-center gap-2 ${
            activeTab === "receipts"
              ? "border-emerald-600 text-emerald-700"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Receipt className="w-4 h-4" /> Recaudos & Recibos Emitidos
          {receiptsData && receiptsData.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black">
              {receiptsData.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("movements")}
          className={`py-3 px-5 text-sm font-bold border-b-2 transition whitespace-nowrap flex items-center gap-2 ${
            activeTab === "movements"
              ? "border-emerald-600 text-emerald-700"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Landmark className="w-4 h-4" /> Libro de Tesorería (Gastos e Ingresos Operativos)
        </button>
        <button
          onClick={() => setActiveTab("movement_form")}
          className={`py-3 px-5 text-sm font-bold border-b-2 transition whitespace-nowrap flex items-center gap-2 ${
            activeTab === "movement_form"
              ? "border-emerald-600 text-emerald-700"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <PlusCircle className="w-4 h-4" /> Registrar Gasto / Ingreso General
        </button>
        <button
          onClick={() => setActiveTab("fees")}
          className={`py-3 px-5 text-sm font-bold border-b-2 transition whitespace-nowrap flex items-center gap-2 ${
            activeTab === "fees"
              ? "border-emerald-600 text-emerald-700"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Settings className="w-4 h-4" /> Configuración de Cuotas & Vigencias
        </button>
        <button
          onClick={() => setActiveTab("nequi_qr")}
          className={`py-3 px-5 text-sm font-bold border-b-2 transition whitespace-nowrap flex items-center gap-2 ${
            activeTab === "nequi_qr"
              ? "border-purple-600 text-purple-700 bg-purple-50/50"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <QrCode className="w-4 h-4 text-purple-600" /> Cuentas de Recaudo & QR Nequi
        </button>
      </div>

      {/* ================= TAB 1: PORTFOLIO & RECAUDOS ================= */}
      {activeTab === "portfolio" && (
        <div className="space-y-4">
          {/* Summary KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                Cartera Total por Cobrar
              </span>
              <span className="text-xl font-black text-rose-600 mt-1 block">
                {formatCurrency(portfolioData?.summary?.totalPortfolioDebt || 0)}
              </span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                Afiliados Al Día
              </span>
              <span className="text-xl font-black text-emerald-600 mt-1 block">
                {portfolioData?.summary?.upToDateCount || 0} socios
              </span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                Cuotas Adelantadas
              </span>
              <span className="text-xl font-black text-purple-600 mt-1 block">
                {portfolioData?.summary?.advanceCount || 0} a favor
              </span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                Afiliados en Mora
              </span>
              <span className="text-xl font-black text-amber-600 mt-1 block">
                {portfolioData?.summary?.inMoraCount || 0} socios
              </span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                Suspendidos por Mora
              </span>
              <span className="text-xl font-black text-red-600 mt-1 block">
                {portfolioData?.summary?.suspendedCount || 0} socios
              </span>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Buscar por afiliado, cédula o folio..."
                value={portfolioSearch}
                onChange={(e) => setPortfolioSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
              <button
                onClick={handleExportPortfolioExcel}
                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition flex items-center gap-1.5"
                title="Exportar a Microsoft Excel"
              >
                <Download className="w-3.5 h-3.5 text-emerald-600" /> Exportar Cartera Excel
              </button>

              <button
                onClick={() => setIsImportModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-bold transition flex items-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5 text-emerald-700" /> Importar con Plantilla
              </button>

              <button
                onClick={() => checkMorosityMutation.mutate()}
                disabled={checkMorosityMutation.isPending}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50"
                title="Aplica la suspensión legal a afiliados con más de 3 cuotas impagas"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${checkMorosityMutation.isPending ? "animate-spin" : ""}`} />
                Auditar Mora (Ley 2166)
              </button>
            </div>
          </div>

          {/* Affiliates Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Folio</th>
                    <th className="py-3.5 px-4">Afiliado(a)</th>
                    <th className="py-3.5 px-4">Sector / Vereda</th>
                    <th className="py-3.5 px-4 text-center">Cuotas Pendientes</th>
                    <th className="py-3.5 px-4 text-right">Total Adeudado</th>
                    <th className="py-3.5 px-4 text-center">Estado Comunal</th>
                    <th className="py-3.5 px-4 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {isLoadingPortfolio ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        Cargando cartera de afiliados...
                      </td>
                    </tr>
                  ) : portfolioData?.affiliates?.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        No se encontraron afiliados registrados en esta Junta.
                      </td>
                    </tr>
                  ) : (
                    portfolioData?.affiliates?.map((aff: PortfolioAffiliate) => (
                      <tr key={aff.membershipId} className="hover:bg-slate-50/70 transition">
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-700">
                          #{aff.folioNumber}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900">{aff.fullName}</div>
                          <div className="text-[11px] text-slate-500">
                            {aff.identificationType} {aff.identificationNumber} • 📱 {aff.phone}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">
                          {aff.veredaOrBarrio || aff.address}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {aff.pendingQuotasCount === 0 ? (
                            aff.advanceQuotasCount && aff.advanceQuotasCount > 0 ? (
                              <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-900 text-[10px] font-black border border-purple-200 inline-flex items-center gap-1 shadow-sm">
                                ✨ Al Día (+{aff.advanceQuotasCount} adelanto)
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                                Al Día (0)
                              </span>
                            )
                          ) : (
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                aff.overdueQuotasCount >= 3
                                  ? "bg-rose-100 text-rose-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {aff.pendingQuotasCount} cuota(s) {aff.overdueQuotasCount >= 3 ? "⚠️ >3 meses" : ""}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right font-black text-slate-900">
                          {formatCurrency(aff.totalDebt)}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {aff.membershipStatus === "SUSPENDED" ? (
                            <span className="px-2.5 py-1 rounded-full bg-red-100 text-red-800 text-[10px] font-black border border-red-200 inline-flex items-center gap-1">
                              <UserX className="w-3 h-3" /> Suspendido (Mora)
                            </span>
                          ) : aff.isUpToDate ? (
                            <div>
                              <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black border border-emerald-200 inline-flex items-center gap-1">
                                <UserCheck className="w-3 h-3" /> Activo (Al Día)
                              </span>
                              {aff.advanceQuotasCount && aff.advanceQuotasCount > 0 && (
                                <span className="block text-[10px] text-purple-700 font-bold mt-1">
                                  🌟 {aff.advanceQuotasCount} cuota(s) por anticipado
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold border border-amber-200">
                              Activo (En Mora)
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => handleOpenPaymentModal(aff)}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition inline-flex items-center gap-1.5"
                          >
                            <DollarSign className="w-3.5 h-3.5" /> Registrar Pago
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

      {/* ================= TAB 2: RECEIPTS & ISSUED PAYMENTS HISTORY ================= */}
      {activeTab === "receipts" && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Buscar por recibo, afiliado o cédula..."
                value={receiptSearch}
                onChange={(e) => setReceiptSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (!receiptsData || receiptsData.length === 0) return;
                  const headers = [
                    "No. Recibo",
                    "Fecha y Hora",
                    "Folio",
                    "Afiliado",
                    "Cédula",
                    "Vereda",
                    "Monto (COP)",
                    "Método de Pago",
                    "Cuenta",
                    "Cuotas Canceladas",
                    "¿Incluye Adelanto?",
                    "Periodos Adelantados",
                    "Notas",
                    "Registrado Por",
                  ];
                  const rows = receiptsData.map((r: PaymentReceiptItem) => [
                    r.receiptNumber,
                    formatDate(r.paidAt),
                    r.user?.folioNumber || 0,
                    r.user?.fullName || "",
                    `${r.user?.identificationType || ""} ${r.user?.identificationNumber || ""}`,
                    r.user?.veredaOrBarrio || "",
                    r.amount,
                    r.paymentMethod === "CASH" ? "Efectivo" : "En Cuenta",
                    r.accountName,
                    r.quotasPaidCount,
                    r.isAdvance ? "SÍ" : "NO",
                    r.advancePeriods?.join(", ") || "",
                    r.notes || "",
                    r.registeredByName,
                  ]);
                  downloadCsv(`Recibos_Recaudos_JAC_${new Date().toISOString().slice(0, 10)}`, headers, rows);
                }}
                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5 text-emerald-600" /> Exportar Recibos Excel
              </button>
            </div>
          </div>

          {/* Receipts Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Recibo #</th>
                    <th className="py-3.5 px-4">Fecha y Hora</th>
                    <th className="py-3.5 px-4">Afiliado(a)</th>
                    <th className="py-3.5 px-4">Forma de Pago</th>
                    <th className="py-3.5 px-4">Concepto / Adelantos</th>
                    <th className="py-3.5 px-4 text-right">Monto Pagado</th>
                    <th className="py-3.5 px-4 text-right">Comprobante</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {isLoadingReceipts ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        Cargando historial de recibos...
                      </td>
                    </tr>
                  ) : receiptsData?.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        No se han registrado recaudos ni recibos todavía.
                      </td>
                    </tr>
                  ) : (
                    receiptsData?.map((r: PaymentReceiptItem) => (
                      <tr key={r.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-3.5 px-4 font-mono font-bold text-emerald-700">
                          {r.receiptNumber}
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 font-mono">
                          {formatDate(r.paidAt)}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900">{r.user?.fullName}</div>
                          <div className="text-[11px] text-slate-500">
                            Folio #{r.user?.folioNumber} • {r.user?.identificationType} {r.user?.identificationNumber}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                              r.paymentMethod === "CASH"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {r.paymentMethod === "CASH" ? "Efectivo" : "En Cuenta"} ({r.accountName})
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          {r.isAdvance && r.advancePeriods && r.advancePeriods.length > 0 ? (
                            <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-bold">
                              ✨ Adelanto ({r.advancePeriods.join(", ")})
                            </span>
                          ) : (
                            <span className="text-slate-700 font-medium">
                              Cuotas comunales ({r.quotasPaidCount} cuota(s))
                            </span>
                          )}
                          {r.notes && (
                            <div className="text-[10px] text-slate-400 italic truncate max-w-xs">
                              {r.notes}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right font-black text-emerald-600 text-sm">
                          {formatCurrency(r.amount)}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => setViewingReceipt(r)}
                            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition inline-flex items-center gap-1.5"
                          >
                            <Eye className="w-3.5 h-3.5 text-emerald-600" /> Ver Comprobante
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

      {/* ================= TAB 3: GENERAL MOVEMENTS LEDGER (EXCLUDING QUOTAS) ================= */}
      {activeTab === "movements" && (
        <div className="space-y-3">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
            <span>
              ℹ️ <strong>Libro de Tesorería General:</strong> Muestra únicamente ingresos y egresos operativos ajenos a las cuotas comunales (convenios, materiales, actividades, papelería).
            </span>
            <button
              onClick={() => {
                if (!movementsData?.data) return;
                const headers = ["Fecha", "Tipo", "Categoría", "Descripción", "Cuenta", "Monto (COP)", "Saldo Posterior (COP)"];
                const rows = movementsData.data.map((m: TreasuryMovementItem) => [
                  m.transactionDate,
                  m.type === "INCOME" ? "Ingreso" : "Egreso",
                  m.category,
                  m.description,
                  m.account?.name || "",
                  m.amount,
                  m.balanceAfter,
                ]);
                downloadCsv(`Libro_Tesoreria_General_${new Date().toISOString().slice(0, 10)}`, headers, rows);
              }}
              className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 font-bold hover:bg-slate-100 text-slate-700 flex items-center gap-1"
            >
              <Download className="w-3 h-3" /> Exportar Movimientos
            </button>
          </div>

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
                    <th className="py-3.5 px-4 text-right">Monto</th>
                    <th className="py-3.5 px-4 text-right">Saldo Posterior</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {isLoadingMovements ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        Cargando movimientos...
                      </td>
                    </tr>
                  ) : movementsData?.data?.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        No hay movimientos registrados distintos a cuotas comunales.
                      </td>
                    </tr>
                  ) : (
                    movementsData?.data?.map((mov: TreasuryMovementItem) => (
                      <tr key={mov.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-3.5 px-4 text-slate-500 font-mono">
                          {formatDate(mov.transactionDate)}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                              mov.type === TreasuryTransactionType.INCOME
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-rose-100 text-rose-800"
                            }`}
                          >
                            {mov.type === TreasuryTransactionType.INCOME ? "Ingreso" : "Egreso"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-700">
                          {mov.category}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate">
                          {mov.description}
                        </td>
                        <td className="py-3.5 px-4 text-slate-500">
                          {mov.account?.name}
                        </td>
                        <td
                          className={`py-3.5 px-4 text-right font-black ${
                            mov.type === TreasuryTransactionType.INCOME
                              ? "text-emerald-600"
                              : "text-rose-600"
                          }`}
                        >
                          {mov.type === TreasuryTransactionType.INCOME ? "+" : "-"}
                          {formatCurrency(mov.amount)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-700">
                          {formatCurrency(mov.balanceAfter)}
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

      {/* ================= TAB 4: REGISTER GENERAL MOVEMENT (NON-QUOTA) ================= */}
      {activeTab === "movement_form" && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm max-w-xl mx-auto">
          <div className="mb-4">
            <h2 className="text-base font-bold text-slate-900">
              Registrar Gasto o Ingreso General (Operativo)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Para recaudar cuotas de afiliados, utilice la pestaña de Cartera de Afiliados.
            </p>
          </div>

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
                {accounts?.map((acc: TreasuryAccountItem) => (
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
                  <option value={TreasuryTransactionType.INCOME}>Ingreso General</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Categoría Operativa *
                </label>
                <select
                  value={movementForm.category}
                  onChange={(e) =>
                    setMovementForm({ ...movementForm, category: e.target.value as TreasuryCategory })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value={TreasuryCategory.MAINTENANCE}>Mantenimiento de Sedes/Vías</option>
                  <option value={TreasuryCategory.OFFICE_SUPPLIES}>Papelería y Libros Oficiales</option>
                  <option value={TreasuryCategory.COMMUNAL_WORKS}>Materiales para Minga</option>
                  <option value={TreasuryCategory.EVENT_PROCEEDS}>Bazar / Actividades Comunales</option>
                  <option value={TreasuryCategory.DONATION}>Donación o Aporte Voluntario</option>
                  <option value={TreasuryCategory.OTHER}>Otros Gastos / Ingresos</option>
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
                placeholder="Ej: Compra de cemento y mangueras para reparación del paso veredal..."
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

      {/* ================= TAB 5: FEES CONFIGURATION & STATUTE EXPIRY ================= */}
      {activeTab === "fees" && (
        <div className="space-y-4">
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Cuotas Estatutarias de la Junta de Acción Comunal
                </h2>
                <p className="text-xs text-slate-500">
                  Aprobadas por la Asamblea General conforme a la Ley 2166 de 2021. Al cumplirse la fecha de caducidad, el sistema emitirá alertas para convocar nueva asamblea y ratificar o ajustar valores.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {feeConfigs?.map((fee: FeeConfigItem) => (
                <div
                  key={fee.id}
                  className={`p-5 rounded-2xl border transition ${
                    fee.isExpired
                      ? "border-rose-300 bg-rose-50/40"
                      : fee.isExpiringSoon
                      ? "border-amber-300 bg-amber-50/40"
                      : "border-slate-200 bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-slate-900 text-sm">{fee.name}</span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        fee.isExpired
                          ? "bg-rose-100 text-rose-800 border border-rose-200"
                          : fee.isExpiringSoon
                          ? "bg-amber-100 text-amber-800 border border-amber-200"
                          : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                      }`}
                    >
                      {fee.isExpired
                        ? "Vencida / Requiere Asamblea"
                        : fee.isExpiringSoon
                        ? `Vence en ${fee.daysUntilExpiry} días`
                        : "Estatuto Vigente"}
                    </span>
                  </div>

                  <div className="text-2xl font-black text-slate-900 mb-3">
                    {formatCurrency(fee.amount)}
                    <span className="text-xs font-normal text-slate-500 ml-1">
                      / {fee.periodicity} (Corte día {fee.dueDateDay})
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-600 border-t border-slate-200/80 pt-3">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Fecha de Aprobación por Asamblea:</span>
                      <span className="font-semibold text-slate-800">
                        {fee.approvalDate ? formatDate(fee.approvalDate) : "No registrada"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Fecha de Caducidad / Vigencia:</span>
                      <span
                        className={`font-semibold ${
                          fee.isExpired ? "text-rose-700 font-bold" : "text-slate-800"
                        }`}
                      >
                        {fee.expiryDate ? formatDate(fee.expiryDate) : "Indefinida"}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-200/60 flex justify-end">
                    <button
                      onClick={() => {
                        setEditingFee(fee);
                        setFeeForm({
                          name: fee.name,
                          amount: String(fee.amount),
                          dueDateDay: String(fee.dueDateDay || 15),
                          approvalDate: fee.approvalDate?.slice(0, 10) || "",
                          expiryDate: fee.expiryDate?.slice(0, 10) || "",
                        });
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-emerald-600" />
                      Modificar Tarifa & Vigencias
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 6: CUENTAS DE RECAUDO & QR NEQUI ================= */}
      {activeTab === "nequi_qr" && (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="p-6 rounded-3xl bg-gradient-to-r from-purple-900 via-purple-800 to-indigo-900 text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-fuchsia-400 text-purple-950 text-[10px] font-black uppercase tracking-wider">
                  Recaudo Móvil Ciudadano
                </span>
                <span className="text-xs text-purple-200">Ley 2166 de 2021</span>
              </div>
              <h3 className="text-xl font-black mt-1 tracking-tight">
                Billetera Digital Nequi & Cuentas Bancarias de la JAC
              </h3>
              <p className="text-xs text-purple-200/80 mt-1 max-w-2xl leading-relaxed">
                El número celular configurado aquí alimenta automáticamente el <strong>Código QR interactivo</strong> que los afiliados ven y escanean en la aplicación móvil en la sección <strong>[Pagar con Nequi]</strong>.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleSaveAccounts}
                disabled={savingAccounts}
                className="px-4 py-2.5 rounded-2xl bg-fuchsia-500 hover:bg-fuchsia-600 text-white text-xs font-black shadow-lg shadow-fuchsia-500/30 transition flex items-center gap-2 disabled:opacity-50"
              >
                {savingAccounts ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                <span>Guardar Cambios</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Form Column */}
            <div className="lg:col-span-7 space-y-5">
              {/* Nequi Configuration Card */}
              <div className="bg-white rounded-3xl border border-purple-100 p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-black text-sm">
                      NQ
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-900">
                        Configuración de Nequi / Daviplata Oficial
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Canal digital preferente para el pago de cuotas ordinarias
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                    Sincronizado con App
                  </span>
                </div>

                <div className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Número Celular de la Cuenta Nequi *
                    </label>
                    <div className="relative">
                      <Smartphone className="w-4 h-4 text-purple-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="tel"
                        maxLength={10}
                        value={nequiForm.phone}
                        onChange={(e) =>
                          setNequiForm((prev) => ({
                            ...prev,
                            phone: e.target.value.replace(/\D/g, ""),
                          }))
                        }
                        placeholder="Ej: 3124440001"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      El afiliado transferirá a este número o lo escaneará desde su app Nequi.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Nombre del Titular *
                      </label>
                      <input
                        type="text"
                        value={nequiForm.holderName}
                        onChange={(e) =>
                          setNequiForm((prev) => ({ ...prev, holderName: e.target.value }))
                        }
                        placeholder="Ej: JAC El Salado - Tesorería"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Tipo de Billetera Digital
                      </label>
                      <select
                        value={nequiForm.bankName}
                        onChange={(e) =>
                          setNequiForm((prev) => ({ ...prev, bankName: e.target.value }))
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
                      >
                        <option value="Nequi">Nequi (Bancolombia)</option>
                        <option value="Daviplata">Daviplata (Davivienda)</option>
                        <option value="Dale">Dale! / Transfiya</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Other Traditional Bank Accounts */}
              <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <Landmark className="w-5 h-5 text-blue-600" />
                    <div>
                      <h4 className="text-sm font-black text-slate-900">
                        Otras Cuentas Bancarias Institucionales
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Para recaudos de aportes por Banco Agrario o convenios
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setBankAccountsList((prev) => [
                        ...prev,
                        {
                          bankName: "Banco Agrario de Colombia",
                          accountType: "Ahorros",
                          accountNumber: "",
                          holderName: jacData?.name || "JAC Comunal",
                          holderNit: jacData?.nit || "",
                        },
                      ])
                    }
                    className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                  >
                    <PlusCircle className="w-3.5 h-3.5 text-slate-600" />
                    <span>Agregar Banco</span>
                  </button>
                </div>

                {bankAccountsList.length === 0 ? (
                  <p className="text-xs text-slate-400 py-3 text-center">
                    No hay cuentas bancarias tradicionales adicionales configuradas.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {bankAccountsList.map((acc, index) => (
                      <div
                        key={index}
                        className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 grid grid-cols-1 sm:grid-cols-4 gap-2.5 items-center text-xs"
                      >
                        <div>
                          <label className="text-[10px] text-slate-400 font-bold block mb-0.5">
                            Banco
                          </label>
                          <input
                            type="text"
                            value={acc.bankName}
                            onChange={(e) => {
                              const updated = [...bankAccountsList];
                              updated[index].bankName = e.target.value;
                              setBankAccountsList(updated);
                            }}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] text-slate-400 font-bold block mb-0.5">
                            Tipo
                          </label>
                          <select
                            value={acc.accountType}
                            onChange={(e) => {
                              const updated = [...bankAccountsList];
                              updated[index].accountType = e.target.value;
                              setBankAccountsList(updated);
                            }}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold"
                          >
                            <option value="Ahorros">Ahorros</option>
                            <option value="Corriente">Corriente</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] text-slate-400 font-bold block mb-0.5">
                            Número
                          </label>
                          <input
                            type="text"
                            value={acc.accountNumber}
                            onChange={(e) => {
                              const updated = [...bankAccountsList];
                              updated[index].accountNumber = e.target.value;
                              setBankAccountsList(updated);
                            }}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold"
                            placeholder="0492-XXXX-XX"
                          />
                        </div>

                        <div className="flex items-center justify-end pt-3 sm:pt-0">
                          <button
                            type="button"
                            onClick={() =>
                              setBankAccountsList((prev) => prev.filter((_, i) => i !== index))
                            }
                            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition"
                            title="Eliminar cuenta"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={handleSaveAccounts}
                    disabled={savingAccounts}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {savingAccounts ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )}
                    <span>Guardar Todas las Cuentas</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Live QR Preview Column */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-gradient-to-br from-[#200030] via-[#2d0042] to-[#12001c] rounded-3xl p-6 text-white shadow-2xl border border-purple-900/40 space-y-5">
                <div className="flex items-center justify-between border-b border-purple-800/60 pb-3">
                  <div className="flex items-center gap-2">
                    <QrCode className="w-5 h-5 text-fuchsia-400" />
                    <span className="font-extrabold text-sm tracking-wide text-purple-100">
                      Vista Previa Oficial del QR
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-fuchsia-400 text-purple-950 text-[10px] font-black uppercase">
                    App Móvil
                  </span>
                </div>

                <div className="text-center space-y-3">
                  <p className="text-xs text-purple-200/90 leading-relaxed">
                    Este es el código QR que se visualiza en la app ciudadana. Puedes descargarlo e imprimirlo para la caseta comunal.
                  </p>

                  {/* QR Image Box */}
                  <div className="bg-white rounded-3xl p-4 shadow-xl inline-block border-4 border-fuchsia-400/40">
                    {nequiQrDataUrl ? (
                      <img
                        src={nequiQrDataUrl}
                        alt="Código QR de Nequi"
                        className="w-48 h-48 mx-auto rounded-xl"
                      />
                    ) : (
                      <div className="w-48 h-48 flex flex-col items-center justify-center text-slate-400 text-xs">
                        <Smartphone className="w-8 h-8 mb-2 text-slate-300" />
                        <span>Ingresa un número celular para generar el QR</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <span className="text-[11px] uppercase tracking-wider text-purple-300 font-bold block">
                      Número Nequi Registrado:
                    </span>
                    <div className="inline-flex items-center gap-2 bg-purple-900/60 px-4 py-1.5 rounded-xl border border-purple-700/50">
                      <span className="text-lg font-black font-mono text-fuchsia-300">
                        {nequiForm.phone || "Sin configurar"}
                      </span>
                      {nequiForm.phone && (
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(nequiForm.phone);
                            setCopiedNequi(true);
                            setTimeout(() => setCopiedNequi(false), 2000);
                          }}
                          className="text-purple-300 hover:text-white"
                          title="Copiar número"
                        >
                          {copiedNequi ? (
                            <Check className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <CreditCard className="w-4 h-4" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="text-[11px] text-purple-300">
                    Titular: <strong className="text-white">{nequiForm.holderName || "JAC Comunal"}</strong>
                  </div>
                </div>

                {/* QR Action Buttons */}
                <div className="pt-2 border-t border-purple-800/60 grid grid-cols-2 gap-2.5">
                  {nequiQrDataUrl ? (
                    <a
                      href={nequiQrDataUrl}
                      download={`QR_Nequi_${jacData?.name?.replace(/\s+/g, "_") || "JAC"}.png`}
                      className="px-3.5 py-2.5 rounded-xl bg-fuchsia-500 hover:bg-fuchsia-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition text-center"
                    >
                      <Download className="w-4 h-4" />
                      <span>Descargar QR</span>
                    </a>
                  ) : (
                    <button
                      disabled
                      className="px-3.5 py-2.5 rounded-xl bg-purple-900/40 text-purple-400 font-bold text-xs flex items-center justify-center gap-1.5 opacity-50"
                    >
                      <Download className="w-4 h-4" />
                      <span>Descargar QR</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center justify-center gap-1.5 border border-white/20 transition"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Imprimir Afiche</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: REGISTRAR PAGO DE AFILIADO ================= */}
      {paymentModalAffiliate && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  Recaudo Oficial de Tesorería
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-1">
                  Registrar Pago de Cuotas
                </h3>
                <p className="text-xs text-slate-500">
                  Folio #{paymentModalAffiliate.folioNumber} — {paymentModalAffiliate.fullName} ({paymentModalAffiliate.identificationType} {paymentModalAffiliate.identificationNumber})
                </p>
              </div>
              <button
                onClick={() => setPaymentModalAffiliate(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 font-bold"
              >
                ✕
              </button>
            </div>

            {/* Current Debt Alert */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-500 block">Deuda Pendiente Actual:</span>
                <span className="text-base font-black text-rose-600">
                  {formatCurrency(paymentModalAffiliate.totalDebt)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-slate-500 block">Cuotas Pendientes:</span>
                <span className="font-bold text-slate-800">
                  {paymentModalAffiliate.pendingQuotasCount} cuota(s)
                </span>
              </div>
            </div>

            {/* Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                paymentMutation.mutate();
              }}
              className="space-y-4 text-xs"
            >
              {/* Payment Method Selector */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  Forma de Pago del Afiliado *
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethodType("CASH");
                      const cashAcc = accounts?.find(
                        (a: TreasuryAccountItem) => a.type === "CASH_BOX" || a.name.toLowerCase().includes("caja")
                      );
                      if (cashAcc) setSelectedAccountId(cashAcc.id);
                    }}
                    className={`p-3 rounded-xl border text-center transition flex items-center justify-center gap-2 font-bold ${
                      paymentMethodType === "CASH"
                        ? "bg-emerald-50 border-emerald-500 text-emerald-800 shadow-sm"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <Wallet className="w-4 h-4 text-emerald-600" /> Efectivo (Caja)
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethodType("BANK_TRANSFER");
                      const bankAcc = accounts?.find(
                        (a: TreasuryAccountItem) => a.type === "BANK_SAVINGS" || a.type === "BANK_CHECKING"
                      );
                      if (bankAcc) setSelectedAccountId(bankAcc.id);
                    }}
                    className={`p-3 rounded-xl border text-center transition flex items-center justify-center gap-2 font-bold ${
                      paymentMethodType === "BANK_TRANSFER"
                        ? "bg-emerald-50 border-emerald-500 text-emerald-800 shadow-sm"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <CreditCard className="w-4 h-4 text-blue-600" /> En Cuenta (Banco)
                  </button>
                </div>
              </div>

              {/* Target Account */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Cuenta Receptora de Tesorería *
                </label>
                <select
                  required
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="">Seleccione cuenta...</option>
                  {accounts?.map((acc: TreasuryAccountItem) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} — Saldo: {formatCurrency(acc.balance)} ({acc.type})
                    </option>
                  ))}
                </select>
              </div>

              {/* Payment Amount */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Valor Pagado en Pesos (COP) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 font-bold">$</span>
                  <input
                    type="number"
                    required
                    min={1}
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="Ej: 15000"
                    className="w-full pl-7 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm font-black focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>

              {/* Dynamic Live Calculation Card */}
              {paymentCalculation && paymentCalculation.entered > 0 && (
                <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-xs space-y-2">
                  <div className="font-bold text-emerald-950 flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-emerald-600" /> Cálculo en Tiempo Real del Sistema:
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-slate-700">
                    <div>
                      Cuotas que cancela:{" "}
                      <strong className="text-emerald-800">
                        {paymentCalculation.quotasPaid} cuota(s)
                      </strong>
                    </div>
                    <div>
                      Saldo restante:{" "}
                      <strong className="text-slate-900">
                        {formatCurrency(paymentCalculation.remainingDebt)}
                      </strong>
                    </div>
                  </div>
                  {paymentCalculation.isAdvance && (
                    <div className="p-2.5 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 font-semibold text-[11px] space-y-1">
                      <div className="font-bold flex items-center gap-1">
                        ✨ Incluye Pago por Adelantado:
                      </div>
                      <p className="text-purple-800 text-[10px]">
                        Este monto cubre la deuda y adelanta{" "}
                        <strong>{paymentCalculation.advanceQuotas} cuota(s) futura(s)</strong> (${formatCurrency(paymentCalculation.advanceAmount)}).
                      </p>
                    </div>
                  )}
                  <div className="pt-1 border-t border-emerald-200/60 font-semibold">
                    {paymentCalculation.willBeUpToDate ? (
                      <span className="text-emerald-700 flex items-center gap-1 font-bold">
                        🎉 ¡Con este pago el afiliado queda totalmente Al Día!
                      </span>
                    ) : (
                      <span className="text-amber-800 font-bold">
                        ⚠️ Quedará con un saldo pendiente de {formatCurrency(paymentCalculation.remainingDebt)}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Receipt Number & Notes */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    No. Recibo (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: REC-00125"
                    value={receiptNumber}
                    onChange={(e) => setReceiptNumber(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Observaciones / Notas
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Pago adelantado mes mayo..."
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPaymentModalAffiliate(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={paymentMutation.isPending || !selectedAccountId || !paymentAmount}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition shadow-sm disabled:opacity-50"
                >
                  {paymentMutation.isPending ? "Registrando..." : "Confirmar Recaudo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: EDIT FEE CONFIGURATION ================= */}
      {editingFee && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Modificar Tarifa y Vigencia Estatutaria
                </h3>
                <p className="text-xs text-slate-500">{editingFee.name}</p>
              </div>
              <button
                onClick={() => setEditingFee(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 font-bold"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateFeeMutation.mutate();
              }}
              className="space-y-3.5 text-xs"
            >
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nombre de la Cuota *</label>
                <input
                  type="text"
                  required
                  value={feeForm.name}
                  onChange={(e) => setFeeForm({ ...feeForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Monto en COP *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={feeForm.amount}
                    onChange={(e) => setFeeForm({ ...feeForm, amount: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Día Límite de Corte *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={31}
                    value={feeForm.dueDateDay}
                    onChange={(e) => setFeeForm({ ...feeForm, dueDateDay: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Fecha de Aprobación por Asamblea General
                </label>
                <input
                  type="date"
                  value={feeForm.approvalDate}
                  onChange={(e) => setFeeForm({ ...feeForm, approvalDate: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Fecha de Caducidad / Vigencia Estatutaria
                </label>
                <input
                  type="date"
                  value={feeForm.expiryDate}
                  onChange={(e) => setFeeForm({ ...feeForm, expiryDate: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Al llegar a esta fecha, el sistema emitirá avisos para citar a asamblea de ratificación.
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingFee(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 font-bold hover:bg-slate-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={updateFeeMutation.isPending}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition shadow-sm disabled:opacity-50"
                >
                  {updateFeeMutation.isPending ? "Guardando..." : "Guardar Cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: BULK IMPORT WITH SYSTEM TEMPLATE ================= */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  Creación / Configuración JAC
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-1">
                  Importar Afiliados y Cartera Inicial
                </h3>
                <p className="text-xs text-slate-500">
                  Cargue el censo inicial con las cuotas y saldos pendientes de vigencias anteriores.
                </p>
              </div>
              <button
                onClick={() => {
                  setIsImportModalOpen(false);
                  setParsedImportRows([]);
                  setImportFeedback(null);
                }}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 font-bold"
              >
                ✕
              </button>
            </div>

            {/* Step 1: Download Template */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
              <div>
                <span className="font-bold text-slate-800 block">Paso 1: Descargar Plantilla Oficial</span>
                <span className="text-slate-500">Formato Excel/CSV listo para diligenciar.</span>
              </div>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 font-bold rounded-xl shadow-sm flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5 text-emerald-600" /> Plantilla CSV
              </button>
            </div>

            {/* Step 2: Upload File */}
            <div className="space-y-2 text-xs">
              <label className="block font-bold text-slate-800">
                Paso 2: Subir archivo diligenciado (.csv)
              </label>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
              />
            </div>

            {importFeedback && (
              <div
                className={`p-3 rounded-xl text-xs font-semibold ${
                  importFeedback.includes("✅")
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "bg-red-50 text-red-800 border border-red-200"
                }`}
              >
                {importFeedback}
              </div>
            )}

            {/* Submit */}
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsImportModalOpen(false);
                  setParsedImportRows([]);
                }}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 font-bold hover:bg-slate-50 transition text-xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={bulkImportMutation.isPending || parsedImportRows.length === 0}
                onClick={() => bulkImportMutation.mutate()}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition shadow-sm disabled:opacity-50 text-xs"
              >
                {bulkImportMutation.isPending
                  ? "Importando..."
                  : `Procesar Importación (${parsedImportRows.length})`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: COMPROBANTE OFICIAL DE RECAUDO ================= */}
      {viewingReceipt && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
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
                  {viewingReceipt.user?.fullName} (Folio #{viewingReceipt.user?.folioNumber})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Documento de Identidad:</span>
                <span className="font-mono text-slate-800">
                  {viewingReceipt.user?.identificationType} {viewingReceipt.user?.identificationNumber}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Sector / Vereda:</span>
                <span className="text-slate-800">
                  {viewingReceipt.user?.veredaOrBarrio || "Vereda Central"}
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
    </div>
  );
}
