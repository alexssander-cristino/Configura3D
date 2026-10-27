/**
 * Schemas Zod compartilhados entre API e frontend.
 * Usados para validar entradas, saídas e contratos de API.
 */

import { z } from 'zod';
import { CURRENCY } from './constants';

// ---------------------------------------------------------------------------
// Tipos base / utilitários
// ---------------------------------------------------------------------------

// Centavos (inteiro não negativo) para evitar ponto flutuante
export const MoneyCents = z.number().int().nonnegative().describe('Valor em centavos');

export const UUID = z.string().min(1).describe('identificador (cuid ou uuid)');
// Slug válido: letras, números, hífens e underline
export const Slug = z.string().regex(/^[a-z0-9_-]+$/, 'slug inválido').min(1).max(100);
export const NonEmptyString = z.string().min(1).trim();

// ---------------------------------------------------------------------------
// Empresa / Usuário / Membro
// ---------------------------------------------------------------------------

export const CompanyCreateInput = z.object({
  name: z.string().min(1).max(200),
  slug: Slug,
  domain: z.string().optional(),
  settings: z.record(z.any()).optional().default({}),
});

export const CompanyUpdateInput = z.object({
  name: z.string().min(1).max(200).optional(),
  slug: Slug.optional(),
  domain: z.string().optional(),
  settings: z.record(z.any()).optional(),
  isActive: z.boolean().optional(),
});

export const CompanyResponse = z.object({
  id: UUID,
  name: z.string(),
  slug: z.string(),
  domain: z.string().nullable(),
  settings: z.record(z.any()),
  isActive: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const UserCreateInput = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(200),
  role: z.enum(['owner', 'admin', 'editor', 'viewer']).default('editor'),
});

export const UserLoginInput = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const UserResponse = z.object({
  id: UUID,
  email: z.string(),
  name: z.string(),
  role: z.string(),
  isActive: z.boolean(),
  createdAt: z.string().datetime(),
});

export const CompanyMemberInput = z.object({
  userId: UUID,
  role: z.enum(['owner', 'admin', 'editor', 'viewer']),
  permissions: z.array(z.string()).optional().default([]),
});

export const CompanyMemberResponse = z.object({
  id: UUID,
  companyId: UUID,
  userId: UUID,
  user: UserResponse,
  role: z.string(),
  permissions: z.array(z.string()),
  createdAt: z.string().datetime(),
});

// ---------------------------------------------------------------------------
// Modelo 3D (asset)
// ---------------------------------------------------------------------------

export const ModelAssetCreateInput = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  fileUrl: z.string().url(),
  thumbnailUrl: z.string().url().optional(),
  mimeType: z.string(),
  sizeBytes: z.number().int().nonnegative(),
  metadata: z.record(z.any()).optional().default({}),
  processingStatus: z.enum(['pending', 'processing', 'ready', 'failed']).default('pending'),
});

export const ModelAssetResponse = z.object({
  id: UUID,
  companyId: UUID,
  name: z.string(),
  description: z.string().nullable(),
  fileUrl: z.string(),
  thumbnailUrl: z.string().nullable(),
  mimeType: z.string(),
  sizeBytes: z.number(),
  processingStatus: z.string(),
  errorMessage: z.string().nullable(),
  metadata: z.record(z.any()),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const ModelComponentInput = z.object({
  name: z.string().min(1).max(200),
  meshName: z.string().min(1).max(200).describe('Nome do mesh no GLB'),
  materialSlot: z.string().optional(),
  type: z.enum(['color', 'material', 'finish', 'component', 'accessory']),
  isConfigurable: z.boolean().default(true),
});

export const ModelComponentResponse = ModelComponentInput.extend({
  id: UUID,
  modelAssetId: UUID,
  displayOrder: z.number().int(),
});

// ---------------------------------------------------------------------------
// Produto
// ---------------------------------------------------------------------------

export const ProductCreateInput = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  slug: Slug,
  category: z.string().min(1).max(100),
  sku: z.string().min(1).max(100),
  basePriceCents: MoneyCents,
  productionTimeDays: z.number().int().nonnegative().optional().default(0),
  modelAssetId: UUID,
  isPublished: z.boolean().optional().default(false),
  settings: z.record(z.any()).optional().default({}),
});

export const ProductUpdateInput = ProductCreateInput.partial();

