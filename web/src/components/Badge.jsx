import React from 'react';

const STATUS_CONFIG = {
  AVAILABLE: { bg: 'var(--status-available-bg)', color: 'var(--status-available-text)', label: 'Available' },
  OCCUPIED: { bg: 'var(--status-occupied-bg)', color: 'var(--status-occupied-text)', label: 'Occupied' },
  MAINTENANCE: { bg: 'var(--status-maintenance-bg)', color: 'var(--status-maintenance-text)', label: 'Maintenance' },
  RESERVED: { bg: 'var(--status-reserved-bg)', color: 'var(--status-reserved-text)', label: 'Reserved' },
  CLEANING: { bg: 'var(--status-cleaning-bg, #e0f2fe)', color: 'var(--status-cleaning-text, #0369a1)', label: 'Cleaning' },
  OUT_OF_SERVICE: { bg: 'var(--status-oos-bg, #f1f5f9)', color: 'var(--status-oos-text, #334155)', label: 'Out of Service' },
  UNKNOWN: { bg: 'var(--color-bg-surface)', color: 'var(--color-text-secondary)', label: 'Unknown' }
};

export function Badge({ status }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.UNKNOWN;

  return (
    <span
      style={{
        backgroundColor: config.bg,
        color: config.color,
        display: 'inline-flex',
        alignItems: 'center',
        padding: '0.25rem 0.75rem',
        borderRadius: 'var(--radius-full)',
        fontSize: '0.75rem',
        fontWeight: 600,
        letterSpacing: '0.025em',
      }}
    >
      <span style={{ marginRight: '0.375rem', fontSize: '0.625rem' }}>●</span>
      {config.label}
    </span>
  );
}