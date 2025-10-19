import React, { useState } from 'react';
import BottomNavBar from './components/BottomNavBar';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  ImageBackground,
} from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { useRouter } from 'expo-router';

const { width, height } = Dimensions.get('window');

// Icon Components
const UserIcon = () => (
  <Svg width="28" height="28" viewBox="0 0 24 24" fill="white">
    <Path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
  </Svg>
);

const SettingsIcon = () => (
  <Svg width="28" height="28" viewBox="0 0 24 24" fill="white">
    <Path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/>
  </Svg>
);

const BookIcon = () => (
  <Svg width="32" height="32" viewBox="0 0 24 24" fill="white">
    <Path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z"/>
  </Svg>
);

const FlowerIcon = () => (
  <Svg width="32" height="32" viewBox="0 0 24 24" fill="white">
    <Path d="M12 22c4.97 0 9-4.03 9-9-4.97 0-9 4.03-9 9zM5.6 10.25c0 1.38 1.12 2.5 2.5 2.5.53 0 1.01-.16 1.42-.44l-.02.19c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5l-.02-.19c.4.28.89.44 1.42.44 1.38 0 2.5-1.12 2.5-2.5 0-1-.59-1.85-1.43-2.25.84-.4 1.43-1.25 1.43-2.25 0-1.38-1.12-2.5-2.5-2.5-.53 0-1.01.16-1.42.44l.02-.19C14.5 2.12 13.38 1 12 1S9.5 2.12 9.5 3.5l.02.19c-.4-.28-.89-.44-1.42-.44-1.38 0-2.5 1.12-2.5 2.5 0 1 .59 1.85 1.43 2.25-.84.4-1.43 1.25-1.43 2.25zM12 5.5c1.38 0 2.5 1.12 2.5 2.5s-1.12 2.5-2.5 2.5S9.5 9.38 9.5 8s1.12-2.5 2.5-2.5zM3 13c0 4.97 4.03 9 9 9 0-4.97-4.03-9-9-9z"/>
  </Svg>
);

const LeafIcon = () => (
  <Svg width="40" height="40" viewBox="0 0 24 24" fill="white">
    <Path d="M12,3L2,12H5V20H19V12H22L12,3M12,8.75A3.25,3.25 0 0,1 15.25,12A3.25,3.25 0 0,1 12,15.25A3.25,3.25 0 0,1 8.75,12A3.25,3.25 0 0,1 12,8.75M12,10.5A1.5,1.5 0 0,0 10.5,12A1.5,1.5 0 0,0 12,13.5A1.5,1.5 0 0,0 13.5,12A1.5,1.5 0 0,0 12,10.5Z"/>
  </Svg>
);

const SunIcon = () => (
  <Svg width="20" height="20" viewBox="0 0 24 24" fill="#F59E0B">
    <Circle cx="12" cy="12" r="5" />
    <Path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
  </Svg>
);

// Mood Data
const moods = [
  { id: 1, emoji: '🍐', label: 'Good', color: '#86efac' },
  { id: 2, emoji: '🍎', label: 'Joyful', color: '#fda4af' },
  { id: 3, emoji: '🫐', label: 'Sad', color: '#93c5fd' },
  { id: 4, emoji: '🍇', label: 'Bored', color: '#c4b5fd' },
  { id: 5, emoji: '🌶️', label: 'Angry', color: '#ef4444' },
  { id: 6, emoji: '🥑', label: 'Stressed', color: '#67e8f9' },
];

