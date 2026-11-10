import React from 'react';
import { AlertTriangle, ShieldAlert, AlertCircle, Info } from 'lucide-react';

export default function SeverityBadge({ severity, showPulse = true, size = 'md' }) {
  const norm = severity || 'Low';

  let config = {
    bg: 'bg-severity-low/15',
    text: 'text-severity-low',
    border: 'border-severity-low/30',
    icon: Info,
    label: 'Low'
  };

  if (norm === 'Medium') {
    config = {
      bg: 'bg-severity-medium/15',
      text: 'text-severity-medium',
      border: 'border-severity-medium/30',
      icon: AlertCircle,
      label: 'Medium'
    };
  } else if (norm === 'High') {
    config = {
      bg: 'bg-severity-high/15',
      text: 'text-severity-high',
      border: 'border-severity-high/30',
      icon: AlertTriangle,
      label: 'High'
    };
  } else if (norm === 'Critical') {
    config = {
      bg: 'bg-severity-critical/20',
      text: 'text-severity-critical',
      border: 'border-severity-critical/40',
      icon: ShieldAlert,
      label: 'Critical'
    };
  }

  const Icon = config.icon;
  const isCritical = norm === 'Critical';

  const sizeClasses = size === 'sm' 
    ? 'text-xs px-2 py-0.5 gap-1' 
    : size === 'lg' 
    ? 'text-sm px-3.5 py-1.5 gap-2 font-semibold'
    : 'text-xs px-2.5 py-1 gap-1.5 font-medium';

  return (
    <span
      className={`inline-flex items-center rounded-full border ${config.bg} ${config.text} ${config.border} ${sizeClasses} ${
        isCritical && showPulse ? 'animate-pulse' : ''
      }`}
    >
      <Icon className={size === 'lg' ? 'w-4 h-4' : 'w-3.5 h-3.5'} />
      <span>{config.label}</span>
    </span>
  );
}
