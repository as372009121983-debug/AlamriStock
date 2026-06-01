// Powered by OnSpace.AI
import { useContext } from 'react';
import { AdminGuardContext } from '@/contexts/AdminGuardContext';

export function useAdminGuard() {
  const ctx = useContext(AdminGuardContext);
  if (!ctx) throw new Error('useAdminGuard must be used within AdminGuardProvider');
  return ctx;
}
