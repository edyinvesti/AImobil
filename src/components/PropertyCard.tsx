
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
      className="group bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden hover:border-zinc-700 transition-all duration-300 cursor-pointer flex flex-col"
      onClick={onClick}
    >
      <div className="relative h-36 sm:h-40 overflow-hidden bg-zinc-950">
        <img 
          src={resolveImageUrl(getFallbackImage(property.title || '', thumbnail))}
          alt={property.title || ''}
          className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
          onError={(e) => { 
            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80';
          }}
        />
        <div className="absolute top-2 left-2 bg-zinc-900/80 backdrop-blur-md px-2 py-0.5 rounded-full text-[10px] font-medium text-emerald-400 border border-emerald-500/20">
          {property.type || 'Venda'}
        </div>
        {campaignActive && (
          <div className="absolute top-2 right-2 bg-gradient-to-r from-blue-600/90 to-violet-600/90 backdrop-blur-md px-2 py-0.5 rounded-full text-[9px] font-bold text-white flex items-center gap-1 border border-white/10 shadow-lg shadow-blue-600/20">
            <Megaphone size={9} />
            Marketing
          </div>
        )}
        {onDelete && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDelete(property.id); }}
            className="absolute bottom-2 right-2 w-7 h-7 bg-red-500/80 hover:bg-red-500 rounded-lg flex items-center justify-center text-white transition-all shadow-lg"
            title="Excluir imóvel"
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>

      <div className="p-3 sm:p-4 flex flex-col flex-grow">
        <span className="text-lg sm:text-xl font-bold text-zinc-100 mb-1">
          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(property.price)}
        </span>

        <h3 className="text-sm font-semibold text-zinc-200 mb-1 line-clamp-1 group-hover:text-emerald-400 transition-colors">
          {property.title}
        </h3>

        <div className="flex items-center gap-1 text-zinc-400 text-xs mb-3">
          <MapPin size={12} className="text-zinc-500 shrink-0" />
          <span className="line-clamp-1">{property.address || property.title}</span>
        </div>

        <div className="grid grid-cols-4 gap-1.5 pt-3 border-t border-zinc-800 text-zinc-400 text-[11px] mt-auto">
          <div className="flex flex-col items-center gap-0.5 bg-zinc-950/40 py-1.5 rounded-lg border border-zinc-800/50">
            <span className="font-semibold text-zinc-200 text-xs">{property.size}{property.sizeUnit === 'Hectares' ? ' ha' : 'm²'}</span>
            <span className="text-[9px] text-zinc-500 uppercase">Área</span>
          </div>
          <div className="flex flex-col items-center gap-0.5 bg-zinc-950/40 py-1.5 rounded-lg border border-zinc-800/50">
            <div className="flex items-center gap-0.5 text-zinc-200 text-xs">
              <BedDouble size={10} />
              <span className="font-semibold">{property.bedrooms}</span>
            </div>
            <span className="text-[9px] text-zinc-500 uppercase">Dorm</span>
          </div>
          <div className="flex flex-col items-center gap-0.5 bg-zinc-950/40 py-1.5 rounded-lg border border-zinc-800/50">
            <div className="flex items-center gap-0.5 text-zinc-200 text-xs">
              <Bath size={10} />
              <span className="font-semibold">{property.suites}</span>
            </div>
            <span className="text-[9px] text-zinc-500 uppercase">Suítes</span>
          </div>
          <div className="flex flex-col items-center gap-0.5 bg-zinc-950/40 py-1.5 rounded-lg border border-zinc-800/50">
            <div className="flex items-center gap-0.5 text-zinc-200 text-xs">
              <Car size={10} />
              <span className="font-semibold">{property.parkingSpaces}</span>
            </div>
            <span className="text-[9px] text-zinc-500 uppercase">Vagas</span>
          </div>
        </div>
      </div>
    </div>
  );
}
