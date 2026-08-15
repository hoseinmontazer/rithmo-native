/**
 * ConfirmContext — Global confirmation sheet
 * Wrap app in <ConfirmProvider> and call useConfirm() anywhere.
 *
 * Usage:
 *   const confirm = useConfirm();
 *   const ok = await confirm({
 *     title: 'Delete Period?',
 *     message: 'This cannot be undone.',
 *     confirmLabel: 'Delete',
 *     variant: 'danger',
 *   });
 *   if (ok) doDelete();
 */
import React, { createContext, useContext, useCallback, useRef, useState } from 'react';
import { ConfirmSheet, ConfirmSheetVariant } from '@components/ui/ConfirmSheet';

interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmSheetVariant;
  icon?: string;
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

interface SheetState extends ConfirmOptions {
  visible: boolean;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [sheet, setSheet] = useState<SheetState>({
    visible: false,
    title: '',
  });

  // Holds the resolve fn of the current pending promise
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
      setSheet({ ...opts, visible: true });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    setSheet(s => ({ ...s, visible: false }));
    resolveRef.current?.(true);
    resolveRef.current = null;
  }, []);

  const handleCancel = useCallback(() => {
    setSheet(s => ({ ...s, visible: false }));
    resolveRef.current?.(false);
    resolveRef.current = null;
  }, []);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <ConfirmSheet
        visible={sheet.visible}
        title={sheet.title}
        message={sheet.message}
        confirmLabel={sheet.confirmLabel}
        cancelLabel={sheet.cancelLabel}
        variant={sheet.variant}
        icon={sheet.icon}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used inside <ConfirmProvider>');
  return ctx;
}
