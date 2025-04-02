import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, Alert, StyleSheet, Animated } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Sentiment from 'sentiment';
import translate from 'google-translate-api-x';
import Voice from 'react-native-voice';
import * as Speech from 'expo-speech';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const API_KEY = 'aFnAMxjTpGEhu0LAmbGz5mQiGxaCLNZpvdtcjltf'; // Replace with actual API key
const EMERGENCY_CONTACT = '+1234567890'; // Replace with actual emergency contact

const userHobbies="reading , painting , cooking";
// Message Type
type Message = {
    text: string;
    sender: 'user' | 'bot';
};

// Supported languages
const LANGUAGES = {
    English: 'en',
    Spanish: 'es',
    French: 'fr',
    Tamil: 'ta',
    Hindi: 'hi',
    German: 'de',
    Chinese: 'zh',
    Arabic: 'ar'
};

const ChatScreen: React.FC = () => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState<string>('');
    const [selectedLanguage, setSelectedLanguage] = useState<'en' | string>('en'); // Default to English
    const [translateEnabled, setTranslateEnabled] = useState<boolean>(false); // Toggle translation
    const [isLanguageMenuVisible, setIsLanguageMenuVisible] = useState(false);
    const slideAnim = useRef(new Animated.Value(0)).current;
    const flatListRef = useRef<FlatList<Message>>(null);

    useEffect(() => {
        loadChatHistory();
        Voice.onSpeechResults = onSpeechResults;
        return () => {
            Voice.destroy();
        };
    }, []);
    const getJournalEntries = async (): Promise<string> => {
        try {
            const entries = await AsyncStorage.getItem('journalEntries');
            if (entries) {
                const parsedEntries = JSON.parse(entries);
                return parsedEntries.map((entry: { text: string }) => `📖 ${entry.text}`).join("\n\n");
            }
            return "No journal entries yet.";
        } catch (error) {
            console.error('Error retrieving journal:', error);
            return "Couldn't retrieve journal entries.";
        }
    };
    
    const loadChatHistory = async () => {
        try {
            const history = await AsyncStorage.getItem('chatHistory');
            if (history) setMessages(JSON.parse(history));
        } catch (error) {
            console.error('Error loading chat history:', error);
        }
    };

    const saveChatHistory = async (chat: Message[]) => {
        try {
            await AsyncStorage.setItem('chatHistory', JSON.stringify(chat));
        } catch (error) {
            console.error('Error saving chat history:', error);
        }
    };

    const getAIResponse = async (userMessage: string): Promise<string> => {
        try {
            // Fetch previous journal entries
            const journalEntries = await getJournalEntries();
    
            // Create conversation history
            const fullConversation = messages.map(msg => `${msg.sender}: ${msg.text}`).join("\n");
    
            // Enhanced prompt to keep the responses human-like
            const prompt = `
            You are the user's best friend, not an AI. You respond as if you're talking to a close friend, with no mention of technology, AI, or anything like that. Be chill, fun, and thoughtful. Use emojis when it fits, and understand internet slang like "heyy", "hiii", "brb", "wyd", "idk", etc. Keep your replies short and engaging, like a real conversation.
    
            The user writes journal entries about their thoughts and feelings. Here are some of their past entries:
            ---
            ${journalEntries}
            ---
    
            Use this information to respond in a meaningful way. If the user talks about something they’ve written in their journal, acknowledge it naturally. Make the conversation feel personal, like you're talking to a real friend.
    
            The user also has these hobbies:
            ---
            ${userHobbies}
            ---
    
            If the user's message relates to their hobbies, bring it up in a way that feels natural and supportive. Suggest activities or topics when relevant.
    
            Here's the ongoing conversation:
            ${fullConversation}
            
            User: "${userMessage}"
            Friend:
            `;
    
            const response = await axios.post(
                'https://api.cohere.ai/v1/generate',
                {
                    model: 'command',
                    prompt: prompt,
                    max_tokens: 100, 
                },
                { headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' } }
            );
    
            return response.data.generations[0].text.trim();
        } catch (error) {
            console.error('Error fetching AI response:', error);
            return "Oops, something went wrong! But hey, I'm still here 😎. What's up?";
        }
    };
    

    
    const analyzeSentiment = (text: string): number => {
        const sentiment = new Sentiment();
        const result = sentiment.analyze(text);
        return result.score;
    };

    const translateText = async (text: string, targetLanguage: string): Promise<string> => {
        try {
            const result = await translate(text, { to: targetLanguage });
            return result.text;
        } catch (error) {
            console.error('Translation error:', error);
            return text;
        }
    };

    const detectLanguage = async (text: string): Promise<string> => {
        try {
            const result = await translate(text, { to: 'en' });
            return result.from.language.iso; // Returns the detected language code
        } catch (error) {
            console.error('Language detection error:', error);
            return 'en'; // Default to English if detection fails
        }
    };
    
    const suggestGame = (mood: string) => {
        const gamesByMood = {
            happy: ['Mario Kart 🎮', 'Among Us 🕵️‍♂️', 'Rocket League 🚗⚽'],
            sad: ['Stardew Valley 🌱', 'Journey 🎭', 'Animal Crossing 🌴'],
            bored: ['Minecraft ⛏️', 'The Sims 🏡', 'GTA V 🚔'],
            stressed: ['Candy Crush 🍬', 'Zen Koi 🐠', 'Tetris 🎶'],
            random: ['Fortnite 🔫', 'FIFA ⚽', 'Valorant 🎯', 'Chess ♟️']
        };
    
        // Choose category based on mood
        const category: keyof typeof gamesByMood = gamesByMood[mood as keyof typeof gamesByMood] ? mood as keyof typeof gamesByMood : 'random';
        const randomGame = gamesByMood[category][Math.floor(Math.random() * gamesByMood[category].length)];
    
        return `You should try playing ${randomGame}! It's really fun and suits your mood. 🎮`;
    };
    
    const sendMessage = async () => {
        if (!inputText.trim()) return;
    
        const detectedLanguage = await detectLanguage(inputText);
        let translatedText = inputText;
    
        if (detectedLanguage !== 'en') {
            translatedText = await translateText(inputText, 'en');
        }
    
        const newMessages: Message[] = [...messages, { text: inputText, sender: 'user' }];
        setMessages(newMessages);
        saveChatHistory(newMessages);
        setInputText('');
    
        let aiResponse = await getAIResponse(translatedText);
    
        if (detectedLanguage !== 'en') {
            aiResponse = await translateText(aiResponse, detectedLanguage);
        }
    
        const updatedMessages: Message[] = [...newMessages, { text: aiResponse, sender: 'bot' }];
        setMessages(updatedMessages);
        saveChatHistory(updatedMessages);
    
        Speech.speak(aiResponse, { language: detectedLanguage });
    
        const sentimentScore = analyzeSentiment(inputText);
        let mood = 'random';
        if (sentimentScore > 2) mood = 'happy';
        else if (sentimentScore < -2) mood = 'sad';
        else if (inputText.toLowerCase().includes('bored')) mood = 'bored';
    
        if (mood !== 'random') {
            const gameSuggestion = suggestGame(mood);
            setMessages(prev => [...prev, { text: gameSuggestion, sender: 'bot' }]);
            saveChatHistory([...updatedMessages, { text: gameSuggestion, sender: 'bot' }]);
            Speech.speak(gameSuggestion, { language: detectedLanguage });
        }
    };
    

    const sendEmergencyMessage = () => {
        Alert.alert('Emergency Alert', `Message sent to ${EMERGENCY_CONTACT}`);
    };

    const clearChatHistory = async () => {
        try {
            await AsyncStorage.removeItem('chatHistory');
            setMessages([]);
        } catch (error) {
            console.error('Error clearing chat history:', error);
        }
    };

    const onSpeechResults = (event: any) => {
        const text = event.value[0];
        setInputText(text);
    };

    const startListening = async () => {
        try {
            await Voice.start(selectedLanguage);
        } catch (error) {
            console.error('Error starting voice recognition:', error);
        }
    };

    const toggleLanguageMenu = () => {
        const toValue = isLanguageMenuVisible ? 0 : 1;
        Animated.parallel([
            Animated.spring(slideAnim, {
                toValue,
                useNativeDriver: true,
                friction: 8,
            })
        ]).start();
        setIsLanguageMenuVisible(!isLanguageMenuVisible);
    };

    return (
        <LinearGradient
            colors={['#171923', '#0D1117']}
            style={styles.container}
        >
            <FlatList
                ref={flatListRef}
                data={[...messages].reverse()} // Reverse to display new messages at the bottom
                keyExtractor={(_, index) => index.toString()}
                renderItem={({ item }) => (
                    <View style={[styles.messageContainer, item.sender === 'user' ? styles.userMessage : styles.botMessage]}>
                        <Text style={styles.messageText}>{item.text}</Text>
                    </View>
                )}
                inverted // Ensures new messages appear at the bottom
            />
            <TouchableOpacity style={styles.clearChatButton} onPress={clearChatHistory}>
                <Text style={styles.clearChatText}>Clear Chat</Text>
            </TouchableOpacity>
            <View style={styles.languageSection}>
                <TouchableOpacity 
                    style={styles.languageToggle}
                    onPress={toggleLanguageMenu}
                >
                    <MaterialCommunityIcons 
                        name={isLanguageMenuVisible ? "chevron-up" : "chevron-down"} 
                        size={24} 
                        color="#E2E8F0" 
                    />
                    <Text style={styles.languageToggleText}>
                        Languages & Translation
                    </Text>
                </TouchableOpacity>

                <Animated.View style={[
                    styles.languageContent,
                    {
                        opacity: slideAnim,
                        transform: [{
                            translateY: slideAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [-20, 0],
                            })
                        }]
                    }
                ]}>
                    {isLanguageMenuVisible && (
                        <>
                            <View style={styles.languageSelector}>
                                {Object.entries(LANGUAGES).map(([name, code]) => (
                                    <TouchableOpacity
                                        key={code}
                                        style={[
                                            styles.languageButton,
                                            selectedLanguage === code && styles.selectedLanguage
                                        ]}
                                        onPress={() => setSelectedLanguage(code)}
                                    >
                                        <Text style={styles.languageText}>{name}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                            
                            <TouchableOpacity
                                style={[styles.translationToggle, translateEnabled && styles.toggleEnabled]}
                                onPress={() => setTranslateEnabled(!translateEnabled)}
                            >
                                <MaterialCommunityIcons 
                                    name={translateEnabled ? "translate" : "translate-off"} 
                                    size={20} 
                                    color="#E2E8F0" 
                                />
                                <Text style={styles.translationToggleText}>
                                    Translation {translateEnabled ? 'ON' : 'OFF'}
                                </Text>
                            </TouchableOpacity>
                        </>
                    )}
                </Animated.View>
            </View>

            <View style={styles.inputContainer}>
                <TextInput
                    style={styles.input}
                    placeholder="Type a message..."
                    placeholderTextColor="#aaa"
                    value={inputText}
                    onChangeText={setInputText}
                />
                <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
                    <Text style={styles.sendButtonText}>Send</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.voiceButton} onPress={startListening}>
                    <Text style={styles.voiceButtonText}>🎤</Text>
                </TouchableOpacity>
            </View>
        </LinearGradient>
    );
};

