import axiosClient from '../AxiosClient';
import { API_ENDPOINT } from '../ApiUrls';

export type GroCategory = 'Platinum' | 'Diamond' | 'Gold' | 'Silver' | 'Bronze';

export type GroMechanic = {
  customer_id: number;
  firm_name: string;
  contact_person: string;
  mobile: string;
  city: string;
  dealer: string;
  category: GroCategory;
  points: number; // 12 months ending last month
  redeemed: number; // 12 months ending last month
  scans: number; // 12 months ending last month
  active_months: number; // months with a scan, of 12
  monthly: number[]; // scans per month, oldest first
  this_month_points: number;
  this_month_scans: number;
};

export type GajraGroReport = {
  period: string;
  months: string[]; // 'Oct' ... 'Sep', oldest first
  synced_at: string | null;
  summary: {
    mechanics: number;
    points: number;
    redeemed: number;
    scans: number;
    this_month_points: number;
    this_month_scans: number;
    this_month_active: number;
    categories: { category: GroCategory; count: number }[];
  };
  rows: GroMechanic[];
};

// Gajra Gro mechanics among the logged-in user's team's customers
export const getGajraGroApi = () => axiosClient.get(API_ENDPOINT.GAJRA_GRO);
