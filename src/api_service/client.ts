import Cookies from 'js-cookie';

const API_BASE_URL = ''; // Uses the /api rewrite from Next.js

export class ApiClient {
  static async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = Cookies.get('access_token');
    
    const headers = new Headers(options.headers);
    if (!(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const config: RequestInit = {
      ...options,
      headers,
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, { ...config, credentials: 'include' });

    if (!response.ok) {
      // If 401 Unauthorized, we could attempt to use the refresh token here.
      // For now, we simply throw the error.
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'API Request Failed');
    }

    return response.json();
  }

  static async post<T>(endpoint: string, body: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  static async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'GET',
    });
  }

  static async postFormData<T>(endpoint: string, formData: FormData): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: formData,
    });
  }

  static async putFormData<T>(endpoint: string, formData: FormData): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: formData,
    });
  }
}
