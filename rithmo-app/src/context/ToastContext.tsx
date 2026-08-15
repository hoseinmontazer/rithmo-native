/**
 * ToastContext — Global toast state
 * Wrap the app in <ToastProvider> and call useToast() anywhere.
 */
import React, { createContext, useContext, useCallback, useState, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { Toast, ToastType } from '@components/ui/Toast';

interface ShowToastOptions {
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextValue {
  show: (opts: ShowToastOptions) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

interface ToastState extends ShowToastOptions {
  visible: boolean;
  id: number;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastState>({
    visible: false,
    type: 'info',
    title: '',
    id: 0,
  });
  const idRef = useRef(0);

  const show = useCallback((opts: ShowToastOptions) => {
    idRef.current += 1;
    setToast({ ...opts, visible: true, id: idRef.current });
  }, []);

  const success = useCallback((title: string, message?: string) =>
    show({ type: 'success', title, message }), [show]);

  const error = useCallback((title: string, message?: string) =>
    show({ type: 'error', title, message }), [show]);

  const warning = useCallback((title: string, message?: string) =>
    show({ type: 'warning', title, message }), [show]);

  const info = useCallback((title: string, message?: string) =>
    show({ type: 'info', title, message }), [show]);

  const dismiss = useCallback(() => {
    setToast(prev => ({ ...prev, visible: false }));
  }, []);

  return (
    <ToastContext.Provider value={{ show, success, error, warning, info }}>
      <View style={styles.root}>
        {children}
        <Toast
          key={toast.id}
          visible={toast.visible}
          type={toast.type}
          title={toast.title}
          message={toast.message}
          duration={toast.duration}
          onDismiss={dismiss}
        />
      </View>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
