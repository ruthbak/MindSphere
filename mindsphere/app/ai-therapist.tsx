import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';

// Message type definition
interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

// API Configuration
const API_CONFIG = {
  baseUrl: 'https://your-api-endpoint.com/api',
  endpoints: {
    sendMessage: '/chat/message',
    getHistory: '/chat/history',
    startSession: '/chat/session/start'
  }
};

export default function AITherapist() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Hello aurora1111 👋☀️!',
      sender: 'bot',
      timestamp: new Date()
    },
    {
      id: '2',
      text: 'How are you doing today?',
      sender: 'bot',
      timestamp: new Date()
    },
    {
      id: '3',
      text: "I'm here to listen and help you with anything on your mind",
      sender: 'bot',
      timestamp: new Date()
    },
    {
      id: '4',
      text: "Hi Luma, I haven't been feeling the best and school is very stressful. I have a lot of assignments and I am overwhelmed",
      sender: 'user',
      timestamp: new Date()
    },
    {
      id: '5',
      text: "That sounds like a really heavy load, and it makes sense that you're feeling overwhelmed right now.\n\nSchool can pile up fast, especially when assignments keep coming in all at once.",
      sender: 'bot',
      timestamp: new Date()
    }
  ]);

  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  // Initialize chat session
  useEffect(() => {
    initializeSession();
  }, []);

  // API Functions
  const initializeSession = async () => {
    try {
      const response = await fetch(`${API_CONFIG.baseUrl}${API_CONFIG.endpoints.startSession}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: 'aurora1111',
          timestamp: new Date().toISOString()
        })
      });

      if (response.ok) {
        const data = await response.json();
        setSessionId(data.sessionId);
      }
    } catch (error) {
      console.error('Failed to initialize session:', error);
    }
  };

  const sendMessageToAPI = async (messageText: string): Promise<string> => {
    try {
      const response = await fetch(`${API_CONFIG.baseUrl}${API_CONFIG.endpoints.sendMessage}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: sessionId,
          message: messageText,
          timestamp: new Date().toISOString(),
          userId: 'aurora1111'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data = await response.json();
      return data.response || "I'm here to listen. Could you tell me more about that?";
    } catch (error) {
      console.error('API Error:', error);
      return "I'm having trouble connecting right now. But I'm here for you. Please try again.";
    }
  };

  const fetchChatHistory = async () => {
    try {
      const response = await fetch(
        `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.getHistory}?sessionId=${sessionId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        const historyMessages = data.messages.map((msg: any, idx: number) => ({
          id: `history-${idx}`,
          text: msg.text,
          sender: msg.sender,
          timestamp: new Date(msg.timestamp)
        }));
        setMessages(historyMessages);
      }
    } catch (error) {
      console.error('Failed to fetch chat history:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputValue,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    const botResponse = await sendMessageToAPI(inputValue);

    const botMessage: Message = {
      id: (Date.now() + 1).toString(),
      text: botResponse,
      sender: 'bot',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, botMessage]);
    setIsLoading(false);
  };

  const handleVoiceInput = () => {
    // Placeholder for voice input - integrate with expo-speech or similar
    alert('Voice input feature - Connect to speech-to-text API');
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Decorative circles */}
        <View style={styles.circleTopRight} />
        <View style={styles.circleBottomLeft} />
        <View style={styles.circleBottomRight} />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => router.back()}
          >
            <Text style={styles.headerButtonText}>←</Text>
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Luma</Text>
            <Text style={styles.headerSubtitle}>AI Therapist</Text>
          </View>

          <TouchableOpacity style={styles.headerButton}>
            <Text style={styles.headerButtonText}>ℹ️</Text>
          </TouchableOpacity>
        </View>

        {/* Date Badge */}
        <View style={styles.dateBadgeContainer}>
          <View style={styles.dateBadge}>
            <Text style={styles.dateBadgeText}>Today</Text>
          </View>
        </View>

        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
        >
          {messages.map((message) => (
            <View
              key={message.id}
              style={[
                styles.messageWrapper,
                message.sender === 'user' ? styles.userMessageWrapper : styles.botMessageWrapper
              ]}
            >
              <View style={styles.messageRow}>
                {message.sender === 'bot' && (
                  <View style={styles.avatar}>
                    <View style={styles.avatarInner} />
                  </View>
                )}

                <View
                  style={[
                    styles.messageBubble,
                    message.sender === 'user' ? styles.userBubble : styles.botBubble
                  ]}
                >
                  <Text
                    style={[
                      styles.messageText,
                      message.sender === 'user' ? styles.userText : styles.botText
                    ]}
                  >
                    {message.text}
                  </Text>
                </View>
              </View>
            </View>
          ))}

          {isLoading && (
            <View style={[styles.messageWrapper, styles.botMessageWrapper]}>
              <View style={styles.messageRow}>
                <View style={styles.avatar}>
                  <View style={styles.avatarInner} />
                </View>
                <View style={[styles.messageBubble, styles.botBubble]}>
                  <View style={styles.loadingDots}>
                    <View style={[styles.dot, styles.dot1]} />
                    <View style={[styles.dot, styles.dot2]} />
                    <View style={[styles.dot, styles.dot3]} />
                  </View>
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Input Area */}
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              value={inputValue}
              onChangeText={setInputValue}
              placeholder=""
              placeholderTextColor="#9CA3AF"
              multiline
              editable={!isLoading}
            />

            <TouchableOpacity
              style={styles.voiceButton}
              onPress={handleVoiceInput}
            >
              <Text style={styles.voiceButtonText}>🎤</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.sendButton,
                (!inputValue.trim() || isLoading) && styles.sendButtonDisabled
              ]}
              onPress={handleSendMessage}
              disabled={!inputValue.trim() || isLoading}
            >
              <Text style={styles.sendButtonText}>➤</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#d4e8e0',
  },
  keyboardView: {
    flex: 1,
  },
  circleTopRight: {
    position: 'absolute',
    top: -128,
    right: -128,
    width: 256,
    height: 256,
    borderRadius: 128,
    borderWidth: 2,
    borderColor: '#1f4633',
  },
  circleBottomLeft: {
    position: 'absolute',
    bottom: -192,
    left: -192,
    width: 384,
    height: 384,
    borderRadius: 192,
    borderWidth: 2,
    borderColor: '#1f4633',
  },
  circleBottomRight: {
    position: 'absolute',
    bottom: 128,
    right: -96,
    width: 192,
    height: 192,
    borderRadius: 96,
    borderWidth: 2,
    borderColor: '#1f4633',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    zIndex: 10,
  },
  headerButton: {
    width: 40,
    height: 40,
    backgroundColor: '#1f4633',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerButtonText: {
    color: '#ffffff',
    fontSize: 18,
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f4633',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#2d5a45',
  },
  dateBadgeContainer: {
    alignItems: 'center',
    marginBottom: 16,
    zIndex: 10,
  },
  dateBadge: {
    backgroundColor: '#5a9b87',
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 20,
  },
  dateBadgeText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  messagesContainer: {
    flex: 1,
    zIndex: 10,
  },
  messagesContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  messageWrapper: {
    marginBottom: 16,
  },
  userMessageWrapper: {
    alignItems: 'flex-end',
  },
  botMessageWrapper: {
    alignItems: 'flex-start',
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    maxWidth: '80%',
  },
  avatar: {
    width: 32,
    height: 32,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#5a9b87',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  avatarInner: {
    width: 12,
    height: 12,
    backgroundColor: '#5a9b87',
    borderRadius: 6,
  },
  messageBubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
  },
  userBubble: {
    backgroundColor: '#5a9b87',
    borderBottomRightRadius: 4,
  },
  botBubble: {
    backgroundColor: '#ffffff',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  userText: {
    color: '#ffffff',
  },
  botText: {
    color: '#1f2937',
  },
  loadingDots: {
    flexDirection: 'row',
    gap: 4,
  },
  dot: {
    width: 8,
    height: 8,
    backgroundColor: '#9CA3AF',
    borderRadius: 4,
  },
  dot1: {},
  dot2: {},
  dot3: {},
  inputContainer: {
    padding: 16,
    zIndex: 10,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
    maxHeight: 100,
  },
  voiceButton: {
    padding: 8,
    marginLeft: 8,
  },
  voiceButtonText: {
    fontSize: 20,
  },
  sendButton: {
    width: 40,
    height: 40,
    backgroundColor: '#1f4633',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    color: '#ffffff',
    fontSize: 18,
  },
});

