import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Info, AlertCircle, X, Trash2 } from 'lucide-react';

export type ModalVariant = 'info' | 'success' | 'warning' | 'danger' | 'cyan';

export interface AlertOptions {
  title: string;
  message: string;
  details?: string | ReactNode;
  buttonText?: string;
  variant?: ModalVariant;
}

export interface ConfirmOptions {
  title: string;
  message: string;
  details?: string | ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: ModalVariant;
}

interface ModalContextType {
  showAlert: (options: AlertOptions) => Promise<void>;
  showConfirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const ModalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    isConfirm: boolean;
    title: string;
    message: string;
    details?: string | ReactNode;
    confirmText: string;
    cancelText: string;
    variant: ModalVariant;
    resolve: (val: any) => void;
  } | null>(null);

  const showAlert = useCallback((options: AlertOptions): Promise<void> => {
    return new Promise((resolve) => {
      setModalState({
        isOpen: true,
        isConfirm: false,
        title: options.title,
        message: options.message,
        details: options.details,
        confirmText: options.buttonText || 'OK',
        cancelText: '',
        variant: options.variant || 'info',
        resolve: () => resolve(),
      });
    });
  }, []);

  const showConfirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setModalState({
        isOpen: true,
        isConfirm: true,
        title: options.title,
        message: options.message,
        details: options.details,
        confirmText: options.confirmText || 'Confirm',
        cancelText: options.cancelText || 'Cancel',
        variant: options.variant || 'warning',
        resolve: (val: boolean) => resolve(val),
      });
    });
  }, []);

  const handleClose = (confirmed: boolean) => {
    if (modalState) {
      modalState.resolve(confirmed);
      setModalState(null);
    }
  };

  const getVariantStyles = (variant: ModalVariant) => {
    switch (variant) {
      case 'danger':
        return {
          color: 'var(--accent-rose)',
          bg: 'rgba(244, 63, 94, 0.12)',
          border: 'rgba(244, 63, 94, 0.3)',
          icon: <AlertCircle size={22} />,
          btnClass: 'btn btn-rose',
        };
      case 'warning':
        return {
          color: 'var(--accent-amber)',
          bg: 'rgba(245, 158, 11, 0.12)',
          border: 'rgba(245, 158, 11, 0.3)',
          icon: <AlertTriangle size={22} />,
          btnClass: 'btn btn-amber',
        };
      case 'success':
        return {
          color: 'var(--accent-emerald)',
          bg: 'rgba(16, 185, 129, 0.12)',
          border: 'rgba(16, 185, 129, 0.3)',
          icon: <CheckCircle2 size={22} />,
          btnClass: 'btn btn-cyan',
        };
      case 'cyan':
      case 'info':
      default:
        return {
          color: 'var(--accent-cyan)',
          bg: 'rgba(6, 182, 212, 0.12)',
          border: 'rgba(6, 182, 212, 0.3)',
          icon: <Info size={22} />,
          btnClass: 'btn btn-cyan',
        };
    }
  };

  return (
    <ModalContext.Provider value={{ showAlert, showConfirm }}>
      {children}

      {modalState?.isOpen && (
        <div
          className="modal-backdrop"
          onClick={() => handleClose(false)}
          style={{ zIndex: 1500 }}
        >
          <div
            className="modal-content"
            style={{ maxWidth: '500px', width: '95%' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            {(() => {
              const styles = getVariantStyles(modalState.variant);
              return (
                <>
                  <div className="modal-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                      <div
                        style={{
                          padding: '0.6rem',
                          borderRadius: 'var(--radius-md)',
                          background: styles.bg,
                          border: `1px solid ${styles.border}`,
                          color: styles.color,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {styles.icon}
                      </div>
                      <div>
                        <h3
                          style={{
                            fontSize: '1.2rem',
                            fontWeight: 800,
                            margin: 0,
                            color: 'var(--text-primary)',
                          }}
                        >
                          {modalState.title}
                        </h3>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleClose(false)}
                      className="btn btn-secondary"
                      style={{ padding: '0.35rem 0.65rem', borderRadius: '8px' }}
                    >
                      <X size={16} />
                    </button>
                  </div>

                  {/* Modal Body */}
                  <div className="modal-body">
                    <div
                      style={{
                        fontSize: '0.9rem',
                        color: 'var(--text-secondary)',
                        lineHeight: 1.5,
                      }}
                    >
                      {modalState.message}
                    </div>

                    {modalState.details && (
                      <div
                        style={{
                          marginTop: '1rem',
                          padding: '0.75rem 1rem',
                          borderRadius: 'var(--radius-md)',
                          background: 'var(--bg-tertiary)',
                          border: '1px solid var(--border-color)',
                          fontSize: '0.8rem',
                          color: 'var(--text-muted)',
                        }}
                      >
                        {modalState.details}
                      </div>
                    )}
                  </div>

                  {/* Modal Footer */}
                  <div className="modal-footer">
                    {modalState.isConfirm && (
                      <button
                        type="button"
                        onClick={() => handleClose(false)}
                        className="btn btn-secondary"
                      >
                        {modalState.cancelText}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleClose(true)}
                      className={styles.btnClass}
                    >
                      {modalState.confirmText}
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </ModalContext.Provider>
  );
};

export const useModal = (): ModalContextType => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
};
