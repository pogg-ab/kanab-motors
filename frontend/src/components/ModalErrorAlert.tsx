import React from 'react';
import { AlertCircle, X } from 'lucide-react';

interface ModalErrorAlertProps {
  error: string | null | undefined;
  onDismiss?: () => void;
}

export const ModalErrorAlert: React.FC<ModalErrorAlertProps> = ({ error, onDismiss }) => {
  if (!error) return null;

  return (
    <div
      className="alert-banner-danger"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.65rem',
        marginBottom: '1.25rem',
      }}
    >
      <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
      <div style={{ flex: 1, wordBreak: 'break-word', fontSize: '0.85rem', lineHeight: 1.45 }}>
        {error}
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'inherit',
            cursor: 'pointer',
            padding: '0 0.2rem',
            opacity: 0.75,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title="Dismiss error message"
        >
          <X size={15} />
        </button>
      )}
    </div>
  );
};
