import React from "react";
import { Radar as RadarIcon, TrendingUp, MapPin, Building, Target, Zap, Waves, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

export function Radar() {
  const stats = [
    { label: 'Oportunidades', value: '12', icon: Target, color: 'text-orange-500' },
    { label: 'Tendência Alta', value: 'Apartamentos', icon: TrendingUp, color: 'text-emerald-500' },
    { label: 'Hotspot', value: 'Setor Bueno', icon: MapPin, color: 'text-blue-500' }
  ];

  const insights = [
    { title: 'Aumento de Demanda', description: 'Crescimento de 15% na busca por lofts no Setor Marista nas últimas 24h.', tag: 'Mercado' },
    { title: 'Oportunidade Reativa', description: '3 propriedades em sua carteira tiveram match com novos leads qualificados.', tag: 'IA Internal' },
    { title: 'Previsão de Preço', description: 'Tendência de valorização de 2.4% para terrenos em condomínio fechado.', tag: 'Futuro' }
  ];

  return (
    <div className="p-4 lg:p-8 w-full">
      <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Oponente Radar</h1>
          <p className="text-gray-500 text-xs mt-1 font-bold uppercase tracking-widest">
             Inteligência de Mercado Proativa & Dash de Tendências
          </p>
        </div>

        <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-2xl border border-white/5 text-[9px] font-black uppercase tracking-widest text-emerald-500">
           <Zap size={10} fill="currentColor" /> Atualizado em tempo real
        </div>
      </header>

      {/* Quick Stats */}
      <div className="flex flex-wrap gap-4 mb-10">
        {stats.map((s, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="flex-1 min-w-[240px] bg-zinc-900/40 border border-white/5 p-6 rounded-3xl backdrop-blur-xl relative overflow-hidden"
          >
            <div className="absolute -right-2 -bottom-2 opacity-5 scale-150 rotate-12">
               <s.icon size={100} />
            </div>
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-2 font-mono">{s.label}</p>
            <h2 className={`text-2xl font-black ${s.color} uppercase tracking-tighter`}>{s.value}</h2>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center gap-2 mb-4">
             <Waves size={16} className="text-blue-500" />
             <h2 className="text-sm font-black uppercase tracking-widest text-white">Fluxo de Insights</h2>
          </div>
          
          {insights.map((insight, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + (i * 0.1) }}
              className="bg-white/5 border border-white/5 p-6 rounded-3xl hover:bg-white/[0.07] transition-all group"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[8px] font-black uppercase tracking-widest text-orange-500/70 bg-orange-500/10 px-2 py-0.5 rounded-full mb-3 inline-block">
                    {insight.tag}
                  </span>
                  <h3 className="text-lg font-black text-white mb-2">{insight.title}</h3>
                  <p className="text-xs text-gray-500 font-medium leading-relaxed max-w-lg">
                    {insight.description}
                  </p>
                </div>
                <button className="p-2 rounded-xl bg-white/5 text-gray-600 opacity-0 group-hover:opacity-100 transition-all">
                  <Sparkles size={16} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="space-y-6">
           <div className="bg-gradient-to-br from-orange-600 to-orange-800 p-8 rounded-[40px] text-white relative overflow-hidden shadow-2xl shadow-orange-500/20">
              <div className="absolute top-0 right-0 -mr-10 -mt-10 opacity-20 rotate-45">
                 <RadarIcon size={200} />
              </div>
              <h3 className="text-xl font-black uppercase tracking-tighter mb-4 relative z-10">Scan de<br/>Oportunidade</h3>
              <p className="text-xs font-bold text-white/80 leading-relaxed mb-6 relative z-10">
                O motor Radar identificou uma lacuna no mercado para aluguéis de temporada em Caldas Novas.
              </p>
              <button className="w-full py-4 bg-white text-orange-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-orange-50 hover:scale-[1.02] transition-all relative z-10 shadow-xl">
                 Ver Mapa de Calor
              </button>
           </div>

           <div className="bg-white/5 border border-white/5 p-6 rounded-3xl">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-6">Volume de Transações (GO)</h3>
              <div className="flex items-end gap-2 h-20">
                 {[40, 70, 45, 90, 65, 80, 55].map((h, i) => (
                   <motion.div 
                    key={i}
                    initial={{ height: 0 }}
                    animate={{ height: `${h}%` }}
                    className="flex-1 bg-white/10 rounded-t-sm group relative"
                   >
                     <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-white text-black text-[8px] font-black px-1 rounded uppercase">
                        {h}k
                     </div>
                   </motion.div>
                 ))}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
