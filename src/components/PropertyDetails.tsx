import React from 'react';
import { X, Bed, Square, Sofa, Utensils, Bath, MapPin, Car, Phone, Printer, Image, ChevronLeft, ChevronRight } from 'lucide-react';
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
    const [currentImageIndex, setCurrentImageIndex] = React.useState(0);

    React.useEffect(() => {
        let cancelled = false;
        setLoadingImages(true);

        if (!initialProperty.id) {
            setLoadingImages(false);
            return;
        }

        fetch(`${getApiUrl()}/api/partner/property-image?id=${initialProperty.id}`)
            .then(r => {
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                return r.json();
            })
            .then(d => {
                if (!cancelled) {
                    if (d.success && d.images?.length > 0) {
                        setProperty(prev => ({ ...prev, images: d.images }));
                    }
                    setLoadingImages(false);
                }
            })
            .catch(() => {
                if (!cancelled) setLoadingImages(false);
            });

        return () => { cancelled = true; };
    }, [initialProperty.id]);

    const formatPrice = (price: number) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price);

    const handleWhatsAppShare = () => {
        const text = `🏠 *${property.title}*\n📍 ${property.address}\n💰 *Valor:* ${formatPrice(property.price)}\n\nConfira mais detalhes!\n\n_Enviado via IAmobil_`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    };

    const prevImg = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrentImageIndex(i => (i - 1 + property.images.length) % property.images.length);
    };
    const nextImg = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrentImageIndex(i => (i + 1) % property.images.length);
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/80 backdrop-blur-xl overflow-hidden"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 40 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 40 }}
                className="glass w-full max-w-5xl max-h-[95dvh] overflow-hidden flex flex-col md:flex-row rounded-t-[2.5rem] md:rounded-[2.5rem] border border-white/5 shadow-2xl mx-0 md:mx-4"
                onClick={e => e.stopPropagation()}
            >
                {/* --- Seção de Imagens --- */}
                <div className="relative flex-shrink-0 w-full md:w-[45%] h-56 md:h-auto bg-black overflow-hidden print:hidden">
                    {loadingImages ? (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-white/20">
                            <Image size={40} className="animate-pulse" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Carregando...</span>
                        </div>
                    ) : property.images.length > 0 ? (
                        <div className="relative w-full h-full group">
                            <AnimatePresence mode="wait">
                                <motion.img
                                    key={currentImageIndex}
                                    initial={{ opacity: 0, scale: 1.05 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.3 }}
                                    src={resolveImageUrl(property.images[currentImageIndex])}
                                    className="absolute inset-0 w-full h-full object-cover cursor-zoom-in"
                                    onClick={() => setZoomedImage(resolveImageUrl(property.images[currentImageIndex]))}
                                    alt={property.title}
                                />
                            </AnimatePresence>
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 pointer-events-none" />

                            {property.images.length > 1 && (
                                <>
                                    <button onClick={prevImg} className="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 bg-black/50 hover:bg-black/80 text-white rounded-full backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all border border-white/10 active:scale-95">
                                        <ChevronLeft size={20} />
                                    </button>
                                    <button onClick={nextImg} className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 bg-black/50 hover:bg-black/80 text-white rounded-full backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all border border-white/10 active:scale-95">
                                        <ChevronRight size={20} />
                                    </button>
                                    <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5">
                                        {property.images.map((_, idx) => (
                                            <button key={idx} onClick={e => { e.stopPropagation(); setCurrentImageIndex(idx); }}
                                                className={`w-1.5 h-1.5 rounded-full transition-all ${idx === currentImageIndex ? 'bg-white scale-125' : 'bg-white/30'}`}
                                            />
                                        ))}
                                    </div>
                                </>
                            )}

                            {/* Tipo do imóvel */}
                            <div className="absolute bottom-8 left-4">
                                <span className="px-3 py-1.5 bg-white/10 backdrop-blur-md border border-white/10 rounded-full text-[9px] font-black uppercase text-white">
                                    {property.type}{property.offerType ? ` • ${property.offerType}` : ''}
                                </span>
                            </div>
                        </div>
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-white/20">
                            <MapPin size={40} />
                            <span className="text-[10px] font-black uppercase tracking-widest">Sem Mídia Disponível</span>
                        </div>
                    )}

                    {/* Botão fechar */}
                    <button onClick={onClose} className="absolute top-4 right-4 p-3 bg-black/40 hover:bg-black/70 rounded-full text-white transition-all backdrop-blur-md border border-white/10 active:scale-95">
                        <X size={18} />
                    </button>
                </div>

                {/* --- Seção de Conteúdo --- */}
                <div className="flex-1 min-w-0 overflow-y-auto p-6 md:p-10 space-y-8 bg-[#0a0a0a] text-white">
                    {/* Cabeçalho */}
                    <header className="space-y-3">
                        <div className="flex items-start justify-between gap-4">
                            <span className="text-[10px] font-black uppercase text-orange-500 tracking-[0.3em]">Detalhes do Ativo</span>
                            <div className="flex gap-3 print:hidden flex-shrink-0">
                                <button onClick={handleWhatsAppShare} className="p-3 bg-emerald-500 text-white rounded-xl hover:scale-110 active:scale-95 transition-all">
                                    <Phone size={16} />
                                </button>
                                <button onClick={() => window.print()} className="p-3 bg-white/5 text-gray-400 rounded-xl hover:text-white hover:bg-white/10 transition-all border border-white/5">
                                    <Printer size={16} />
                                </button>
                            </div>
                        </div>
                        <h1 className="text-2xl md:text-4xl font-black leading-tight tracking-tight break-words">{property.title}</h1>
                        <p className="text-gray-500 flex items-center gap-2 text-sm break-words">
                            <MapPin size={16} className="text-orange-500 flex-shrink-0" />
                            <span>{property.address}</span>
                        </p>
                    </header>

                    {/* Estatísticas */}
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                        {[
                            { label: 'm²', icon: Square, val: property.size },
                            { label: 'Dorm', icon: Bed, val: property.bedrooms },
                            { label: 'Suíte', icon: Bath, val: property.suites },
                            { label: 'Salas', icon: Sofa, val: property.livingRooms },
                            { label: 'Cozinhas', icon: Utensils, val: property.kitchens },
                            { label: 'Vagas', icon: Car, val: property.parkingSpaces },
                        ].map((item, idx) => (
                            <div key={idx} className="glass p-3 rounded-2xl flex flex-col items-center gap-1 border-white/5">
                                <item.icon size={14} className="text-orange-500/60" />
                                <span className="text-[8px] font-black uppercase text-gray-600 tracking-wider">{item.label}</span>
                                <span className="text-base font-bold">{item.val || 0}</span>
                            </div>
                        ))}
                    </div>

                    {/* Descrição */}
                    <div className="space-y-3">
                        <h3 className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Descrição Certificada</h3>
                        <p className="text-gray-400 leading-relaxed font-medium opacity-80 whitespace-pre-line text-sm md:text-base">
                            {property.description || 'Nenhum detalhe adicional informado.'}
                        </p>
                    </div>

                    {/* Preço e Ação */}
                    <div className="pt-6 border-t border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6">
                        <div className="min-w-0">
                            <span className="text-[10px] font-black uppercase text-orange-500 tracking-tight block mb-1">Valentia Comercial</span>
                            <span className="text-3xl md:text-5xl font-black tracking-tighter break-all">{formatPrice(property.price)}</span>
                            <p className="text-gray-600 text-[10px] font-bold uppercase tracking-widest mt-1">
                                {property.offerType === 'Aluguel' ? 'Taxa Mensal' : 'Ativo para Aquisição'}
                            </p>
                        </div>

                        <button
                            disabled={isPublishing || Boolean(property.remoteId && property.remoteStatus === 'approved')}
                            className="flex-shrink-0 px-6 py-4 bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:shadow-xl hover:shadow-orange-500/30 hover:-translate-y-0.5 transition-all active:scale-95 disabled:opacity-50 print:hidden"
                        >
                            {isPublishing ? 'Transmitindo...' : 'Transmitir para Rede IAmobil'}
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
                            alt="Foto em tamanho completo"
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};