export const ProductResponse = z.object({
  id: UUID,
  companyId: UUID,
  name: z.string(),
  description: z.string().nullable(),
  slug: z.string(),
  category: z.string(),
  sku: z.string(),
  basePriceCents: z.number(),
  productionTimeDays: z.number(),
  modelAssetId: UUID.nullable(),
  modelAsset: ModelAssetResponse.nullable(),
  isPublished: z.boolean(),
  isArchived: z.boolean(),
  settings: z.record(z.any()),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const ProductListItem = ProductResponse.pick({
  id: true, name: true, slug: true, category: true, sku: true,
  basePriceCents: true, isPublished: true, isArchived: true, createdAt: true,
});

// ---------------------------------------------------------------------------
// Opções
// ---------------------------------------------------------------------------

export const OptionGroupCreateInput = z.object({
  productId: UUID,
  name: z.string().min(1).max(200),
  type: z.enum([
    'color', 'material', 'finish', 'component', 'dimension',
    'accessory', 'quantity', 'custom',
  ]),
  isRequired: z.boolean().default(false),
  minSelections: z.number().int().nonnegative().default(1),
  maxSelections: z.number().int().nonnegative().default(1),
  displayOrder: z.number().int().nonnegative().default(0),
});

export const OptionGroupResponse = z.object({
  id: UUID,
  productId: UUID,
  name: z.string(),
  type: z.string(),
  isRequired: z.boolean(),
  minSelections: z.number(),
  maxSelections: z.number(),
  displayOrder: z.number(),
  options: z.array(z.any()),
  createdAt: z.string().datetime(),
});

export const ProductOptionCreateInput = z.object({
  optionGroupId: UUID,
  name: z.string().min(1).max(200),
  value: z.string().min(1).max(100),
  priceAdditionalCents: MoneyCents.default(0),
  skuSuffix: z.string().optional(),
  isAvailable: z.boolean().default(true),
  isDiscontinued: z.boolean().default(false),
  metadata: z.record(z.any()).optional().default({}),
  compatibilityRules: z.array(z.any()).optional().default([]),
  displayOrder: z.number().int().nonnegative().default(0),
});

export const ProductOptionResponse = z.object({
  id: UUID,
  optionGroupId: UUID,
  name: z.string(),
  value: z.string(),
  priceAdditionalCents: z.number(),
  skuSuffix: z.string().nullable(),
  isAvailable: z.boolean(),
  isDiscontinued: z.boolean(),
  metadata: z.record(z.any()),
  compatibilityRules: z.array(z.any()),
  displayOrder: z.number(),
  createdAt: z.string().datetime(),
});

// ---------------------------------------------------------------------------
// Regras de compatibilidade
// ---------------------------------------------------------------------------

export const CompatibilityRuleCreateInput = z.object({
  productId: UUID,
  name: z.string().min(1).max(200),
  type: z.enum(['incompatible', 'requires', 'limited_to']),
  condition: z.record(z.any()),
  action: z.record(z.any()),
  isActive: z.boolean().default(true),
});

export const CompatibilityRuleResponse = z.object({
  id: UUID,
  productId: UUID,
  name: z.string(),
  type: z.string(),
  condition: z.record(z.any()),
  action: z.record(z.any()),
  isActive: z.boolean(),
  createdAt: z.string().datetime(),
});

// ---------------------------------------------------------------------------
// Configurações
// ---------------------------------------------------------------------------

export const ConfigurationSaveInput = z.object({
  productId: UUID,
  quantity: z.number().int().positive().default(1),
  selections: z.record(z.array(z.string())).default({}),
  name: z.string().optional(),
  isPublic: z.boolean().default(false),
});

export const ConfigurationResponse = z.object({
  id: UUID,
  companyId: UUID,
  productId: UUID,
  shareToken: UUID,
  isPublic: z.boolean(),
  name: z.string().nullable(),
  quantity: z.number(),
  selections: z.record(z.array(z.string())),
  priceSnapshot: z.record(z.any()),
  pricingVersionId: UUID.nullable(),
  expiresAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const ConfigurationValidateInput = z.object({
  productId: UUID,
  quantity: z.number().int().positive().default(1),
  selections: z.record(z.array(z.string())).default({}),
});

// ---------------------------------------------------------------------------
// Orçamentos
// ---------------------------------------------------------------------------

export const QuoteCreateInput = z.object({
  configurationId: UUID.optional(),
  productId: UUID,
  quantity: z.number().int().positive().default(1),
  customerName: z.string().min(1).max(200),
  customerEmail: z.string().email(),
  customerPhone: z.string().optional(),
  notes: z.string().optional(),
  selections: z.record(z.array(z.string())).default({}),
});

export const QuoteResponse = z.object({
  id: UUID,
  companyId: UUID,
  quoteNumber: z.string(),
  configurationId: UUID.nullable(),
  productId: UUID,
  customerName: z.string(),
  customerEmail: z.string(),
  customerPhone: z.string().nullable(),
  quantity: z.number(),
  notes: z.string().nullable(),
  estimatedValueCents: z.number(),
  status: z.string(),
  validUntil: z.string().datetime().nullable(),
  pdfUrl: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const QuoteStatusUpdateInput = z.object({
  status: z.enum(['draft', 'sent', 'approved', 'rejected', 'expired']),
});

// ---------------------------------------------------------------------------
// Preço
// ---------------------------------------------------------------------------

export const PriceCalculateInput = z.object({
  productId: UUID,
  quantity: z.number().int().positive().default(1),
  selections: z.record(z.array(z.string())).default({}),
});

export const PriceCalculateOutput = z.object({
  basePriceCents: MoneyCents,
  additionalCents: MoneyCents,
  quantity: z.number().int().positive(),
  subtotalCents: MoneyCents,
  taxCents: MoneyCents,
  discountCents: MoneyCents,
  totalCents: MoneyCents,
  currency: z.string().default(CURRENCY),
  pricingVersionId: UUID.nullable(),
  breakdown: z.array(z.record(z.any())),
  warnings: z.array(z.string()),
});

// ---------------------------------------------------------------------------
// Upload / Asset
// ---------------------------------------------------------------------------

export const UploadUrlInput = z.object({
  filename: z.string().min(1),
  mimeType: z.string(),
  sizeBytes: z.number().int().nonnegative(),
  companyId: UUID,
});

export const UploadUrlOutput = z.object({
  uploadUrl: z.string().url(),
  assetUrl: z.string().url(),
  fields: z.record(z.any()).optional(),
});

// ---------------------------------------------------------------------------
// Erros
// ---------------------------------------------------------------------------

export const ErrorResponse = z.object({
  error: z.string(),
  message: z.string(),
  code: z.string().optional(),
  details: z.any().optional(),
});

// ---------------------------------------------------------------------------
// Tipos inferidos
// ---------------------------------------------------------------------------

export type CompanyCreateInput = z.infer<typeof CompanyCreateInput>;
export type CompanyUpdateInput = z.infer<typeof CompanyUpdateInput>;
export type CompanyResponse = z.infer<typeof CompanyResponse>;
export type UserCreateInput = z.infer<typeof UserCreateInput>;
export type UserLoginInput = z.infer<typeof UserLoginInput>;
export type UserResponse = z.infer<typeof UserResponse>;
export type CompanyMemberInput = z.infer<typeof CompanyMemberInput>;
export type CompanyMemberResponse = z.infer<typeof CompanyMemberResponse>;
export type ModelAssetCreateInput = z.infer<typeof ModelAssetCreateInput>;
export type ModelAssetResponse = z.infer<typeof ModelAssetResponse>;
export type ModelComponentInput = z.infer<typeof ModelComponentInput>;
export type ModelComponentResponse = z.infer<typeof ModelComponentResponse>;
export type ProductCreateInput = z.infer<typeof ProductCreateInput>;
export type ProductUpdateInput = z.infer<typeof ProductUpdateInput>;
export type ProductResponse = z.infer<typeof ProductResponse>;
export type ProductListItem = z.infer<typeof ProductListItem>;
export type OptionGroupCreateInput = z.infer<typeof OptionGroupCreateInput>;
export type OptionGroupResponse = z.infer<typeof OptionGroupResponse>;
export type ProductOptionCreateInput = z.infer<typeof ProductOptionCreateInput>;
export type ProductOptionResponse = z.infer<typeof ProductOptionResponse>;
export type CompatibilityRuleCreateInput = z.infer<typeof CompatibilityRuleCreateInput>;
export type CompatibilityRuleResponse = z.infer<typeof CompatibilityRuleResponse>;
export type ConfigurationSaveInput = z.infer<typeof ConfigurationSaveInput>;
export type ConfigurationResponse = z.infer<typeof ConfigurationResponse>;
export type ConfigurationValidateInput = z.infer<typeof ConfigurationValidateInput>;
export type QuoteCreateInput = z.infer<typeof QuoteCreateInput>;
export type QuoteResponse = z.infer<typeof QuoteResponse>;
export type QuoteStatusUpdateInput = z.infer<typeof QuoteStatusUpdateInput>;
export type PriceCalculateInput = z.infer<typeof PriceCalculateInput>;
export type PriceCalculateOutput = z.infer<typeof PriceCalculateOutput>;
export type UploadUrlInput = z.infer<typeof UploadUrlInput>;
export type UploadUrlOutput = z.infer<typeof UploadUrlOutput>;
export type ErrorResponse = z.infer<typeof ErrorResponse>;
