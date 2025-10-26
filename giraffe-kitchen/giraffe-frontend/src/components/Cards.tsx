import React from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'gradient' | 'hover' | 'stat';
  onClick?: () => void;
}

export function Card({ children, className, variant = 'default', onClick }: CardProps) {
  const baseClasses = 'rounded-2xl p-6 transition-all duration-300';

  const variantClasses = {
    default: 'bg-white/90 backdrop-blur-sm border border-gray-200 shadow-sm hover:shadow-md',
    gradient: 'bg-gradient-to-br from-white/95 to-gray-50/95 backdrop-blur-sm border border-gray-200 shadow-lg hover:shadow-xl',
    hover: 'bg-white/90 backdrop-blur-sm border-2 border-transparent hover:border-[#f97316] hover:shadow-2xl hover:-translate-y-1 cursor-pointer',
    stat: 'bg-gradient-to-br from-[#f97316] to-[#ea580c] text-white shadow-xl shadow-orange-500/30 hover:shadow-2xl hover:shadow-orange-500/40 hover:-translate-y-1',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={onClick ? { scale: 1.02 } : undefined}
      onClick={onClick}
      className={clsx(baseClasses, variantClasses[variant], className)}
    >
      {children}
    </motion.div>
  );
}

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  color?: 'orange' | 'green' | 'blue' | 'red';
}

export function StatCard({ title, value, subtitle, icon, trend, trendValue, color = 'orange' }: StatCardProps) {
  const colors = {
    orange: {
      gradient: 'from-[#f97316] to-[#ea580c]',
      shadow: 'shadow-orange-500/30 hover:shadow-orange-500/40',
    },
    green: {
      gradient: 'from-[#22c55e] to-[#16a34a]',
      shadow: 'shadow-green-500/30 hover:shadow-green-500/40',
    },
    blue: {
      gradient: 'from-[#3b82f6] to-[#2563eb]',
      shadow: 'shadow-blue-500/30 hover:shadow-blue-500/40',
    },
    red: {
      gradient: 'from-[#ef4444] to-[#dc2626]',
      shadow: 'shadow-red-500/30 hover:shadow-red-500/40',
    },
  };

  const trendIcons = {
    up: '📈',
    down: '📉',
    neutral: '➡️',
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.03, y: -4 }}
      className={clsx(
        'rounded-2xl p-6 bg-gradient-to-br text-white shadow-xl transition-all duration-300',
        colors[color].gradient,
        colors[color].shadow
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-white/80 text-sm font-medium mb-1">{title}</p>
          <h3 className="text-3xl font-bold">{value}</h3>
        </div>
        {icon && (
          <div className="text-4xl opacity-90">
            {icon}
          </div>
        )}
      </div>

      {(subtitle || trend) && (
        <div className="flex items-center gap-2 pt-4 border-t border-white/20">
          {trend && trendValue && (
            <span className="flex items-center gap-1 text-sm font-medium">
              {trendIcons[trend]} {trendValue}
            </span>
          )}
          {subtitle && (
            <span className="text-white/70 text-sm">{subtitle}</span>
          )}
        </div>
      )}
    </motion.div>
  );
}

interface ActionCardProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  onClick: () => void;
  color?: 'orange' | 'green' | 'blue' | 'purple';
}

export function ActionCard({ title, description, icon, onClick, color = 'orange' }: ActionCardProps) {
  const colors = {
    orange: 'hover:border-[#f97316] hover:bg-orange-50',
    green: 'hover:border-[#22c55e] hover:bg-green-50',
    blue: 'hover:border-[#3b82f6] hover:bg-blue-50',
    purple: 'hover:border-[#a855f7] hover:bg-purple-50',
  };

  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.05, y: -4 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={clsx(
        'w-full p-6 rounded-2xl bg-white/90 backdrop-blur-sm border-2 border-gray-200',
        'transition-all duration-300 text-right shadow-md hover:shadow-xl',
        colors[color]
      )}
    >
      <div className="flex items-center gap-4">
        {icon && (
          <div className="text-4xl flex-shrink-0">
            {icon}
          </div>
        )}
        <div className="flex-1">
          <h3 className="font-bold text-lg text-gray-900 mb-1">{title}</h3>
          {description && (
            <p className="text-sm text-gray-600">{description}</p>
          )}
        </div>
      </div>
    </motion.button>
  );
}

interface EmptyStateProps {
  icon?: string;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon = '📭', title, description, action }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center p-12 text-center"
    >
      <div className="text-7xl mb-4">{icon}</div>
      <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 mb-6 max-w-md">{description}</p>
      {action && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={action.onClick}
          className="px-6 py-3 bg-gradient-to-r from-[#f97316] to-[#ea580c] text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all"
        >
          {action.label}
        </motion.button>
      )}
    </motion.div>
  );
}

export function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-8 bg-gray-200 rounded-lg w-1/3" />
      <div className="h-4 bg-gray-200 rounded w-2/3" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 bg-gray-200 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}