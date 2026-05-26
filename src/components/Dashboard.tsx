import React from "react";
import { Search, Filter, SlidersHorizontal, House, Building2, LandPlot, Building, Trees, Sprout, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import { Property } from "../types";
import { PropertyCard } from "./PropertyCard";
import { SkeletonCard } from "./SkeletonCard";
import { EmptyPortfolio } from "./EmptyPortfolio";
import { motion, AnimatePresence } from "framer-motion";
import { SyncStatus } from "../hooks/useProperties";

interface DashboardProps {
  properties: Property[];
  onAddClick: () => void;
  onPropertyClick: (property: Property) => void;
  onEdit: (property: Property) => void;
  onDelete: (id: string) => void;
  onSync: () => void;
  loading?: boolean;
  syncStatus?: SyncStatus;
}

const CATEGORIES = [
  { id: 'all', label: 'Todos', icon: House },
  { id: 'Apartamento', label: 'Apartamentos', icon: Building2 },
  { id: 'Casa', label: 'Casas', icon: House },
  { id: 'Terreno', label: 'Terrenos', icon: LandPlot },
  { id: 'Chácara', label: 'Chácaras', icon: Trees },
  { id: 'Fazenda', label: 'Fazendas', icon: Sprout },
  { id: 'Comercial', label: 'Comercial', icon: Building },
];

function formatLastSync(timestamp: number | null): string {
  if (!timestamp) return 'Nunca';
  const diff = Date.now() - timestamp;
  if (diff < 60000) return 'Agora';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m atrás`;
  return `${Math.floor(diff / 3600000)}h atrás`;
}

export function Dashboard({ properties, onAddClick, onPropertyClick, onEdit, onDelete, onSync, loading, syncStatus }: DashboardProps) {
  const [search, setSearch] = React.useState('');
  const [category, setCategory] = React.useState('all');

  const filteredProperties = properties.filter(p => {
    const matchesSearch = (p.title || '').toLowerCase().includes(search.toLowerCase()) || 
                          (p.address || '').toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === 'all' || (p.type || '').trim().toLowerCase() === category.toLowerCase();
    return matchesSearch && matchesCategory;
  });

  const totalValue = filteredProperties.reduce((acc, p) => acc + Number(p.price), 0);
  const pendingProps = filteredProperties.filter(p => p.remoteStatus === 'pending' || p.remoteStatus === 'unknown').length;

  if (loading) {
    return (
      <div className="p-4 lg:p-8 w-full">
        <div className="h-16 w-48 bg-white/5 rounded-xl mb-10 animate-pulse" />
        <div className="flex flex-wrap gap-4 mb-10">
          {[1, 2, 3].map(i => <div key={i} className="flex-1 min-w-[200px] h-24 bg-white/5 rounded-2xl animate-pulse" />)}
        </div>
        <div className="flex flex-wrap gap-6">
          {[1, 2, 3, 4].map(i => <div key={i} className="w-[300px] shrink-0"><SkeletonCard /></div>)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 w-full">
      <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Sua Carteira</h1>
            <p className="text-gray-500 text-xs mt-1 font-bold uppercase tracking-widest">
              Total: <span className="text-orange-500">{properties.length}</span> ativos em gestão
            </p>
          </div>
          
          <div className="flex items-center gap-2 mt-1">
            {syncStatus?.syncing ? (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                <RefreshCw size={14} className="text-blue-400 animate-spin" />
                <span className="text-[10px] font-bold text-blue-400 uppercase">Sincronizando</span>
              </div>
            ) : syncStatus?.error ? (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded-xl">
                <AlertCircle size={14} className="text-red-400" />
                <span className="text-[10px] font-bold text-red-400 uppercase">{syncStatus.error}</span>
              </div>
            ) : syncStatus?.lastSync ? (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                <CheckCircle2 size={14} className="text-emerald-400" />
                <span className="text-[10px] font-bold text-emerald-400 uppercase">Sincronizado {formatLastSync(syncStatus.lastSync)}</span>
              </div>
            ) : null}
            
            <button 
              onClick={onSync}
              title="Sincronizar com a Nuvem"
              className="h-10 w-10 flex items-center justify-center bg-white/5 border border-white/10 rounded-xl text-gray-500 hover:text-orange-500 hover:border-orange-500/30 transition-all group"
            >
              <SlidersHorizontal size={18} className="group-active:rotate-180 transition-transform duration-500" />
            </button>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
            <div className="relative group flex-1 md:w-80">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-orange-500 transition-colors" />
                <input 
                    type="text"
                    placeholder="Buscar por título ou endereço..."
                    className="w-full h-12 bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 text-sm font-bold text-white outline-none focus:ring-1 focus:ring-orange-500/50 focus:bg-white/10 transition-all placeholder:text-gray-700"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>
            <button className="h-12 w-12 flex items-center justify-center bg-white/5 border border-white/10 rounded-2xl text-gray-400 hover:text-white hover:bg-white/10 transition-all">
                <SlidersHorizontal size={20} />
            </button>
        </div>
      </header>

      <div className="flex gap-2 overflow-x-auto pb-6 scrollbar-hide">
        {CATEGORIES.map(cat => (
            <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border ${
                    category === cat.id 
                    ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20 border-orange-400' 
                    : 'bg-white/5 text-gray-500 border-white/5 hover:border-white/10 hover:text-white'
                }`}
            >
                <cat.icon size={14} />
                {cat.label}
            </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-4 mb-10">
        <div className="flex-1 min-w-[200px] bg-zinc-900/50 backdrop-blur-md p-6 rounded-2xl border border-white/10 group hover:border-orange-500/30 transition-all">
          <p className="text-gray-500 text-[10px] font-black uppercase mb-1 flex items-center gap-2">
            <Filter size={10} className="text-orange-500" /> Resultados
          </p>
          <h2 className="text-3xl font-black text-white">{filteredProperties.length}</h2>
        </div>
        <div className="flex-1 min-w-[200px] bg-zinc-900 p-6 rounded-2xl border border-white/10">
          <p className="text-gray-500 text-[10px] font-black uppercase mb-1">Volume</p>
          <h2 className="text-3xl font-black text-orange-500">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(totalValue)}
          </h2>
        </div>
        <div className="flex-1 min-w-[200px] bg-zinc-900 p-6 rounded-2xl border border-white/10">
          <p className="text-gray-500 text-[10px] font-black uppercase mb-1">Análise</p>
          <h2 className="text-3xl font-black text-blue-400">{pendingProps}</h2>
        </div>
      </div>

      <AnimatePresence mode="popLayout">
        {filteredProperties.length === 0 ? (
          search || category !== 'all' ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-20 text-gray-500"
            >
              <Search size={48} className="mb-4 opacity-20" />
              <p className="font-black uppercase tracking-widest text-[10px]">Nenhum ativo encontrado para esta busca</p>
            </motion.div>
          ) : (
            <EmptyPortfolio onAddClick={onAddClick} />
          )
        ) : (
          <motion.div 
            className="flex flex-wrap gap-6 items-start justify-start"
            layout
          >
            {filteredProperties.map(property => (
              <motion.div 
                key={property.id} 
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="w-full sm:w-[300px] shrink-0"
              >
                <PropertyCard 
                  property={property}
                  onClick={() => onPropertyClick(property)}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}