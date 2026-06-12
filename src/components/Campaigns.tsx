import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { BarChart3, ExternalLink, Instagram, RefreshCw, Image, CheckCircle2, XCircle, Trash2, Clock, Filter, X, ChevronRight, Loader2 } from 'lucide-react';
import { useCampaigns, useDeleteCampaign } from '../hooks/useCampaigns';
import { useToast } from '../hooks/useToast';

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
  ai_copy?: string;
  is_video?: boolean;
  media_urls?: string[];
}

interface CampaignStats {
  total: number;
  published: number;
  adsActive: number;
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
  { id: 'pending', label: 'Aguardando Aprovação' },
  { id: 'published', label: 'Publicados' },
  { id: 'failed', label: 'Falhos' },
  { id: 'carousel', label: 'Carrossel' },
] as const;

type FilterId = typeof filters[number]['id'];

export const Campaigns = () => {
  const { toast } = useToast();
  const { data: campaignsData, isLoading: loading, refetch } = useCampaigns();
  const deleteMutation = useDeleteCampaign();
  const [activeFilter, setActiveFilter] = useState<FilterId>('all');
  const [detail, setDetail] = useState<Campaign | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [approvalCaption, setApprovalCaption] = useState('');
  const [isApproving, setIsApproving] = useState(false);

  const openDetail = (camp: Campaign) => {
    setDetail(camp);
    setApprovalCaption(camp.ai_copy || '');
  };

  const campaigns: Campaign[] = (campaignsData as any)?.campanhas || (Array.isArray(campaignsData) ? campaignsData : []);

  // Auto-refresh every 10s while any campaign is still publishing (empty status)
  const hasPending = campaigns.some(c => !c.instagram_status || c.instagram_status === 'IN_PROGRESS');
  useEffect(() => {
    if (!hasPending) return;
    const interval = setInterval(() => refetch(), 10000);
    return () => clearInterval(interval);
  }, [hasPending, refetch]);

  const stats: CampaignStats = (campaignsData as any)?.stats || (() => {
    const list = Array.isArray(campaignsData) ? campaignsData : [];
    return {
      total: list.length,
      published: list.filter(c => c.instagram_status === 'PUBLISHED').length,
      adsActive: list.filter(c => c.campaign_status === 'ACTIVE').length,
      failed: list.filter(c => c.instagram_status && c.instagram_status !== 'PUBLISHED' && c.instagram_status !== 'WAITING_APPROVAL').length,
      carousel: list.filter(c => c.has_carousel).length,
    };
  })();

  const approveCampaign = async () => {
    if (!detail) return;
    setIsApproving(true);
    try {
      const api = (await import('../utils')).getApiUrl();
      const res = await fetch(`${api}/api/marketing/approve/${detail.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caption: approvalCaption })
      });
      const data = await res.json();
      if (data.success) {
        toast('Post aprovado e enviado ao Instagram!', 'success');
        setDetail(null);
        refetch();
      } else {
        toast(data.error || 'Erro ao publicar', 'error');
      }
    } catch (e) {
      toast('Erro de conexão ao aprovar', 'error');
    } finally {
      setIsApproving(false);
    }
  };

  const deleteCampaign = async (id: string) => {
    setDeleting(id);
    try {
      await deleteMutation.mutateAsync(id);
      toast('Campanha removida com sucesso!', 'success');
      refetch();
    } catch (e) {
      console.error('Erro ao deletar campanha:', e);
      toast('Erro ao remover campanha', 'error');
    } finally {
      setDeleting(null);
    }
  };

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusLabel = (status: string) => {
    if (status === 'PUBLISHED') return 'Publicado';
    if (status === 'DRAFT') return 'Rascunho';
    if (status === 'SKIPPED') return 'Pulado';
    if (status === 'WAITING_APPROVAL') return 'Aguardando Aprovação';
    if (!status) return 'Publicando...';
    return status;
  };

  const getStatusColor = (status: string) => {
    if (status === 'PUBLISHED') return 'text-emerald-400';
    if (status === 'SKIPPED') return 'text-gray-400';
    if (status === 'WAITING_APPROVAL') return 'text-amber-400';
    if (!status) return 'text-blue-400';
    return 'text-red-400';
  };

  const getStatusIcon = (status: string) => {
    if (status === 'PUBLISHED') return <CheckCircle2 size={12} className="text-emerald-400" />;
    if (status === 'SKIPPED') return <XCircle size={12} className="text-gray-500" />;
    if (status === 'WAITING_APPROVAL') return <Clock size={12} className="text-amber-400" />;
    if (!status) return <Loader2 size={12} className="animate-spin text-blue-400" />;
    return <XCircle size={12} className="text-red-400" />;
  };

  const filtered = campaigns.filter(c => {
    if (activeFilter === 'published') return c.instagram_status === 'PUBLISHED';
    if (activeFilter === 'pending') return c.instagram_status === 'WAITING_APPROVAL';
    if (activeFilter === 'failed') return c.instagram_status && c.instagram_status !== 'PUBLISHED' && c.instagram_status !== 'WAITING_APPROVAL';
    if (activeFilter === 'carousel') return c.has_carousel;
    return true;
  });

  const statCards = [
    { label: 'Total', value: stats.total, color: 'from-blue-500 to-cyan-500', icon: BarChart3 },
    { label: 'Publicados', value: stats.published, color: 'from-emerald-500 to-green-500', icon: CheckCircle2 },
    { label: 'Ads Ativos', value: stats.adsActive, color: 'from-amber-500 to-yellow-500', icon: BarChart3 },
    { label: 'Carrossel', value: stats.carousel, color: 'from-violet-500 to-purple-500', icon: Image },
  ];

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="p-4 md:p-6 space-y-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 size={20} className="text-orange-500" />
          <h1 className="text-sm font-black uppercase tracking-[0.3em] bg-gradient-to-r from-orange-500 to-violet-500 bg-clip-text text-transparent">Campanhas</h1>
        </div>
        <button onClick={() => refetch()} className="p-2 bg-zinc-900 border border-white/10 rounded-xl hover:bg-zinc-800 transition-all">
          <RefreshCw size={16} className={`text-gray-400 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Publishing in progress banner */}
      {hasPending && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2.5 px-4 py-3 bg-blue-500/10 border border-blue-500/20 rounded-2xl">
          <Loader2 size={14} className="text-blue-400 animate-spin shrink-0" />
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-blue-400">Publicando no Instagram...</p>
            <p className="text-[9px] text-gray-500">Esta tela atualiza automaticamente a cada 10 segundos</p>
          </div>
        </motion.div>
      )}

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
        <motion.div variants={containerVariants} className="space-y-2">
          {filtered.map(camp => (
            <motion.div key={camp.id} variants={itemVariants}
              className="group bg-zinc-900/50 border border-white/5 rounded-2xl hover:border-white/10 hover:bg-zinc-900/80 transition-all cursor-pointer overflow-hidden"
              onClick={() => openDetail(camp)}>
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
                      {getStatusIcon(camp.instagram_status)}
                      <span className={getStatusColor(camp.instagram_status)}>
                        {getStatusLabel(camp.instagram_status)}
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

      {detail && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setDetail(null)}>
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="bg-zinc-900 border border-white/10 rounded-3xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}>

            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-sm font-black uppercase tracking-widest text-white">Detalhes da Campanha</h2>
                {detail.instagram_status === 'WAITING_APPROVAL' && (
                  <p className="text-[9px] text-amber-400 font-bold uppercase tracking-widest mt-0.5">⏳ Aguardando sua aprovação para publicar</p>
                )}
              </div>
              <button onClick={() => setDetail(null)} className="p-1.5 bg-zinc-800 rounded-xl hover:bg-zinc-700 transition-all">
                <X size={14} className="text-gray-400" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="bg-black/30 rounded-2xl p-4 border border-white/5">
                <div className="text-[8px] font-black uppercase tracking-widest text-gray-500 mb-1">Imóvel</div>
                <div className="text-sm font-bold text-white">{detail.property_title || 'Sem título'}</div>
              </div>

              <div className="bg-black/30 rounded-2xl p-4 border border-white/5">
                <div className="text-[8px] font-black uppercase tracking-widest text-gray-500 mb-1">Status Instagram</div>
                <div className="flex items-center gap-2">
                  {detail.instagram_status === 'PUBLISHED' ? (
                    <span className="flex items-center gap-1.5 text-emerald-400 text-sm font-bold">
                      <CheckCircle2 size={16} className="text-emerald-500" /> Publicado
                    </span>
                  ) : detail.instagram_status === 'WAITING_APPROVAL' ? (
                    <span className="flex items-center gap-1.5 text-amber-400 text-sm font-bold">
                      <Clock size={16} className="text-amber-400" /> Aguardando Aprovação
                    </span>
                  ) : !detail.instagram_status ? (
                    <span className="flex items-center gap-1.5 text-blue-400 text-sm font-bold">
                      <Loader2 size={16} className="text-blue-400 animate-spin" /> Publicando...
                    </span>
                  ) : detail.instagram_status === 'SKIPPED' ? (
                    <span className="flex items-center gap-1.5 text-gray-400 text-sm font-bold">
                      <XCircle size={16} className="text-gray-500" /> Pulado (sem mídia ou opção desativada)
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-red-400 text-sm font-bold">
                      <XCircle size={16} className="text-red-500" /> {detail.instagram_status}
                    </span>
                  )}
                </div>
              </div>

              {/* PAINEL DE APROVAÇÃO DE IA */}
              {detail.instagram_status === 'WAITING_APPROVAL' && (
                <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[8px] font-black uppercase tracking-widest text-amber-400">✨ Legenda gerada pela IA</span>
                    <span className="text-[7px] text-gray-500">(Edite à vontade antes de publicar)</span>
                  </div>
                  <textarea
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white font-medium outline-none focus:ring-1 focus:ring-amber-500 transition-all resize-none min-h-[180px] leading-relaxed"
                    value={approvalCaption}
                    onChange={e => setApprovalCaption(e.target.value)}
                    placeholder="Legenda do post..."
                  />
                  <button
                    onClick={approveCampaign}
                    disabled={isApproving || !approvalCaption.trim()}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl text-xs font-black uppercase tracking-widest text-white hover:from-amber-400 hover:to-orange-400 transition-all disabled:opacity-50 shadow-lg shadow-orange-500/20"
                  >
                    {isApproving ? <Loader2 size={14} className="animate-spin" /> : <Instagram size={14} />}
                    {isApproving ? 'Publicando no Instagram...' : '✅ Aprovar & Publicar no Instagram'}
                  </button>
                </div>
              )}

              {detail.campaign_status && (
                <div className="bg-black/30 rounded-2xl p-4 border border-white/5">
                  <div className="text-[8px] font-black uppercase tracking-widest text-gray-500 mb-1">Campanha Ads</div>
                  <div className="text-sm font-bold text-white">{detail.campaign_status}</div>
                </div>
              )}

              {detail.has_carousel && (
                <div className="bg-black/30 rounded-2xl p-4 border border-white/5">
                  <div className="text-[8px] font-black uppercase tracking-widest text-gray-500 mb-1">Formato</div>
                  <span className="flex items-center gap-1.5 text-violet-400 text-sm font-bold">
                    <Image size={16} /> Carrossel de fotos
                  </span>
                </div>
              )}

              <div className="bg-black/30 rounded-2xl p-4 border border-white/5">
                <div className="text-[8px] font-black uppercase tracking-widest text-gray-500 mb-1">Criado em</div>
                <div className="text-sm text-gray-300">{formatDate(detail.created_at)}</div>
              </div>

              {detail.instagram_post_id && (
                <div className="bg-black/30 rounded-2xl p-4 border border-white/5">
                  <div className="text-[8px] font-black uppercase tracking-widest text-gray-500 mb-1">Post ID</div>
                  <div className="text-xs text-gray-400 font-mono truncate">{detail.instagram_post_id}</div>
                </div>
              )}
            </div>

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
