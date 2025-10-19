import React, { useEffect, useState } from "react";
import BottomNavBar from './components/BottomNavBar';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";

// Replace with your backend base URL
const BASE_URL = "https://your-api-base-url.com";

/* ------------------ TYPES ------------------ */
interface Community {
  id: string;
  name: string;
  message?: string;
  time?: string;
  unread?: number;
}

interface Message {
  id: string;
  community_id?: string;
  user_id?: string;
  content: string;
  timestamp: string;
}

/* ------------------ COMPONENT ------------------ */
const Community = () => {
  const [recommendedCommunities, setRecommendedCommunities] = useState<Community[]>([]);
  const [myCommunities, setMyCommunities] = useState<Community[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchCommunities();
  }, []);

  /* ------------------ API FUNCTIONS ------------------ */

  // 1️⃣ GET /communities — List Communities
  const fetchCommunities = async () => {
    try {
      const response = await axios.get<Community[]>(`${BASE_URL}/communities`);
      setRecommendedCommunities(response.data);
      console.log("Communities:", response.data);
    } catch (error) {
      console.error("Error fetching communities:", error);
    }
  };

  // 2️⃣ POST /communities — Create a Community
  const createCommunity = async (communityName: string) => {
    try {
      const response = await axios.post<Community>(`${BASE_URL}/communities`, {
        name: communityName,
      });
      Alert.alert("Success", "Community created successfully!");
      fetchCommunities();
      console.log("Created:", response.data);
    } catch (error) {
      console.error("Error creating community:", error);
    }
  };

  // 3️⃣ POST /communities/{community_id}/join — Join a Community
  const joinCommunity = async (communityId: string) => {
    try {
      const response = await axios.post(`${BASE_URL}/communities/${communityId}/join`);
      Alert.alert("Joined", "You’ve joined this community!");
      console.log("Joined:", response.data);
    } catch (error) {
      console.error("Error joining community:", error);
    }
  };

  // 4️⃣ GET /communities/{community_id}/messages — Get Community Messages
  const getCommunityMessages = async (communityId: string) => {
    try {
      const response = await axios.get<Message[]>(`${BASE_URL}/communities/${communityId}/messages`);
      console.log("Community Messages:", response.data);
      Alert.alert("Messages fetched!", `Loaded ${response.data.length} messages.`);
    } catch (error) {
      console.error("Error fetching community messages:", error);
    }
  };

  // 5️⃣ POST /messages — Send Message
  const sendMessage = async (communityId: string, message: string) => {
    try {
      const response = await axios.post<Message>(`${BASE_URL}/messages`, {
        community_id: communityId,
        message,
      });
      console.log("Message sent:", response.data);
      Alert.alert("Message Sent", "Your message was sent successfully!");
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  // 6️⃣ GET /messages/{user_id} — Get Messages by User
  const getUserMessages = async (userId: string) => {
    try {
      const response = await axios.get<Message[]>(`${BASE_URL}/messages/${userId}`);
      console.log("User messages:", response.data);
    } catch (error) {
      console.error("Error fetching user messages:", error);
    }
  };

  /* ------------------ UI ------------------ */
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.title}>Community</Text>
        <TouchableOpacity onPress={() => createCommunity("New Community")}>
          <Ionicons name="add" size={26} color="#000" />
        </TouchableOpacity>
      </View>

      {/* Search bar */}
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={18} color="#999" />
        <TextInput
          placeholder="Search for communities"
          placeholderTextColor="#bbb"
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Recommended Section */}
        <Text style={styles.sectionTitle}>Recommended</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {recommendedCommunities.map((item) => (
            <View key={item.id} style={styles.recommendCard}>
              <View style={styles.placeholderBox} />
              <Text style={styles.commName}>{item.name}</Text>
              <TouchableOpacity onPress={() => joinCommunity(item.id)}>
                <Text style={styles.joinText}>Join</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>

        {/* My Communities Section */}
        <Text style={styles.sectionTitleGreen}>My Communities</Text>
        <FlatList
          data={myCommunities}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.communityItem}
              onPress={() => getCommunityMessages(item.id)}
            >
              <View style={styles.avatar} />
              <View style={{ flex: 1 }}>
                <Text style={styles.commName}>{item.name}</Text>
                <Text style={styles.message}>{item.message || "Tap to view messages"}</Text>
              </View>
              <View style={styles.timeBadge}>
                <Text style={styles.time}>{item.time || ""}</Text>
                {item.unread && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{item.unread}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          )}
        />
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.navBar}>
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="home-outline" size={22} color="#003366" />
          <Text style={styles.navText}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="people-outline" size={22} color="#003366" />
          <Text style={[styles.navText, { color: "#003366", fontWeight: "bold" }]}>
            Community
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.centerButton}>
          <Image
            source={{
              uri: "https://upload.wikimedia.org/wikipedia/commons/2/20/Recycle_symbol.svg",
            }}
            style={styles.centerIcon}
          />
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="medkit-outline" size={22} color="#003366" />
          <Text style={styles.navText}>Pro Help</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="warning-outline" size={22} color="#003366" />
          <Text style={styles.navText}>Safe Report</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default Community;

/* ------------------ STYLES ------------------ */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", paddingHorizontal: 20, paddingTop: 50 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 28, fontWeight: "700", color: "#4C8C7A" },
  searchBar: { flexDirection: "row", alignItems: "center", backgroundColor: "#f5f5f5", borderRadius: 10, paddingHorizontal: 10, marginVertical: 15, height: 40 },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 14, color: "#333" },
  sectionTitle: { fontSize: 16, fontWeight: "600", color: "#336633", marginBottom: 10 },
  recommendCard: { alignItems: "center", marginRight: 20 },
  placeholderBox: { width: 100, height: 100, backgroundColor: "#E6E6E6", borderRadius: 12, marginBottom: 5 },
  commName: { fontSize: 14, fontWeight: "600" },
  joinText: { color: "#003399", fontSize: 13, marginTop: 3 },
  sectionTitleGreen: { fontSize: 18, fontWeight: "700", color: "#4C8C3F", marginTop: 25, marginBottom: 10 },
  communityItem: { flexDirection: "row", alignItems: "center", paddingVertical: 15, borderBottomWidth: 0.3, borderColor: "#ccc" },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#ddd", marginRight: 12 },
  message: { fontSize: 13, color: "#999" },
  timeBadge: { alignItems: "flex-end" },
  time: { fontSize: 12, color: "#999" },
  badge: { backgroundColor: "#C62828", borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2, marginTop: 4 },
  badgeText: { color: "#fff", fontSize: 12 },
  navBar: { flexDirection: "row", justifyContent: "space-around", alignItems: "center", height: 70, borderTopWidth: 0.4, borderColor: "#ccc", backgroundColor: "#fff" },
  navItem: { alignItems: "center" },
  navText: { fontSize: 12, color: "#003366" },
  centerButton: { backgroundColor: "#fff", borderRadius: 40, padding: 8, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 5, elevation: 3 },
  centerIcon: { width: 45, height: 45 },
});

