export interface DemographicItem {
  key: string;
  label: string;
  percentage: number;
}

export interface CountryDemographic {
  code: string;
  name: string;
  views: number;
  percentage: number;
}

export interface DeviceDemographic {
  type: string;
  label: string;
  views: number;
  percentage: number;
}

export interface ChannelDemographics {
  start_date: string;
  end_date: string;
  age_groups: DemographicItem[];
  genders: DemographicItem[];
  countries: CountryDemographic[];
  devices: DeviceDemographic[];
  total_views?: number;
  has_data?: boolean;
  has_demographics?: boolean;
  youtube_channel_id?: string;
  youtube_channel_title?: string;
  google_email?: string;
  message?: string | null;
}

export interface YoutubeOAuthStatus {
  connected: boolean;
  google_email?: string;
  youtube_channel_id?: string;
  connected_at?: string;
}
