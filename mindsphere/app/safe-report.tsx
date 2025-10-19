import React, { useState } from 'react';
import BottomNavBar from './components/BottomNavBar';

import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView, 
  Dimensions, 
  Alert,
  ActivityIndicator,
  Linking,
  Image
} from 'react-native';
import Svg, { Path, Circle, Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { useRouter } from 'expo-router';

const { width, height } = Dimensions.get('window');

// Icon components
const EmergencyIcon = () => (
  <Image 
    source={require('../assets/images/police.png')} 
    style={{ width: 48, height: 48 }}
    resizeMode="contain"
  />
);

const LifelineIcon = () => (
  <Image 
    source={require('../assets/images/suicide.png')} 
    style={{ width: 48, height: 48 }}
    resizeMode="contain"
  />
);

const WomanIcon = () => (
  <Image 
    source={require('../assets/images/woman.png')} 
    style={{ width: 48, height: 48 }}
    resizeMode="contain"
  />
);

const ManIcon = () => (
  <Image 
    source={require('../assets/images/man.png')} 
    style={{ width: 48, height: 48 }}
    resizeMode="contain"
  />
);

const ChildIcon = () => (
  <Image 
    source={require('../assets/images/baby-icon.png')} 
    style={{ width: 48, height: 48 }}
    resizeMode="contain"
  />
);

const ReportIcon = () => (
  <Image 
    source={require('../assets/images/report.png')} 
    style={{ width: 48, height: 48 }}
    resizeMode="contain"
  />
);

// Type definitions
type ReportTypeId = 'emergency' | 'suicide' | 'domestic_violence_women' | 'domestic_violence_men' | 'child_abuse' | 'crime_violence';
type ReportAction = 'call' | 'report';

interface ReportType {
  id: ReportTypeId;
  label: string;
  icon: React.ComponentType;
  iconBgColor: string;
  borderColor: string;
  action: ReportAction;
}

export default function SafeReport() {
  const router = useRouter();
  const [selectedType, setSelectedType] = useState<ReportTypeId | ''>('');
  const [reportContent, setReportContent] = useState('');
  const [location, setLocation] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const reportTypes: ReportType[] = [
    { 
      id: 'emergency', 
      label: 'Call 119\nDispatcher', 
      icon: EmergencyIcon,
      iconBgColor: '#7c3aed',
      borderColor: '#7c3aed',
      action: 'call'
    },
    { 
      id: 'suicide', 
      label: 'Call Suicide\nPrevention Hotline', 
      icon: LifelineIcon,
      iconBgColor: '#eab308',
      borderColor: '#eab308',
      action: 'call'
    },
    { 
      id: 'domestic_violence_women', 
      label: 'Call Women\nDomestic Violence\nHelpline', 
      icon: WomanIcon,
      iconBgColor: '#fce7f3',
      borderColor: '#ec4899',
      action: 'call'
    },
    { 
      id: 'domestic_violence_men', 
      label: 'Call Men\nDomestic Violence\nHelpline', 
      icon: ManIcon,
      iconBgColor: '#60a5fa',
      borderColor: '#3b82f6',
      action: 'call'
    },
    { 
      id: 'child_abuse', 
      label: 'Report\nChild\nAbuse', 
      icon: ChildIcon,
      iconBgColor: '#a855f7',
      borderColor: '#a855f7',
      action: 'report'
    },
    { 
      id: 'crime_violence', 
      label: 'Report\nCrime and Violence', 
      icon: ReportIcon,
      iconBgColor: '#14b8a6',
      borderColor: '#14b8a6',
      action: 'report'
    },
  ];

  const handleEmergencyCall = (type: ReportTypeId) => {
    const phoneNumbers: Record<string, string> = {
      'emergency': '119',
      'suicide': '1-888-429-5343',
      'domestic_violence_women': '1-888-991-4444',
      'domestic_violence_men': '1-800-799-7233',
    };

    const number = phoneNumbers[type];
    if (number) {
      Alert.alert(
        'Emergency Call',
        `Call ${number}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Call Now', 
            onPress: () => Linking.openURL(`tel:${number}`)
          }
        ]
      );
    }
  };

  const handleTypeSelect = (type: ReportTypeId) => {
    const selectedReport = reportTypes.find(r => r.id === type);
    
    if (selectedReport?.action === 'call') {
      handleEmergencyCall(type);
    } else {
      setSelectedType(type);
    }
  };

  const validateForm = () => {
    if (!selectedType) {
      Alert.alert('Validation Error', 'Please select a report type');
      return false;
    }
    if (!reportContent.trim()) {
      Alert.alert('Validation Error', 'Please describe what happened');
      return false;
    }
    return true;
  };

  const handleSubmitReport = async () => {
    if (!validateForm()) return;

    setIsLoading(true);

    try {
      const API_URL = 'https://e587a26be7e6.ngrok-free.app/reports'; 
      
      const requestBody = {
        report_type: selectedType,
        content: reportContent.trim(),
        location: location.trim(),
        is_anonymous: isAnonymous,
        timestamp: new Date().toISOString()
      };

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert(
          'Report Submitted',
          data.message || 'Your report has been submitted successfully.',
          [
            {
              text: 'OK',
              onPress: () => {
                setSelectedType('');
                setReportContent('');
                setLocation('');
                router.back();
              },
            },
          ]
        );
      } else {
        Alert.alert('Submission Error', data.detail || 'Failed to submit report');
      }
    } catch (error) {
      Alert.alert('Network Error', 'Unable to submit report. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Gradient Background */}
      <Svg height="100%" width="100%" style={StyleSheet.absoluteFillObject}>
        <Defs>
          <LinearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#a7f3d0" stopOpacity="1" />
            <Stop offset="0.5" stopColor="#d1fae5" stopOpacity="1" />
            <Stop offset="1" stopColor="#e0f2fe" stopOpacity="1" />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#grad)" />
      </Svg>

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={[styles.contentContainer, { paddingBottom: 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Text style={styles.title}>Safe Report</Text>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <Text style={styles.infoText}>
            Choose an option below to get immediate help.{'\n'}
            <Text style={styles.urgentText}>If you are in urgent danger call 119</Text>
          </Text>
        </View>

        {/* Report Options Grid */}
        <View style={styles.optionsGrid}>
          {reportTypes.map((type) => (
            <TouchableOpacity
              key={type.id}
              style={[
                styles.optionCard,
                { borderColor: type.borderColor },
                selectedType === type.id && styles.optionCardSelected
              ]}
              onPress={() => handleTypeSelect(type.id)}
              activeOpacity={0.8}
            >
              <View style={[styles.iconCircle, { backgroundColor: type.iconBgColor }]}>
                <type.icon />
              </View>
              <Text style={styles.optionLabel}>{type.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Report Form */}
        {selectedType && reportTypes.find(r => r.id === selectedType)?.action === 'report' && (
          <View style={styles.formContainer}>
            <View style={styles.formCard}>
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>What happened? <Text style={styles.required}>*</Text></Text>
                <TextInput
                  style={styles.textArea}
                  placeholder="Describe the incident in detail..."
                  placeholderTextColor="#9ca3af"
                  value={reportContent}
                  onChangeText={setReportContent}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                />
              </View>

              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Location (Optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Where did this happen?"
                  placeholderTextColor="#9ca3af"
                  value={location}
                  onChangeText={setLocation}
                />
              </View>

              <TouchableOpacity 
                style={styles.anonymousToggle}
                onPress={() => setIsAnonymous(!isAnonymous)}
              >
                <View style={[styles.checkbox, isAnonymous && styles.checkboxChecked]}>
                  {isAnonymous && (
                    <Svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                      <Path d="M20 6L9 17l-5-5" />
                    </Svg>
                  )}
                </View>
                <Text style={styles.anonymousText}>Submit anonymously</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.submitButton, isLoading && styles.submitButtonDisabled]} 
                onPress={handleSubmitReport}
                disabled={isLoading}
              >
                {isLoading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator color="white" size="small" />
                    <Text style={styles.submitButtonText}>Submitting...</Text>
                  </View>
                ) : (
                  <Text style={styles.submitButtonText}>Submit Report</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Bottom Navigation Bar */}
      <BottomNavBar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#d1fae5',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    color: '#064e3b',
    textAlign: 'center',
    marginBottom: 20,
  },
  infoCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  infoText: {
    fontSize: 15,
    textAlign: 'center',
    color: '#000000',
    lineHeight: 22,
    fontWeight: '500',
  },
  urgentText: {
    color: '#dc2626',
    fontWeight: '700',
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
  },
  optionCard: {
    width: '48%',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    borderWidth: 3,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 160,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  optionCardSelected: {
    backgroundColor: 'rgba(255, 255, 255, 1)',
    transform: [{ scale: 0.98 }],
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    color: '#000000',
    lineHeight: 18,
  },
  formContainer: {
    marginTop: 20,
  },
  formCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  required: {
    color: '#dc2626',
  },
  input: {
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderRadius: 12,
    backgroundColor: '#ffffff',
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#111827',
  },
  textArea: {
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderRadius: 12,
    backgroundColor: '#ffffff',
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#111827',
    minHeight: 120,
  },
  anonymousToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    marginBottom: 20,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderColor: '#14b8a6',
    borderRadius: 6,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  checkboxChecked: {
    backgroundColor: '#14b8a6',
    borderColor: '#14b8a6',
  },
  anonymousText: {
    fontSize: 15,
    color: '#374151',
    fontWeight: '500',
  },
  submitButton: {
    backgroundColor: '#14b8a6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
  },
});