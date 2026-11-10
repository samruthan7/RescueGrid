import React from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export default function Toast({ toast, onClose }) {
  if (!toast) return null;

  const { type = 'success', message } = toast;

  let config = {
    bg: 'bg-surface border-gold/40 text-white',
    icon: CheckCircle2,
    iconColor: 'text-gold'
  };

  if (type === 'error') {
    config = {
      bg: 'bg-surface border-severity-critical/50 text-white',
      icon: AlertCircle,
      iconColor: 'text-severity-critical'
    };
  } else if (type === 'warning') {
    config = {
      bg: 'bg-surface border-severity-medium/50 text-white',
      icon: AlertTriangle,
      iconColor: 'text-severity-medium'
    };
  } else if (type === 'info') {
    config = {
      bg: 'bg-surface border-gold/30 text-white',
      icon: Info,
      iconColor: 'text-gold'
    };
  }

  const Icon = config.icon;

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-md animate-bounce-short">
      <div className={`flex items-start gap-3 p-4 rounded-xl border shadow-2xl backdrop-blur-md ${config.bg}`}>
        <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${config.iconColor}`} />
        <div className="flex-1 text-sm font-medium pr-2">{message}</div>
        <button
          onClick={onClose}
          className="text-zinc-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
