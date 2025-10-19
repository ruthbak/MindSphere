// CommunityScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'https://your-api-domain.com/api';

interface Community {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  unreadCount?: number;
  imageUrl?: string;
}

interface CommunityScreenProps {
  navigation: any;
}

export default function CommunityScreen({ navigation }: CommunityScreenProps) {
  const [communities, setCommunities] = useState<Community[]>([]);
  const [myCommunities, setMyCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadCommunities();
  }, []);

  const loadCommunities = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        Alert.alert('Error', 'Please log in to view communities');
        return;
      }

      // GET /communities - List all communities
      const response = await fetch(`${API_BASE_URL}/communities`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const allCommunities = await response.json();
        
        // Mock: First 4 are user's communities, rest are recommended
        // In real app, you'd have separate endpoints or filters
        const userCommunities = allCommunities.slice(0, 4);
        const recommended = allCommunities.slice(4, 7);

        setMyCommunities(userCommunities);
        setCommunities(recommended);
      } else {
        throw new Error('Failed to load communities');
      }
    } catch (error) {
      console.error('Error loading communities:', error);
      Alert.alert('Error', 'Failed to load communities');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadCommunities();
  };

  const handleJoinCommunity = async (communityId: string) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;

      // POST /communities/{community_id}/join
      const response = await fetch(
        `${API_BASE_URL}/communities/${communityId}/join`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        Alert.alert('Success', 'You have joined the community!');
        loadCommunities(); // Refresh the list
      } else {
        throw new Error('Failed to join community');
      }
    } catch (error) {
      console.error('Error joining community:', error);
      Alert.alert('Error', 'Failed to join community');
    }
  };

  const navigateToCommunity = (community: Community) => {
    navigation.navigate('CommunityDetail', { community });
  };

  const filteredCommunities = communities.filter((community) =>
    community.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#5EBBAA" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Community</Text>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => navigation.navigate('CreateCommunity')}
            activeOpacity={0.7}
          >
            <Text style={styles.addButtonText}>+</Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search for communities"
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Recommended Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recommended</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.horizontalScroll}
          >
            {filteredCommunities.map((community) => (
              <TouchableOpacity
                key={community.id}
                style={styles.recommendedCard}
                onPress={() => navigateToCommunity(community)}
                activeOpacity={0.8}
              >
                <View style={styles.communityImage}>
                  <Text style={styles.communityImagePlaceholder}>🏥</Text>
                </View>
                <Text style={styles.communityName}>{community.name}</Text>
                <TouchableOpacity
                  style={styles.joinButton}
                  onPress={() => handleJoinCommunity(community.id)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.joinButtonText}>Join</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* My Communities Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>My Communities</Text>
          
          {myCommunities.map((community) => (
            <TouchableOpacity
              key={community.id}
              style={styles.communityItem}
              onPress={() => navigateToCommunity(community)}
              activeOpacity={0.7}
            >
              <View style={styles.communityItemLeft}>
                <View style={styles.communityAvatar}>
                  <Text style={styles.communityAvatarText}>🏥</Text>
                </View>
                <View style={styles.communityInfo}>
                  <Text style={styles.communityItemName}>{community.name}</Text>
                  <Text style={styles.communityDescription}>
                    {community.memberCount} members appreciate this community
                  </Text>
                </View>
              </View>
              {community.unreadCount && community.unreadCount > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadCount}>
                    {community.unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Bottom padding */}
        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => navigation.navigate('Home')}
          activeOpacity={0.7}
        >
          <Text style={styles.navIcon}>🏠</Text>
          <Text style={styles.navLabel}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => navigation.navigate('Community')}
          activeOpacity={0.7}
        >
          <Text style={styles.navIcon}>👥</Text>
          <Text style={styles.navLabelActive}>Community</Text>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#5EBBAA',
  },
  addButton: {
    width: 40,
    height: 40,
    backgroundColor: '#5EBBAA',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: 28,
    color: '#FFFFFF',
    fontWeight: '300',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    marginHorizontal: 24,
    marginBottom: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#5EBBAA',
    marginLeft: 24,
    marginBottom: 16,
  },
  horizontalScroll: {
    paddingLeft: 24,
  },
  recommendedCard: {
    width: 140,
    marginRight: 16,
    alignItems: 'center',
  },
  communityImage: {
    width: 120,
    height: 120,
    backgroundColor: '#F0F0F0',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  communityImagePlaceholder: {
    fontSize: 48,
  },
  communityName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  joinButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#5EBBAA',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 6,
  },
  joinButtonText: {
    color: '#5EBBAA',
    fontSize: 12,
    fontWeight: '600',
  },
  communityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  communityItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  communityAvatar: {
    width: 56,
    height: 56,
    backgroundColor: '#F0F0F0',
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  communityAvatarText: {
    fontSize: 28,
  },
  communityInfo: {
    flex: 1,
  },
  communityItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  communityDescription: {
    fontSize: 12,
    color: '#999',
  },
  unreadBadge: {
    width: 24,
    height: 24,
    backgroundColor: '#FF4444',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadCount: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
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