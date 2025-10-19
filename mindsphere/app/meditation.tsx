// app/meditation.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import BottomNavBar from './components/BottomNavBar';

const { width } = Dimensions.get('window');

export default function Meditation() {
  const router = useRouter();
  const [isActive, setIsActive] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(300); // 5 minutes in seconds
  const [sessionDuration, setSessionDuration] = useState(300);
  const [breatheIn, setBreatheIn] = useState(true);
  const [scaleAnim] = useState(new Animated.Value(1));

  // Breathing animation
  useEffect(() => {
    if (isActive) {
      const breathingCycle = () => {
        // Breathe in (4 seconds)
        Animated.timing(scaleAnim, {
          toValue: 1.3,
          duration: 4000,
          useNativeDriver: true,
        }).start(() => {
          setBreatheIn(false);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          
          // Hold (2 seconds)
          setTimeout(() => {
            // Breathe out (4 seconds)
            Animated.timing(scaleAnim, {
              toValue: 1,
              duration: 4000,
              useNativeDriver: true,
            }).start(() => {
              setBreatheIn(true);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              
              // Hold (2 seconds) then repeat
              setTimeout(breathingCycle, 2000);
            });
          }, 2000);
        });
      };

      breathingCycle();
    }
  }, [isActive]);

  // Timer countdown
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isActive && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining((time) => {
          if (time <= 1) {
            handleComplete();
            return 0;
          }
          return time - 1;
        });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isActive, timeRemaining]);

  const handleComplete = async () => {
    setIsActive(false);
    // Strong vibration pattern for completion
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    // Custom vibration pattern (3 pulses)
    setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 0);
    setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 200);
    setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 400);
  };

  const startSession = () => {
    setIsActive(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const pauseSession = () => {
    setIsActive(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const resetSession = () => {
    setIsActive(false);
    setTimeRemaining(sessionDuration);
    setBreatheIn(true);
    scaleAnim.setValue(1);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const changeDuration = (minutes: number) => {
    const seconds = minutes * 60;
    setSessionDuration(seconds);
    setTimeRemaining(seconds);
    Haptics.selectionAsync();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = ((sessionDuration - timeRemaining) / sessionDuration) * 100;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#A7D8C3', '#86CFAC', '#5D9B8E']}
        style={styles.gradient}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backButton}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Meditation</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Duration Selector */}
        {!isActive && (
          <View style={styles.durationSelector}>
            <Text style={styles.durationLabel}>Session Duration</Text>
            <View style={styles.durationButtons}>
              {[3, 5, 10, 15].map((minutes) => (
                <TouchableOpacity
                  key={minutes}
                  style={[
                    styles.durationButton,
                    sessionDuration === minutes * 60 && styles.durationButtonActive,
                  ]}
                  onPress={() => changeDuration(minutes)}
                >
                  <Text
                    style={[
                      styles.durationButtonText,
                      sessionDuration === minutes * 60 && styles.durationButtonTextActive,
                    ]}
                  >
                    {minutes}m
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Breathing Circle */}
        <View style={styles.breathingContainer}>
          <Animated.View
            style={[
              styles.breathingCircle,
              {
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            <View style={styles.breathingCircleInner}>
              <Text style={styles.breathingText}>
                {isActive ? (breatheIn ? 'Breathe In' : 'Breathe Out') : 'Ready?'}
              </Text>
            </View>
          </Animated.View>
        </View>

        {/* Timer */}
        <View style={styles.timerContainer}>
          <Text style={styles.timerText}>{formatTime(timeRemaining)}</Text>
          
          {/* Progress Bar */}
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBar, { width: `${progress}%` }]} />
          </View>
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          {!isActive ? (
            <TouchableOpacity style={styles.startButton} onPress={startSession}>
              <Text style={styles.startButtonText}>Start Session</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.activeControls}>
              <TouchableOpacity style={styles.controlButton} onPress={pauseSession}>
                <Text style={styles.controlButtonText}>⏸</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.controlButton} onPress={resetSession}>
                <Text style={styles.controlButtonText}>↻</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Breathing Instructions */}
        {isActive && (
          <View style={styles.instructions}>
            <Text style={styles.instructionsText}>
              Follow the circle's rhythm
            </Text>
            <Text style={styles.instructionsSubtext}>
              Breathe deeply and relax
            </Text>
          </View>
        )}
      </LinearGradient>

      <BottomNavBar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backButton: {
    fontSize: 32,
    color: '#ffffff',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
  },
  durationSelector: {
    alignItems: 'center',
    marginTop: 20,
  },
  durationLabel: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '600',
    marginBottom: 12,
  },
  durationButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  durationButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  durationButtonActive: {
    backgroundColor: '#ffffff',
    borderColor: '#ffffff',
  },
  durationButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  durationButtonTextActive: {
    color: '#5D9B8E',
  },
  breathingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  breathingCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  breathingCircleInner: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  breathingText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#5D9B8E',
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  timerText: {
    fontSize: 48,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 20,
  },
  progressBarContainer: {
    width: width - 80,
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 3,
  },
  controls: {
    paddingHorizontal: 40,
    marginBottom: 40,
  },
  startButton: {
    backgroundColor: '#ffffff',
    paddingVertical: 18,
    borderRadius: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#5D9B8E',
  },
  activeControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
  },
  controlButton: {
    backgroundColor: '#ffffff',
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  controlButtonText: {
    fontSize: 24,
    color: '#5D9B8E',
  },
  instructions: {
    alignItems: 'center',
    marginBottom: 100,
  },
  instructionsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  instructionsSubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
});