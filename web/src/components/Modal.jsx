import React, { useEffect } from 'react';

export function Modal({ isOpen, onClose, title, children }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !e.defaultPrevented) onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'var(--color-bg-overlay)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, overflowY: 'auto', padding: '1rem' }}>
      <div role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()} style={{ backgroundColor: 'var(--color-bg-primary)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: '32rem', maxHeight: '90vh', overflowY: 'auto', padding: '1.5rem', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600 }}>{title}</h3>
          <button onClick={onClose} aria-label="Close dialog" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem', padding: '0.25rem' }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}
