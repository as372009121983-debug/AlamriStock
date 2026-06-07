// Powered by OnSpace.AI
import React, { createContext, ReactNode, useCallback, useState } from 'react';
import { AdminPasswordModal } from '@/components/ui/AdminPasswordModal';
import { useStore } from '@/hooks/useStore';

export type GuardRequest = {
  title?: string;
  description?: string;
  action: () => void | Promise<void>;
};

export type AdminGuardContextType = {
  guard: (request: GuardRequest) => void;
};

export const AdminGuardContext = createContext<AdminGuardContextType | undefined>(undefined);

export function AdminGuardProvider({ children }: { children: ReactNode }) {
  const { settings } = useStore();
  const [pending, setPending] = useState<GuardRequest | null>(null);

  const guard = useCallback((request: GuardRequest) => {
    if (settings.adminPasswordEnabled === false) {
      Promise.resolve(request.action()).catch((e) => {
        console.warn('Direct action failed', e);
      });
      return;
    }
    setPending(request);
  }, [settings.adminPasswordEnabled]);

  const handleSuccess = useCallback(async () => {
    if (pending) {
      try {
        await pending.action();
      } catch (e) {
        console.warn('Guarded action failed', e);
      }
    }
  }, [pending]);

  return (
    <AdminGuardContext.Provider value={{ guard }}>
      {children}
      <AdminPasswordModal
        visible={!!pending}
        title={pending?.title || 'تأكيد المدير'}
        description={pending?.description || 'أدخل كلمة مرور المدير لإتمام العملية'}
        expectedPassword={settings.adminPassword || '0'}
        onClose={() => setPending(null)}
        onSuccess={handleSuccess}
      />
    </AdminGuardContext.Provider>
  );
}
