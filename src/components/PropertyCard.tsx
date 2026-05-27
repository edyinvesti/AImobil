import React, { useState, useEffect } from 'react';
import { MapPin, Trash2, Edit2, Square, Bed, ArrowRight, RefreshCw } from 'lucide-react';
import { Property } from '../types';
import { resolveImageUrl, getApiUrl } from '../utils';

interface PropertyCardProps {
  property: Property;
  onClick: () => void;
  onDelete: (id: string) => void;
  onEdit: (property: Property) => void;
}

export const PropertyCard: React.FC<PropertyCardProps> = ({ property, onClick, onDelete, onEdit }) => {
  // Use the thumbnail from property data, or fall back to first image
  const [thumbnail, setThumbnail] = useState<string | null>(property.thumbnail || (property.images && property.images.length > 0 ? property.images[0] : null));

  useEffect(() => {
    if (property.thumbnail || (property.images && property.images.length > 0)) {
      setThumbnail(property.thumbnail || (property.images ? property.images[0] : null));
      return;
    }

    let isMounted = true;
    if (!thumbnail && property.id && !property.id.includes('prop_migrated')) {
      const targetId = property.remoteId || property.id;
      fetch(`${getApiUrl()}/api/partner/property-image?id=${targetId}`)
        .then(res => res.json())
        .then(data => {
          if (isMounted && data.success && data.images && data.images.length > 0) {
            setThumbnail(data.images[0]);
          }
        })
        .catch(err => console.error("Erro ao carregar imagem sob demanda:", err));
    }
    
    return () => { isMounted = false; };
  }, [property.id, property.remoteId, property.thumbnail, property.images, thumbnail]);

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(price);

  return (
    <div 
      className="group relative bg-[#0d0d0d] border border-white/10 rounded-[2.5rem] overflow-hidden hover:border-orange-500/50 transition-all duration-500 hover:shadow-[0_20px_50px_rgba(0,0,0,0.5)] cursor-pointer flex flex-col"
      onClick={onClick}
    >
       {/* Glossy Image Container */}
       <div className="relative h-56 overflow-hidden">
         {thumbnail ? (
           <img 
             src={resolveImageUrl(getFallbackImage(property.title, thumbnail))}
             alt={property.title}
             className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
             onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
           />
         ) : (
           <div className="w-full h-full bg-white/5 flex items-center justify-center">
             <MapPin className="text-gray-800" size={32} />
           </div>
         )}
        
        {/* Gradients and Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0d0d0d] via-transparent to-black/20 opacity-80" />
        <div className="absolute inset-0 bg-orange-500/0 group-hover:bg-orange-500/5 transition-colors duration-500" />
        
        {/* Badges */}
        <div className="absolute top-5 left-5 flex gap-2">
            <span className="px-4 py-1.5 bg-black/60 backdrop-blur-md border border-white/10 rounded-full text-[8px] font-black uppercase text-white tracking-widest">
                {property.type}
            </span>
            {property.remoteId ? (
                <span className="px-4 py-1.5 bg-orange-500 text-white border border-orange-400 rounded-full text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-lg shadow-orange-500/20">
                    <div className="w-1 h-1 rounded-full bg-white animate-pulse" />
                    Hub
                </span>
            ) : (
                <span className="px-4 py-1.5 bg-white/10 text-gray-400 border border-white/5 rounded-full text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5 backdrop-blur-md">
                    <RefreshCw size={8} className="animate-spin" />
                    Local (Syncing...)
                </span>
            )}
        </div>

        {/* Price Floating Overlay */}
        <div className="absolute bottom-5 left-5">
           <p className="text-2xl font-black text-white tracking-tighter drop-shadow-lg">
             {formatPrice(property.price)}
           </p>
        </div>
      </div>

      {/* Content Section */}
      <div className="p-6 md:p-8 space-y-5 flex-1 flex flex-col">
        <div className="space-y-1">
          <h3 className="text-lg font-black text-white leading-tight truncate group-hover:text-orange-500 transition-colors uppercase tracking-tighter">
            {property.title}
          </h3>
          <p className="text-gray-500 text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 truncate">
            <MapPin size={10} className="text-orange-500" /> {property.address}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-gray-500">
          <div className="flex items-center gap-2">
            <Square size={12} className="text-orange-500/40" />
            <span className="text-[10px] font-black text-gray-400">{property.size}m²</span>
          </div>
          <div className="flex items-center gap-2">
            <Bed size={12} className="text-orange-500/40" />
            <span className="text-[10px] font-black text-gray-400">{property.bedrooms} Dorm</span>
          </div>
          {property.suites > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-orange-500/60">{property.suites} S</span>
            </div>
          )}
          {property.parkingSpaces > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-orange-500/60">{property.parkingSpaces} V</span>
            </div>
          )}
        </div>

        <div className="mt-auto pt-6 border-t border-white/5 flex justify-between items-center">
          <div className="flex gap-2">
            <button 
              onClick={(e) => { e.stopPropagation(); onEdit(property); }}
              className="p-3 bg-white/5 hover:bg-orange-500/10 text-gray-600 hover:text-orange-500 rounded-2xl transition-all border border-transparent hover:border-orange-500/20"
            >
              <Edit2 size={14} />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onDelete(property.id); }}
              className="p-3 bg-white/5 hover:bg-red-500/10 text-gray-600 hover:text-red-500 rounded-2xl transition-all border border-transparent hover:border-red-500/20"
            >
              <Trash2 size={14} />
            </button>
          </div>
          
          <div className="flex items-center gap-2 text-[10px] font-black text-orange-500 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
            Detalhes <ArrowRight size={14} />
          </div>
        </div>
      </div>
    </div>
  );
};

