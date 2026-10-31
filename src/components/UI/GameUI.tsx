'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';

// ─── BUTTON ─────────────────────────────────────────────────────────────────

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline' | 'gold';
type ButtonSize = 'sm' | 'md' | 'lg' | 'xl';

interface GameButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: LucideIcon;
  iconRight?: LucideIcon;
  fullWidth?: boolean;
  children: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white border-blue-500/30',
  secondary:
    'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white border-emerald-500/30',
  danger:
    'bg-red-600 hover:bg-red-500 active:bg-red-700 text-white border-red-500/30',
  ghost:
    'bg-white/5 hover:bg-white/10 active:bg-white/[0.07] text-slate-200 border-white/10',
  outline:
    'bg-transparent hover:bg-white/5 active:bg-white/[0.07] text-slate-300 border-slate-600 hover:border-slate-500',
  gold:
    'bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white border-amber-500/30',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-lg',
  md: 'h-10 px-4 text-sm gap-2 rounded-xl',
  lg: 'h-12 px-5 text-sm gap-2.5 rounded-xl',
  xl: 'h-14 px-6 text-base gap-3 rounded-2xl',
};

export const GameButton: React.FC<GameButtonProps> = ({
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconRight: IconRight,
  fullWidth = false,
  children,
  className = '',
  ...props
}) => {
  return (
    <button
      className={`
        inline-flex items-center justify-center font-game font-bold uppercase tracking-wider
        border transition-all duration-150 active:scale-[0.97] cursor-pointer select-none
        ${variantStyles[variant]} ${sizeStyles[size]}
        ${fullWidth ? 'w-full' : ''}
        disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100
        ${className}
      `}
      {...props}
    >
      {Icon && <Icon className="w-4 h-4 flex-shrink-0" />}
      <span>{children}</span>
      {IconRight && <IconRight className="w-4 h-4 flex-shrink-0" />}
    </button>
  );
};

// ─── ICON BUTTON ────────────────────────────────────────────────────────────

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'ghost' | 'outline' | 'filled';
  active?: boolean;
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon: Icon,
  size = 'md',
  variant = 'ghost',
  active = false,
  className = '',
  ...props
}) => {
  const sizeMap = {
    sm: 'w-8 h-8',
    md: 'w-9 h-9 sm:w-10 sm:h-10',
    lg: 'w-11 h-11',
  };
  const iconSizeMap = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };
  const variantMap = {
    ghost: 'bg-white/5 hover:bg-white/10 border-white/10 hover:border-white/20 text-slate-300 hover:text-white',
    outline: 'bg-transparent hover:bg-white/5 border-slate-600 hover:border-slate-500 text-slate-400 hover:text-white',
    filled: 'bg-surface hover:bg-surface-elevated border-game-border text-slate-300 hover:text-white',
  };

  return (
    <button
      className={`
        ${sizeMap[size]} rounded-xl border flex items-center justify-center
        transition-all duration-150 active:scale-95 cursor-pointer
        ${active ? 'bg-blue-600/20 border-blue-500/50 text-blue-400' : variantMap[variant]}
        ${className}
      `}
      {...props}
    >
      <Icon className={iconSizeMap[size]} />
    </button>
  );
};

// ─── MODAL ──────────────────────────────────────────────────────────────────

interface ModalProps {
  children: React.ReactNode;
  maxWidth?: string;
}

export const Modal: React.FC<ModalProps> = ({ children, maxWidth = 'max-w-md' }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div
        className={`w-full ${maxWidth} bg-[#111827] border border-[#1e293b] rounded-2xl overflow-hidden animate-fade-in-scale`}
      >
        {children}
      </div>
    </div>
  );
};

// ─── MODAL HEADER ───────────────────────────────────────────────────────────

interface ModalHeaderProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  onClose: () => void;
}

