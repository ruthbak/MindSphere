import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView, 
  Image,
  Animated
} from 'react-native';
import { useRouter } from 'expo-router';
import BottomNavBar from './components/BottomNavBar';
import { LinearGradient } from 'expo-linear-gradient';

const MoodCard = ({ 
  mood, 
  isSelected, 
  onPress 
}: { 
  mood: { id: string; image: any; label: string; color: string; emoji: string }; 
  isSelected: boolean;
  onPress: () => void;
}) => {
  const [scaleValue] = useState(new Animated.Value(1));

  const handlePressIn = () => {
    Animated.spring(scaleValue, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleValue, {
      toValue: 1,
      friction: 3,
      useNativeDriver: true,
    }).start();
  };

  return (
    <TouchableOpacity
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      activeOpacity={1}
      style={styles.moodButton}
    >
      <Animated.View
        style={[
          styles.moodCard,
          isSelected && styles.moodCardSelected,
          {
            transform: [{ scale: scaleValue }],
          },
        ]}
      >
        <Image 
          source={mood.image} 
          style={styles.moodImage}
          resizeMode="contain"
        />
        <Text style={[styles.moodLabel, { color: mood.color }]}>{mood.label}</Text>
      </Animated.View>
    </TouchableOpacity>
  );
};

export default function Homepage() {
  const router = useRouter();
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [greeting, setGreeting] = useState('Good Morning');

  useEffect(() => {
    const getGreeting = () => {
      const hour = new Date().getHours();
      
      if (hour >= 5 && hour < 12) {
        return 'Good Morning';
      } else if (hour >= 12 && hour < 17) {
        return 'Good Afternoon';
      } else if (hour >= 17 && hour < 21) {
        return 'Good Evening';
      } else {
        return 'Good Night';
      }
    };

    setGreeting(getGreeting());


    const interval = setInterval(() => {
      setGreeting(getGreeting());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const moods = [
    { id: 'good', image: require('../assets/images/Good.png'), label: 'Good', color: '#84CC16', emoji: '😊' },
    { id: 'joyful', image: require('../assets/images/Joyful.png'), label: 'Joyful', color: '#FB7185', emoji: '😄' },
    { id: 'sad', image: require('../assets/images/Sad.png'), label: 'Sad', color: '#60A5FA', emoji: '😢' },
    { id: 'bored', image: require('../assets/images/Bored.png'), label: 'Bored', color: '#A78BFA', emoji: '😐' },
    { id: 'angry', image: require('../assets/images/Angry.png'), label: 'Angry', color: '#EF4444', emoji: '😠' },
    { id: 'stressed', image: require('../assets/images/Stressed.png'), label: 'Stressed', color: '#14B8A6', emoji: '😰' },
  ];

  const handleMoodSelect = (moodId: string) => {
    setSelectedMood(moodId);
  };

  const getSelectedMoodData = () => {
    return moods.find(m => m.id === selectedMood);
  };

  const selectedMoodData = getSelectedMoodData();

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.contentContainer, { paddingBottom: 110 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerBackground}>
          <Image
            source={require('../assets/images/spiral-background.png')}
            style={styles.headerImage}
            resizeMode="cover"
          />
          
          <View style={styles.headerIcons}>
            <TouchableOpacity style={styles.iconButton}>
              <Text style={styles.iconText}>👤</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton}>
              <Text style={styles.iconText}>⚙️</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.greetingBadge}>
            <Text style={styles.greetingText}>✨ {greeting}</Text>
          </View>

          <Text style={styles.userName}>Hi Aurora!</Text>

          <View style={styles.badgesContainer}>
            <View style={[styles.badge, styles.proMemberBadge]}>
              <Text style={styles.badgeTextDark}>⭐ Pro Member</Text>
            </View>
            <View style={[styles.badge, styles.streakBadge]}>
              <Text style={styles.badgeText}>🔥 6 Day Streak</Text>
            </View>
            {selectedMood && selectedMoodData && (
              <View style={[styles.badge, { backgroundColor: selectedMoodData.color }]}>
                <Text style={styles.badgeText}>{selectedMoodData.emoji} {selectedMoodData.label}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.curvedBackground}>
          <Text style={styles.moodQuestion}>How are you doing today?</Text>
          

          <View style={styles.moodSection}>
            <View style={styles.moodsContainer}>
              {moods.map((mood) => (
                <MoodCard
                  key={mood.id}
                  mood={mood}
                  isSelected={selectedMood === mood.id}
                  onPress={() => handleMoodSelect(mood.id)}
                />
              ))}
            </View>
          </View>

          {/* Quote and Meditation Cards Side by Side */}
          <View style={styles.cardsRow}>
            {/* Quote Card */}
             <LinearGradient
                  colors={['#A7D8C3', '#86CFAC', '#5D9B8E']}
                  start={{ x: 0.5, y: 0.5 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.quoteCard}
                >
                <Text style={styles.quoteText}>
                  The journey to mental wellness begins with a single step
                </Text>
                <Text style={styles.quoteAuthor}>-Unknown</Text>
              </LinearGradient>

            {/* Meditation Card */}
              <TouchableOpacity
                onPress={() => router.push('/meditation')}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#C8E6D5', '#A7D8C3', '#86CFAC']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={styles.meditationCard}
                >
                  <View style={styles.meditationIcon}>
                    <Text style={styles.meditationEmoji}>🌱</Text>
                  </View>
                  <Text style={styles.meditationTitle}>Meditation</Text>
                  <Text style={styles.meditationSubtitle}>Start your Session</Text>
                  <Text style={styles.meditationDuration}>5 Minutes</Text>
                </LinearGradient>
              </TouchableOpacity>
          </View>

          {/* Activities Section */}
          <Text style={styles.sectionTitle}>Activities</Text>

          <View style={styles.activitiesContainer}>
            <TouchableOpacity style={styles.activityCard} activeOpacity={0.7}>
              <View style={styles.activityIconCircle}>
                <Text style={styles.activityIcon}>📖</Text>
              </View>
              <Text style={styles.activityLabel}>Journal</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.activityCard, styles.activityCardAlt]} activeOpacity={0.7}>
              <View style={styles.activityIconCircle}>
                <Text style={styles.activityIcon}>🙏</Text>
              </View>
              <Text style={styles.activityLabel}>Gratitude Garden</Text>
            </TouchableOpacity>
          </View>

        </View>
      </ScrollView>
      <BottomNavBar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingTop: 0,
  },

  headerBackground: {
    width: '100%',
    paddingTop: 50,
    paddingBottom: 180,
    position: 'relative',
    alignItems: 'center',
  },
  headerImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  headerIcons: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    zIndex: 2,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  iconText: {
    fontSize: 22,
  },
  greetingBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 40,
    marginBottom: 12,
  },
  greetingText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  userName: {
    fontSize: 36,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 12,
  },
  badgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  proMemberBadge: {
    backgroundColor: '#ffffff',
  },
  streakBadge: {
    backgroundColor: '#84CC16',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  badgeTextDark: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },

  curvedBackground: {
    backgroundColor: '#F3F4F6',
    borderTopLeftRadius: 300,
    borderTopRightRadius: 300,
    paddingHorizontal: 20,
    paddingTop: 40,
    marginTop: -160,
    minHeight: 600,
  },

  moodQuestion: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0891B2',
    textAlign: 'center',
    marginBottom: 10,
  },

  moodSection: {
    backgroundColor: '#ffffff',
    borderRadius: 100,
    paddingHorizontal: 8,
    paddingVertical: 14,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    marginHorizontal: 15,
  },

  moodsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  moodButton: {
    width: '15.5%',
  },
  moodCard: {
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 1,
    borderRadius: 10,
    backgroundColor: 'transparent',
  },
  moodCardSelected: {
    backgroundColor: '#F0F9FF',
    borderWidth: 2,
    borderColor: '#0891B2',
  },
  moodImage: {
    width: 45,
    height: 45,
    marginBottom: 3,
  },
  moodLabel: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },

  cardsRow: {
  flexDirection: 'row',
  gap: 16,
  marginBottom: 24,
},

