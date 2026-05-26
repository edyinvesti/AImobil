import React, { useMemo } from 'react';
import { Home, PlusSquare, User, CreditCard, Layout, LogOut, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

interface SidebarProps {
  currentView: string;
  onViewChange: (view: any) => void;
  profile: { name: string; creci: string; photo?: string };
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onViewChange, profile, onLogout }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Carteira', icon: Home },
    { id: 'appointments', label: 'Agendamentos', icon: Layout },
    { id: 'form', label: 'Novo Imóvel', icon: PlusSquare },
    { id: 'business-card', label: 'Cartão Digital', icon: CreditCard },
    { id: 'profile', label: 'Configurações', icon: User },
  ];

  const initials = useMemo(() => {
    return (profile.name || 'E').substring(0, 2).toUpperCase();
  }, [profile.name]);

  return (
    <aside className="hidden lg:flex flex-col w-64 lg:w-72 h-screen sticky top-0 glass-dark border-r border-white/5 p-4 z-50">
      <div className="flex items-center gap-3 mb-10 px-2">
        <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center text-white font-black shadow-lg shadow-orange-500/20 text-sm">
          IA
        </div>
        <div className="flex flex-col">
          <span className="text-lg font-black text-white tracking-tight">IAmobil</span>
          <span className="text-[8px] font-black uppercase text-orange-500 tracking-[0.3em] leading-none">Gestor Premium</span>
        </div>
      </div>

      <nav className="flex-1 space-y-1">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all duration-300 group relative ${
              currentView === item.id 
                ? 'bg-orange-500 text-white shadow-[0_0_20px_rgba(249,115,22,0.3)] border border-orange-400/50' 
                : 'text-gray-500 hover:bg-white/5 hover:text-white border border-transparent'
            }`}
          >
            <div className="flex items-center gap-3">
              <item.icon size={18} className={currentView === item.id ? 'text-white' : 'group-hover:text-orange-500 transition-colors'} />
              <span className="font-black text-[10px] uppercase tracking-widest">{item.label}</span>
            </div>
            {currentView === item.id && (
              <motion.div 
                layoutId="active-indicator"
                className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_10px_white]"
              />
            )}
          </button>
        ))}
      </nav>

      <div className="mt-auto pt-6 border-t border-white/5">
        <div className="p-4 rounded-[2rem] bg-white/5 border border-white/5 group hover:bg-white/[0.08] transition-all cursor-pointer">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 p-[1px]">
              <div className="w-full h-full rounded-2xl bg-[#111] flex items-center justify-center overflow-hidden">
                {profile.photo ? (
                  <img src={profile.photo} className="w-full h-full object-cover" alt="" />
                ) : (
                  <span className="text-orange-500 font-black text-xs">{initials}</span>
                )}
              </div>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] font-black text-white truncate">{profile.name || 'Identifique-se'}</span>
              <span className="text-[9px] text-gray-500 font-bold tracking-tighter">{profile.creci || 'Configurar Perfil'}</span>
            </div>
          </div>
        </div>
        <button 
          onClick={onLogout}
          className="w-full mt-4 flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-white/5 hover:bg-red-500/10 hover:text-red-500 transition-all text-[9px] font-black uppercase tracking-widest border border-white/5 hover:border-red-500/20"
        >
          <LogOut size={12} /> Encerrar Sessão
        </button>
      </div>
    </aside>
  );
};
