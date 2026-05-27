import React from 'react';
import { MapPin, BedDouble, Bath, Car } from 'lucide-react';

interface Property {
  id: string;
  title: string;
  price: number;
  location: string;
  beds: number;
  baths: number;
  parking: number;
  size: number;
  thumbnail?: string;
  type?: string;
}

interface PropertyCardProps {
  property: Property;
  onClick?: () => void;
}

const resolveImageUrl = (url?: string) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  const baseUrl = import.meta.env.VITE_API_URL || '';
  return baseUrl + url;
};

const getFallbackImage = (title: string, currentUrl: string) => {
  const lowerTitle = title ? title.toLowerCase() : '';
  const urlStr = currentUrl ? String(currentUrl) : '';
  
  if (!urlStr || urlStr.includes('placeholder') || urlStr.includes('test') || urlStr.includes('feia') || urlStr.length < 5) {
    if (lowerTitle.includes('fazenda') || lowerTitle.includes('sitio') || lowerTitle.includes('chacara') || lowerTitle.includes('rubao')) {
      return 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80';
    }
    if (lowerTitle.includes('casa') || lowerTitle.includes('mansao')) {
      return 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80';
    }
    return 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80';
  }
  return urlStr;
};

export function PropertyCard({ property, onClick }: PropertyCardProps) {
  const thumbnail = property.thumbnail || '';
  
  return (
    <div 
      className="group bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden hover:border-zinc-700 transition-all duration-300 cursor-pointer flex flex-col h-full"
      onClick={onClick}
    >
      <div className="relative h-56 overflow-hidden bg-zinc-950">
        <img 
          src={resolveImageUrl(getFallbackImage(property.title || '', thumbnail))}
          alt={property.title || ''}
          className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
          onError={(e) => { 
            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80';
          }}
        />
        <div className="absolute top-4 left-4 bg-zinc-900/80 backdrop-blur-md px-3 py-1 rounded-full text-xs font-medium text-emerald-400 border border-emerald-500/20">
          {property.type || 'Venda'}
        </div>
      </div>

      <div className="p-5 flex flex-col flex-grow">
        <div className="mb-4">
          <span className="text-2xl font-bold text-zinc-100">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(property.price)}
          </span>
        </div>

        <h3 className="text-lg font-semibold text-zinc-200 mb-2 line-clamp-1 group-hover:text-emerald-400 transition-colors">
          {property.title}
        </h3>

        <div className="flex items-center gap-1.5 text-zinc-400 text-sm mb-5">
          <MapPin size={16} className="text-zinc-500 shrink-0" />
          <span className="line-clamp-1">{property.location}</span>
        </div>

        <div className="grid grid-cols-4 gap-2 pt-4 border-t border-zinc-800 text-zinc-400 text-xs mt-auto">
          <div className="flex flex-col items-center gap-1 bg-zinc-950/40 p-2 rounded-xl border border-zinc-800/50">
            <span className="font-semibold text-zinc-200">{property.size}m²</span>
            <span className="text-[10px] text-zinc-500 uppercase">Área</span>
          </div>
          <div className="flex flex-col items-center gap-1 bg-zinc-950/40 p-2 rounded-xl border border-zinc-800/50">
            <div className="flex items-center gap-1 text-zinc-200">
              <BedDouble size={12} />
              <span className="font-semibold">{property.beds}</span>
            </div>
            <span className="text-[10px] text-zinc-500 uppercase">Dorm</span>
          </div>
          <div className="flex flex-col items-center gap-1 bg-zinc-950/40 p-2 rounded-xl border border-zinc-800/50">
            <div className="flex items-center gap-1 text-zinc-200">
              <Bath size={12} />
              <span className="font-semibold">{property.baths}</span>
            </div>
            <span className="text-[10px] text-zinc-500 uppercase">Suítes</span>
          </div>
          <div className="flex flex-col items-center gap-1 bg-zinc-950/40 p-2 rounded-xl border border-zinc-800/50">
            <div className="flex items-center gap-1 text-zinc-200">
              <Car size={12} />
              <span className="font-semibold">{property.parking}</span>
            </div>
            <span className="text-[10px] text-zinc-500 uppercase">Vagas</span>
          </div>
        </div>
      </div>
    </div>
  );
}