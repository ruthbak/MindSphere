// ============================================
// FILE: app/_layout.tsx
// ============================================
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="createaccount" />
        <Stack.Screen name="homepage" />
        <Stack.Screen name="community" />
        <Stack.Screen name="pro-help" />
        <Stack.Screen name="safe-report" />
        <Stack.Screen name="meditation" />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}