export type Option = {
  id: string;
  optionGroupId: string;
  name: string;
  value: string;
  priceAdditionalCents: number;
  isAvailable: boolean;
  isDiscontinued?: boolean;
  metadata?: Record<string, unknown>;
};

export type OptionGroup = {
  id: string;
  productId: string;
  name: string;
  type: string;
  isRequired: boolean;
  minSelections: number;
  maxSelections: number;
  displayOrder: number;
  options: Option[];
};

export type Product = {
  id: string;
  companyId: string;
  name: string;
  description: string | null;
  slug: string;
  category: string;
  sku: string;
  basePriceCents: number;
  productionTimeDays: number;
  modelAssetId: string | null;
  isPublished: boolean;
  isArchived: boolean;
  modelAsset?: {
    id: string;
    name: string;
    fileUrl: string | null;
    thumbnailUrl: string | null;
    processingStatus: string;
  } | null;
};

export type PriceBreakdown = {
  basePriceCents: number;
  additionalCents: number;
  quantity: number;
  subtotalCents: number;
  taxCents: number;
  discountCents: number;
  totalCents: number;
  currency: string;
  pricingVersionId: string | null;
  selectedOptions: Array<{
    optionId: string;
    optionGroupId: string;
    name: string;
    value: string;
    priceAdditionalCents: number;
  }>;
  warnings: string[];
};

export type Configuration = {
  id: string;
  shareToken: string;
  name: string | null;
  productId: string;
  quantity: number;
  selections: Record<string, string[]>;
  priceSnapshot: Record<string, unknown>;
  createdAt: string;
};

export type Quote = {
  id: string;
  quoteNumber: string;
  customerName: string;
  customerEmail: string;
  estimatedValueCents: number;
  status: string;
  validUntil: string | null;
  createdAt: string;
};
