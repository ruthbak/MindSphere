import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { 
  Circle, 
  Path, 
  Defs, 
  LinearGradient as SvgLinearGradient, 
  Stop 
} from 'react-native-svg';

const MindSphereLogo: React.FC = () => {
  return (
    <Svg width={80} height={80} viewBox="0 0 100 100">
      <Defs>
        <SvgLinearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#4FC3F7" stopOpacity="1" />
          <Stop offset="100%" stopColor="#81C784" stopOpacity="1" />
        </SvgLinearGradient>
      </Defs>
      <Circle cx="50" cy="50" r="45" fill="none" stroke="url(#gradient1)" strokeWidth="3" opacity="0.3" />
      <Path 
        d="M 30 45 Q 35 35 50 40 Q 65 35 70 45 Q 70 55 50 70 Q 30 55 30 45 Z" 
        fill="url(#gradient1)" 
        opacity="0.7"
      />
      <Circle 
        cx="50" 
        cy="50" 
        r="35" 
        fill="none" 
        stroke="url(#gradient1)" 
        strokeWidth="4" 
        strokeDasharray="10,5" 
        opacity="0.5"
      />
    </Svg>
  );
};

const UserIcon: React.FC = () => {
  return (
    <Svg width={20} height={20} viewBox="0 0 20 20" fill="#81C784">
      <Path 
        fillRule="evenodd" 
        d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" 
        clipRule="evenodd"
      />
    </Svg>
  );
};

const LockIcon: React.FC = () => {
  return (
    <Svg width={20} height={20} viewBox="0 0 20 20" fill="#81C784">
      <Path 
        fillRule="evenodd" 
        d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" 
        clipRule="evenodd"
      />
    </Svg>
  );
};

interface LoginProps {
  onLoginSuccess?: () => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [displayName, setDisplayName] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleLogin = async (): Promise<void> => {
    if (!displayName || !password) {
      alert('Please enter both display name and password');
      return;
    }

    setIsLoading(true);
    
    try {
      // TODO: Replace with your actual API call
      console.log('Login attempted with:', { displayName, password });
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // On successful login
      if (onLoginSuccess) {
        onLoginSuccess();
      }
    } catch (error) {
      console.error('Login error:', error);
      alert('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = (): void => {
    console.log('Forgot password clicked');
    // Add forgot password logic here
  };

  const handleSignUp = (): void => {
    console.log('Sign up clicked');
    // Add navigation to sign up screen here
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#e8f5e9', '#c8e6c9']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Decorative Circles */}
            <View style={[styles.circle, styles.circle1]} />
            <View style={[styles.circle, styles.circle2]} />
            <View style={[styles.circle, styles.circle3]} />

            {/* Login Card */}
            <View style={styles.card}>
              {/* Logo Section */}
              <View style={styles.logoContainer}>
                <MindSphereLogo />
                <View style={styles.titleContainer}>
                  <Text style={styles.titleMind}>Mind</Text>
                  <Text style={styles.titleSphere}>Sphere</Text>
                </View>
                <Text style={styles.tagline}>"Where wellness comes full circle"</Text>
              </View>

              {/* Sign In Header */}
              <View style={styles.headerContainer}>
                <Text style={styles.signInTitle}>Sign In</Text>
                <Text style={styles.subtitle}>Enter a valid Display Name and Password</Text>
              </View>

              {/* Form */}
              <View style={styles.formContainer}>
                {/* Display Name Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>
                    Choose a Display Name{' '}
                    <Text style={styles.labelNote}>(no real name required)</Text>
                  </Text>
                  <View style={styles.inputWrapper}>
                    <View style={styles.iconContainer}>
                      <UserIcon />
                    </View>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter your display name"
                      placeholderTextColor="#9CA3AF"
                      value={displayName}
                      onChangeText={setDisplayName}
                      autoCapitalize="none"
                    />
                  </View>
                </View>

                {/* Password Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Password</Text>
                  <View style={styles.inputWrapper}>
                    <View style={styles.iconContainer}>
                      <LockIcon />
                    </View>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter your password"
                      placeholderTextColor="#9CA3AF"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry
                      autoCapitalize="none"
                    />
                  </View>
                </View>

                {/* Forgot Password */}
                <TouchableOpacity 
                  style={styles.forgotPasswordContainer}
                  onPress={handleForgotPassword}
                >
                  <Text style={styles.forgotPasswordText}>Forgot Password</Text>
                </TouchableOpacity>

                {/* Login Button */}
                <TouchableOpacity
                  style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
                  onPress={handleLogin}
                  activeOpacity={0.8}
                  disabled={isLoading}
                >
                  <Text style={styles.loginButtonText}>
                    {isLoading ? 'Logging in...' : 'Login'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Sign Up Link */}
              <View style={styles.signUpContainer}>
                <Text style={styles.signUpText}>Don't have an Account? </Text>
                <TouchableOpacity onPress={handleSignUp}>
                  <Text style={styles.signUpLink}>Sign up</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  circle: {
    position: 'absolute',
    borderRadius: 9999,
    backgroundColor: '#81C784',
  },
  circle1: {
    width: 96,
    height: 96,
    top: 40,
    left: 40,
    opacity: 0.3,
  },
  circle2: {
    width: 128,
    height: 128,
    top: 128,
    right: 80,
    opacity: 0.2,
  },
  circle3: {
    width: 80,
    height: 80,
    bottom: 80,
    left: '25%',
    opacity: 0.25,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 32,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  titleContainer: {
    flexDirection: 'row',
    marginTop: 16,
    marginBottom: 4,
  },
  titleMind: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#81C784',
  },
  titleSphere: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#64B5F6',
  },
  tagline: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#6B7280',
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  signInTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7280',
  },
  formContainer: {
    gap: 20,
  },
  inputGroup: {
    marginBottom: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  labelNote: {
    fontSize: 12,
    fontWeight: '400',
    color: '#6B7280',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
  },
  iconContainer: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: '#374151',
  },
  forgotPasswordContainer: {
    alignItems: 'flex-end',
    marginTop: -4,
  },
  forgotPasswordText: {
    fontSize: 13,
    color: '#6B7280',
  },
  loginButton: {
    backgroundColor: '#81C784',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
    shadowColor: '#81C784',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  loginButtonDisabled: {
    backgroundColor: '#A5D6A7',
    opacity: 0.6,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  signUpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  signUpText: {
    fontSize: 14,
    color: '#6B7280',
  },
  signUpLink: {
    fontSize: 14,
    color: '#81C784',
    fontWeight: '600',
  },
});

export default Login;