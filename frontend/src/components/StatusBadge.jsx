import React from 'react';
import { Clock, Shield, Activity, CheckCircle2 } from 'lucide-react';

export default function StatusBadge({ status, size = 'md' }) {
  const norm = status || 'Reported';

  let config = {
    bg: 'bg-status-reported/15',
    text: 'text-status-reported',
    border: 'border-status-reported/30',
    icon: Clock,
    label: 'Reported'
  };

  if (norm === 'Assigned') {
    config = {
      bg: 'bg-purple-500/15',
      text: 'text-[#A855F7]',
      border: 'border-purple-500/30',
      icon: Shield,
      label: 'Assigned'
    };
  } else if (norm === 'In Progress') {
    config = {
      bg: 'bg-status-inprogress/15',
      text: 'text-status-inprogress',
      border: 'border-status-inprogress/30',
      icon: Activity,
      label: 'In Progress'
    };
  } else if (norm === 'Resolved') {
    config = {
      bg: 'bg-status-resolved/15',
      text: 'text-status-resolved',
      border: 'border-status-resolved/30',
      icon: CheckCircle2,
      label: 'Resolved'
    };
  }

  const Icon = config.icon;
  const statusColor = { Reported: '#94A3B8', Assigned: '#A855F7', 'In Progress': '#3B82F6', Resolved: '#22C55E' }[config.label];

  const sizeClasses = size === 'sm' 
    ? 'text-xs px-2 py-0.5 gap-1' 
    : size === 'lg' 
    ? 'text-sm px-3.5 py-1.5 gap-2 font-semibold'
    : 'text-xs px-2.5 py-1 gap-1.5 font-medium';

  return (
    <span
      className={`inline-flex items-center rounded-full border ${sizeClasses}`}
      style={{ color: statusColor, borderColor: `${statusColor}4D`, backgroundColor: `${statusColor}26` }}
    >
      <Icon className={size === 'lg' ? 'w-4 h-4' : 'w-3.5 h-3.5'} />
      <span>{config.label}</span>
    </span>
  );
}
