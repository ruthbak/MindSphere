import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import Svg, { Path, Circle } from 'react-native-svg';

// Icon Components
const HomeIcon = ({ active }: { active: boolean }) => (
  <Svg width="28" height="28" viewBox="0 0 24 24" fill={active ? "#0369a1" : "#0369a1"} stroke="none">
    <Path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <Path d="M9 22V12h6v10" fill={active ? "#0369a1" : "white"} />
  </Svg>
);

const CommunityIcon = ({ active }: { active: boolean }) => (
  <Svg width="28" height="28" viewBox="0 0 24 24" fill={active ? "#0369a1" : "#0369a1"} stroke="none">
    <Circle cx="9" cy="7" r="4" />
    <Path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
    <Circle cx="16" cy="11" r="3" />
    <Path d="M23 21v-2a4 4 0 0 0-3-3.87" />
  </Svg>
);

const ProHelpIcon = ({ active }: { active: boolean }) => (
  <Svg width="28" height="28" viewBox="0 0 24 24" fill={active ? "#0369a1" : "#0369a1"} stroke="none">
    <Circle cx="12" cy="8" r="5" />
    <Path d="M20 21a8 8 0 1 0-16 0" />
    <Path d="M12 11v3" stroke="white" strokeWidth="2" />
    <Circle cx="12" cy="8" r="1" fill="white" />
  </Svg>
);

const SafeReportIcon = ({ active }: { active: boolean }) => (
  <Svg width="28" height="28" viewBox="0 0 24 24" fill={active ? "#0369a1" : "#0369a1"} stroke="none">
    <Path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <Path d="M12 9v4" stroke="white" strokeWidth="2" strokeLinecap="round" />
    <Circle cx="12" cy="17" r="1" fill="white" />
  </Svg>
);

interface BottomNavBarProps {
  currentRoute?: string;
}

export default function BottomNavBar({ currentRoute }: BottomNavBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  
  // Use provided currentRoute or detect from pathname
  const activeRoute = currentRoute || pathname;

  const isActive = (route: string) => {
    return activeRoute.includes(route);
  };

  const navigateTo = (route: string) => {
    router.push(route as any);
  };

  return (
    <View style={styles.container}>
      <View style={styles.navBar}>
        {/* Home */}
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => navigateTo('/homepage')}
          activeOpacity={0.7}
        >
          <HomeIcon active={isActive('homepage')} />
          <Text style={[styles.navLabel, isActive('homepage') && styles.navLabelActive]}>
            Home
          </Text>
        </TouchableOpacity>

        {/* Community */}
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => navigateTo('/community')}
          activeOpacity={0.7}
        >
          <CommunityIcon active={isActive('community')} />
          <Text style={[styles.navLabel, isActive('community') && styles.navLabelActive]}>
            Community
          </Text>
        </TouchableOpacity>

        {/* AI Therapist (Center with Spiral) */}
        <TouchableOpacity
          style={styles.centerButton}
          onPress={() => navigateTo('/ai-therapist')}
          activeOpacity={0.7}
        >
          <View style={styles.spiralContainer}>
            <Svg width="60" height="60" viewBox="0 0 200 200">
              <Path
                d="M100,100 Q100,60 120,60 Q140,60 140,80 Q140,100 120,100 Q100,100 100,120 Q100,140 120,140 Q140,140 140,120 Q140,100 160,100 Q180,100 180,120 Q180,140 160,140 Q140,140 140,160 Q140,180 160,180"
                fill="none"
                stroke="#14b8a6"
                strokeWidth="8"
                strokeLinecap="round"
              />
              <Path
                d="M100,100 Q100,140 80,140 Q60,140 60,120 Q60,100 80,100 Q100,100 100,80 Q100,60 80,60 Q60,60 60,80 Q60,100 40,100 Q20,100 20,80 Q20,60 40,60 Q60,60 60,40 Q60,20 40,20"
                fill="none"
                stroke="#06b6d4"
                strokeWidth="8"
                strokeLinecap="round"
              />
              <Circle cx="100" cy="100" r="20" fill="#059669" opacity="0.3" />
              <Circle cx="100" cy="100" r="10" fill="#10b981" />
            </Svg>
          </View>
        </TouchableOpacity>

        {/* Pro Help */}
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => navigateTo('/pro-help')}
          activeOpacity={0.7}
        >
          <ProHelpIcon active={isActive('pro-help')} />
          <Text style={[styles.navLabel, isActive('pro-help') && styles.navLabelActive]}>
            Pro Help
          </Text>
        </TouchableOpacity>

        {/* Safe Report */}
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => navigateTo('/safe-report')}
          activeOpacity={0.7}
        >
          <SafeReportIcon active={isActive('safe-report')} />
          <Text style={[styles.navLabel, isActive('safe-report') && styles.navLabelActive]}>
            Safe Report
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 20,
    paddingBottom: Platform.OS === 'ios' ? 25 : 10,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 12,
    paddingBottom: 8,
    paddingHorizontal: 10,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: 4,
  },
  navLabel: {
    fontSize: 11,
    color: '#0369a1',
    marginTop: 4,
    fontWeight: '600',
  },
  navLabelActive: {
    color: '#0369a1',
    fontWeight: '700',
  },
  centerButton: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -30,
    flex: 1,
  },
  spiralContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 10,
    borderWidth: 3,
    borderColor: '#f0fdfa',
  },
});