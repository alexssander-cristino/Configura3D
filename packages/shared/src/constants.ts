/**
 * Constantes compartilhadas entre API e frontend.
 * Valores em centavos para evitar ponto flutuante.
 */

export const CURRENCY = 'BRL';
export const CURRENCY_SYMBOL = 'R$';
export const CENTS_PER_UNIT = 100;

/**
 * Limites de upload de modelos 3D.
 */
export const MODEL_UPLOAD = {
  // Tamanho máximo: 50 MB
  MAX_SIZE_BYTES: 50 * 1024 * 1024,
  // Extensões permitidas
  ALLOWED_EXTENSIONS: ['.glb', '.gltf'],
  // MIME types aceitos
  ALLOWED_MIME_TYPES: [
    'model/gltf-binary',
    'model/gltf+json',
    'application/octet-stream',
  ],
};

/**
 * Limites gerais de arquivo.
 */
export const FILE_UPLOAD = {
  MAX_IMAGE_SIZE_BYTES: 10 * 1024 * 1024, // 10 MB
  ALLOWED_IMAGE_MIME_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],
};

/**
 * Status de processamento de modelo.
 */
export const MODEL_PROCESSING_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  READY: 'ready',
  FAILED: 'failed',
} as const;

export type ModelProcessingStatus =
  (typeof MODEL_PROCESSING_STATUS)[keyof typeof MODEL_PROCESSING_STATUS];

/**
 * Status de publicação de produto.
 */
export const PRODUCT_PUBLISH_STATE = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  ARCHIVED: 'archived',
} as const;

export type ProductPublishState =
  (typeof PRODUCT_PUBLISH_STATE)[keyof typeof PRODUCT_PUBLISH_STATE];

/**
 * Status de orçamento.
 */
export const QUOTE_STATUS = {
  DRAFT: 'draft',
  SENT: 'sent',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  EXPIRED: 'expired',
} as const;

export type QuoteStatus = (typeof QUOTE_STATUS)[keyof typeof QUOTE_STATUS];

/**
 * Tipo de regra de compatibilidade.
 */
export const COMPATIBILITY_RULE_TYPE = {
  INCOMPATIBLE: 'incompatible',
  REQUIRES: 'requires',
  LIMITED_TO: 'limited_to',
} as const;

export type CompatibilityRuleType =
  (typeof COMPATIBILITY_RULE_TYPE)[keyof typeof COMPATIBILITY_RULE_TYPE];

/**
 * Tipo de grupo de opção.
 */
export const OPTION_GROUP_TYPE = {
  COLOR: 'color',
  MATERIAL: 'material',
  FINISH: 'finish',
  COMPONENT: 'component',
  DIMENSION: 'dimension',
  ACCESSORY: 'accessory',
  QUANTITY: 'quantity',
  CUSTOM: 'custom',
} as const;

export type OptionGroupType =
  (typeof OPTION_GROUP_TYPE)[keyof typeof OPTION_GROUP_TYPE];

/**
 * Níveis de acesso / papel no tenant.
 */
export const MEMBER_ROLE = {
  OWNER: 'owner',
  ADMIN: 'admin',
  EDITOR: 'editor',
  VIEWER: 'viewer',
} as const;

export type MemberRole = (typeof MEMBER_ROLE)[keyof typeof MEMBER_ROLE];

/**
 * Tamanho mínimo de tela suportado (px).
 */
export const MIN_SCREEN_WIDTH = 360;

/**
 * Identificador do produto de demonstração.
 */
export const DEMO_PRODUCT_SLUG = 'organizador-de-mesa-demo';
export const DEMO_MODEL_NAME = 'organizador-de-mesa-demo.glb';
