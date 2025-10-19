import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView, 
  Dimensions, 
  Image,
  Alert,
  ActivityIndicator
} from 'react-native';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { useRouter } from 'expo-router';

const { width, height } = Dimensions.get('window');

// Icon components
const UserIcon = () => (
  <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6ee7b7" strokeWidth="2">
    <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <Circle cx="12" cy="7" r="4" />
  </Svg>
);

const LockIcon = () => (
  <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6ee7b7" strokeWidth="2">
    <Rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <Path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </Svg>
);

export default function Login() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Validation function
  const validateForm = () => {
    if (!username.trim()) {
      Alert.alert('Validation Error', 'Please enter your username');
      return false;
    }

    if (!password) {
      Alert.alert('Validation Error', 'Please enter your password');
      return false;
    }

    return true;
  };

  // API request function
  const handleLogin = async () => {
    // Validate form before submission
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      // Replace with your actual API endpoint
      const API_URL = 'https://0eeb7eb6ea7b.ngrok-free.app/auth/login'; // UPDATE THIS
      
      const requestBody = {
        username: username.trim(),
        password: password
      };

      console.log('Sending login request:', { username: username.trim(), password: '***' });

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (response.ok) {
        // Login successful
        console.log('Login successful:', data);
        
        // TODO: Store auth token if your backend returns one
        // Example:
        // if (data.token) {
        //   await AsyncStorage.setItem('authToken', data.token);
        //   await AsyncStorage.setItem('userId', data.userId);
        // }
        
        Alert.alert(
          'Success',
          'Login successful!',
          [
            {
              text: 'OK',
              onPress: () => {
                // Clear form
                setUsername('');
                setPassword('');
                
                // Navigate to main app (tabs)
                router.push('/(tabs)');
              },
            },
          ]
        );
      } else {
        // Handle API errors
        console.error('Login failed:', data);
        const errorMessage = data.message || data.error || 'Invalid username or password';
        Alert.alert('Login Error', errorMessage);
      }
    } catch (error) {
      // Handle network errors
      console.error('Login error:', error);
      Alert.alert(
        'Network Error',
        'Unable to connect to the server. Please check your internet connection and try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = () => {
    router.push('/createaccount');
  };

  const handleForgotPassword = () => {
    console.log('Forgot password clicked');
    Alert.alert(
      'Forgot Password',
      'Password recovery feature coming soon!',
      [{ text: 'OK' }]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Decorative circles */}
      <View style={[styles.circle, { top: 10, left: 10, width: 50, height: 50, opacity: 0.4 }]} />
      <View style={[styles.circle, { top: 30, left: 80, width: 100, height: 100, opacity: 0.3 }]} />
      <View style={[styles.circle, { top: 80, left: 200, width: 70, height: 70, opacity: 0.25 }]} />
      <View style={[styles.circle, { top: 20, right: 50, width: 85, height: 85, opacity: 0.3 }]} />
      <View style={[styles.circle, { top: 60, right: 130, width: 130, height: 130, opacity: 0.2 }]} />
      <View style={[styles.blueCircle, { top: 110, left: width / 3, width: 85, height: 85, opacity: 0.3 }]} />

      {/* Main card */}
      <View style={styles.card}>
        {/* Logo and branding */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Image 
              source={require('../assets/images/mindsphere-logo.png')} 
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          
          <View style={styles.brandingContainer}>
            <Text style={styles.brandText}>
              <Text style={styles.mindText}>Mind</Text>
              <Text style={styles.sphereText}>Sphere</Text>
            </Text>
          </View>
          
          <Text style={styles.tagline}>"Where wellness comes full circle"</Text>
        </View>

        {/* Form header */}
        <View style={styles.formHeader}>
          <Text style={styles.formTitle}>Sign In</Text>
          <Text style={styles.formSubtitle}>Welcome back! Please enter your details</Text>
        </View>

        {/* Form fields */}
        <View style={styles.formContainer}>
          {/* Username */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Username</Text>
            <View style={styles.inputWrapper}>
              <View style={styles.iconContainer}>
                <UserIcon />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Enter your username"
                placeholderTextColor="#d1d5db"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          {/* Password */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputWrapper}>
              <View style={styles.iconContainer}>
                <LockIcon />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Enter your password"
                placeholderTextColor="#d1d5db"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>
          </View>

          {/* Forgot Password */}
          <TouchableOpacity onPress={handleForgotPassword} style={styles.forgotPasswordContainer}>
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>

          {/* Submit Button */}
          <TouchableOpacity 
            style={[styles.button, isLoading && styles.buttonDisabled]} 
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color="white" size="small" />
                <Text style={styles.buttonText}>Signing In...</Text>
              </View>
            ) : (
              <Text style={styles.buttonText}>Sign In</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Sign up link */}
        <Text style={styles.signUpText}>
          Don't have an Account ?{' '}
          <Text style={styles.signUpLink} onPress={handleSignUp}>Sign up</Text>
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0fdf4',
  },
  contentContainer: {
    minHeight: height,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  circle: {
    position: 'absolute',
    backgroundColor: '#86efac',
    borderRadius: 1000,
  },
  blueCircle: {
    position: 'absolute',
    backgroundColor: '#bfdbfe',
    borderRadius: 1000,
  },
  card: {
    width: '100%',
    maxWidth: 450,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 40,
    padding: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    width: 120,
    height: 120,
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    width: 120,
    height: 120,
  },
  brandingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  brandText: {
    fontSize: 48,
    letterSpacing: 1,
  },
  mindText: {
    color: '#6ee7b7',
    fontWeight: '300',
  },
  sphereText: {
    color: '#93c5fd',
    fontWeight: '200',
  },
  tagline: {
    fontSize: 16,
    fontStyle: 'italic',
    color: '#374151',
  },
  formHeader: {
    marginBottom: 30,
  },
  formTitle: {
    fontSize: 32,
    fontWeight: '300',
    color: '#111827',
    marginBottom: 8,
  },
  formSubtitle: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#059669',
    fontWeight: '300',
  },
  formContainer: {
    gap: 24,
  },
  fieldContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 8,
  },
  labelHint: {
    fontSize: 14,
    fontWeight: '400',
    color: '#6b7280',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#6ee7b7',
    borderRadius: 16,
    backgroundColor: 'white',
  },
  iconContainer: {
    paddingLeft: 16,
    paddingRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    paddingRight: 16,
    fontSize: 16,
    color: '#111827',
  },
  forgotPasswordContainer: {
    alignItems: 'flex-end',
    marginTop: -12,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  button: {
    backgroundColor: '#6ee7b7',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '500',
  },
  signUpText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#4b5563',
    marginTop: 32,
  },
  signUpLink: {
    color: '#374151',
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
});