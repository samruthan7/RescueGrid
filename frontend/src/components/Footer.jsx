import React from 'react';
import { Shield, ExternalLink, Heart } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="w-full bg-[#0E0E0E] border-t border-gold/15 py-8 px-4 text-xs text-zinc-400 mt-auto">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-gold" />
          <span className="font-semibold text-gold">RescueGrid</span>
          <span>&copy; {new Date().getFullYear()} Code Clash 2026 Round 1. All rights reserved.</span>
        </div>

        <div className="flex items-center gap-6">
          <span className="text-zinc-500">Emergency Protocol Standard 112/911</span>
          <span className="inline-flex items-center gap-1 text-gold/80">
            Engineered for High-Reliability Disaster Response
          </span>
        </div>
      </div>
    </footer>
  );
}
