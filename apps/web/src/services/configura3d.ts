import { api, isApiError, ApiError } from '@/lib/api';
import type {
  Product, OptionGroup, PriceBreakdown, Configuration, Quote,
} from '@/types';

export type { ApiError };

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export async function login(email: string, password: string) {
  const { data } = await api.post<{ user: any; token: string }>('/auth/login', { email, password });
  return data;
}

export async function register(body: any) {
  const { data } = await api.post<{ user: any; company: any; token: string }>('/auth/register', body);
  return data;
}

export async function me() {
  const { data } = await api.get<{ user: any; companyId: string | null }>('/auth/me');
  return data;
}

export async function logout() {
  await api.post('/auth/logout');
}

// ---------------------------------------------------------------------------
// Companies
// ---------------------------------------------------------------------------

export async function listCompanies() {
  const { data } = await api.get<any[]>('/companies');
  return data;
}

export async function createCompany(body: any) {
  const { data } = await api.post<any>('/companies', body);
  return data;
}

export async function getCompany(id: string) {
  const { data } = await api.get<any>(`/companies/${id}`);
  return data;
}

export async function listCompanyMembers(companyId: string) {
  const { data } = await api.get<any[]>(`/companies/${companyId}/members`);
  return data;
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

export async function listProducts(params?: {
  category?: string; search?: string; isPublished?: string; isArchived?: string;
  page?: number; pageSize?: number;
}) {
  const { data } = await api.get<any>('/products', { params });
  return data;
}

export async function createProduct(body: any) {
  const { data } = await api.post<Product>('/products', body);
  return data;
}

export async function getProduct(id: string) {
  const { data } = await api.get<Product>(`/products/${id}`);
  return data;
}

export async function publishProduct(id: string) {
  const { data } = await api.post<any>(`/products/${id}/publish`);
  return data;
}

export async function archiveProduct(id: string) {
  const { data } = await api.post<any>(`/products/${id}/archive`);
  return data;
}

export async function duplicateProduct(id: string) {
  const { data } = await api.post<any>(`/products/${id}/duplicate`);
  return data;
}

// ---------------------------------------------------------------------------
// Models
// ---------------------------------------------------------------------------

export async function listModels(params?: { processingStatus?: string; page?: number; pageSize?: number }) {
  const { data } = await api.get<any>('/models', { params });
  return data;
}

export async function createModel(body: any) {
  const { data } = await api.post<any>('/models', body);
  return data;
}

export async function getModelComponents(modelId: string) {
  const { data } = await api.get<any[]>(`/models/${modelId}/components`);
  return data;
}

export async function addModelComponent(modelId: string, body: any) {
  const { data } = await api.post<any>(`/models/${modelId}/components`, body);
  return data;
}

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

export async function listOptionGroups(productId: string) {
  const { data } = await api.get<OptionGroup[]>(`/products/${productId}/option-groups`);
  return data;
}

export async function createOptionGroup(productId: string, body: any) {
  const { data } = await api.post<OptionGroup>(`/products/${productId}/option-groups`, body);
  return data;
}

export async function createProductOption(groupId: string, body: any) {
  const { data } = await api.post<any>(`/option-groups/${groupId}/options`, body);
  return data;
}

// ---------------------------------------------------------------------------
// Compatibility
// ---------------------------------------------------------------------------

export async function listCompatibilityRules(productId: string) {
  const { data } = await api.get<any[]>(`/products/${productId}/compatibility-rules`);
  return data;
}

export async function createCompatibilityRule(productId: string, body: any) {
  const { data } = await api.post<any>(`/products/${productId}/compatibility-rules`, body);
  return data;
}

// ---------------------------------------------------------------------------
// Pricing
// ---------------------------------------------------------------------------

export async function calculatePrice(body: {
  productId: string; quantity: number; selections: Record<string, string[]>;
}) {
  const { data } = await api.post<PriceBreakdown>('/pricing/calculate', body);
  return data;
}

// ---------------------------------------------------------------------------
// Configurations
// ---------------------------------------------------------------------------

export async function validateConfiguration(body: {
  productId: string; quantity: number; selections: Record<string, string[]>;
}) {
  const { data } = await api.post<any>('/configurations/validate', body);
  return data;
}

export async function saveConfiguration(body: {
  productId: string; quantity: number; selections: Record<string, string[]>; name?: string; isPublic?: boolean;
}) {
  const { data } = await api.post<Configuration>('/configurations', body);
  return data;
}

export async function listConfigurations(params?: { productId?: string; isPublic?: string; page?: number; pageSize?: number }) {
  const { data } = await api.get<any>('/configurations', { params });
  return data;
}

export async function getConfiguration(id: string) {
  const { data } = await api.get<any>(`/configurations/${id}`);
  return data;
}

export async function getSharedConfiguration(shareToken: string) {
  const { data } = await api.get<any>(`/configurations/share/${shareToken}`);
  return data;
}

export async function updateConfiguration(id: string, body: any) {
  const { data } = await api.patch<any>(`/configurations/${id}`, body);
  return data;
}

export async function deleteConfiguration(id: string) {
  const { data } = await api.delete<any>(`/configurations/${id}`);
  return data;
}

// ---------------------------------------------------------------------------
// Quotes
// ---------------------------------------------------------------------------

export async function createQuote(body: {
  configurationId?: string; productId: string; quantity: number;
  customerName: string; customerEmail: string; customerPhone?: string; notes?: string;
  selections: Record<string, string[]>;
}) {
  const { data } = await api.post<Quote>('/quotes', body);
  return data;
}

export async function listQuotes(params?: { status?: string; productId?: string; page?: number; pageSize?: number }) {
  const { data } = await api.get<any>('/quotes', { params });
  return data;
}

export async function getQuote(id: string) {
  const { data } = await api.get<Quote>(`/quotes/${id}`);
  return data;
}

export async function updateQuoteStatus(id: string, status: 'draft' | 'sent' | 'approved' | 'rejected' | 'expired') {
  const { data } = await api.patch<any>(`/quotes/${id}/status`, { status });
  return data;
}