quoteCard: {
  flex: 1,
  borderRadius: 20,
  padding: 20,
  justifyContent: 'center',
  borderWidth: 3,
  borderColor: '#5D9B8E',
},

quoteText: {
  fontSize: 16,
  fontWeight: '700',
  color: '#ffffff',
  marginBottom: 8,
  lineHeight: 22,
},
quoteAuthor: {
  fontSize: 12,
  color: '#ffffff',
  fontStyle: 'italic',
  fontWeight: '500',
},

meditationCard: {
  flex: 1,
  borderRadius: 20,
  padding: 20,
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: 3,
  borderColor: '#86CFAC',
},

meditationIcon: {
  marginBottom: 8,
  width: 48,
  height: 48,
  borderRadius: 24,
  backgroundColor: '#ffffff',
  alignItems: 'center',
  justifyContent: 'center',
},
meditationEmoji: {
  fontSize: 28,
},
meditationTitle: {
  fontSize: 18,
  fontWeight: '700',
  color: '#000000',
  marginBottom: 4,
},
meditationSubtitle: {
  fontSize: 13,
  color: '#374151',
  marginBottom: 12,
},
meditationDuration: {
  fontSize: 12,
  color: '#6B7280',
  fontWeight: '500',
},

  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 16,
  },
  activitiesContainer: {
  flexDirection: 'row',
  gap: 16,
  marginBottom: 24,
},
activityCard: {
  flex: 1,
  backgroundColor: '#5D9B8E',
  borderRadius: 20,
  paddingVertical: 24,
  paddingHorizontal: 16,
  alignItems: 'flex-start',
  justifyContent: 'flex-start',
  minHeight: 140,
  borderWidth: 3,
  borderColor: '#2D5A52',
},
activityCardAlt: {
  backgroundColor: '#A7D8C3',
  borderColor: '#86CFAC',
},
activityIconCircle: {
  width: 48,
  height: 48,
  borderRadius: 24,
  backgroundColor: '#ffffff',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: 16,
},
activityIcon: {
  fontSize: 24,
  color: '#000000',
},
activityLabel: {
  fontSize: 18,
  fontWeight: '700',
  color: '#ffffff',
  textAlign: 'left',
},
});