import React from "react";
import { User, Phone, Mail, TrendingUp, Filter, Search, BadgeCheck, Clock, UserPlus } from "lucide-react";
import { motion } from "framer-motion";

interface Lead {
  id: string;
  name: string;
  contact: string;
  source: string;
  score: number;
  status: 'frio' | 'morno' | 'quente' | 'convertido';
  interest: string;
  timestamp: string;
}

const MOCK_LEADS: Lead[] = [
  { id: '1', name: 'Edy Carlos', contact: '+55 62 99211-5143', source: 'Instagram Direct', score: 95, status: 'quente', interest: 'Apartamento Luxury Setor Oeste', timestamp: '2026-05-13T10:30:00' },
  { id: '2', name: 'Maria Silva', contact: 'maria.s@email.com', source: 'Portal Imobiliário', score: 45, status: 'frio', interest: 'Casa em Condomínio', timestamp: '2026-05-13T09:15:00' },
  { id: '3', name: 'Ricardo Oliveira', contact: '+55 62 98888-0022', source: 'WhatsApp Bot', score: 78, status: 'morno', interest: 'Terreno AlphaVille', timestamp: '2026-05-12T16:45:00' },
];

export function Leads() {
  const [search, setSearch] = React.useState('');

  const getStatusColor = (status: Lead['status']) => {
    switch (status) {
      case 'quente': return 'bg-orange-500/20 text-orange-500 border-orange-500/30';
      case 'morno': return 'bg-blue-500/20 text-blue-500 border-blue-500/30';
      case 'frio': return 'bg-gray-500/20 text-gray-400 border-white/10';
      case 'convertido': return 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30';
    }
  };

  return (
    <div className="p-4 lg:p-8 w-full">
      <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Gestão de Leads</h1>
          <p className="text-gray-500 text-xs mt-1 font-bold uppercase tracking-widest">
            <span className="text-orange-500">CRM Ativo</span> • {MOCK_LEADS.length} prospects em negociação
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative group flex-1 md:w-80">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-orange-500 transition-colors" />
            <input 
              type="text"
              placeholder="Buscar prospecto..."
              className="w-full h-12 bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 text-sm font-bold text-white outline-none focus:ring-1 focus:ring-orange-500/50 focus:bg-white/10 transition-all placeholder:text-gray-700"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button className="h-12 px-6 flex items-center gap-2 bg-orange-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20">
            <UserPlus size={16} />
            Novo Lead
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 mb-10">
        {MOCK_LEADS.map((lead, index) => (
          <motion.div
            key={lead.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="group relative bg-[#0a0a0a] border border-white/5 p-6 rounded-3xl hover:border-orange-500/30 transition-all overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
               <TrendingUp size={80} />
            </div>

            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center border border-white/10 group-hover:border-orange-500/40 transition-colors">
                  <User size={24} className="text-gray-400 group-hover:text-orange-500 transition-colors" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">{lead.name}</h3>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                    <span className="flex items-center gap-1.5 text-xs text-gray-500 font-bold">
                      <Phone size={12} className="text-orange-500" /> {lead.contact}
                    </span>
                    <span className="flex items-center gap-1.5 text-xs text-gray-500 font-bold italic">
                      <BadgeCheck size={12} className="text-blue-500" /> {lead.source}
                    </span>
                  </div>
                </div>
              </div>

              <div className="h-[1px] w-full lg:h-8 lg:w-[1px] bg-white/5" />

              <div className="flex-1 max-w-sm">
                <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-1">Interesse Principal</p>
                <p className="text-xs text-gray-400 font-medium leading-relaxed">{lead.interest}</p>
              </div>

              <div className="flex items-center gap-4">
                 <div className="text-right hidden sm:block">
                    <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-1">Score IA</p>
                    <p className="text-xl font-black text-white">{lead.score}%</p>
                 </div>
                 
                 <div className={`px-4 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest ${getStatusColor(lead.status)}`}>
                    {lead.status}
                 </div>

                 <button className="p-3 bg-white/5 rounded-xl border border-white/10 hover:border-white/20 hover:text-orange-500 transition-all">
                    <Clock size={16} />
                 </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
