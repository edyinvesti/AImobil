import React from 'react';
import { Phone, Mail, MapPin, Globe, Share2, Download, Zap, ShieldCheck, QrCode } from 'lucide-react';
import { motion } from 'framer-motion';
import { UserProfile } from '../types';

interface BusinessCardProps {
    profile: UserProfile;
}

export const BusinessCard: React.FC<BusinessCardProps> = ({ profile }) => {
    const handleConnect = () => {
        const text = `Olá ${profile.name}, vim através do seu Cartão Digital IAmobil e gostaria de conversar!`;
        const phone = profile.phone?.replace(/\D/g, '') || '';
        const url = phone ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}` : 'https://wa.me/';
        window.open(url, '_blank');
    };

    const handleEmail = () => {
        window.location.href = `mailto:${profile.email || 'contato@iamobil.com.br'}`;
    };

    const handleShare = async () => {
        const shareData = {
          title: profile.name || 'Meu Cartão Digital',
          text: `🤝 *${profile.name || 'Seu Consultor'}*\n🏢 Corretor Parceiro IAmobil\n📜 CRECI: ${profile.creci || '---'}\n\nConecte-se comigo para os melhores ativos imobiliários!`,
          url: window.location.href
        };

        if (navigator.share) {
          try {
            await navigator.share(shareData);
            return;
          } catch (err) {
            console.error('Error sharing:', err);
          }
        }
        
        // Fallback to WhatsApp
        const whatsappText = `${shareData.text}\n\n_Cartão Digital IAmobil_`;
        const url = `https://wa.me/?text=${encodeURIComponent(whatsappText)}`;
        window.open(url, '_blank');
    };

    return (
        <div className="max-w-xl mx-auto px-6 py-10 lg:py-20 h-full flex flex-col justify-center">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative glass rounded-[4rem] overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.4)] border-white/10"
            >
                {/* Header / Brand */}
                <div className="h-40 premium-gradient p-10 flex justify-between items-start">
                    <div className="bg-black/20 backdrop-blur-md px-4 py-2 rounded-full border border-white/20">
                        <span className="text-[10px] font-black uppercase text-white tracking-widest">IAmobil Certified</span>
                    </div>
                    <Zap className="text-white/40" size={32} />
                </div>

                {/* Avatar / Profile Info */}
                <div className="px-10 pb-16 -mt-16">
                    <div className="relative inline-block mb-10">
                        <div className="w-32 h-32 rounded-[2.5rem] bg-[#111] border-8 border-[#030303] flex items-center justify-center overflow-hidden shadow-2xl">
                             {profile.photo ? (
                                <img src={profile.photo} className="w-full h-full object-cover" alt="" />
                             ) : (
                                <div className="text-4xl font-black text-white">{(profile.name || 'E').charAt(0)}</div>
                             )}
                        </div>
                        <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-emerald-500 rounded-2xl border-4 border-[#030303] flex items-center justify-center">
                            <ShieldCheck size={20} className="text-white" />
                        </div>
                    </div>

                    <div className="space-y-2 mb-12">
                        <h1 className="text-4xl font-black text-white tracking-tight">{profile.name || 'Seu Nome'}</h1>
                        <div className="flex items-center gap-3">
                            <span className="px-3 py-1 bg-orange-500/10 border border-orange-500/20 rounded-full text-[10px] font-black uppercase text-orange-500 tracking-widest">Corretor de Elite</span>
                            <span className="text-gray-600 font-bold text-[10px] uppercase tracking-widest leading-none">CRECI {profile.creci || '---'}</span>
                        </div>
                    </div>

                    {/* Contact Links */}
                    <div className="grid grid-cols-1 gap-4 mb-12">
                        <button 
                            onClick={handleConnect}
                            className="w-full flex items-center gap-6 p-6 bg-white/5 rounded-3xl border border-white/5 hover:bg-white/10 transition-all group text-left"
                        >
                            <div className="p-4 bg-emerald-500/10 rounded-2xl text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-all">
                                <Phone size={20} />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[9px] font-black uppercase text-gray-500 tracking-widest">WhatsApp Business</span>
                                <span className="text-lg font-bold text-white">Conectar Agora</span>
                            </div>
                        </button>
                        
                        <button 
                            onClick={handleEmail}
                            className="w-full flex items-center gap-6 p-6 bg-white/5 rounded-3xl border border-white/5 hover:bg-white/10 transition-all text-left"
                        >
                            <div className="p-4 bg-white/5 rounded-2xl text-gray-400">
                                <Mail size={20} />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[9px] font-black uppercase text-gray-500 tracking-widest">E-mail Corporativo</span>
                                <span className="text-lg font-bold text-white truncate max-w-[200px]">{profile.email || 'Não informado'}</span>
                            </div>
                        </button>
                    </div>

                    {/* QR Code Simulation */}
                    <div className="flex justify-center mb-12">
                         <div className="p-8 glass rounded-[3rem] border-white/5 flex flex-col items-center gap-4">
                             <QrCode size={120} className="text-white/20" />
                             <span className="text-[8px] font-black uppercase text-gray-600 tracking-[0.4em]">Scan to Save</span>
                         </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-4">
                        <button 
                            onClick={handleShare}
                            className="flex-1 premium-gradient py-6 rounded-3xl text-white font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-3 shadow-2xl shadow-orange-500/20 active:scale-95 transition-all"
                        >
                            <Share2 size={16} /> Compartilhar
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};
