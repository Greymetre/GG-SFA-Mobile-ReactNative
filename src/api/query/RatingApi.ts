import axiosClient from '../AxiosClient';
import { API_ENDPOINT } from '../ApiUrls';

export type RatingKey = 'category' | 'orders' | 'activation' | 'visit';

export type AsmRating = {
  user_id: number;
  rank: number;
  name: string;
  employee_code: string;
  profile_image: string;
  zone: string;
  sub_zone: string;
  location: string;
  rating: number; // 0 to 2
  percent: number; // rating / 2
  ratings: Record<RatingKey, 0 | 1 | 2>;
  category: { achieved: number; target: number; pct: number };
  orders: { achieved: number; target: number; pct: number };
  activation: number;
  visit: number;
};

export type AsmRatingReport = {
  month: string;
  period: string;
  parameters: { key: RatingKey; title: string; rule: string; weight: number }[];
  count: number;
  average: number;
  top: AsmRating | null;
  sub_zone_top: (AsmRating & { group: string })[]; // best ASM of each sub zone; group = sub zone (or zone)
  rows: AsmRating[];
};

// ASM Performance rating of last month (the backend always picks last month)
export const getAsmRatingApi = () => axiosClient.get(API_ENDPOINT.ASM_RATING);

export type RatingDriver = {
  key: RatingKey;
  title: string;
  rule: string;
  value: number;
  unit: string; // '%' or '' for counts
  detail: string;
  weight: number;
  rating: 0 | 1 | 2;
  score: number; // weight x rating
  max_score: number; // weight x 2
};

export type AsmRatingDetail = {
  user_id: number;
  name: string;
  zone: string;
  sub_zone: string;
  location: string;
  // 6 months ending last month, oldest first
  months: { month: string; label: string; period: string; rating: number; percent: number; parameters: RatingDriver[] }[];
};

export const getAsmRatingDetailApi = (userId: number) =>
  axiosClient.get(`${API_ENDPOINT.ASM_RATING_DETAIL}${userId}`);
