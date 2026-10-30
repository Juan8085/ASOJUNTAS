import { z } from "zod";
import {
  UserRole,
  IdentificationType,
  MembershipStatus,
  CertificateType,
  FeeType,
  FeePeriodicity,
  PaymentGateway,
  PaymentMethod,
  MarketUnit,
  MarketOrderStatus,
  DeliveryMethod,
  PostScope,
  PostType,
  PostPriority,
  PqrsdType,
  PqrsdStatus,
  AssemblyType,
  TreasuryAccountType,
  TreasuryTransactionType,
  TreasuryCategory
} from "../enums";

// Helper universal para identificadores de MongoDB (ObjectId hex 24 chars) y UUID
export const IdSchema = z.string().min(1, "Identificador requerido");

// ==========================================
// 1. AUTHENTICATION & USERS
// ==========================================
export const LoginSchema = z.object({
  identifier: z.string().min(3, "Correo o número de documento requerido"),
  password: z.string().min(6, "La contraseña debe tener mínimo 6 caracteres"),
  jacId: IdSchema.optional() // Opcional para SUPER_ADMIN, requerido para contexto JAC
});

export const RegisterCitizenSchema = z.object({
  jacId: IdSchema,
  identificationType: z.nativeEnum(IdentificationType),
  identificationNumber: z.string().min(5).max(20),
  firstName: z.string().min(2).max(100),
  lastName: z.string().min(2).max(100),
  email: z.string().email("Correo electrónico inválido").optional().or(z.literal("")),
  phone: z.string().min(7).max(15, "Número de teléfono celular válido"),
  birthDate: z.string().datetime().optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
  address: z.string().min(3).max(200),
  veredaOrBarrio: z.string().min(2).max(100),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres")
});

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(10)
});

// ==========================================
// 2. TENANTS (JAC & ASOJUNTAS)
// ==========================================
export const CreateJacSchema = z.object({
  municipalityId: IdSchema,
  name: z.string().min(3).max(150),
  legalPersonhoodNumber: z.string().min(2).max(50), // Número de Personería Jurídica
  nit: z.string().max(20).optional(),
  codeRup: z.string().max(50).optional(), // Registro Único Comunal
  veredaOrBarrio: z.string().min(2).max(100),
  address: z.string().max(255).optional(),
  phone: z.string().max(20).optional(),
  email: z.string().email().optional().or(z.literal("")),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  adminUser: z.object({
    identificationType: z.nativeEnum(IdentificationType),
    identificationNumber: z.string().min(5),
    firstName: z.string().min(2),
    lastName: z.string().min(2),
    email: z.string().email(),
    phone: z.string().min(7),
    password: z.string().min(6)
  })
});

