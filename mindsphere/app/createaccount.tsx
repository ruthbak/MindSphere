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

const MailIcon = () => (
  <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6ee7b7" strokeWidth="2">
    <Rect x="2" y="4" width="20" height="16" rx="2" />
    <Path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </Svg>
);

const LockIcon = () => (
  <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6ee7b7" strokeWidth="2">
    <Rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <Path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </Svg>
);

export default function CreateAccount() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Validation function
  const validateForm = () => {
    if (!displayName.trim()) {
      Alert.alert('Validation Error', 'Please enter a display name');
      return false;
    }
    
    if (displayName.trim().length < 3) {
      Alert.alert('Validation Error', 'Display name must be at least 3 characters');
      return false;
    }

    if (!email.trim()) {
      Alert.alert('Validation Error', 'Please enter an email address');
      return false;
    }

    if (!isValidEmail(email)) {
      Alert.alert('Validation Error', 'Please enter a valid email address');
      return false;
    }

    if (!password) {
      Alert.alert('Validation Error', 'Please enter a password');
      return false;
    }

    if (password.length < 8) {
      Alert.alert('Validation Error', 'Password must be at least 8 characters');
      return false;
    }

    return true;
  };

  // Email validation helper
  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Generate username from display name
  const generateUsername = (displayName: string) => {
    // Remove spaces and special characters, convert to lowercase
    const username = displayName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
    
    // Add random numbers if username is too short
    if (username.length < 3) {
      return username + Math.floor(Math.random() * 1000);
    }
    
    return username;
  };

  // API request function
  const handleSubmit = async () => {
    // Validate form before submission
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      // Updated API endpoint with /register path
      const API_URL = 'https://mindsphere-backend.onrender.com/auth/register';
      
      // Generate username from display name
      const username = generateUsername(displayName);

      const requestBody = {
        username: username,
        email: email.trim(),
        password: password,
        display_name: displayName.trim(),
        anonymous_mode: false,
        language_preference: "en"
      };

      console.log('Sending registration request:', { ...requestBody, password: '*' });

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (response.ok) {
        // Registration successful
        console.log('Registration successful:', data);
        
        Alert.alert(
          'Success',
          'Account created successfully!',
          [
            {
              text: 'OK',
              onPress: () => {
                // Clear form
                setDisplayName('');
                setEmail('');
                setPassword('');
                
                // Navigate to login
                router.push('/login');
              },
            },
          ]
        );
      } else {
        // Handle API errors
        console.error('Registration failed:', data);
        const errorMessage = data.message || data.error || 'Registration failed. Please try again.';
        Alert.alert('Registration Error', errorMessage);
      }
    } catch (error) {
      // Handle network errors
      console.error('Registration error:', error);
      Alert.alert(
        'Network Error',
        'Unable to connect to the server. Please check your internet connection and try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = () => {
    router.push('/login');
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
          <Text style={styles.formTitle}>Create account</Text>
          <Text style={styles.formSubtitle}>Protecting your privacy while supporting your mind</Text>
        </View>

        {/* Form fields */}
        <View style={styles.formContainer}>
          {/* Display Name */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>
              Choose a Display Name{' '}
              <Text style={styles.labelHint}>(no real name required)</Text>
            </Text>
            <View style={styles.inputWrapper}>
              <View style={styles.iconContainer}>
                <UserIcon />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Enter your display name"
                placeholderTextColor="#d1d5db"
                value={displayName}
                onChangeText={setDisplayName}
              />
            </View>
          </View>

          {/* Email */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>
              Email{' '}
              <Text style={styles.labelHint}>(Required for account recovery)</Text>
            </Text>
            <View style={styles.inputWrapper}>
              <View style={styles.iconContainer}>
                <MailIcon />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                placeholderTextColor="#d1d5db"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
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
              />
            </View>
          </View>

          {/* Terms */}
          <Text style={styles.termsText}>
            By signing up, you agree to our{' '}
            <Text style={styles.link}>Terms & Conditions</Text>
            {' '}and{' '}
            <Text style={styles.link}>Privacy Policy</Text>
          </Text>

          {/* Submit Button */}
          <TouchableOpacity 
            style={[styles.button, isLoading && styles.buttonDisabled]} 
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color="white" size="small" />
                <Text style={styles.buttonText}>Creating Account...</Text>
              </View>
            ) : (
              <Text style={styles.buttonText}>Create Account</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Sign in link */}
        <Text style={styles.signInText}>
          Already have an Account ?{' '}
          <Text style={styles.signInLink} onPress={handleSignIn}>Sign in</Text>
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
  termsText: {
    fontSize: 12,
    textAlign: 'center',
    color: '#6b7280',
    marginTop: 8,
    lineHeight: 18,
  },
  link: {
    color: '#3b82f6',
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
  signInText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#4b5563',
    marginTop: 32,
  },
  signInLink: {
    color: '#374151',
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
});