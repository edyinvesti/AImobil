import React from 'react';
import { Plus, Home, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

interface EmptyPortfolioProps {
  onAddClick: () => void;
}

export function EmptyPortfolio({ onAddClick }: EmptyPortfolioProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <motion.div 
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative mb-8"
      >
        <div className="w-24 h-24 bg-orange-500/10 rounded-3xl flex items-center justify-center border border-orange-500/20 relative z-10">
          <Home className="text-orange-500" size={40} />
        </div>
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
          className="absolute -top-4 -right-4 w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center border border-blue-500/20 blur-sm"
        />
        <Sparkles className="absolute -bottom-2 -left-2 text-yellow-500 animate-pulse" size={24} />
      </motion.div>

      <h2 className="text-2xl font-black text-white mb-2 uppercase tracking-tighter">Sua Carteira está Vazia</h2>
      <p className="text-gray-500 text-sm max-w-xs mb-10 leading-relaxed">
        Comece a cadastrar seus imóveis de alto luxo e deixe nossa IA gerar as melhores descrições para você.
      </p>

      <button
        onClick={onAddClick}
        className="flex items-center gap-2 px-8 py-4 bg-orange-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20 active:scale-95"
      >
        <Plus size={18} /> Cadastrar Primeiro Imóvel
      </button>
    </div>
  );
}
