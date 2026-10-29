export enum UserRole {
  SUPER_ADMIN = "SUPER_ADMIN", // Asojuntas / Municipal Super Admin
  JAC_ADMIN = "JAC_ADMIN",     // Overall JAC Administrator
  JAC_PRESIDENT = "JAC_PRESIDENT",
  JAC_VICE_PRESIDENT = "JAC_VICE_PRESIDENT",
  JAC_SECRETARY = "JAC_SECRETARY",
  JAC_TREASURER = "JAC_TREASURER",
  JAC_FISCAL = "JAC_FISCAL",
  CITIZEN = "CITIZEN"          // Regular resident of vereda or neighborhood
}

export enum IdentificationType {
  CC = "CC",             // Cédula de Ciudadanía
  TI = "TI",             // Tarjeta de Identidad
  CE = "CE",             // Cédula de Extranjería
  PASSPORT = "PASSPORT", // Pasaporte
  PPT = "PPT"            // Permiso por Protección Temporal
}

export enum MembershipStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  SUSPENDED = "SUSPENDED",
  DECEASED = "DECEASED"
}

export enum CertificateType {
  RESIDENCE = "RESIDENCE",           // Certificado de Residencia
  AFFILIATION = "AFFILIATION",       // Certificado de Afiliación a la JAC
  GOOD_STANDING = "GOOD_STANDING"   // Paz y Salvo Comunal
}

export enum CertificateStatus {
  VALID = "VALID",
  REVOKED = "REVOKED",
  EXPIRED = "EXPIRED"
}

export enum FeeType {
  ORDINARY = "ORDINARY",                 // Cuota ordinaria sostenimiento
  EXTRAORDINARY = "EXTRAORDINARY",       // Cuota extraordinaria (obras, eventos)
  COMMUNAL_WORK_FINE = "COMMUNAL_WORK_FINE", // Compensación por no asistir a minga
  EVENT = "EVENT"                        // Aporte pro-evento/bazar
}

export enum FeePeriodicity {
  ONE_TIME = "ONE_TIME",
  MONTHLY = "MONTHLY",
  BIMONTHLY = "BIMONTHLY",
  QUARTERLY = "QUARTERLY",
  BIANNUAL = "BIANNUAL",
  ANNUAL = "ANNUAL"
}

export enum ObligationStatus {
  PENDING = "PENDING",
  PARTIALLY_PAID = "PARTIALLY_PAID",
  PAID = "PAID",
  OVERDUE = "OVERDUE",
  WAIVED = "WAIVED"
}

export enum PaymentGateway {
  WOMPI = "WOMPI",
  MERCADOPAGO = "MERCADOPAGO",
  EPAYCO = "EPAYCO",
  MANUAL_CASH = "MANUAL_CASH"
}

export enum PaymentMethod {
  PSE = "PSE",
  NEQUI = "NEQUI",
  DAVIPLATA = "DAVIPLATA",
  CREDIT_CARD = "CREDIT_CARD",
  DEBIT_CARD = "DEBIT_CARD",
  CASH = "CASH",
  BANK_TRANSFER = "BANK_TRANSFER"
}

export enum PaymentStatus {
  PENDING = "PENDING",
  PROCESSING = "PROCESSING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  CANCELLED = "CANCELLED",
  REFUNDED = "REFUNDED"
}

export enum TreasuryAccountType {
  CASH_BOX = "CASH_BOX",
  BANK_SAVINGS = "BANK_SAVINGS",
  BANK_CHECKING = "BANK_CHECKING",
  DIGITAL_WALLET = "DIGITAL_WALLET" // Nequi/Daviplata institucional
}

export enum TreasuryTransactionType {
  INCOME = "INCOME",
  EXPENSE = "EXPENSE"
}

export enum TreasuryCategory {
  AFFILIATION_FEE = "AFFILIATION_FEE",
  MONTHLY_FEE = "MONTHLY_FEE",
  EXTRAORDINARY_FEE = "EXTRAORDINARY_FEE",
  COMMUNAL_HALL_RENT = "COMMUNAL_HALL_RENT",
  DONATION = "DONATION",
  MUNICIPAL_SUBSIDY = "MUNICIPAL_SUBSIDY",
  EVENT_PROCEEDS = "EVENT_PROCEEDS",
  COMMUNAL_WORKS = "COMMUNAL_WORKS",
  OFFICE_SUPPLIES = "OFFICE_SUPPLIES",
  MAINTENANCE = "MAINTENANCE",
  LEGAL_SERVICES = "LEGAL_SERVICES",
  OTHER = "OTHER"
}

export enum MarketUnit {
  KG = "KG",
  LIBRA = "LIBRA",
  BULTO = "BULTO",
  ARROBA = "ARROBA",
  UNIDAD = "UNIDAD",
  MANOJO = "MANOJO",
  LITRO = "LITRO",
  BOTELLA = "BOTELLA"
}

export enum MarketOrderStatus {
  PENDING_CONFIRMATION = "PENDING_CONFIRMATION",
  CONFIRMED = "CONFIRMED",
  PREPARING = "PREPARING",
  READY_FOR_PICKUP = "READY_FOR_PICKUP",
  IN_TRANSIT = "IN_TRANSIT",
  DELIVERED = "DELIVERED",
  CANCELLED = "CANCELLED"
}

export enum DeliveryMethod {
  PICKUP_AT_FARM = "PICKUP_AT_FARM",
  LOCAL_DELIVERY = "LOCAL_DELIVERY",
  COMMUNITY_HUB_PICKUP = "COMMUNITY_HUB_PICKUP",
  WHATSAPP_COORDINATION = "WHATSAPP_COORDINATION"
}

export enum PostScope {
  MUNICIPAL_ASOJUNTAS = "MUNICIPAL_ASOJUNTAS",
  JAC_LOCAL = "JAC_LOCAL"
}

export enum PostType {
  NEWS = "NEWS",
  OFFICIAL_CIRCULAR = "OFFICIAL_CIRCULAR",
  COMMUNAL_WORK = "COMMUNAL_WORK", // Minga comunitaria
  EMERGENCY_ALERT = "EMERGENCY_ALERT",
  EVENT = "EVENT"
}

export enum PostPriority {
  LOW = "LOW",
  NORMAL = "NORMAL",
  HIGH = "HIGH",
  URGENT = "URGENT"
}

export enum PqrsdType {
  PETITION = "PETITION",
  COMPLAINT = "COMPLAINT",
  CLAIM = "CLAIM",
  SUGGESTION = "SUGGESTION",
  REPORT = "REPORT" // Denuncia
}

export enum PqrsdStatus {
  RECEIVED = "RECEIVED",
  UNDER_REVIEW = "UNDER_REVIEW",
  IN_PROGRESS = "IN_PROGRESS",
  RESOLVED = "RESOLVED",
  REJECTED = "REJECTED",
  CLOSED = "CLOSED"
}

export enum AssemblyType {
  ORDINARY = "ORDINARY",
  EXTRAORDINARY = "EXTRAORDINARY"
}

export enum AssemblyStatus {
  SCHEDULED = "SCHEDULED",
  IN_PROGRESS = "IN_PROGRESS",
  QUORUM_FAILED = "QUORUM_FAILED",
  FINISHED = "FINISHED",
  CANCELLED = "CANCELLED"
}

export enum NotificationChannel {
  PUSH = "PUSH",
  WHATSAPP = "WHATSAPP",
  SMS = "SMS",
  EMAIL = "EMAIL",
  IN_APP = "IN_APP"
}
