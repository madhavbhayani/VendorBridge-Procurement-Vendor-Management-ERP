import { ApiClient } from './client';

export interface Country {
  id: number;
  code: string;
  name: string;
}

export interface State {
  id: number;
  country_id: number;
  code: string;
  name: string;
}

export class LocationService {
  static async getCountries(): Promise<Country[]> {
    return ApiClient.get<Country[]>('/api/countries');
  }

  static async getStatesByCountry(countryId: number): Promise<State[]> {
    return ApiClient.get<State[]>(`/api/countries/${countryId}/states`);
  }
}
