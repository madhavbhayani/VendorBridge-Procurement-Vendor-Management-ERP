import { ApiClient } from './client';

export interface VendorCategory {
  id: number;
  name: string;
  description: string;
}

export interface VendorAddress {
  id?: number;
  vendor_id?: number;
  address_type: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state_id?: number;
  state_name?: string;
  pincode: string;
  country_id: number;
  country_name?: string;
}

export interface VendorBankDetail {
  id?: number;
  vendor_id?: number;
  account_holder_name: string;
  account_number: string;
  bank_name: string;
  branch_name?: string;
  ifsc_code?: string;
  swift_code?: string;
  is_primary: boolean;
}

export interface Vendor {
  id?: number;
  user_id?: number;
  company_name: string;
  trade_name?: string;
  gst_number?: string;
  pan_number?: string;
  email: string;
  phone: string;
  alternate_phone?: string;
  website?: string;
  status: string;
  rating?: number;
  notes?: string;
  category_ids?: number[];
  addresses?: VendorAddress[];
  bank_details?: VendorBankDetail[];
}

export interface VendorSummary {
  id: number;
  company_name: string;
  gst_number?: string;
  phone: string;
  status: string;
  categories: string[];
}

export interface VendorSearchResult {
  total: number;
  vendors: VendorSummary[];
  page?: number;
  total_pages?: number;
}

export class VendorService {
  static async getCategories(): Promise<VendorCategory[]> {
    return ApiClient.get<VendorCategory[]>('/api/vendor-categories');
  }

  static async listVendors(page: number = 1, limit: number = 20): Promise<VendorSearchResult> {
    return ApiClient.get<VendorSearchResult>(`/api/vendors?page=${page}&limit=${limit}`);
  }

  static async searchVendors(query: string, categoryId?: number, status?: string, page: number = 1, limit: number = 20): Promise<VendorSearchResult> {
    const params = new URLSearchParams();
    if (query) params.append('q', query);
    if (categoryId) params.append('category', categoryId.toString());
    if (status) params.append('status', status);
    
    const offset = (page - 1) * limit;
    params.append('limit', limit.toString());
    params.append('offset', offset.toString());

    return ApiClient.get<VendorSearchResult>(`/api/vendors/search?${params.toString()}`);
  }

  static async getVendor(id: number): Promise<Vendor & { categories: VendorCategory[] }> {
    return ApiClient.get<Vendor & { categories: VendorCategory[] }>(`/api/vendors/${id}`);
  }

  static async deleteVendor(id: number): Promise<{ message: string }> {
    return ApiClient.request<{ message: string }>(`/api/vendors/${id}`, {
      method: 'DELETE',
    });
  }

  static async createVendor(vendor: Vendor): Promise<{ message: string; vendor_id: number; user_id: number }> {
    return ApiClient.post<{ message: string; vendor_id: number; user_id: number }>('/api/vendors', vendor);
  }

  static async updateVendor(id: number, vendor: Partial<Vendor>): Promise<{ message: string; vendor_id: number }> {
    return ApiClient.request<{ message: string; vendor_id: number }>(`/api/vendors/${id}`, {
      method: 'PUT',
      body: JSON.stringify(vendor),
    });
  }
}
