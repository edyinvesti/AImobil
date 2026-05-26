import React from 'react';
import { X, Bed, Square, Sofa, Utensils, Bath, MapPin, Calendar, Info, CheckCircle2, Car, Maximize2, Share2, Printer, Zap, Phone, Image } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Property, UserProfile } from '../types';
import { resolveImageUrl, getApiUrl } from '../utils';

interface PropertyDetailsProps {
    property: Property;
    profile: UserProfile;
    onClose: () => void;
}

export const PropertyDetails: React.FC<PropertyDetailsProps> = ({ property: initialProperty, profile, onClose }) => {
    const [property, setProperty] = React.useState(initialProperty);
    const [zoomedImage, setZoomedImage] = React.useState<string | null>(null);
    const [isPublishing, setIsPublishing] = React.useState(false);
    const [loadingImages, setLoadingImages] = React.useState(true);

    React.useEffect(() => {
      let cancelled = false;
      console.log(`[PropertyDetails] Fetching images for property ID: ${initialProperty.id}`);
      setLoadingImages(true);
      
      // Add explicit check for ID
      if (!initialProperty.id) {
        console.error('[PropertyDetails] Property ID is missing!');
        setLoadingImages(false);
        return;
      }

      fetch(`${getApiUrl()}/api/partner/property-image?id=${initialProperty.id}`)
        .then(r => {
          console.log(`[PropertyDetails] Image fetch status: ${r.status}`);
          if (!r.ok) {
            throw new Error(`HTTP ${r.status}: ${r.statusText}`);
          }
          return r.json();
        })
        .then(d => {
          console.log(`[PropertyDetails] Image fetch response:`, d);
          if (!cancelled) {
            if (d.success && d.images?.length > 0) {
              console.log(`[PropertyDetails] Setting ${d.images.length} images`);
              setProperty(prev => ({ ...prev, images: d.images }));
            } else {
              console.warn('[PropertyDetails] No images in response:', d);
            }
            setLoadingImages(false);
          }
        })
        .catch(err => {
          if (!cancelled) {
            console.error('[PropertyDetails] Error fetching images:', err);
            setLoadingImages(false);
          }
        });
      
      return () => { cancelled = true; };
    }, [initialProperty.id]);

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price);
    };

    const handleWhatsAppShare = () => {
        const text = `🏠 *${property.title}*\n📍 ${property.address}\n💰 *Valor:* ${formatPrice(property.price)}\n\nConfira mais detalhes deste imóvel incrível!\n\n_Enviado via IAmobil_`;
        const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-0 lg:p-4 bg-black/80 backdrop-blur-xl"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="glass rounded-none lg:rounded-[4rem] w-full max-w-6xl h-full lg:max-h-[90vh] overflow-hidden flex flex-col md:flex-row border-white/5 shadow-[0_0_100px_rgba(0,0,0,0.5)]"
                onClick={e => e.stopPropagation()}
            >
                {/* Visual Section */}
                <div className="md:w-1/2 relative bg-black print:hidden">
                    {loadingImages ? (
                        <div className="w-full h-full bg-white/5 flex flex-col items-center justify-center text-white/10 gap-4">
                            <Image size={48} className="animate-pulse" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Carregando...</span>
                        </div>
                    ) : property.images.length > 0 ? (
                        <div className="flex h-[40vh] md:h-full overflow-x-auto snap-x snap-mandatory scrollbar-hide">
                            {property.images.map((img, i) => (
                                <div key={i} className="relative h-full w-full flex-shrink-0 snap-center group cursor-zoom-in" onClick={() => setZoomedImage(resolveImageUrl(img))}>
                                    <img src={resolveImageUrl(img)} className="h-full w-full object-cover" alt="" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="w-full h-full bg-white/5 flex flex-col items-center justify-center text-white/10 gap-4">
                            <MapPin size={48} />
                            <span className="text-[10px] font-black uppercase tracking-widest">Sem Mídia Disponível</span>
                        </div>
                    )}
                    
                    <button onClick={onClose} className="absolute top-8 right-8 p-4 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all backdrop-blur-md">
                        <X size={20} />
                    </button>

                    <div className="absolute bottom-8 left-8 right-8 flex justify-between items-end">
                        <div className="flex flex-col gap-2">
                             <div className="px-4 py-2 bg-white/10 backdrop-blur-md border border-white/10 rounded-full text-[10px] font-black uppercase text-white inline-block">
                                {property.type} • {property.offerType}
                             </div>
                             {property.remoteId && (
                                <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500 rounded-full text-[9px] font-black uppercase text-white">
                                    <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                    Conectado ao Hub
                                </div>
                             )}
                        </div>
                    </div>
                </div>

                {/* Content Section */}
                <div className="flex-1 overflow-y-auto p-8 lg:p-16 space-y-12 bg-[#0a0a0a] text-white">
                    <header className="space-y-6">
                        <div className="flex justify-between items-start">
                             <span className="text-[10px] font-black uppercase text-orange-500 tracking-[0.4em]">Detalhes do Ativo</span>
                             <div className="flex gap-4 print:hidden">
                                <button onClick={handleWhatsAppShare} className="p-4 bg-emerald-500 text-white rounded-2xl hover:scale-110 active:scale-95 transition-all shadow-lg shadow-emerald-500/20">
                                    <Phone size={18} />
                                </button>
                                <button onClick={handlePrint} className="p-4 bg-white/5 text-gray-400 rounded-2xl hover:text-white hover:bg-white/10 transition-all border border-white/5">
                                    <Printer size={18} />
                                </button>
                             </div>
                        </div>
                        <h1 className="text-3xl lg:text-5xl font-black leading-tight tracking-tight">{property.title}</h1>
                        <p className="text-gray-500 text-lg lg:text-xl flex items-center gap-3">
                            <MapPin size={20} className="text-orange-500" />
                            {property.address}
                        </p>
                    </header>

                    {/* Stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 print:grid-cols-6">
                        {[
                          { label: 'm²', icon: Square, val: property.size },
                          { label: 'Dorm', icon: Bed, val: property.bedrooms },
                          { label: 'Suíte', icon: Bath, val: property.suites },
                          { label: 'Salas', icon: Sofa, val: property.livingRooms },
                          { label: 'Cozinhas', icon: Utensils, val: property.kitchens },
                          { label: 'Vagas', icon: Car, val: property.parkingSpaces },
                        ].map((item, idx) => (
                           <div key={idx} className="glass p-5 rounded-[2rem] flex flex-col items-center gap-2 border-white/5">
                              <item.icon size={16} className="text-orange-500/50" />
                              <span className="text-[8px] font-black uppercase text-gray-600 tracking-widest">{item.label}</span>
                              <span className="text-lg font-bold">{item.val || 0}</span>
                           </div>
                        ))}
                    </div>

                    <div className="space-y-6">
                        <h3 className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Descrição Certificada</h3>
                        <p className="text-gray-400 text-lg leading-relaxed font-medium opacity-80 whitespace-pre-line">
                            {property.description || "Nenhum detalhe adicional informado."}
                        </p>
                    </div>

                    <div className="pt-12 border-t border-white/5 flex flex-col lg:flex-row justify-between items-end gap-10">
                        <div className="flex flex-col">
                             <span className="text-[10px] font-black uppercase text-orange-500 tracking-tighter mb-2">Valentia Comercial</span>
                             <span className="text-5xl lg:text-7xl font-black tracking-tighter">{formatPrice(property.price)}</span>
                             <p className="text-gray-600 text-[10px] font-bold uppercase tracking-widest mt-2">
                                {property.offerType === 'Aluguel' ? 'Taxa Mensal' : 'Ativo para Aquisição'}
                             </p>
                        </div>
                        
                        <button 
                            disabled={isPublishing || Boolean(property.remoteId && property.remoteStatus === 'approved')}
                            className="group relative px-10 py-5 bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-3xl font-black uppercase text-xs tracking-widest hover:shadow-2xl hover:shadow-orange-500/30 hover:-translate-y-1 transition-all shadow-xl active:scale-95 disabled:opacity-50 print:hidden"
                        >
                            {isPublishing ? "Transmitindo..." : "Transmitir para Rede IAmobil"}
                        </button>
                    </div>
                </div>
            </motion.div>

            {/* Lightbox */}
            <AnimatePresence>
                {zoomedImage && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-4"
                        onClick={() => setZoomedImage(null)}
                    >
                        <motion.img
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            src={zoomedImage}
                            className="max-w-full max-h-full object-contain rounded-3xl shadow-2xl"
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};
