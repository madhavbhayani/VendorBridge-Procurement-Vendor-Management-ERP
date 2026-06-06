import { ApiClient } from './client';

export interface RFQItem {

  id?: number;
  rfq_id?: number;
  product_category_id?: number;
  item_name: string;
  description?: string;
  quantity: number;
  unit_id: number;
  estimated_unit_price?: number;
  specifications?: string;
  sort_order: number;
  part_number?: string; // Added optional part number
  is_approved?: boolean;
}

export interface RFQAttachment {
  id: number;
  rfq_id: number;
  file_name: string;
  file_url: string;
  file_size_bytes?: number;
  uploaded_by: number;
  uploaded_at: string;
}

export interface RFQVendorInvitation {
  rfq_id: number;
  vendor_id: number;
  invited_at: string;
  notified_at?: string;
}

export interface RFQ {
  id?: number;
  rfq_number?: string;
  title: string;
  description?: string;
  status: string;
  submission_deadline: string;
  delivery_deadline?: string;
  created_by?: number;
  closed_at?: string;
  created_at?: string;
  updated_at?: string;

  items?: RFQItem[];
  attachments?: RFQAttachment[];
  invitations?: RFQVendorInvitation[];
}

export interface RFQSearchResult {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  rfqs: RFQ[];
}

export class RFQService {
  static async createRFQ(formData: FormData): Promise<{ id: number; rfq_number: string; message: string }> {
    return ApiClient.postFormData<{ id: number; rfq_number: string; message: string }>('/api/rfqs', formData);
  }

  static async searchRFQs(query: string, status?: string, page: number = 1, limit: number = 20): Promise<RFQSearchResult> {
    const params = new URLSearchParams();
    if (query) params.append('q', query);
    if (status) params.append('status', status);
    
    const offset = (page - 1) * limit;
    params.append('limit', limit.toString());
    params.append('offset', offset.toString());

    return ApiClient.get<RFQSearchResult>(`/api/rfqs/search?${params.toString()}`);
  }

  static async getRFQ(id: number): Promise<RFQ> {
    return ApiClient.get<RFQ>(`/api/rfqs/${id}`);
  }

  static async updateRFQ(id: number, formData: FormData): Promise<{ message: string }> {
    const handleSubmit = async (e: any) => {
      e.preventDefault();
      try {
        const payload = {
          email: formData.get('email'),
          company_name: formData.get('companyName'),
        };
        await ApiClient.post('/api/auth/signup', payload);
      } catch (err: any) {
        console.error(err);
      }
    };
    return ApiClient.putFormData<{ message: string }>(`/api/rfqs/${id}`, formData);
  }

  static async deleteRFQ(id: number): Promise<{ message: string }> {
    return ApiClient.request<{ message: string }>(`/api/rfqs/${id}`, {
      method: 'DELETE',
    });
  }
}