export const ModalHeader: React.FC<ModalHeaderProps> = ({
  title,
  subtitle,
  icon: Icon,
  onClose,
}) => {
  return (
    <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e293b]">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="w-9 h-9 rounded-xl bg-blue-600/15 border border-blue-500/20 flex items-center justify-center">
            <Icon className="w-4.5 h-4.5 text-blue-400" />
          </div>
        )}
        <div>
          <h2 className="text-lg font-game font-bold text-white tracking-wide">
            {title}
          </h2>
          {subtitle && (
            <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
      <button
        onClick={onClose}
        className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
};

// ─── MODAL FOOTER ───────────────────────────────────────────────────────────

interface ModalFooterProps {
  children: React.ReactNode;
}

export const ModalFooter: React.FC<ModalFooterProps> = ({ children }) => {
  return (
    <div className="px-5 py-4 border-t border-[#1e293b] flex items-center justify-end gap-2">
      {children}
    </div>
  );
};

// ─── TOGGLE SWITCH ──────────────────────────────────────────────────────────

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  color?: 'blue' | 'emerald' | 'red' | 'amber';
}

const toggleColorMap = {
  blue: 'bg-blue-600',
  emerald: 'bg-emerald-600',
  red: 'bg-red-600',
  amber: 'bg-amber-600',
};

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  checked,
  onChange,
  color = 'blue',
}) => {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`w-11 h-6 rounded-full transition-colors relative flex items-center p-0.5 cursor-pointer flex-shrink-0 ${
        checked ? toggleColorMap[color] : 'bg-slate-700'
      }`}
    >
      <div
        className={`w-5 h-5 rounded-full bg-white transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
};

// ─── OPTION CHIP ────────────────────────────────────────────────────────────

interface OptionChipProps {
  label: string;
  active: boolean;
  onClick: () => void;
  compact?: boolean;
}

export const OptionChip: React.FC<OptionChipProps> = ({
  label,
  active,
  onClick,
  compact = false,
}) => {
  return (
    <button
      onClick={onClick}
      className={`
        ${compact ? 'py-1.5 px-2.5 text-xs' : 'py-2 px-3 text-xs'}
        rounded-lg font-semibold capitalize border transition-all cursor-pointer
        ${
          active
            ? 'bg-blue-600/20 border-blue-500/50 text-blue-300'
            : 'bg-white/[0.03] border-[#1e293b] text-slate-400 hover:border-slate-600 hover:text-slate-300'
        }
      `}
    >
      {label}
    </button>
  );
};

// ─── STAT CARD ──────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  color?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  icon: Icon,
  color = 'text-slate-100',
}) => {
  return (
    <div className="bg-[#0d1117] border border-[#1e293b] rounded-xl p-3 flex flex-col items-center gap-1">
      <div className="flex items-center gap-1.5">
        {Icon && <Icon className="w-3 h-3 text-slate-500" />}
        <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-500">
          {label}
        </span>
      </div>
      <span className={`text-lg font-game font-bold ${color} tabular-nums`}>
        {value}
      </span>
    </div>
  );
};

// ─── BADGE ──────────────────────────────────────────────────────────────────

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
}

const badgeVariants = {
  default: 'bg-slate-700/50 border-slate-600/50 text-slate-300',
  success: 'bg-emerald-900/40 border-emerald-700/40 text-emerald-400',
  warning: 'bg-amber-900/40 border-amber-700/40 text-amber-400',
  danger: 'bg-red-900/40 border-red-700/40 text-red-400',
  info: 'bg-blue-900/40 border-blue-700/40 text-blue-400',
};

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'default' }) => {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${badgeVariants[variant]}`}
    >
      {children}
    </span>
  );
};

// ─── SECTION LABEL ──────────────────────────────────────────────────────────

interface SectionLabelProps {
  children: React.ReactNode;
  trailing?: React.ReactNode;
}

export const SectionLabel: React.FC<SectionLabelProps> = ({ children, trailing }) => {
  return (
    <div className="flex items-center justify-between mb-2">
      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
        {children}
      </label>
      {trailing && <span className="text-[10px] text-slate-400">{trailing}</span>}
    </div>
  );
};

// ─── SETTING ROW ────────────────────────────────────────────────────────────

interface SettingRowProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  border?: boolean;
}

export const SettingRow: React.FC<SettingRowProps> = ({
  title,
  description,
  children,
  border = false,
}) => {
  return (
    <div
      className={`flex items-center justify-between py-3 ${
        border ? 'border-t border-[#1e293b]' : ''
      }`}
    >
      <div className="flex-1 min-w-0 mr-3">
        <div className="text-sm font-medium text-slate-200">{title}</div>
        {description && (
          <div className="text-xs text-slate-500 mt-0.5">{description}</div>
        )}
      </div>
      {children}
    </div>
  );
};

