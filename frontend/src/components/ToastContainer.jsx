import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const ICONS = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

const COLORS = {
  success: 'bg-accent-secondary/15 border-accent-secondary/30 text-accent-secondary',
  error: 'bg-red-50 border-red-200 text-red-600',
  info: 'bg-accent/10 border-accent/20 text-accent',
};

export default function ToastContainer({ toasts, onRemove }) {
  return (
    <div className="fixed bottom-6 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => {
          const Icon = ICONS[toast.type] || Info;
          return (
            <motion.div
              key={toast.id}
              className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-lg border shadow-lg ${COLORS[toast.type] || COLORS.info}`}
              initial={{ opacity: 0, x: 60, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 60, scale: 0.9 }}
              transition={{ duration: 0.2 }}
            >
              <Icon size={16} className="mt-0.5 flex-shrink-0" />
              <p className="text-sm flex-1">{toast.message}</p>
              <button onClick={() => onRemove(toast.id)} className="flex-shrink-0 opacity-60 hover:opacity-100">
                <X size={14} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
