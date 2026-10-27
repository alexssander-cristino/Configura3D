/**
 * Tipos TypeScript compartilhados entre API e frontend.
 * Valores monetários são representados como inteiros (centavos).
 */

export type Money = number; // centavos

export interface MoneyFormat {
  cents: number;
  currency: string;
  symbol: string;
}

export interface PricedOption {
  id: string;
  name: string;
  value: string;
  priceAdditionalCents: number;
  isAvailable: boolean;
  isDiscontinued?: boolean;
  metadata?: Record<string, unknown>;
}

export interface OptionGroup {
  id: string;
  name: string;
  type: string;
  isRequired: boolean;
  minSelections: number;
  maxSelections: number;
  displayOrder: number;
  options: PricedOption[];
}

export interface ProductConfigurationInput {
  productId: string;
  quantity: number;
  selections: Record<string, string[]>; // groupId -> optionIds
  notes?: string;
}

export interface PriceBreakdown {
  basePriceCents: number;
  additionalCents: number;
  quantity: number;
  subtotalCents: number;
  taxCents: number;
  discountCents: number;
  totalCents: number;
  pricingVersionId?: string;
  currency: string;
}

export interface ValidatedConfiguration {
  valid: boolean;
  configurationId?: string;
  price: PriceBreakdown;
  selectedOptions: Record<string, string[]>;
  warnings: string[];
  errors: string[];
}

export interface ShareableLink {
  shareToken: string;
  url: string;
  isPublic: boolean;
  expiresAt?: string;
}

export interface QuoteRequestInput {
  configurationId?: string;
  productId: string;
  quantity: number;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  notes?: string;
  selections: Record<string, string[]>;
}

export interface TenantContext {
  companyId: string;
  userId: string;
  role: string;
  permissions: string[];
}
