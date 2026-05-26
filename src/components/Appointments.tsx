import React from 'react';
import { motion } from 'framer-motion';
import { Calendar, User, Phone, CheckCircle2, Clock, MessageSquare, Briefcase, ArrowRight, RefreshCw } from 'lucide-react';
import { useLeads } from '../hooks/useLeads';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

// Map backend status to UI status and colors
const getStatusConfig = (status: string, score: number) => {
  if (status === 'Visita Agendada') return { label: 'Visita Agendada', color: 'bg-orange-500 text-black', icon: <Calendar size={20} className="text-orange-500" /> };
  if (score >= 80) return { label: 'Lead Quente (AI)', color: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20', icon: <MessageSquare size={20} className="text-emerald-500" /> };
  if (status === 'Frio') return { label: 'Aguardando Contato', color: 'bg-blue-500/20 text-blue-400 border border-blue-500/20', icon: <Briefcase size={20} className="text-blue-500" /> };
  return { label: status, color: 'bg-zinc-500/20 text-zinc-400 border border-zinc-500/20', icon: <User size={20} className="text-zinc-400" /> };
};

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);
};

export const Appointments: React.FC = () => {
  const { leads, loading, refresh } = useLeads();

  if (loading && leads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-6">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 bg-orange-500/10 rounded-full animate-pulse" />
          </div>
        </div>
        <div className="text-center space-y-2">
          <p className="text-sm font-black uppercase tracking-[0.3em] text-white animate-pulse">Sincronizando Leads</p>
          <p className="text-[10px] text-gray-500 font-medium uppercase tracking-widest">IA Comercial está processando sua carteira...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-12 space-y-8 max-w-7xl mx-auto">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
             <div className="px-2 py-0.5 bg-orange-500/10 border border-orange-500/20 rounded text-[9px] font-black text-orange-500 uppercase tracking-widest">Live Sync</div>
             <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <h1 className="text-3xl lg:text-5xl font-black text-white uppercase tracking-tighter leading-none">Agendamentos & Leads</h1>
          <p className="text-gray-400 mt-3 font-medium tracking-wide text-sm max-w-xl">
            Gestão estratégica da sua inteligência artificial comercial. Visualize e gerencie o fluxo de clientes em tempo real.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={refresh}
            className="p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-colors group"
          >
            <RefreshCw size={16} className={`text-orange-500 ${loading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
          </button>
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-2xl backdrop-blur-md">
            <Clock size={16} className="text-orange-500 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Total: {leads.length} Oportunidades</span>
          </div>
        </div>
      </header>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        {leads.map((lead) => {
          const config = getStatusConfig(lead.status, lead.score);
          return (
            <motion.div 
              key={lead.id} 
              variants={itemVariants}
              className="group relative bg-[#0C0C0C] border border-white/5 hover:border-orange-500/30 rounded-[2.5rem] p-8 hover:shadow-[0_20px_50px_rgba(234,88,12,0.1)] transition-all duration-500 overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 blur-[50px] -mr-16 -mt-16 group-hover:bg-orange-500/10 transition-colors" />

              <div className="absolute top-8 right-8 p-3 bg-gradient-to-br from-zinc-800 to-zinc-900 rounded-2xl group-hover:scale-110 group-hover:rotate-6 transition-all shadow-xl border border-white/10">
                 {config.icon}
              </div>

              <div className="mb-10">
                <span className={`text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full ${config.color}`}>
                  {config.label}
                </span>
              </div>

              <h3 className="text-2xl lg:text-3xl font-black text-white w-4/5 tracking-tighter leading-[1.1] mb-2 group-hover:text-orange-500 transition-colors">
                {lead.name}
              </h3>
              
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2 mb-8">
                 IA Responsável <ArrowRight size={10} className="text-orange-500" /> <span className="text-white/80">{lead.score >= 80 ? 'Edy Carlos' : 'Atendimento IA'}</span>
              </p>

              <div className="p-6 bg-white/5 rounded-[2rem] border border-white/5 space-y-4 mb-8 backdrop-blur-sm">
                 <div className="flex justify-between items-center text-sm">
                   <span className="text-gray-500 font-medium">Imóvel Alvo</span>
                   <span className="font-bold text-white text-right max-w-[60%] truncate">{lead.interest || 'Busca Ativa'}</span>
                 </div>
                 <div className="flex justify-between items-center text-sm">
                   <span className="text-gray-500 font-medium">Ticket Médio</span>
                   <span className="font-bold text-orange-500 tracking-tighter text-lg">{formatCurrency(lead.potential_value)}</span>
                 </div>
                 <div className="h-[1px] bg-white/5 w-full" />
                 <div className="flex justify-between items-center text-[10px] uppercase tracking-widest font-black">
                   <span className="text-gray-500">Última Interação</span>
                   <span className="text-white">{lead.date}</span>
                 </div>
              </div>

<div className="flex gap-4">
                  <button 
                     onClick={() => {
                        const phone = lead.phone?.replace(/\D/g, '') || '';
                        if (phone) window.open(`https://wa.me/${phone}`, '_blank');
                     }}
                     className="flex-1 bg-white text-black hover:bg-emerald-500 hover:text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest flex justify-center items-center gap-2 transition-all duration-300 transform active:scale-95 shadow-lg"
                  >
                     <Phone size={14} /> Falar no WhatsApp
                  </button>
                 <button className="w-14 flex justify-center items-center bg-white/5 hover:bg-orange-500/20 text-gray-400 hover:text-orange-500 rounded-2xl transition-all duration-300 border border-white/5">
                    <CheckCircle2 size={18} />
                 </button>
              </div>
            </motion.div>
          );
        })}
      </motion.div>
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="flex flex-col items-center justify-center p-12 mt-8 bg-gradient-to-b from-orange-500/[0.03] to-transparent border border-orange-500/10 rounded-[3rem]"
      >
        <div className="w-12 h-12 bg-orange-500/20 rounded-2xl flex items-center justify-center mb-6">
           <Briefcase className="text-orange-500" size={24} />
        </div>
        <p className="text-sm font-medium text-gray-400 text-center max-w-2xl leading-relaxed">
          Os dados acima são sincronizados via <span className="text-white font-bold">Turso Cloud Protocol</span>. 
          Suas interações no Telegram e WhatsApp são processadas pela nossa IA para fornecer insights de conversão e agendamentos inteligentes diretamente na sua mão.
        </p>
      </motion.div>
    </div>
  );
};
