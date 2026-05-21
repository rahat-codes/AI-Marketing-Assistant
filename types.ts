

export enum AppView {
  HOME = 'HOME',
  CAMPAIGN_STEP_1 = 'CAMPAIGN_STEP_1',
  CAMPAIGN_STEP_2 = 'CAMPAIGN_STEP_2',
  CAMPAIGN_STEP_3 = 'CAMPAIGN_STEP_3',
  HISTORY = 'HISTORY',
  SETTINGS = 'SETTINGS',
  HELP = 'HELP',
  STUDIO = 'STUDIO'
}

export interface BusinessProfile {
  name: string;
  type: string;
  location: string;
  audience: string;
  description: string;
  tone: string;
  language: string;
}

export interface CampaignDetails {
  type: string;
  platforms: string[];
  keywords: string;
  startDate: string;
  endDate: string;
  length: number; // 0 (Short) to 100 (Long)
}

export interface GeneratedVariant {
  headline: string;
  postCopy: string;
  hashtags: string[];
  visualIdea: string;
  engagementTips: string[];
}

export interface SavedCampaign {
  id: string;
  title: string;
  date: string;
  createdTimestamp: number;
  type: string;
  platformIcon: string;
  variant?: GeneratedVariant;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}