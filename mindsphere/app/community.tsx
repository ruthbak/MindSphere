// community.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
  FlatList,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BottomNavBar from './components/BottomNavBar';

const API_BASE_URL = 'https://mindsphere-backend.onrender.com';

interface Community {
  id: string;
  name: string;
  description?: string;
  memberCount?: number;
  unreadCount?: number;
  is_member?: boolean;
  icon_url?: string;
  last_sender?: string;
  last_message?: string;
  last_timestamp?: string;
  unread_count?: number;
}

interface Message {
  id: string;
  sender_id: string;
  recipient_id?: string;
  content: string;
  timestamp: string;
  message_type?: string;
}

export default function Community() {
  const [communities, setCommunities] = useState<Community[]>([]);
  const [myCommunities, setMyCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  // Hardcoded user ID - you can make this dynamic later
  const [currentUserId] = useState<string>('68f441b437fbd6ba07060552');

  // Chat modal states
  const [isChatModalVisible, setIsChatModalVisible] = useState(false);
  const [selectedCommunity, setSelectedCommunity] = useState<Community | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState('');
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  // Create community modal states
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [newCommunityName, setNewCommunityName] = useState('');

  useEffect(() => {
    loadCommunities();
  }, []);

  const loadCommunities = async () => {
    try {
      // GET /communities
      const response = await fetch(`${API_BASE_URL}/communities`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        const allCommunities: Community[] = Array.isArray(data)
          ? data
          : Array.isArray(data?.communities)
          ? data.communities
          : [];

        const myComms = allCommunities.filter((c) => c.is_member === true);
        const recommendedComms = allCommunities.filter((c) => c.is_member !== true);

        setMyCommunities(myComms);
        setCommunities(recommendedComms);
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

  const handleCreateCommunity = () => {
    setIsCreateModalVisible(true);
  };

  const submitCreateCommunity = async () => {
    if (!newCommunityName || !newCommunityName.trim()) {
      Alert.alert('Error', 'Please enter a community name');
      return;
    }

    try {
      // POST /communities
      const response = await fetch(`${API_BASE_URL}/communities`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newCommunityName.trim() }),
      });

      if (response.ok) {
        Alert.alert('Success', 'Community created successfully!');
        setIsCreateModalVisible(false);
        setNewCommunityName('');
        loadCommunities();
      } else {
        throw new Error('Failed to create community');
      }
    } catch (error) {
      console.error('Error creating community:', error);
      Alert.alert('Error', 'Failed to create community');
    }
  };

  const cancelCreateCommunity = () => {
    setIsCreateModalVisible(false);
    setNewCommunityName('');
  };

  const handleJoinCommunity = async (communityId: string) => {
    try {
      // POST /communities/{community_id}/join
      const response = await fetch(
        `${API_BASE_URL}/communities/${communityId}/join`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ user_id: currentUserId }),
        }
      );

      if (response.ok) {
        Alert.alert('Success', 'Joined community successfully!');
        loadCommunities();
      } else {
        throw new Error('Failed to join community');
      }
    } catch (error) {
      console.error('Error joining community:', error);
      Alert.alert('Error', 'Failed to join community');
    }
  };

  const openCommunityChat = async (community: Community) => {
    setSelectedCommunity(community);
    setIsChatModalVisible(true);
    await loadCommunityMessages(community.id);
  };

  const loadCommunityMessages = async (communityId: string) => {
    setIsLoadingMessages(true);
    try {
      // GET /communities/{community_id}/messages
      const response = await fetch(
        `${API_BASE_URL}/communities/${communityId}/messages`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setMessages(data || []);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      Alert.alert('Error', 'Failed to load messages');
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const sendMessage = async () => {
    if (!messageText.trim() || !selectedCommunity) return;

    try {
      // POST /messages
      const messageData = {
        sender_id: currentUserId,
        recipient_id: selectedCommunity.id,
        content: messageText.trim(),
        message_type: 'text',
      };

      const response = await fetch(`${API_BASE_URL}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messageData),
      });

      if (response.ok) {
        const data = await response.json();
        
        const newMessage: Message = {
          id: data.id || Date.now().toString(),
          sender_id: currentUserId,
          recipient_id: selectedCommunity.id,
          content: messageText.trim(),
          timestamp: new Date().toISOString(),
          message_type: 'text',
        };

        setMessages((prev) => [...prev, newMessage]);
        setMessageText('');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message');
    }
  };

  const closeChatModal = () => {
    setIsChatModalVisible(false);
    setSelectedCommunity(null);
    setMessages([]);
    setMessageText('');
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
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Community</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={handleCreateCommunity}
            activeOpacity={0.7}
          >
            <Ionicons name="add" size={28} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={18} color="#999" />
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
            {filteredCommunities.length > 0 ? (
              filteredCommunities.map((community) => (
                <TouchableOpacity
                  key={community.id}
                  style={styles.recommendedCard}
                  onPress={() => openCommunityChat(community)}
                  activeOpacity={0.8}
                >
                  <View style={styles.communityImage}>
                    <Text style={styles.communityImagePlaceholder}>🏥</Text>
                  </View>
                  <Text style={styles.communityName}>{community.name}</Text>
                  <TouchableOpacity
                    style={styles.joinButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleJoinCommunity(community.id);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.joinButtonText}>Join</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              ))
            ) : (
              <Text style={styles.emptyText}>No communities found</Text>
            )}
          </ScrollView>
        </View>

        {/* My Communities Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>My Communities</Text>

          {myCommunities.length > 0 ? (
            myCommunities.map((community) => (
              <TouchableOpacity
                key={community.id}
                style={styles.communityItem}
                onPress={() => openCommunityChat(community)}
                activeOpacity={0.7}
              >
                <View style={styles.communityItemLeft}>
                  <View style={styles.communityAvatar}>
                    <Text style={styles.communityAvatarText}>🏥</Text>
                  </View>
                  <View style={styles.communityInfo}>
                    <Text style={styles.communityItemName}>
                      {community.name}
                    </Text>
                    <Text style={styles.communityDescription} numberOfLines={1}>
                      {community.last_sender && community.last_message
                        ? `${community.last_sender}: ${community.last_message}`
                        : 'No recent messages'}
                    </Text>
                  </View>
                </View>
                <View style={styles.rightSection}>
                  {community.last_timestamp && (
                    <Text style={styles.timestamp}>{community.last_timestamp}</Text>
                  )}
                  {community.unread_count && community.unread_count > 0 && (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadCount}>
                        {community.unread_count}
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <Text style={styles.emptyText}>
              You haven't joined any communities yet
            </Text>
          )}
        </View>
      </ScrollView>

      {/* Create Community Modal */}
      <Modal
        visible={isCreateModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={cancelCreateCommunity}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.createModalContent}>
            <Text style={styles.createModalTitle}>Create Community</Text>
            
            <TextInput
              style={styles.createModalInput}
              placeholder="Enter community name"
              placeholderTextColor="#999"
              value={newCommunityName}
              onChangeText={setNewCommunityName}
              autoFocus
            />

            <View style={styles.createModalButtons}>
              <TouchableOpacity
                style={[styles.createModalButton, styles.cancelButton]}
                onPress={cancelCreateCommunity}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.createModalButton, styles.submitButton]}
                onPress={submitCreateCommunity}
                activeOpacity={0.7}
              >
                <Text style={styles.submitButtonText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Chat Modal */}
      <Modal
        visible={isChatModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={closeChatModal}
      >
        <KeyboardAvoidingView
          style={styles.chatContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* Chat Header */}
          <View style={styles.chatHeader}>
            <TouchableOpacity onPress={closeChatModal}>
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.chatTitle}>{selectedCommunity?.name}</Text>
            <View style={{ width: 24 }} />
          </View>

          {/* Messages List */}
          <FlatList
            data={messages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messagesList}
            renderItem={({ item }) => (
              <View
                style={[
                  styles.messageContainer,
                  item.sender_id === currentUserId
                    ? styles.myMessage
                    : styles.theirMessage,
                ]}
              >
                {item.sender_id !== currentUserId && (
                  <Text style={styles.senderName}>{item.sender_id}</Text>
                )}
                <Text
                  style={[
                    styles.messageContent,
                    item.sender_id === currentUserId
                      ? styles.myMessageText
                      : styles.theirMessageText,
                  ]}
                >
                  {item.content}
                </Text>
                <Text
                  style={[
                    styles.messageTime,
                    item.sender_id === currentUserId
                      ? styles.myMessageTime
                      : styles.theirMessageTime,
                  ]}
                >
                  {new Date(item.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
            )}
            ListEmptyComponent={
              isLoadingMessages ? (
                <Text style={styles.emptyMessageText}>Loading messages...</Text>
              ) : (
                <Text style={styles.emptyMessageText}>
                  No messages yet. Start the conversation!
                </Text>
              )
            }
          />

          {/* Message Input */}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.messageInput}
              placeholder="Type a message..."
              placeholderTextColor="#999"
              value={messageText}
              onChangeText={setMessageText}
              multiline
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                !messageText.trim() && styles.sendButtonDisabled,
              ]}
              onPress={sendMessage}
              disabled={!messageText.trim()}
              activeOpacity={0.7}
            >
              <Ionicons 
                name="send" 
                size={20} 
                color={messageText.trim() ? "#FFFFFF" : "#999"} 
              />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Bottom Navigation */}
      <BottomNavBar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    paddingBottom: 100,
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
    paddingTop: 60,
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
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginLeft: 8,
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
  rightSection: {
    alignItems: 'flex-end',
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  unreadBadge: {
    backgroundColor: '#FF4444',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadCount: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyText: {
    color: '#999',
    fontSize: 13,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  // Create Community Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  createModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '85%',
    maxWidth: 400,
  },
  createModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  createModalInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
    color: '#333',
  },
  createModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  createModalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F5F5F5',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#5EBBAA',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  // Chat Modal Styles
  chatContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#5EBBAA',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 15,
  },
  chatTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  messagesList: {
    padding: 15,
  },
  messageContainer: {
    marginBottom: 15,
    padding: 12,
    borderRadius: 12,
    maxWidth: '75%',
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#5EBBAA',
  },
  theirMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#f0f0f0',
  },
  senderName: {
    fontSize: 11,
    color: '#666',
    marginBottom: 4,
    fontWeight: '600',
  },
  messageContent: {
    fontSize: 15,
  },
  myMessageText: {
    color: '#FFFFFF',
  },
  theirMessageText: {
    color: '#333',
  },
  messageTime: {
    fontSize: 10,
    marginTop: 4,
    textAlign: 'right',
  },
  myMessageTime: {
    color: 'rgba(255,255,255,0.7)',
  },
  theirMessageTime: {
    color: '#999',
  },
  emptyMessageText: {
    textAlign: 'center',
    color: '#999',
    marginTop: 50,
    fontSize: 15,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#FFFFFF',
  },
  messageInput: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
    color: '#333',
  },
  sendButton: {
    marginLeft: 10,
    backgroundColor: '#5EBBAA',
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#CCC',
  },
});