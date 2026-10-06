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
  target?: GroTarget | null;
};

// Logged-in user's own mechanic target (current financial year) and achievement per category
export type GroTarget = {
  has_target: boolean;
  financial_year: string; // 'FY 2026-27'
  period: string; // 12 months the categories are counted on
  target: number;
  achieved: number;
  percent: number | null;
  categories: { category: GroCategory; target: number; achieved: number }[];
};

// Gajra Gro mechanics among the logged-in user's team's customers
export const getGajraGroApi = () => axiosClient.get(API_ENDPOINT.GAJRA_GRO);

export type GroSchemeStatus = 'Running' | 'Upcoming' | 'Expired';

// A Gajra Gro loyalty scheme (live from Gajra Gro)
export type GroScheme = {
  id: string;
  name: string;
  description: string;
  image: string; // full URL, '' when none
  type: string; // 'Coupon Scan' ...
  audience: 'Mechanic' | 'Retailer' | ''; // from the scheme name
  startedAt: string | null;
  endedAt: string | null;
  status: GroSchemeStatus;
};

export type GroRedemptionPeriod = 'month' | '3m' | '12m';

// A team mechanic's Gajra Gro points redeemed in the period
export type GroRedemption = {
  customer_id: number;
  firm_name: string;
  contact_person: string;
  mobile: string;
  city: string;
  dealer: string;
  category: GroCategory | null;
  redeemed: number;
  earned: number;
  last_redeemed_month: string; // 'Sep 2026'
};

export type GroRedemptionPage = {
  period: GroRedemptionPeriod;
  period_label: string;
  page: number;
  total: number;
  has_more: boolean;
  synced_at: string | null;
  summary: { mechanics: number; redeemed: number; earned: number };
  rows: GroRedemption[];
};

// Running / upcoming / recently expired Gajra Gro schemes
export const getGajraGroSchemesApi = () => axiosClient.get(API_ENDPOINT.GAJRA_GRO_SCHEMES);

// Gajra Gro points redeemed by the user's team's mechanics, most redeemed first
export const getGajraGroRedemptionsApi = (params: { page?: number; period?: GroRedemptionPeriod; search?: string }) =>
  axiosClient.get(API_ENDPOINT.GAJRA_GRO_REDEMPTIONS, { params });
