export type Car = {
  id: number;
  model: string;
  plate_number: string;
  fuel_consumption?: number;
  maintenance_limit?: number;
  last_maintenance_mileage?: number;
};

export type AppEvent = {
  id: number;
  date: string;
  title: string;
  category: string;
  description: string;
};

export type Driver = {
  id: number;
  telegram_id: string;
  full_name: string;
  phone_number: string;
  is_approved: boolean;
  created_at: string;
  passport_series?: string;
  passport_number?: string;
  id_number?: string;
  passport_issue_date?: string;
  passport_issued_by?: string;
};

export type Shift = {
  id: number;
  driver_id: string;
  car_id: number;
  shift_start: string;
  shift_end: string;
  mileage: number;
  avg_fuel_consumption: number;
  revenue_disp_1: number;
  revenue_disp_2: number;
  special_notes: string;
  is_checked: boolean;
  created_at: string;
  driver_name?: string;
  car_name?: string;
};

export type PlannedShift = {
  id: number;
  car_id: number;
  driver_id: number;
  date: string;
  time_from?: string;
  time_to?: string;
};
