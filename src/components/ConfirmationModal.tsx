import React from 'react';
import { AlertCircle, X, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="glass rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl p-8 space-y-8 border border-white/5"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex flex-col items-center text-center gap-6">
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center text-red-500">
                <AlertCircle size={32} />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black text-white tracking-tight">{title}</h3>
                <p className="text-gray-500 font-medium text-sm">{message}</p>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={onClose}
                className="flex-1 py-4 border border-white/10 rounded-2xl font-black text-[10px] uppercase tracking-widest text-gray-400 hover:bg-white/5 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
                className="flex-1 py-4 bg-red-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-red-200 hover:bg-red-600 hover:-translate-y-1 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Trash2 size={14} /> Confirmar Exclusão
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