export const UpdateJacSettingsSchema = z.object({
  name: z.string().min(3).max(150).optional(),
  nit: z.string().max(20).optional(),
  address: z.string().max(255).optional(),
  phone: z.string().max(20).optional(),
  email: z.string().email().optional(),
  logoUrl: z.string().url().optional(),
  officialSealUrl: z.string().url().optional(),
  primaryColor: z.string().regex(/^#([A-Fa-f0-9]{6})$/).optional(),
  bankAccounts: z.array(z.object({
    bankName: z.string(),
    accountType: z.string(),
    accountNumber: z.string(),
    holderName: z.string(),
    holderNit: z.string()
  })).optional()
});

// ==========================================
// 3. AFFILIATES & CERTIFICATES (Libro Afiliados)
// ==========================================
export const AffiliationBookEntrySchema = z.object({
  userId: IdSchema,
  jacId: IdSchema,
  bookNumber: z.number().int().positive().default(1),
  folioNumber: z.number().int().positive(),
  affiliationDate: z.string().datetime(),
  status: z.nativeEnum(MembershipStatus).default(MembershipStatus.ACTIVE),
  role: z.nativeEnum(UserRole).default(UserRole.CITIZEN),
  occupation: z.string().max(100).optional(),
  hasLandOrFarm: z.boolean().default(false),
  farmName: z.string().max(120).optional(),
  observations: z.string().max(500).optional()
});

export const RequestCertificateSchema = z.object({
  jacId: IdSchema,
  type: z.nativeEnum(CertificateType),
  purpose: z.string().min(5).max(300), // Ej: Trámite bancario, subsidio vivienda
  deliveryMethod: z.enum(["DIGITAL_DOWNLOAD", "PHYSICAL_COLLECTION"]).default("DIGITAL_DOWNLOAD")
});

export const VerifyCertificateSchema = z.object({
  verificationCode: z.string().min(6).max(36)
});

// ==========================================
// 4. TREASURY & PAYMENTS
// ==========================================
export const CreateFeeConfigSchema = z.object({
  jacId: IdSchema,
  name: z.string().min(3).max(120),
  description: z.string().max(500).optional(),
  type: z.nativeEnum(FeeType),
  periodicity: z.nativeEnum(FeePeriodicity),
  amount: z.number().positive("El monto debe ser mayor a 0"),
  dueDateDay: z.number().min(1).max(31).default(15),
  active: z.boolean().default(true)
});

export const InitPaymentTransactionSchema = z.object({
  jacId: IdSchema,
  feeObligationId: IdSchema.optional(),
  marketOrderId: IdSchema.optional(),
  gateway: z.nativeEnum(PaymentGateway),
  paymentMethod: z.nativeEnum(PaymentMethod),
  amount: z.number().positive(),
  currency: z.literal("COP").default("COP"),
  idempotencyKey: z.string().min(1),
  payerEmail: z.string().email(),
  payerPhone: z.string().min(7),
  redirectUrl: z.string().url().optional()
});

export const RecordManualPaymentSchema = z.object({
  jacId: IdSchema,
  feeObligationId: IdSchema,
  amount: z.number().positive(),
  receiptNumber: z.string().min(1).max(50),
  paidAt: z.string().datetime(),
  notes: z.string().max(300).optional(),
  voucherFileUrl: z.string().url().optional()
});

export const CreateTreasuryAccountSchema = z.object({
  jacId: IdSchema,
  name: z.string().min(2).max(100),
  type: z.nativeEnum(TreasuryAccountType),
  initialBalance: z.number().nonnegative().default(0)
});

export const CreateTreasuryMovementSchema = z.object({
  jacId: IdSchema,
  accountId: IdSchema,
  type: z.nativeEnum(TreasuryTransactionType),
  category: z.nativeEnum(TreasuryCategory),
  amount: z.number().positive(),
  description: z.string().min(5).max(300),
  voucherUrl: z.string().url().optional(),
  movementDate: z.string().datetime().default(() => new Date().toISOString())
});

// ==========================================
// 5. MERCADO CAMPESINO
// ==========================================
export const ProducerProfileSchema = z.object({
  jacId: IdSchema,
  farmName: z.string().min(2).max(120),
  veredaName: z.string().min(2).max(100),
  bio: z.string().max(500).optional(),
  whatsappContact: z.string().min(10).max(15),
  acceptsOnlinePayment: z.boolean().default(true),
  acceptsCashOnDelivery: z.boolean().default(true),
  bannerImageUrl: z.string().url().optional()
});

export const CreateMarketProductSchema = z.object({
  categoryId: IdSchema,
  title: z.string().min(3).max(120),
  description: z.string().max(800),
  price: z.number().positive(),
  unit: z.nativeEnum(MarketUnit),
  stockQuantity: z.number().nonnegative(),
  isOrganic: z.boolean().default(false),
  harvestDate: z.string().datetime().optional(),
  images: z.array(z.string().url()).min(1, "Debe subir al menos una foto del producto").max(5),
  availableForDelivery: z.boolean().default(true),
  availableForPickup: z.boolean().default(true)
});

export const FilterMarketProductsSchema = z.object({
  municipalityId: IdSchema.optional(),
  jacId: IdSchema.optional(),
  categoryId: IdSchema.optional(),
  minPrice: z.number().nonnegative().optional(),
  maxPrice: z.number().positive().optional(),
  search: z.string().optional(),
  onlyOrganic: z.boolean().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(50).default(20)
});

export const CreateMarketOrderSchema = z.object({
  producerId: IdSchema,
  deliveryMethod: z.nativeEnum(DeliveryMethod),
  deliveryAddress: z.string().min(5).max(255).optional(),
  buyerName: z.string().min(2).max(100),
  buyerPhone: z.string().min(7).max(15),
  customerNotes: z.string().max(500).optional(),
  paymentMethod: z.nativeEnum(PaymentMethod),
  items: z.array(z.object({
    productId: IdSchema,
    quantity: z.number().positive()
  })).min(1, "La orden debe contener al menos un producto")
});

export const UpdateMarketOrderStatusSchema = z.object({
  orderId: IdSchema,
  status: z.nativeEnum(MarketOrderStatus),
  trackingNotes: z.string().max(300).optional()
});

// ==========================================
// 6. NOTICIAS, COMUNICACIONES & MINGAS
// ==========================================
export const CreatePostSchema = z.object({
  jacId: IdSchema.optional(), // Requerido si scope es JAC_LOCAL; nulo si ASOJUNTAS municipal
  scope: z.nativeEnum(PostScope),
  type: z.nativeEnum(PostType),
  priority: z.nativeEnum(PostPriority).default(PostPriority.NORMAL),
  title: z.string().min(5).max(200),
  content: z.string().min(10),
  excerpt: z.string().max(300).optional(),
  coverImageUrl: z.string().url().optional(),
  eventDate: z.string().datetime().optional(), // Para mingas o asambleas
  location: z.string().max(200).optional(),
  requiresAttendanceConfirmation: z.boolean().default(false),
  sendPushNotification: z.boolean().default(true),
  sendWhatsAppAlert: z.boolean().default(false)
});

export const MingaAttendanceSchema = z.object({
  postId: IdSchema,
  attending: z.boolean(),
  notes: z.string().max(250).optional()
});

// ==========================================
// 7. PARTICIPACIÓN (PQRSD & ASAMBLEAS)
// ==========================================
export const CreatePqrsdSchema = z.object({
  jacId: IdSchema,
  type: z.nativeEnum(PqrsdType),
  subject: z.string().min(5).max(150),
  description: z.string().min(10).max(2000),
  isAnonymous: z.boolean().default(false),
  attachments: z.array(z.string().url()).max(3).optional()
});

export const RespondPqrsdSchema = z.object({
  ticketId: IdSchema,
  status: z.nativeEnum(PqrsdStatus),
  responseText: z.string().min(10).max(3000),
  notifyViaWhatsApp: z.boolean().default(true)
});

export const CreateAssemblySchema = z.object({
  jacId: IdSchema,
  title: z.string().min(5).max(180),
  description: z.string().max(1000).optional(),
  type: z.nativeEnum(AssemblyType),
  scheduledDate: z.string().datetime(),
  location: z.string().min(3).max(200),
  quorumPercentageRequired: z.number().min(1).max(100).default(50)
});

export const CastAssemblyVoteSchema = z.object({
  assemblyId: IdSchema,
  topicId: IdSchema,
  selectedOptionId: IdSchema,
  voteSignature: z.string().min(10) // HMAC/Sign digital para garantizar no repudio y anonimato
});
