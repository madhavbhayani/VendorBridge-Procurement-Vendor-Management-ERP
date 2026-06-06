import { ApiClient } from './client';
import Cookies from 'js-cookie';

export interface LoginResponse {
  code: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
}

export class AuthService {
  static async login(email: string, password: string): Promise<void> {
    // 1. Get the one-time login code
    const loginResp = await ApiClient.post<LoginResponse>('/api/auth/login', { email, password });
    
    // 2. Exchange the code for the JWT tokens
    const tokenResp = await ApiClient.post<TokenResponse>('/api/auth/assign-token', { code: loginResp.code });
    
    // 3. Store tokens in cookies
    // Access token valid for a short time, refresh token for longer
    Cookies.set('access_token', tokenResp.access_token, { expires: 1/24 }); // 1 hour approx
    Cookies.set('refresh_token', tokenResp.refresh_token, { expires: 7 }); // 7 days
  }

  static logout(): void {
    Cookies.remove('access_token');
    Cookies.remove('refresh_token');
    window.location.href = '/login';
  }

  static isAuthenticated(): boolean {
    return !!Cookies.get('access_token');
  }
}
