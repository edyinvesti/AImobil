/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const MAX_IMAGES = 10;
export const MAX_VIDEO_SIZE_MB = 15;
export const MAX_VIDEO_DURATION_SEC = 30;

export type PropertyType = 'Casa' | 'Apartamento' | 'Terreno' | 'Comercial' | 'Rural' | 'Chácara' | 'Fazenda';
export type OfferType = 'Venda' | 'Aluguel';
export type AreaUnit = 'm²' | 'Hectares' | 'Alqueires';
export type PropertyStatus = 'Disponível' | 'Vendido' | 'Reservado';
export type MarketingOption = 'none' | 'feed' | 'stories' | 'feed_stories' | 'feed_ads' | 'stories_ads' | 'feed_stories_ads';

export interface Property {
  id: string;
  title: string;
  type: PropertyType;
  offerType: OfferType;
  price: number;
  status: PropertyStatus;
  address: string;
  zipCode?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  streetNumber?: string;
  complement?: string;
  size: number;
  sizeUnit: AreaUnit;
  bedrooms: number;
  suites: number;
  livingRooms: number;
  kitchens: number;
  bathrooms: number;
  parkingSpaces: number;
  description: string;
  amenities: string[];
  images: string[];
  thumbnail?: string;
  videoData?: string;
  videoType?: string;
  video_url?: string;
  hasVideo?: boolean;
  latitude?: number;
  longitude?: number;
  brokerLogin?: string;
  createdAt: number;
  remoteId?: string;
  remoteStatus?: 'pending' | 'approved' | 'rejected' | 'unknown';
  marketingOption?: MarketingOption;
}

export interface UserProfile {
  name: string;
  login: string;
  photo: string;
  email: string;
  phone: string;
  telegramId?: string;
  password?: string;
}
