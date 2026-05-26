import React from 'react';
import { Home, Plus, User, Search, CreditCard, Layout } from 'lucide-react';
import { motion } from 'framer-motion';

interface BottomBarProps {
  currentView: string;
  onViewChange: (view: any) => void;
}

export const BottomBar: React.FC<BottomBarProps> = ({ currentView, onViewChange }) => {
  const tabs = [
    { id: 'dashboard', label: 'Início', icon: Home },
    { id: 'appointments', label: 'Agenda', icon: Layout },
    { id: 'form', label: 'Add', icon: Plus, primary: true },
    { id: 'business-card', label: 'Cartão', icon: CreditCard },
    { id: 'profile', label: 'Perfil', icon: User },
  ];

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 px-6 pb-6 pt-2 bg-gradient-to-t from-black to-transparent pointer-events-none">
      <nav className="glass-dark rounded-3xl p-2 flex justify-between items-center pointer-events-auto shadow-2xl">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onViewChange(tab.id)}
            className={`relative flex flex-col items-center justify-center transition-all ${
              tab.primary 
                ? 'w-14 h-14 bg-orange-500 rounded-2xl text-white shadow-lg shadow-orange-500/40 -translate-y-2' 
                : 'flex-1 h-12 text-gray-500 hover:text-white'
            }`}
          >
            {currentView === tab.id && !tab.primary && (
              <motion.div
                layoutId="active-tab-mobile"
                className="absolute inset-0 bg-white/5 rounded-xl"
              />
            )}
            <tab.icon 
                size={tab.primary ? 28 : 20} 
                className={currentView === tab.id ? 'text-orange-500' : ''} 
            />
            {!tab.primary && <span className={`text-[8px] font-black uppercase tracking-widest mt-1 ${currentView === tab.id ? 'text-white' : 'text-gray-600'}`}>{tab.label}</span>}
          </button>
        ))}
      </nav>
    </div>
  );
};
