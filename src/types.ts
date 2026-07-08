export interface AlertArea {
  name: string;
  stopWork: boolean;
  stopSchool: boolean;
}

export interface AlertInfo {
  language: string;
  event: string;
  effective: Date | null;
  expires: Date | null;
  headline: string;
  description: string;
  areas: AlertArea[];
}

export interface CapAlert {
  id: string;
  sender: string;
  sent: Date;
  status: string;
  msgType: string;
  info: AlertInfo[];
}

export interface DataState {
  alerts: CapAlert[];
  lastFetched: Date | null;
  latestDataTime: Date | null;
  nextRefreshAt: Date | null;
  loading: boolean;
  error: string | null;
}

export type RefreshInterval = 3 | 5 | 10 | 15 | 30 | 60;
