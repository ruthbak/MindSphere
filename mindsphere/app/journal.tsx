// app/journal.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Modal,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import BottomNavBar from './components/BottomNavBar';

interface JournalEntry {
  id: string;
  user_id: string;
  title: string;
  content: string;
  mood: string;
  mood_emoji: string;
  image_url?: string;
  created_at: Date;
  updated_at: Date;
}

export default function Journal() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEntry, setNewEntry] = useState({
    title: '',
    content: '',
    mood: '😊',
  });
  const [loading, setLoading] = useState(true);

  // User ID - get this from your auth context/session
  const userId = 'aurora'; // Replace with actual user ID from auth

  useEffect(() => {
    fetchJournalEntries();
  }, []);

  const fetchJournalEntries = async () => {
    try {
      setLoading(true);
      // Replace with your actual API endpoint
      const response = await fetch(`https://mindsphere-backend.onrender.com/journal/entries/${userId}`);
      const data = await response.json();
      setEntries(data.map((entry: any) => ({
        ...entry,
        created_at: new Date(entry.created_at),
        updated_at: new Date(entry.updated_at),
      })));
    } catch (error) {
      console.error('Error fetching entries:', error);
      Alert.alert('Error', 'Failed to load journal entries');
    } finally {
      setLoading(false);
    }
  };

  const createJournalEntry = async () => {
    if (!newEntry.title.trim()) {
      Alert.alert('Error', 'Please enter a title');
      return;
    }

    try {
      const response = await fetch('https://mindsphere-backend.onrender.com/journal/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          title: newEntry.title,
          content: newEntry.content,
          mood: 'happy', // or map from emoji
          mood_emoji: newEntry.mood,
        }),
      });

      if (response.ok) {
        setShowAddModal(false);
        setNewEntry({ title: '', content: '', mood: '😊' });
        fetchJournalEntries();
        Alert.alert('Success', 'Journal entry created!');
      }
    } catch (error) {
      console.error('Error creating entry:', error);
      Alert.alert('Error', 'Failed to create entry');
    }
  };

  const deleteEntry = async (entryId: string) => {
    try {
      const response = await fetch(`https://mindsphere-backend.onrender.com/journal/delete/${entryId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchJournalEntries();
        Alert.alert('Success', 'Entry deleted');
      }
    } catch (error) {
      console.error('Error deleting entry:', error);
      Alert.alert('Error', 'Failed to delete entry');
    }
  };

  const today = new Date();
  const todayEntry = entries.find(
    (entry) => entry.created_at.toDateString() === today.toDateString()
  );

  const getDaysOfWeek = () => {
    const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    const dates = [];
    const currentDate = new Date();
    const currentDay = currentDate.getDay();

    for (let i = 0; i < 7; i++) {
      const date = new Date(currentDate);
      date.setDate(currentDate.getDate() - currentDay + i);
      dates.push({
        day: days[i],
        date: date.getDate(),
        isToday: date.toDateString() === currentDate.toDateString(),
      });
    }
    return dates;
  };

  const daysOfWeek = getDaysOfWeek();

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const filteredEntries = entries.filter(
    (entry) =>
      entry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.contentContainer, { paddingBottom: 110 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <LinearGradient
          colors={['#A7D8C3', '#86CFAC']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <Text style={styles.headerTitle}>Journal</Text>
        </LinearGradient>

        {/* Calendar Week View */}
        <View style={styles.calendarContainer}>
          {daysOfWeek.map((day, index) => (
            <View key={index} style={styles.calendarDay}>
              <Text style={styles.calendarDayText}>{day.day}</Text>
              <View
                style={[
                  styles.calendarDate,
                  day.isToday && styles.calendarDateToday,
                ]}
              >
                <Text
                  style={[
                    styles.calendarDateText,
                    day.isToday && styles.calendarDateTextToday,
                  ]}
                >
                  {day.date}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search entries"
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Today Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Today</Text>
        </View>

        {todayEntry ? (
          <TouchableOpacity style={styles.todayCard}>
            <Image
              source={require('../assets/images/spiral-background.png')}
              style={styles.todayCardImage}
              resizeMode="cover"
            />
            <View style={styles.todayCardOverlay}>
              <Text style={styles.todayCardMood}>{todayEntry.mood_emoji}</Text>
              <Text style={styles.todayCardTitle}>{todayEntry.title}</Text>
              <Text style={styles.todayCardTime}>{formatTime(todayEntry.created_at)}</Text>
            </View>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.addTodayCard}
            onPress={() => setShowAddModal(true)}
          >
            <Text style={styles.addTodayIcon}>+</Text>
          </TouchableOpacity>
        )}

        {/* Recent Entries */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Entries</Text>
          <TouchableOpacity>
            <Text style={styles.viewAllText}>View all</Text>
          </TouchableOpacity>
        </View>

        {filteredEntries
          .filter((entry) => entry.id !== todayEntry?.id)
          .slice(0, 5)
          .map((entry) => (
            <TouchableOpacity key={entry.id} style={styles.entryCard}>
              <View style={styles.entryIndicator} />
              <View style={styles.entryContent}>
                <Text style={styles.entryTitle}>{entry.title}</Text>
                <Text style={styles.entryDate}>
                  {formatTime(entry.created_at)} • {formatDate(entry.created_at)}
                </Text>
              </View>
              <Text style={styles.entryMood}>{entry.mood_emoji}</Text>
            </TouchableOpacity>
          ))}
      </ScrollView>

      {/* Add Entry Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>New Journal Entry</Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Title"
              placeholderTextColor="#9CA3AF"
              value={newEntry.title}
              onChangeText={(text) => setNewEntry({ ...newEntry, title: text })}
            />

            <TextInput
              style={[styles.modalInput, styles.modalTextArea]}
              placeholder="How are you feeling today?"
              placeholderTextColor="#9CA3AF"
              value={newEntry.content}
              onChangeText={(text) => setNewEntry({ ...newEntry, content: text })}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={styles.modalButtonTextCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSave]}
                onPress={createJournalEntry}
              >
                <Text style={styles.modalButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
  header: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 30,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#ffffff',
  },
  calendarContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: '#ffffff',
  },
  calendarDay: {
    alignItems: 'center',
  },
  calendarDayText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 8,
    fontWeight: '500',
  },
  calendarDate: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  calendarDateToday: {
    backgroundColor: '#000000',
  },
  calendarDateText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  calendarDateTextToday: {
    color: '#ffffff',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    marginTop: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#374151',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 24,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  viewAllText: {
    fontSize: 14,
    color: '#14B8A6',
    fontWeight: '600',
  },
  todayCard: {
    marginHorizontal: 20,
    height: 200,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  todayCardImage: {
    width: '100%',
    height: '100%',
  },
  todayCardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    padding: 20,
    justifyContent: 'flex-end',
  },
  todayCardMood: {
    fontSize: 32,
    marginBottom: 8,
  },
  todayCardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  todayCardTime: {
    fontSize: 14,
    color: '#ffffff',
  },
  addTodayCard: {
    marginHorizontal: 20,
    height: 200,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  addTodayIcon: {
    fontSize: 48,
    color: '#9CA3AF',
  },
  entryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
  },
  entryIndicator: {
    width: 4,
    height: 40,
    backgroundColor: '#14B8A6',
    borderRadius: 2,
    marginRight: 16,
  },
  entryContent: {
    flex: 1,
  },
  entryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  entryDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  entryMood: {
    fontSize: 24,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    minHeight: 400,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 24,
  },
  modalInput: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#111827',
    marginBottom: 16,
  },
  modalTextArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  modalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#F3F4F6',
  },
  modalButtonSave: {
    backgroundColor: '#14B8A6',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  modalButtonTextCancel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
});