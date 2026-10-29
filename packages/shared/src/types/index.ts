import { z } from "zod";
import * as schemas from "../schemas";

export * from "../enums";
export * from "../schemas";

// Inferred TypeScript types from Zod Schemas
export type LoginInput = z.infer<typeof schemas.LoginSchema>;
export type RegisterCitizenInput = z.infer<typeof schemas.RegisterCitizenSchema>;
export type RefreshTokenInput = z.infer<typeof schemas.RefreshTokenSchema>;

export type CreateJacInput = z.infer<typeof schemas.CreateJacSchema>;
export type UpdateJacSettingsInput = z.infer<typeof schemas.UpdateJacSettingsSchema>;

export type AffiliationBookEntryInput = z.infer<typeof schemas.AffiliationBookEntrySchema>;
export type RequestCertificateInput = z.infer<typeof schemas.RequestCertificateSchema>;
export type VerifyCertificateInput = z.infer<typeof schemas.VerifyCertificateSchema>;

export type CreateFeeConfigInput = z.infer<typeof schemas.CreateFeeConfigSchema>;
export type InitPaymentTransactionInput = z.infer<typeof schemas.InitPaymentTransactionSchema>;
export type RecordManualPaymentInput = z.infer<typeof schemas.RecordManualPaymentSchema>;
export type CreateTreasuryAccountInput = z.infer<typeof schemas.CreateTreasuryAccountSchema>;
export type CreateTreasuryMovementInput = z.infer<typeof schemas.CreateTreasuryMovementSchema>;

export type ProducerProfileInput = z.infer<typeof schemas.ProducerProfileSchema>;
export type CreateMarketProductInput = z.infer<typeof schemas.CreateMarketProductSchema>;
export type FilterMarketProductsInput = z.infer<typeof schemas.FilterMarketProductsSchema>;
export type CreateMarketOrderInput = z.infer<typeof schemas.CreateMarketOrderSchema>;
export type UpdateMarketOrderStatusInput = z.infer<typeof schemas.UpdateMarketOrderStatusSchema>;

export type CreatePostInput = z.infer<typeof schemas.CreatePostSchema>;
export type MingaAttendanceInput = z.infer<typeof schemas.MingaAttendanceSchema>;

export type CreatePqrsdInput = z.infer<typeof schemas.CreatePqrsdSchema>;
export type RespondPqrsdInput = z.infer<typeof schemas.RespondPqrsdSchema>;
export type CreateAssemblyInput = z.infer<typeof schemas.CreateAssemblySchema>;
export type CastAssemblyVoteInput = z.infer<typeof schemas.CastAssemblyVoteSchema>;

// JWT Payload definitions
export interface UserJwtPayload {
  sub: string;             // User ID
  email?: string;
  phone: string;
  roles: Array<{
    jacId?: string;
    role: string;
  }>;
  currentJacId?: string;   // Active tenant context
  iat?: number;
  exp?: number;
}