export default function HomePage() {
  const router = useRouter();
  const [selectedMood, setSelectedMood] = useState<number | null>(null);

  const handleMoodSelect = (moodId: number) => {
    setSelectedMood(moodId);
    console.log('Selected mood:', moods.find(m => m.id === moodId)?.label);
  };

  return (
    <View style={styles.container}>
      <ImageBackground
        source={require('../assets/images/spiral-background.png')}
        style={styles.background}
        resizeMode="cover"
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.iconButton}>
            <UserIcon />
          </TouchableOpacity>
          
          <View style={styles.greetingBadge}>
            <SunIcon />
            <Text style={styles.greetingText}>Good Morning</Text>
          </View>
          
          <TouchableOpacity style={styles.iconButton}>
            <SettingsIcon />
          </TouchableOpacity>
        </View>

        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeText}>Hi Aurora!</Text>
          <View style={styles.badgeContainer}>
            <View style={styles.proBadge}>
              <Text style={styles.proText}>⭐ Pro Member</Text>
            </View>
            <View style={styles.streakBadge}>
              <Text style={styles.streakText}>🔥 5 Day Streak</Text>
            </View>
          </View>
        </View>

        {/* Scrollable Content Card */}
        <View style={styles.contentCard}>
          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Mood Check Section */}
            <View style={styles.moodSection}>
              <Text style={styles.moodTitle}>How are you doing today?</Text>
              <View style={styles.moodGrid}>
                {moods.map((mood) => (
                  <TouchableOpacity
                    key={mood.id}
                    style={[
                      styles.moodItem,
                      selectedMood === mood.id && styles.moodItemSelected
                    ]}
                    onPress={() => handleMoodSelect(mood.id)}
                  >
                    <Text style={styles.moodEmoji}>{mood.emoji}</Text>
                    <Text style={[
                      styles.moodLabel,
                      { color: mood.color }
                    ]}>{mood.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Quote Card */}
            <View style={styles.quoteCard}>
              <Text style={styles.quoteText}>
                The journey to mental wellness begins with a single step
              </Text>
              <Text style={styles.quoteAuthor}>-Unknown</Text>
            </View>

            {/* Meditation Card */}
            <TouchableOpacity style={styles.meditationCard}>
              <View style={styles.meditationIcon}>
                <LeafIcon />
              </View>
              <Text style={styles.meditationTitle}>Meditation</Text>
              <Text style={styles.meditationSubtitle}>Start your Session</Text>
              <View style={styles.meditationDivider} />
              <Text style={styles.meditationDuration}>5 Minutes</Text>
            </TouchableOpacity>

            {/* Activities Section */}
            <View style={styles.activitiesSection}>
              <Text style={styles.sectionTitle}>Activities</Text>
              <View style={styles.activitiesGrid}>
                <TouchableOpacity style={styles.activityCard}>
                  <View style={styles.activityIcon}>
                    <BookIcon />
                  </View>
                  <Text style={styles.activityTitle}>Journal</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.activityCard}>
                  <View style={styles.activityIcon}>
                    <FlowerIcon />
                  </View>
                  <Text style={styles.activityTitle}>Gratitude{'\n'}Garden</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Bottom Spacing */}
            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#5eead4',
  },
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  greetingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  greetingText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  welcomeSection: {
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  welcomeText: {
    fontSize: 42,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  badgeContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  proBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  proText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '600',
  },
  streakBadge: {
    backgroundColor: '#fbbf24',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  streakText: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '600',
  },
  contentCard: {
    flex: 1,
    backgroundColor: 'white',
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 30,
  },
  moodSection: {
    marginBottom: 24,
  },
  moodTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1e40af',
    textAlign: 'center',
    marginBottom: 20,
  },
  moodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    gap: 12,
  },
  moodItem: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 20,
    backgroundColor: '#f9fafb',
    width: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  moodItemSelected: {
    backgroundColor: '#f0fdf4',
    borderWidth: 2,
    borderColor: '#6ee7b7',
  },
  moodEmoji: {
    fontSize: 40,
    marginBottom: 8,
  },
  moodLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  quoteCard: {
    backgroundColor: '#6ee7b7',
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
  },
  quoteText: {
    fontSize: 18,
    color: 'white',
    fontWeight: '600',
    lineHeight: 26,
    marginBottom: 8,
  },
  quoteAuthor: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontStyle: 'italic',
  },
  meditationCard: {
    backgroundColor: '#86efac',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    marginBottom: 30,
  },
  meditationIcon: {
    marginBottom: 12,
  },
  meditationTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  meditationSubtitle: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 16,
  },
  meditationDivider: {
    width: 60,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    marginVertical: 12,
  },
  meditationDuration: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  activitiesSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  activitiesGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  activityCard: {
    flex: 1,
    backgroundColor: '#5eead4',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    minHeight: 140,
    justifyContent: 'center',
  },
  activityIcon: {
    marginBottom: 12,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    textAlign: 'center',
  },
});