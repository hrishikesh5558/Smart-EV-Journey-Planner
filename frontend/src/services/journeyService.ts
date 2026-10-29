import api from './api';
import type {
  Journey,
  JourneyAnalysisResult,
  DashboardStats,
  JourneyCalculateRequest,
  JourneyCalculateResponse,
  JourneySaveRequest,
} from '../types';

export const journeyService = {
  /** Stateless calculation – does not save to MongoDB */
  calculate: async (payload: JourneyCalculateRequest): Promise<JourneyCalculateResponse> => {
    const { data } = await api.post<JourneyCalculateResponse>('/journeys/calculate', payload);
    return data;
  },

  /** Calculate AND persist to MongoDB */
  save: async (payload: JourneySaveRequest): Promise<JourneyAnalysisResult> => {
    const { data } = await api.post<JourneyAnalysisResult>('/journeys/save', payload);
    return data;
  },

  /** Load authenticated user's journey history */
  list: async (vehicleId?: string): Promise<Journey[]> => {
    const params = vehicleId ? { vehicle_id: vehicleId } : {};
    const { data } = await api.get<Journey[]>('/journeys', { params });
    return data;
  },

  /** Load journey history (explicit /history alias) */
  history: async (): Promise<Journey[]> => {
    const { data } = await api.get<Journey[]>('/journeys/history');
    return data;
  },

  /** Get a single journey record */
  get: async (id: string): Promise<Journey> => {
    const { data } = await api.get<Journey>(`/journeys/${id}`);
    return data;
  },

  /** Delete a journey (only owner can delete) */
  delete: async (id: string): Promise<void> => {
    await api.delete(`/journeys/${id}`);
  },

  /** Dashboard summary stats */
  getStats: async (): Promise<DashboardStats> => {
    const { data } = await api.get<DashboardStats>('/journeys/stats/summary');
    return data;
  },
};
