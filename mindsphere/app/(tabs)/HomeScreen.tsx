// HomeScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'https://your-api-domain.com/api';

type Mood = 'good' | 'joyful' | 'sad' | 'bored' | 'angry' | 'stressed';

interface MoodOption {
  id: Mood;
  label: string;
  emoji: string;
  color: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  isPro: boolean;
  streak: number;
}

interface HomeScreenProps {
  navigation: any;
}

export default function HomeScreen({ navigation }: HomeScreenProps) {
  const [selectedMood, setSelectedMood] = useState<Mood | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [greeting, setGreeting] = useState('Good Morning');

  const moods: MoodOption[] = [
    { id: 'good', label: 'Good', emoji: '🍐', color: '#A8D5A8' },
    { id: 'joyful', label: 'Joyful', emoji: '🍎', color: '#FFB6C6' },
    { id: 'sad', label: 'Sad', emoji: '🫐', color: '#7B9EC4' },
    { id: 'bored', label: 'Bored', emoji: '🍇', color: '#B8B8C8' },
    { id: 'angry', label: 'Angry', emoji: '🌶️', color: '#E85D5D' },
    { id: 'stressed', label: 'Stressed', emoji: '🥑', color: '#88C9C3' },
  ];

  useEffect(() => {
    loadUserData();
    setGreetingBasedOnTime();
  }, []);

  const setGreetingBasedOnTime = () => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good Morning');
    else if (hour < 18) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');
  };

  const loadUserData = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const userId = await AsyncStorage.getItem('userId');

      if (token && userId) {
        // GET /users/{user_id}
        const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        } else {
          throw new Error('Failed to load user data');
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      Alert.alert('Error', 'Failed to load user data');
    } finally {
      setLoading(false);
    }
  };

  const handleMoodSelection = async (mood: Mood) => {
    setSelectedMood(mood);

    try {
      const token = await AsyncStorage.getItem('userToken');
      const userId = await AsyncStorage.getItem('userId');

      if (token && userId) {
        // POST to record mood (you can create custom endpoint or use /mood/history)
        const response = await fetch(`${API_BASE_URL}/mood/history/${userId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            mood,
            timestamp: new Date().toISOString(),
            note: '',
          }),
        });

        if (response.ok) {
          Alert.alert('Mood Recorded', `You're feeling ${mood} today!`);
        }
      }
    } catch (error) {
      console.error('Error recording mood:', error);
      Alert.alert('Error', 'Failed to record mood');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#5EBBAA" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#5EBBAA" />
      <LinearGradient
        colors={['#7DD3C0', '#5EBBAA']}
        style={styles.gradient}
      >
        <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <TouchableOpacity 
                style={styles.iconButton}
                onPress={() => navigation.navigate('Profile')}
              >
                <Text style={styles.iconText}>👤</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.iconButton}
                onPress={() => navigation.navigate('Settings')}
              >
                <Text style={styles.iconText}>⚙️</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.greetingBadge}>
              <Text style={styles.greetingText}>☀️ {greeting}</Text>
            </View>

            <Text style={styles.welcomeText}>
              Hi {user?.name || 'Aurora'}!
            </Text>

            <View style={styles.badgeContainer}>
              {user?.isPro && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>⭐ Pro Member</Text>
                </View>
              )}
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  🔥 {user?.streak || 5} Day Streak
                </Text>
              </View>
            </View>
          </View>

          {/* Main Content Card */}
          <View style={styles.contentCard}>
            <Text style={styles.questionText}>
              How are you doing today?
            </Text>

            {/* Mood Selector */}
            <View style={styles.moodContainer}>
              {moods.map((mood) => (
                <TouchableOpacity
                  key={mood.id}
                  onPress={() => handleMoodSelection(mood.id)}
                  style={styles.moodButton}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.moodCircle,
                      { backgroundColor: mood.color },
                      selectedMood === mood.id && styles.selectedMood,
                    ]}
                  >
                    <Text style={styles.moodEmoji}>{mood.emoji}</Text>
                  </View>
                  <Text
                    style={[
                      styles.moodLabel,
                      selectedMood === mood.id && styles.selectedMoodLabel,
                    ]}
                  >
                    {mood.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Meditation Cards */}
            <View style={styles.cardRow}>
              <View style={styles.quoteCard}>
                <Text style={styles.quoteText}>
                  The journey to mental wellness begins with a single step
                </Text>
                <Text style={styles.quoteAuthor}>-Unknown</Text>
              </View>

              <TouchableOpacity
                style={styles.meditationCard}
                onPress={() => navigation.navigate('Meditation')}
                activeOpacity={0.8}
              >
                <Text style={styles.meditationIcon}>🌱</Text>
                <Text style={styles.meditationTitle}>Meditation</Text>
                <Text style={styles.meditationSubtitle}>
                  Start your Session
                </Text>
                <View style={styles.progressBar} />
                <Text style={styles.meditationDuration}>5 Minutes</Text>
              </TouchableOpacity>
            </View>

            {/* Activities Section */}
            <Text style={styles.sectionTitle}>Activities</Text>

            <View style={styles.activityRow}>
              <TouchableOpacity
                style={[styles.activityCard, styles.activityCardDark]}
                onPress={() => navigation.navigate('Journal')}
                activeOpacity={0.8}
              >
                <Text style={styles.activityIcon}>📖</Text>
                <Text style={styles.activityText}>Journal</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.activityCard, styles.activityCardLight]}
                onPress={() => navigation.navigate('Gratitude')}
                activeOpacity={0.8}
              >
                <Text style={styles.activityIcon}>🎵</Text>
                <Text style={styles.activityTextDark}>Gratitude</Text>
                <Text style={styles.activityTextDark}>Garden</Text>
              </TouchableOpacity>
            </View>

            {/* Extra padding for bottom nav */}
            <View style={styles.bottomPadding} />
          </View>
        </ScrollView>

        {/* Bottom Navigation */}
        <View style={styles.bottomNav}>
          <TouchableOpacity
            style={styles.navItem}
            onPress={() => navigation.navigate('Home')}
            activeOpacity={0.7}
          >
            <Text style={styles.navIcon}>🏠</Text>
            <Text style={styles.navLabelActive}>Home</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navItem}
            onPress={() => navigation.navigate('Community')}
            activeOpacity={0.7}
          >
            <Text style={styles.navIcon}>👥</Text>
            <Text style={styles.navLabel}>Community</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.centerNavButton}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#7DD3C0', '#5EBBAA']}
              style={styles.centerGradient}
            >
              <Text style={styles.centerIcon}>🌀</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navItem}
            onPress={() => navigation.navigate('ProHelp')}
            activeOpacity={0.7}
          >
            <Text style={styles.navIcon}>🩺</Text>
            <Text style={styles.navLabel}>Pro Help</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navItem}
            onPress={() => navigation.navigate('SafeReport')}
            activeOpacity={0.7}
          >
            <Text style={styles.navIcon}>⚠️</Text>
            <Text style={styles.navLabel}>Safe Report</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#5EBBAA',
  },
  gradient: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#5EBBAA',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  iconButton: {
    width: 40,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontSize: 20,
    color: '#FFFFFF',
  },
  greetingBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  greetingText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  welcomeText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  badgeContainer: {
    flexDirection: 'row',
  },
  badge: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginRight: 8,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
  },
  contentCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 32,
    minHeight: '100%',
  },
  questionText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D7A6E',
    textAlign: 'center',
    marginBottom: 24,
  },
  moodContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
    flexWrap: 'wrap',
  },
  moodButton: {
    alignItems: 'center',
    width: '16%',
  },
  moodCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  selectedMood: {
    transform: [{ scale: 1.1 }],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  moodEmoji: {
    fontSize: 28,
  },
  moodLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  selectedMoodLabel: {
    fontWeight: 'bold',
    color: '#2D7A6E',
  },
  cardRow: {
    flexDirection: 'row',
    marginBottom: 32,
  },
  quoteCard: {
    flex: 1,
    backgroundColor: '#7DD3C0',
    borderRadius: 24,
    padding: 24,
    marginRight: 8,
  },
  quoteText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    lineHeight: 22,
    marginBottom: 8,
  },
  quoteAuthor: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
  },
  meditationCard: {
    flex: 1,
    backgroundColor: '#B8E6DD',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    marginLeft: 8,
  },
  meditationIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  meditationTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D7A6E',
    marginBottom: 4,
  },
  meditationSubtitle: {
    fontSize: 12,
    color: '#5EBBAA',
    marginBottom: 12,
  },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: '#7DD3C0',
    borderRadius: 2,
    marginBottom: 8,
  },
  meditationDuration: {
    fontSize: 12,
    color: '#5EBBAA',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 16,
  },
  activityRow: {
    flexDirection: 'row',
  },
  activityCard: {
    flex: 1,
    borderRadius: 24,
    padding: 24,
    height: 128,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityCardDark: {
    backgroundColor: '#5EBBAA',
    marginRight: 8,
  },
  activityCardLight: {
    backgroundColor: '#B8E6DD',
    marginLeft: 8,
  },
  activityIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  activityText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  activityTextDark: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D7A6E',
  },
  bottomPadding: {
    height: 100,
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 12,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  navItem: {
    alignItems: 'center',
  },
  navIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  navLabel: {
    fontSize: 10,
    color: '#999',
  },
  navLabelActive: {
    fontSize: 10,
    color: '#5EBBAA',
    fontWeight: '600',
  },
  centerNavButton: {
    marginTop: -32,
  },
  centerGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  centerIcon: {
    fontSize: 32,
  },
});