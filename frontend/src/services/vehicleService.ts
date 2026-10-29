import api from './api';
import type { Vehicle, VehicleCreate } from '../types';

export const vehicleService = {
  list: async (): Promise<Vehicle[]> => {
    const { data } = await api.get<Vehicle[]>('/vehicles');
    return data;
  },

  create: async (payload: VehicleCreate): Promise<Vehicle> => {
    const { data } = await api.post<Vehicle>('/vehicles', payload);
    return data;
  },

  get: async (id: string): Promise<Vehicle> => {
    const { data } = await api.get<Vehicle>(`/vehicles/${id}`);
    return data;
  },

  update: async (id: string, payload: Partial<VehicleCreate>): Promise<Vehicle> => {
    const { data } = await api.put<Vehicle>(`/vehicles/${id}`, payload);
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/vehicles/${id}`);
  },
};
