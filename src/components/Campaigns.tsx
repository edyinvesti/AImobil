import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { BarChart3, ExternalLink, Instagram, RefreshCw, Image, CheckCircle2, XCircle, Trash2, Clock, Filter, X, ChevronRight } from 'lucide-react';
import { getApiUrl } from '../utils';

interface Campaign {
  id: string;
  property_id: string;
  property_title: string;
  instagram_status: string;
  instagram_post_id: string;
  instagram_url: string;
  campaign_status: string;
  campaign_id: string;
  has_carousel: boolean;
  created_at: number;
}

interface CampaignStats {
  total: number;
  published: number;
  failed: number;
  carousel: number;
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

const filters = [
  { id: 'all', label: 'Todos' },
  { id: 'published', label: 'Publicados' },
  { id: 'failed', label: 'Falhos' },
  { id: 'carousel', label: 'Carrossel' },
] as const;

type FilterId = typeof filters[number]['id'];

export const Campaigns = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [stats, setStats] = useState<CampaignStats>({ total: 0, published: 0, failed: 0, carousel: 0 });
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterId>('all');
  const [detail, setDetail] = useState<Campaign | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const API_BASE = getApiUrl();
      const [listRes, statsRes] = await Promise.all([
        fetch(`${API_BASE}/api/campaigns/list`),
        fetch(`${API_BASE}/api/campaigns/stats`)
      ]);
      const listData = await listRes.json();
      const statsData = await statsRes.json();
      if (listData.success) setCampaigns(listData.campanhas || []);
      if (statsData.success) setStats(statsData.stats);
    } catch (e) {
      console.error('Erro ao buscar campanhas:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const deleteCampaign = async (id: string) => {
    setDeleting(id);
    try {
      const API_BASE = getApiUrl();
      const res = await fetch(`${API_BASE}/api/campaigns/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setCampaigns(prev => prev.filter(c => c.id !== id));
        if (detail?.id === id) setDetail(null);
        fetchData();
      }
    } catch (e) {
      console.error('Erro ao deletar campanha:', e);
    } finally {
      setDeleting(null);
    }
  };

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const filtered = activeFilter === 'all' ? campaigns
    : activeFilter === 'published' ? campaigns.filter(c => c.instagram_status === 'PUBLISHED')
    : activeFilter === 'failed' ? campaigns.filter(c => c.instagram_status !== 'PUBLISHED' && c.instagram_status !== '')
    : campaigns.filter(c => c.has_carousel);

  const statCards = [
    { label: 'Total', value: stats.total, color: 'from-blue-500 to-cyan-500', icon: BarChart3 },
    { label: 'Publicados', value: stats.published, color: 'from-emerald-500 to-green-500', icon: CheckCircle2 },
    { label: 'Falhos', value: stats.failed, color: 'from-red-500 to-rose-500', icon: XCircle },
    { label: 'Carrossel', value: stats.carousel, color: 'from-violet-500 to-purple-500', icon: Image },
  ];

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="p-4 md:p-6 space-y-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 size={20} className="text-orange-500" />
          <h1 className="text-sm font-black uppercase tracking-[0.3em] bg-gradient-to-r from-orange-500 to-violet-500 bg-clip-text text-transparent">Campanhas</h1>
        </div>
        <button onClick={fetchData} className="p-2 bg-zinc-900 border border-white/10 rounded-xl hover:bg-zinc-800 transition-all">
          <RefreshCw size={16} className={`text-gray-400 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {statCards.map(s => (
          <div key={s.label} className="bg-zinc-900/60 border border-white/5 rounded-2xl p-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <s.icon size={12} className="text-gray-500" />
              <span className="text-[8px] font-bold uppercase tracking-widest text-gray-500">{s.label}</span>
            </div>
            <span className={`text-lg font-black bg-gradient-to-r ${s.color} bg-clip-text text-transparent`}>
              {s.value}
            </span>
          </div>
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {filters.map(f => (
          <button key={f.id} onClick={() => setActiveFilter(f.id)}
            className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
              activeFilter === f.id
                ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                : 'bg-zinc-900/50 text-gray-500 border border-white/5 hover:border-white/10 hover:text-gray-300'
            }`}>
            {f.id === 'all' && <Filter size={10} className="inline mr-1" />}
            {f.id === 'published' && <CheckCircle2 size={10} className="inline mr-1" />}
            {f.id === 'failed' && <XCircle size={10} className="inline mr-1" />}
            {f.id === 'carousel' && <Image size={10} className="inline mr-1" />}
            {f.label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && campaigns.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-[30vh] gap-4">
          <div className="w-12 h-12 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin" />
          <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Carregando campanhas...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-[30vh] gap-4 text-gray-600">
          <BarChart3 size={48} className="opacity-20" />
          <p className="text-xs font-bold uppercase tracking-widest">
            {activeFilter === 'all' ? 'Nenhuma campanha ainda' : 'Nenhuma campanha encontrada'}
          </p>
          <p className="text-[10px]">Publique um imóvel no Instagram para ver aqui</p>
        </div>
      ) : (
        /* Campaign List */
        <motion.div variants={containerVariants} className="space-y-2">
          {filtered.map(camp => (
            <motion.div key={camp.id} variants={itemVariants}
              className="group bg-zinc-900/50 border border-white/5 rounded-2xl hover:border-white/10 hover:bg-zinc-900/80 transition-all cursor-pointer overflow-hidden"
              onClick={() => setDetail(camp)}>
              <div className="flex items-start justify-between gap-3 p-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-2">
                    <h3 className="text-sm font-bold text-white truncate">{camp.property_title || 'Sem título'}</h3>
                    {camp.has_carousel && (
                      <span className="flex items-center gap-1 px-2 py-0.5 bg-violet-500/10 border border-violet-500/20 rounded-full text-[7px] font-black uppercase text-violet-400 shrink-0">
                        <Image size={9} /> Carrossel
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[9px] text-gray-500 font-bold uppercase tracking-widest flex-wrap">
                    <span className="flex items-center gap-1"><Clock size={10} />{formatDate(camp.created_at)}</span>
                    <span className="w-1 h-1 rounded-full bg-gray-600 shrink-0" />
                    <span className="flex items-center gap-1">
                      {camp.instagram_status === 'PUBLISHED' ? (
                        <CheckCircle2 size={11} className="text-emerald-500" />
                      ) : (
                        <XCircle size={11} className="text-red-500" />
                      )}
                      <span className={camp.instagram_status === 'PUBLISHED' ? 'text-emerald-400' : 'text-red-400'}>
                        {camp.instagram_status === 'PUBLISHED' ? 'Publicado' : camp.instagram_status || 'Pendente'}
                      </span>
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {camp.instagram_url && (
                    <a href={camp.instagram_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                      className="p-2 bg-gradient-to-r from-pink-600 to-purple-600 rounded-xl hover:from-pink-500 hover:to-purple-500 transition-all">
                      <Instagram size={14} className="text-white" />
                    </a>
                  )}
                  <div className="p-2 bg-zinc-800/50 rounded-xl opacity-0 group-hover:opacity-100 transition-all">
                    <ChevronRight size={14} className="text-gray-500" />
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Detail Modal */}
      {detail && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setDetail(null)}>
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="bg-zinc-900 border border-white/10 rounded-3xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}>

            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-black uppercase tracking-widest text-white">Detalhes da Campanha</h2>
              <button onClick={() => setDetail(null)} className="p-1.5 bg-zinc-800 rounded-xl hover:bg-zinc-700 transition-all">
                <X size={14} className="text-gray-400" />
              </button>
            </div>

            <div className="space-y-3">
              {/* Property */}
              <div className="bg-black/30 rounded-2xl p-4 border border-white/5">
                <div className="text-[8px] font-black uppercase tracking-widest text-gray-500 mb-1">Imóvel</div>
                <div className="text-sm font-bold text-white">{detail.property_title || 'Sem título'}</div>
              </div>

              {/* Status */}
              <div className="bg-black/30 rounded-2xl p-4 border border-white/5">
                <div className="text-[8px] font-black uppercase tracking-widest text-gray-500 mb-1">Status Instagram</div>
                <div className="flex items-center gap-2">
                  {detail.instagram_status === 'PUBLISHED' ? (
                    <span className="flex items-center gap-1.5 text-emerald-400 text-sm font-bold">
                      <CheckCircle2 size={16} className="text-emerald-500" /> Publicado
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-red-400 text-sm font-bold">
                      <XCircle size={16} className="text-red-500" /> {detail.instagram_status || 'Pendente'}
                    </span>
                  )}
                </div>
              </div>

              {/* Campaign Status */}
              {detail.campaign_status && (
                <div className="bg-black/30 rounded-2xl p-4 border border-white/5">
                  <div className="text-[8px] font-black uppercase tracking-widest text-gray-500 mb-1">Campanha Ads</div>
                  <div className="text-sm font-bold text-white">{detail.campaign_status}</div>
                </div>
              )}

              {/* Carrossel */}
              {detail.has_carousel && (
                <div className="bg-black/30 rounded-2xl p-4 border border-white/5">
                  <div className="text-[8px] font-black uppercase tracking-widest text-gray-500 mb-1">Formato</div>
                  <span className="flex items-center gap-1.5 text-violet-400 text-sm font-bold">
                    <Image size={16} /> Carrossel de fotos
                  </span>
                </div>
              )}

              {/* Date */}
              <div className="bg-black/30 rounded-2xl p-4 border border-white/5">
                <div className="text-[8px] font-black uppercase tracking-widest text-gray-500 mb-1">Criado em</div>
                <div className="text-sm text-gray-300">{formatDate(detail.created_at)}</div>
              </div>

              {/* Post ID */}
              {detail.instagram_post_id && (
                <div className="bg-black/30 rounded-2xl p-4 border border-white/5">
                  <div className="text-[8px] font-black uppercase tracking-widest text-gray-500 mb-1">Post ID</div>
                  <div className="text-xs text-gray-400 font-mono truncate">{detail.instagram_post_id}</div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 mt-6">
              {detail.instagram_url && (
                <a href={detail.instagram_url} target="_blank" rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-gradient-to-r from-pink-600 to-purple-600 rounded-xl text-[9px] font-black uppercase tracking-widest text-white hover:from-pink-500 hover:to-purple-500 transition-all">
                  <Instagram size={14} /> Ver no Instagram <ExternalLink size={11} />
                </a>
              )}
              <button onClick={() => { if (confirm('Excluir esta campanha?')) deleteCampaign(detail.id); }}
                disabled={deleting === detail.id}
                className="p-2.5 bg-red-500/10 border border-red-500/20 rounded-xl hover:bg-red-500/20 transition-all disabled:opacity-50">
                <Trash2 size={16} className="text-red-400" />
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
};
