// ─────────────────────────────────────────────
// Core Types for Smart EV Frontend (MongoDB Compatible)
// Manual Input – No OCR
// ─────────────────────────────────────────────

export interface User {
  id: string;
  _id?: string;
  full_name: string;
  email: string;
  default_safety_reserve: number;
  preferred_unit: string;
  created_at: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
}

export interface Vehicle {
  id: string;
  _id?: string;
  user_id: string;
  nickname: string;
  manufacturer: string;
  model: string;
  model_year?: number;
  battery_capacity_kwh?: number;
  full_charge_range_km?: number;
  registration_identifier?: string;
  image_path?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface VehicleCreate {
  nickname: string;
  manufacturer: string;
  model: string;
  model_year?: number;
  battery_capacity_kwh?: number;
  full_charge_range_km?: number;
  registration_identifier?: string;
  notes?: string;
}

// ─── Journey / Range Calculation ───────────────

export interface JourneyCalculateRequest {
  current_battery_percentage?: number;
  estimated_remaining_range_km: number;
  planned_journey_distance_km: number;
  reserve_percentage?: number;
  driving_conditions?: string;
}

export interface JourneyCalculateResponse {
  current_battery_percentage?: number;
  estimated_remaining_range_km: number;
  planned_journey_distance_km: number;
  reserve_percentage: number;
  reserve_distance_km: number;
  usable_range_km: number;
  remaining_margin_km: number;
  is_sufficient: boolean;
  result_status: 'feasible' | 'low_reserve' | 'charging_recommended';
  recommendation: string;
  feasibility_label: string;
  color_class: 'green' | 'amber' | 'red';
  shortage_km?: number;
  disclaimer: string;
}

export interface JourneySaveRequest {
  // Vehicle info
  vehicle_id?: string;
  manufacturer?: string;
  model?: string;
  battery_capacity_kwh?: number;
  // Readings
  current_battery_percentage: number;
  estimated_remaining_range_km: number;
  // Journey
  starting_location?: string;
  destination?: string;
  journey_distance_km: number;
  reserve_percentage: number;
  notes?: string;
  driving_conditions?: string;
}

export interface Journey {
  id: string;
  _id?: string;
  user_id: string;
  // Vehicle
  vehicle_id?: string;
  manufacturer?: string;
  model?: string;
  battery_capacity_kwh?: number;
  // Readings
  current_battery_percentage?: number;
  battery_percentage_used?: number;    // legacy
  estimated_remaining_range_km?: number;
  current_remaining_range_km?: number; // legacy
  // Journey
  starting_location?: string;
  destination?: string;
  destination_name?: string;           // legacy
  journey_distance_km?: number;
  destination_distance_km?: number;    // legacy
  reserve_percentage?: number;
  safety_reserve_percent?: number;     // legacy
  reserve_distance_km?: number;
  usable_range_km?: number;
  remaining_margin_km?: number;
  notes?: string;
  driving_conditions?: string;
  // Result
  result_status: 'feasible' | 'low_reserve' | 'charging_recommended';
  recommendation: string;
  is_sufficient?: boolean;
  // Legacy
  required_range_km?: number;
  range_margin_km?: number;
  is_sample_mode: boolean;
  range_provenance: string;
  created_at: string;
}

export interface JourneyAnalysisResult {
  journey: Journey;
  surplus_km: number;
  shortage_km?: number;
  feasibility_label: string;
  color_class: 'green' | 'amber' | 'red';
}

export interface DashboardStats {
  user_name?: string;
  total_vehicles: number;
  total_journeys: number;
  feasible_journeys: number;
  charging_recommended_journeys: number;
  total_analyses?: number;
  recent_journeys: Journey[];
}

export interface ChargingStation {
  id: string;
  name: string;
  address: string;
  distance_from_route_km: number;
  connector_types: string[];
  max_power_kw: number;
  availability: string;
  is_demo: boolean;
  operator?: string;
}

export type ResultStatus = 'feasible' | 'low_reserve' | 'charging_recommended';
