/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type PropertyType = 'Casa' | 'Apartamento' | 'Terreno' | 'Comercial' | 'Rural' | 'Chácara' | 'Fazenda';
export type OfferType = 'Venda' | 'Aluguel';
export type AreaUnit = 'm²' | 'Hectares' | 'Alqueires';
export type PropertyStatus = 'Disponível' | 'Vendido' | 'Reservado';

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
  latitude?: number;
  longitude?: number;
  brokerCreci?: string;
  createdAt: number;
  remoteId?: string;
  remoteStatus?: 'pending' | 'approved' | 'rejected' | 'unknown';
}

export interface UserProfile {
  name: string;
  creci: string;
  photo: string;
  email: string;
  phone: string;
  telegramId?: string;
  password?: string;
}
