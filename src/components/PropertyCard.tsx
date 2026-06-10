
import { MapPin, BedDouble, Bath, Car, Megaphone, Trash2 } from 'lucide-react';
import { Property } from '../types';

interface PropertyCardProps {
  property: Property;
  onClick?: () => void;
  onEdit?: (property: Property) => void;
  onDelete?: (id: string) => void;
  campaignActive?: boolean;
}

const resolveImageUrl = (url?: string) => {
  if (!url) return '';
  if (url.startsWith('http') || url.startsWith('data:')) return url;
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

export function PropertyCard({ property, onClick, onDelete, campaignActive }: PropertyCardProps) {
  const thumbnail = property.thumbnail || '';
  
  return (
    <div 
      className="group bg-zinc-900/30 border border-zinc-800/60 rounded-xl overflow-hidden hover:border-zinc-600/60 transition-all duration-300 cursor-pointer"
      onClick={onClick}
    >
      <div className="relative h-28 overflow-hidden bg-zinc-950">
        <img 
          src={resolveImageUrl(getFallbackImage(property.title || '', thumbnail))}
          alt={property.title || ''}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          onError={(e) => { 
            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80';
          }}
        />
        <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-sm px-2 py-0.5 rounded-md text-[9px] font-semibold text-emerald-400 border border-emerald-500/20 leading-tight max-w-[60%] truncate">
          {property.type || 'Venda'}
        </div>
        {campaignActive && (
          <div className="absolute top-2 right-2 bg-gradient-to-r from-blue-600/90 to-violet-600/90 backdrop-blur-sm px-1.5 py-0.5 rounded-md text-[8px] font-bold text-white flex items-center gap-0.5 border border-white/10">
            <Megaphone size={8} />
            Marketing
          </div>
        )}
        {onDelete && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDelete(property.id); }}
            className="absolute bottom-1.5 right-1.5 w-6 h-6 bg-red-500/80 hover:bg-red-500 rounded-md flex items-center justify-center text-white transition-all"
            title="Excluir imóvel"
          >
            <Trash2 size={10} />
          </button>
        )}
      </div>

      <div className="p-2.5 space-y-1.5">
        <div className="flex items-center justify-between gap-1">
          <span className="text-sm font-bold text-zinc-100 truncate">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(property.price)}
          </span>
          <span className="text-[9px] text-zinc-500 font-medium uppercase whitespace-nowrap shrink-0">
            {property.status || 'Disponível'}
          </span>
        </div>

        <h3 className="text-xs font-semibold text-zinc-300 line-clamp-1 group-hover:text-emerald-400 transition-colors">
          {property.title}
        </h3>

        <div className="flex items-center gap-1 text-zinc-500 text-[10px]">
          <MapPin size={10} className="shrink-0" />
          <span className="line-clamp-1">{property.address || property.title}</span>
        </div>

        <div className="flex items-center gap-3 pt-1.5 border-t border-zinc-800/60 text-zinc-400">
          <span className="text-[10px] font-medium text-zinc-300">{property.size}{property.sizeUnit === 'Hectares' ? ' ha' : 'm²'}</span>
          <span className="text-zinc-700">|</span>
          <BedDouble size={10} className="shrink-0" />
          <span className="text-[10px]">{property.bedrooms}</span>
          <Bath size={10} className="shrink-0" />
          <span className="text-[10px]">{property.suites}</span>
          <Car size={10} className="shrink-0" />
          <span className="text-[10px]">{property.parkingSpaces}</span>
        </div>
      </div>
    </div>
  );
}
