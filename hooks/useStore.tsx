// Powered by OnSpace.AI
import { useContext } from 'react';
import { StoreContext, StoreContextType } from '@/contexts/StoreContext';

export function useStore(): StoreContextType {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
