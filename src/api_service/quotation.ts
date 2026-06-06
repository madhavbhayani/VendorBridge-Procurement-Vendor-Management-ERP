import { ApiClient } from './client';
import { RFQ } from './rfq';

export interface TaxRate {
  id: number;
  name: string;
  rate: number;
  is_active: boolean;
}

export interface QuotationItemPayload {
  rfq_item_id: number;
  unit_price: number;
  quantity: number;
  tax_rate_ids: number[];
  discount_pct: number;
  notes?: string;
}

export interface CreateQuotationPayload {
  rfq_id: number;
  delivery_days: number;
  validity_days: number;
  payment_terms?: string;
  currency: string;
  notes?: string;
  items: QuotationItemPayload[];
}

export interface QuotationItem {
  id: number;
  rfq_item_id: number;
  unit_price: number;
  quantity: number;
  tax_rate_ids?: number[];
  tax_rates?: TaxRate[];
  discount_pct: number;
  line_total: number;
  notes?: string;
  item_name?: string;
  item_description?: string;
}

export interface Quotation {
  id: number;
  quotation_number: string;
  rfq_id: number;
  vendor_id: number;
  status: string;
  delivery_days: number;
  validity_days: number;
  payment_terms?: string;
  currency: string;
  notes?: string;
  submitted_at: string;
  updated_at: string;
  rfq_number?: string;
  rfq_title?: string;
  vendor_name?: string;
  total_amount?: number;
  is_recommended?: boolean;
  approval_id?: number;
  approval_status?: string;
  items?: QuotationItem[];
}

export interface ApprovalRequest {
  id: number;
  quotation_id: number;
  requested_by: number;
  requested_by_name: string;
  assigned_to: number;
  status: string;
  remarks?: string;
  actioned_at?: string;
  created_at: string;
  updated_at: string;
  quotation?: Quotation;
}

export interface PurchaseOrderItem {
  id: number;
  po_id: number;
  quotation_item_id: number;
  item_name: string;
  quantity: number;
  unit_id: number;
  unit_price: number;
  tax_rate_id?: number;
  discount_pct: number;
  line_total: number;
}

export interface PurchaseOrder {
  id: number;
  po_number: string;
  quotation_id: number;
  vendor_id: number;
  vendor_name?: string;
  rfq_title?: string;
  created_by: number;
  status: string;
  currency: string;
  created_at: string;
  updated_at: string;
  items?: PurchaseOrderItem[];
}

export const QuotationService = {
  getVendorInvitations: async (): Promise<{ invitations: RFQ[] }> => {
    return ApiClient.get<{ invitations: RFQ[] }>('/api/vendor/invitations');
  },

  getVendorRFQ: async (id: number): Promise<RFQ> => {
    return ApiClient.get<RFQ>(`/api/vendor/rfqs/${id}`);
  },

  getTaxRates: async (): Promise<TaxRate[]> => {
    return ApiClient.get<TaxRate[]>('/api/tax-rates');
  },

  submitQuotation: async (formData: FormData): Promise<Quotation> => {
    return ApiClient.postFormData<Quotation>('/api/quotations', formData);
  },

  getVendorQuotations: async (): Promise<{ quotations: Quotation[] }> => {
    return ApiClient.get<{ quotations: Quotation[] }>('/api/vendor/quotations');
  },

  getAllQuotations: async (): Promise<{ quotations: Quotation[] }> => {
    return ApiClient.get<{ quotations: Quotation[] }>('/api/quotation-review');
  },

  getQuotation: async (id: number): Promise<Quotation> => {
    return ApiClient.get<Quotation>(`/api/quotation-review/${id}`);
  },

  requestApproval: async (id: number, remarks?: string): Promise<{ message: string }> => {
    return ApiClient.post<{ message: string }>(`/api/quotation-review/${id}/request-approval`, { remarks });
  },

  rejectQuotation: async (id: number, remarks?: string): Promise<{ message: string }> => {
    return ApiClient.post<{ message: string }>(`/api/quotation-review/${id}/reject`, { remarks });
  },

  getApprovals: async (): Promise<{ approvals: ApprovalRequest[] }> => {
    return ApiClient.get<{ approvals: ApprovalRequest[] }>('/api/approvals');
  },

  decideApproval: async (id: number, status: "approved" | "rejected", remarks?: string): Promise<{ message: string }> => {
    return ApiClient.post<{ message: string }>(`/api/approvals/${id}/decision`, { status, remarks });
  },

  getPurchaseOrders: async (): Promise<{ purchase_orders: PurchaseOrder[] }> => {
    return ApiClient.get<{ purchase_orders: PurchaseOrder[] }>('/api/purchase-orders');
  },
  getPurchaseOrder: async (id: number): Promise<PurchaseOrder> => { return ApiClient.get<PurchaseOrder>(`/api/purchase-orders/${id}`); } };
