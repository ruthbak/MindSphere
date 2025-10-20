import React from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView, 
  Image,
  Linking
} from 'react-native';
import { useRouter } from 'expo-router';
import BottomNavBar from './components/BottomNavBar';

// ---------- Types ----------
interface ProfessionalCategory {
  id: string;
  title: string;
  description: string;
  icon: any;
  iconBgColor: string;
  link: string;
}

export default function ProHelp() {
  const router = useRouter();

  const categories: ProfessionalCategory[] = [
    {
      id: 'mental_health',
      title: 'Mental Health Support',
      description: 'Talk to counselors, therapists, or psychologists about anxiety, depression, trauma, or mental health.',
      icon: require('../assets/images/brain.png'),
      iconBgColor: '#FDE2E4',
      link: 'https://mental-health-support.com'
    },
    {
      id: 'medical',
      title: 'Medical & Wellness',
      description: 'Connect with doctors or pharmacists for medical advice, wellness checks, and mental care.',
      icon: require('../assets/images/doctor.png'),
      iconBgColor: '#DBEAFE',
      link: 'https://medical-wellness.com'
    },
    {
      id: 'family',
      title: 'Social & Family Support',
      description: 'Get guidance from social workers or community counselors on family issues, domestic challenges, or child protection.',
      icon: require('../assets/images/family.png'),
      iconBgColor: '#FED7AA',
      link: 'https://family-support.com'
    },
    {
      id: 'legal',
      title: 'Safety & Legal Guidance',
      description: 'Chat with legal experts or legal aid volunteers for help with legal issues, restraining orders, or safety concerns.',
      icon: require('../assets/images/legal.png'),
      iconBgColor: '#D1FAE5',
      link: 'https://legal-guidance.com'
    },
  ];

  const handleCategoryPress = (link: string) => {
    Linking.openURL(link);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.contentContainer, { paddingBottom: 110 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header with background image */}
        <View style={styles.headerBackground}>
          <Image
            source={require('../assets/images/spiral-background.png')}
            style={styles.headerImage}
            resizeMode="cover"
          />
          <Text style={styles.title}>Pro Help</Text>
        </View>

        {/* Main Content Container with Curve */}
        <View style={styles.mainContentContainer}>
          {/* Subtitle */}
          <Text style={styles.subtitle}>Talk to a Professional!</Text>

          {/* Info Text */}
          <Text style={styles.infoText}>
            You are not alone. Choose a category below to connect via chat with someone who can help.
          </Text>

          {/* Divider Line */}
          <View style={styles.divider} />

          {/* Categories Section */}
          <Text style={styles.sectionTitle}>Professionals</Text>

          {/* Category Cards */}
          <View style={styles.categoriesContainer}>
            {categories.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={styles.categoryCard}
                onPress={() => handleCategoryPress(category.link)}
                activeOpacity={0.7}
              >
                <View style={styles.categoryContent}>
                  <View style={[styles.iconCircle, { backgroundColor: category.iconBgColor }]}>
                    <Image
                      source={category.icon}
                      style={styles.categoryIcon}
                      resizeMode="contain"
                    />
                  </View>
                  <View style={styles.categoryTextContainer}>
                    <Text style={styles.categoryTitle}>{category.title}</Text>
                    <Text style={styles.categoryDescription}>{category.description}</Text>
                  </View>
                  <Text style={styles.externalIcon}>↗</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Privacy Notice */}
          <View style={styles.privacyNotice}>
            <Text style={styles.privacyText}>
              Your identity remains private. You only share what you want
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Navigation Bar */}
      <BottomNavBar />
    </View>
  );
}

// ---------- Styles ----------
const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#ffffff'
  },
  scrollView: { 
    flex: 1 
  },
  contentContainer: { 
    paddingTop: 0,
  },

  headerBackground: {
    width: '100%',
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 0,
    position: 'relative',
  },
  headerImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderBottomLeftRadius: 30,  
    borderBottomRightRadius: 30,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    zIndex: 1,
  },

  mainContentContainer: {
    backgroundColor: '#ffffff',
    paddingTop: 24,
    paddingHorizontal: 20,
    marginTop: 0,
  },

  subtitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0891B2',
    marginBottom: 12,
  },

  infoText: {
    fontSize: 14,
    color: '#000000',
    lineHeight: 20,
    marginBottom: 20,
  },

  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginBottom: 20,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 16,
  },

  categoriesContainer: {
    gap: 16,
    marginBottom: 24,
  },

  categoryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },

  categoryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },

  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  categoryIcon: {
    width: 32,
    height: 32,
  },

  categoryTextContainer: {
    flex: 1,
    marginRight: 8,
  },

  categoryTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 4,
  },

  categoryDescription: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
  },

  externalIcon: {
    fontSize: 24,
    color: '#666',
    fontWeight: '600',
  },

  privacyNotice: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },

  privacyText: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 18,
  },
});