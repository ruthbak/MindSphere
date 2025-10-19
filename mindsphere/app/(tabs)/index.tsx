import React, { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import Login from '../login';

export default function Index() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  // Check if user is already logged in (from AsyncStorage, SecureStore, etc.)
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async (): Promise<void> => {
    try {
      // TODO: Check if user token exists in AsyncStorage/SecureStore
      // const token = await AsyncStorage.getItem('userToken');
      // if (token) {
      //   setIsAuthenticated(true);
      //   router.replace('/(tabs)');
      // }
    } catch (error) {
      console.error('Error checking auth status:', error);
    }
  };

  const handleLoginSuccess = (): void => {
    // TODO: Save user token to AsyncStorage/SecureStore
    // await AsyncStorage.setItem('userToken', token);
    setIsAuthenticated(true);
    router.replace('/(tabs)');
  };

  // If authenticated, navigate to tabs (this prevents flash of login screen)
  if (isAuthenticated) {
    return null;
  }

  return <Login onLoginSuccess={handleLoginSuccess} />;
}