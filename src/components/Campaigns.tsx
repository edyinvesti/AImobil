import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { BarChart3, ExternalLink, Instagram, RefreshCw, Image, CheckCircle2, XCircle } from 'lucide-react';
import { getApiUrl } from '../utils';

interface Campaign {
  id: string;
  property_id: string;
  property_title: string;
  instagram_status: string;
  instagram_post_id: string;
  instagram_url: string;
  has_carousel: boolean;
  created_at: number;
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

export const Campaigns = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const API_BASE = getApiUrl();
      const res = await fetch(`${API_BASE}/api/campaigns/list`);
      const data = await res.json();
      if (data.success) {
        setCampaigns(data.campanhas || []);
      }
    } catch (e) {
      console.error('Erro ao buscar campanhas:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCampaigns(); }, []);

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="p-4 md:p-6 space-y-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 size={20} className="text-orange-500" />
          <h1 className="text-sm font-black uppercase tracking-[0.3em] bg-gradient-to-r from-orange-500 to-violet-500 bg-clip-text text-transparent">Campanhas</h1>
        </div>
        <button onClick={fetchCampaigns} className="p-2 bg-zinc-900 border border-white/10 rounded-xl hover:bg-zinc-800 transition-all">
          <RefreshCw size={16} className={`text-gray-400 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading && campaigns.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-[40vh] gap-4">
          <div className="w-12 h-12 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin" />
          <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Carregando campanhas...</p>
        </div>
      ) : campaigns.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-[40vh] gap-4 text-gray-600">
          <BarChart3 size={48} className="opacity-20" />
          <p className="text-xs font-bold uppercase tracking-widest">Nenhuma campanha ainda</p>
          <p className="text-[10px]">Publique um imóvel no Instagram para ver aqui</p>
        </div>
      ) : (
        <motion.div variants={containerVariants} className="space-y-3">
          {campaigns.map((camp, i) => (
            <motion.div key={camp.id} variants={itemVariants} className="bg-zinc-900/50 border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-all">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-sm font-bold text-white truncate">{camp.property_title || 'Sem título'}</h3>
                    {camp.has_carousel && (
                      <span className="flex items-center gap-1 px-2 py-0.5 bg-violet-500/10 border border-violet-500/20 rounded-full text-[8px] font-black uppercase text-violet-400">
                        <Image size={10} /> Carrossel
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                    <span>{formatDate(camp.created_at)}</span>
                    <span className="w-1 h-1 rounded-full bg-gray-600" />
                    <span className="flex items-center gap-1">
                      {camp.instagram_status === 'PUBLISHED' ? (
                        <CheckCircle2 size={12} className="text-emerald-500" />
                      ) : (
                        <XCircle size={12} className="text-red-500" />
                      )}
                      {camp.instagram_status || 'PENDENTE'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {camp.instagram_url && (
                    <a href={camp.instagram_url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-pink-600 to-purple-600 rounded-xl text-[9px] font-black uppercase tracking-widest text-white hover:from-pink-500 hover:to-purple-500 transition-all">
                      <Instagram size={12} />
                      Ver Post
                      <ExternalLink size={10} />
                    </a>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </motion.div>
  );
};
