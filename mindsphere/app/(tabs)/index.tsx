// FILE: app/index.tsx
// ============================================
import React, { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      // Replace with actual auth check
      const isLoggedIn = false;
      
      if (isLoggedIn) {
        router.replace('/homepage');
      } else {
        router.replace('/login');
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#14B8A6" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#A7D8C3',
  },
});