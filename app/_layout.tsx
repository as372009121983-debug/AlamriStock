// Powered by OnSpace.AI
import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AlertProvider } from '@/template';
import { AuthProvider } from '@/contexts/AuthContext';
import { StoreProvider } from '@/contexts/StoreContext';
import { AdminGuardProvider } from '@/contexts/AdminGuardContext';
import { useAuth } from '@/hooks/useAuth';

const AUTH_ROUTES = new Set(['login', 'signup', 'forgot-password', 'verify-email', 'user-login']);

function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, ready, pendingSignup } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (!ready) return;
    const current = segments[0] || '';
    const inAuth = AUTH_ROUTES.has(current);

    if (!user && !inAuth) {
      router.replace('/login');
    } else if (user && inAuth && current !== 'verify-email') {
      router.replace('/(tabs)');
    } else if (user && current === 'verify-email' && !pendingSignup) {
      const t = setTimeout(() => router.replace('/(tabs)'), 1800);
      return () => clearTimeout(t);
    }
  }, [user, ready, segments, router, pendingSignup]);

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <AlertProvider>
      <SafeAreaProvider>
        <AuthProvider>
          <StoreProvider>
            <AdminGuardProvider>
              <AuthGate>
                <StatusBar style="dark" />
                <Stack screenOptions={{ headerShown: false }}>
                  <Stack.Screen name="login" />
                  <Stack.Screen name="user-login" />
                  <Stack.Screen name="signup" />
                  <Stack.Screen name="verify-email" />
                  <Stack.Screen name="forgot-password" />
                  <Stack.Screen name="(tabs)" />
                  <Stack.Screen name="suppliers" />
                  <Stack.Screen name="purchases" />
                  <Stack.Screen name="warehouses" />
                  <Stack.Screen name="transfers" />
                  <Stack.Screen name="returns" />
                  <Stack.Screen name="purchase-returns" />
                  <Stack.Screen name="expenses" />
                  <Stack.Screen name="customer-payments" />
                  <Stack.Screen name="workers" />
                  <Stack.Screen name="worker-advances" />
                  <Stack.Screen name="journal" />
                  <Stack.Screen name="profits" />
                  <Stack.Screen name="inventory" />
                  <Stack.Screen name="activity-log" />
                  <Stack.Screen name="users" />
                  <Stack.Screen name="join-requests" />
                  <Stack.Screen name="reports" />
                  <Stack.Screen name="report-view" />
                  <Stack.Screen name="ai-assistant" />
                  <Stack.Screen name="settings" />
                  <Stack.Screen name="about" />
                  <Stack.Screen name="import-products" />
                  <Stack.Screen name="import-customers" />
                  <Stack.Screen name="import-contacts" />
                  <Stack.Screen name="ocr-import" />
                  <Stack.Screen name="new-sale" options={{ presentation: 'modal' }} />
                  <Stack.Screen name="invoice/[id]" />
                  <Stack.Screen name="customer/[id]" />
                </Stack>
              </AuthGate>
            </AdminGuardProvider>
          </StoreProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </AlertProvider>
  );
}
