// FILE: app/components/BottomNavBar.tsx
// ============================================
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';

export default function BottomNavBar() {
  const router = useRouter();
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;

  return (
    <View style={styles.navBar}>
      <TouchableOpacity 
        style={styles.navItem}
        onPress={() => router.push('/homepage')}
      >
        <Ionicons 
          name="home-outline" 
          size={22} 
          color="#003366" 
        />
        <Text style={[styles.navText, isActive('/homepage') && styles.navTextActive]}>
          Home
        </Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.navItem}
        onPress={() => router.push('/community')}
      >
        <Ionicons 
          name="people-outline" 
          size={22} 
          color="#003366" 
        />
        <Text style={[styles.navText, isActive('/community') && styles.navTextActive]}>
          Community
        </Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.centerButton}
        onPress={() => router.push('/meditation')}
      >
        <Image
          source={{
            uri: 'https://upload.wikimedia.org/wikipedia/commons/2/20/Recycle_symbol.svg',
          }}
          style={styles.centerIcon}
        />
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.navItem}
        onPress={() => router.push('/pro-help')}
      >
        <Ionicons 
          name="medkit-outline" 
          size={22} 
          color="#003366" 
        />
        <Text style={[styles.navText, isActive('/pro-help') && styles.navTextActive]}>
          Pro Help
        </Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.navItem}
        onPress={() => router.push('/safe-report')}
      >
        <Ionicons 
          name="warning-outline" 
          size={22} 
          color="#003366" 
        />
        <Text style={[styles.navText, isActive('/safe-report') && styles.navTextActive]}>
          Safe Report
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  navBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: 70,
    borderTopWidth: 0.4,
    borderColor: '#ccc',
    backgroundColor: '#fff',
  },
  navItem: {
    alignItems: 'center',
  },
  navText: {
    fontSize: 12,
    color: '#003366',
  },
  navTextActive: {
    color: '#003366',
    fontWeight: 'bold',
  },
  centerButton: {
    backgroundColor: '#fff',
    borderRadius: 40,
    padding: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  centerIcon: {
    width: 45,
    height: 45,
  },
});