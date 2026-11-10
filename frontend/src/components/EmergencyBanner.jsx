import React from 'react';
import { PhoneCall, AlertTriangle } from 'lucide-react';

export default function EmergencyBanner() {
  return (
    <div className="w-full bg-[#181104] border-b border-gold/40 text-white px-4 py-2.5 shadow-md">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs sm:text-sm">
        <div className="flex items-center gap-2 text-center sm:text-left">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-severity-critical opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-severity-critical"></span>
          </span>
          <AlertTriangle className="w-4 h-4 text-gold shrink-0 hidden sm:inline" />
          <span>
            <strong className="text-gold font-semibold">In immediate danger?</strong> Call{' '}
            <a
              href="tel:112"
              className="inline-flex items-center font-bold text-white underline decoration-gold underline-offset-2 hover:text-gold transition-colors"
            >
              112
            </a>{' '}
            now. This platform does not replace official emergency dispatch services.
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <a
            href="tel:112"
            className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-severity-critical/20 border border-severity-critical/50 text-severity-critical hover:bg-severity-critical hover:text-white transition-all font-semibold text-xs tracking-wider uppercase"
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span>Emergency: 112</span>
          </a>
        </div>
      </div>
    </div>
  );
}
