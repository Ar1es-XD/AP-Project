import React, { useEffect, useRef, useId } from 'react';

export function Modal({ isOpen, onClose, title, children }) {
  const titleId = useId();
  const dialogRef = useRef(null);
  const previousActiveElement = useRef(null);
  const isBackdropMouseDown = useRef(false);

  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement;
      if (dialogRef.current) {
        dialogRef.current.focus();
      }
    } else {
      if (previousActiveElement.current) {
        previousActiveElement.current.focus();
      }
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;

      if (e.key === 'Escape' && !e.defaultPrevented) {
        e.preventDefault();
        onClose();
      }

      if (e.key === 'Tab' && dialogRef.current) {
        const focusableElements = dialogRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      onMouseDown={(e) => {
        isBackdropMouseDown.current = e.target === e.currentTarget;
      }}
      onClick={(e) => {
        if (isBackdropMouseDown.current && e.target === e.currentTarget) {
          onClose();
        }
        isBackdropMouseDown.current = false;
      }}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'var(--color-bg-overlay)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
        overflowY: 'auto',
        padding: '1rem',
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: 'var(--color-bg-primary)',
          borderRadius: 'var(--radius-lg)',
          width: '100%',
          maxWidth: '32rem',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '1.5rem',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
          outline: 'none',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 id={titleId} style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600 }}>{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem', padding: '0.25rem' }}
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}