// Updated styles
const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 15,
    },
    messageContainer: {
        padding: 15,
        borderRadius: 12,
        marginVertical: 5,
        maxWidth: '75%',
    },
    userMessage: {
        alignSelf: 'flex-end',
        backgroundColor: '#7F5AF0',
        borderBottomRightRadius: 3,
    },
    botMessage: {
        alignSelf: 'flex-start',
        backgroundColor: '#2D3748',
        borderBottomLeftRadius: 3,
    },
    messageText: {
        fontSize: 16,
        color: '#E2E8F0',
        lineHeight: 24,
    },
    inputContainer: {
        flexDirection: 'row',
        padding: 15,
        backgroundColor: '#1A202C',
        borderTopWidth: 1,
        borderTopColor: '#2D3748',
        borderRadius: 12,
        alignItems: 'center',
    },
    input: {
        flex: 1,
        padding: 12,
        borderWidth: 1,
        borderColor: '#2D3748',
        borderRadius: 12,
        fontSize: 16,
        backgroundColor: '#1A202C',
        
    },
    sendButton: {
        backgroundColor: '#7F5AF0',
        padding: 12,
        borderRadius: 12,
        marginLeft: 10,
        shadowColor: '#7F5AF0',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 5,
    },
    sendButtonText: {
        fontSize: 16,
        color: '#E2E8F0',
        fontWeight: '600',
    },
    languageSection: {
        marginVertical: 10,
        backgroundColor: '#1A202C',
        borderRadius: 12,
        overflow: 'hidden',
    },
    languageToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        backgroundColor: '#2D3748',
    },
    languageToggleText: {
        color: '#E2E8F0',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 10,
    },
    languageContent: {
        overflow: 'hidden',
        maxHeight: 200, // Set a fixed maximum height
    },
    languageSelector: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        padding: 10,
        backgroundColor: '#1A202C',
    },
    languageButton: {
        padding: 8,
        margin: 4,
        borderRadius: 8,
        backgroundColor: '#2D3748',
        borderWidth: 1,
        borderColor: '#4A5568',
    },
    selectedLanguage: {
        backgroundColor: '#7F5AF0',
        borderColor: '#6B46C1',
    },
    languageText: {
        color: '#E2E8F0',
        fontSize: 14,
    },
    toggleButton: {
        padding: 10,
        marginVertical: 10,
        alignSelf: 'center',
        borderRadius: 12,
        backgroundColor: '#2D3748',
        borderWidth: 1,
        borderColor: '#4A5568',
    },
    toggleEnabled: {
        backgroundColor: '#7F5AF0',
        borderColor: '#6B46C1',
    },
    toggleButtonText: {
        color: '#E2E8F0',
        fontWeight: '600',
    },
    voiceButton: {
        backgroundColor: '#7F5AF0',
        padding: 12,
        borderRadius: 12,
        marginLeft: 10,
        shadowColor: '#7F5AF0',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 5,
    },
    voiceButtonText: {
        fontSize: 16,
        color: '#E2E8F0',
    },
    clearChatButton: {
        backgroundColor: '#EF4444',
        padding: 10,
        borderRadius: 12,
        alignSelf: 'center',
        marginVertical: 10,
        opacity: 0.9,
    },
    clearChatText: {
        color: '#E2E8F0',
        fontWeight: '600',
    },
    translationToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        marginHorizontal: 10,
        marginBottom: 10,
        backgroundColor: '#2D3748',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#4A5568',
    },
    translationToggleText: {
        color: '#E2E8F0',
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 8,
    },
});

export default ChatScreen;
