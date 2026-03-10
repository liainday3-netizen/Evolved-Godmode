import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useLayoutEffect,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  Platform,
  Animated,
  ActivityIndicator,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { fetch } from "expo/fetch";
import { getApiUrl } from "@/lib/query-client";
import Colors from "@/constants/colors";
import type { GodMode, Conversation } from "@/app/index";

const STORAGE_KEY = "godmode_conversations";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

let msgCounter = 0;
function uid(): string {
  msgCounter++;
  return `msg-${Date.now()}-${msgCounter}-${Math.random().toString(36).substr(2, 9)}`;
}

const MODE_LABELS: Record<GodMode, string> = {
  genius: "GENIUS",
  coder: "CODER",
  strategist: "STRATEGIST",
  oracle: "ORACLE",
};

function TypingIndicator({ color }: { color: string }) {
  const dots = [
    useRef(new Animated.Value(0.3)).current,
    useRef(new Animated.Value(0.3)).current,
    useRef(new Animated.Value(0.3)).current,
  ];

  useEffect(() => {
    const animations = dots.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 180),
          Animated.timing(dot, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0.3,
            duration: 400,
            useNativeDriver: true,
          }),
        ])
      )
    );
    animations.forEach((a) => a.start());
    return () => animations.forEach((a) => a.stop());
  }, []);

  return (
    <View style={styles.typingContainer}>
      <View style={styles.typingBubble}>
        {dots.map((dot, i) => (
          <Animated.View
            key={i}
            style={[styles.typingDot, { backgroundColor: color, opacity: dot }]}
          />
        ))}
      </View>
    </View>
  );
}

function MessageBubble({
  message,
  accentColor,
}: {
  message: Message;
  accentColor: string;
}) {
  const isUser = message.role === "user";
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(12)).current;

  useLayoutEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.messageRow,
        isUser ? styles.messageRowUser : styles.messageRowAI,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      {!isUser && (
        <View style={[styles.aiAvatar, { borderColor: accentColor }]}>
          <Ionicons name="flash" size={12} color={accentColor} />
        </View>
      )}
      <View
        style={[
          styles.bubble,
          isUser
            ? [
                styles.userBubble,
                { borderColor: `${accentColor}40` },
              ]
            : styles.aiBubble,
          isUser && { maxWidth: "78%" },
        ]}
      >
        <Text style={[styles.bubbleText, isUser && styles.userBubbleText]}>
          {message.content}
        </Text>
      </View>
    </Animated.View>
  );
}

export default function ChatScreen() {
  const { id, mode: modeParam } = useLocalSearchParams<{
    id: string;
    mode: string;
  }>();
  const mode = (modeParam || "genius") as GodMode;
  const insets = useSafeAreaInsets();
  const modeColors = Colors.modes[mode];
  const accentColor = modeColors.color;

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [showTyping, setShowTyping] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const initializedRef = useRef(false);

  // Load conversation messages on mount
  useEffect(() => {
    loadMessages();
  }, [id]);

  const loadMessages = async () => {
    try {
      const data = await AsyncStorage.getItem(`godmode_msgs_${id}`);
      if (data && !initializedRef.current) {
        setMessages(JSON.parse(data));
        initializedRef.current = true;
      }
    } catch {}
  };

  const saveMessages = async (msgs: Message[]) => {
    try {
      await AsyncStorage.setItem(`godmode_msgs_${id}`, JSON.stringify(msgs));
    } catch {}
  };

  const updateConversationMeta = async (
    lastMessage: string,
    messageCount: number
  ) => {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (!data) return;
      const convs: Conversation[] = JSON.parse(data);
      const updated = convs.map((c) => {
        if (c.id === id) {
          return {
            ...c,
            lastMessage,
            messageCount,
            timestamp: Date.now(),
            title:
              c.messageCount === 0
                ? lastMessage.slice(0, 40) + (lastMessage.length > 40 ? "…" : "")
                : c.title,
          };
        }
        return c;
      });
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {}
  };

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isStreaming) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setInput("");
    inputRef.current?.focus();

    const currentMessages = [...messages];
    const userMsg: Message = { id: uid(), role: "user", content: text };
    const newMessages = [...currentMessages, userMsg];

    setMessages(newMessages);
    setIsStreaming(true);
    setShowTyping(true);

    let fullContent = "";
    let assistantAdded = false;
    let finalMessages = newMessages;

    try {
      const baseUrl = getApiUrl();
      const chatHistory = [
        ...currentMessages.map((m) => ({ role: m.role, content: m.content })),
        { role: "user", content: text },
      ];

      const response = await fetch(`${baseUrl}api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        },
        body: JSON.stringify({ messages: chatHistory, mode }),
      });

      if (!response.ok) throw new Error("Failed to get response");

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") continue;

          try {
            const parsed = JSON.parse(data);
            if (parsed.content) {
              fullContent += parsed.content;

              if (!assistantAdded) {
                setShowTyping(false);
                const aiMsg: Message = {
                  id: uid(),
                  role: "assistant",
                  content: fullContent,
                };
                setMessages((prev) => {
                  finalMessages = [...prev, aiMsg];
                  return finalMessages;
                });
                assistantAdded = true;
              } else {
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    ...updated[updated.length - 1],
                    content: fullContent,
                  };
                  finalMessages = updated;
                  return updated;
                });
              }
            }
          } catch {}
        }
      }
    } catch (error) {
      setShowTyping(false);
      const errMsg: Message = {
        id: uid(),
        role: "assistant",
        content: "Connection lost. Please try again.",
      };
      setMessages((prev) => {
        finalMessages = [...prev, errMsg];
        return finalMessages;
      });
    } finally {
      setIsStreaming(false);
      setShowTyping(false);
      // Save to storage after streaming completes
      await saveMessages(finalMessages);
      await updateConversationMeta(text, finalMessages.length);
    }
  }, [input, isStreaming, messages, mode, id]);

  const reversedMessages = [...messages].reverse();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <View style={[styles.modePill, { backgroundColor: modeColors.bg }]}>
            <Ionicons
              name={modeColors.icon as any}
              size={12}
              color={accentColor}
            />
            <Text style={[styles.modePillText, { color: accentColor }]}>
              {MODE_LABELS[mode]}
            </Text>
          </View>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            GODMODE AI
          </Text>
        </View>
        <View style={styles.backBtn} />
      </View>

      {/* Divider */}
      <View style={[styles.divider, { backgroundColor: accentColor + "20" }]} />

      {/* Chat */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior="padding"
        keyboardVerticalOffset={0}
      >
        <FlatList
          data={reversedMessages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <MessageBubble message={item} accentColor={accentColor} />
          )}
          inverted={messages.length > 0}
          ListHeaderComponent={
            showTyping ? <TypingIndicator color={accentColor} /> : null
          }
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.chatContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.welcomeContainer}>
              <View
                style={[
                  styles.welcomeIconRing,
                  { borderColor: accentColor + "40" },
                ]}
              >
                <View
                  style={[
                    styles.welcomeIconInner,
                    { backgroundColor: modeColors.bg },
                  ]}
                >
                  <Ionicons
                    name={modeColors.icon as any}
                    size={28}
                    color={accentColor}
                  />
                </View>
              </View>
              <Text style={styles.welcomeTitle}>
                {MODE_LABELS[mode]} Mode Active
              </Text>
              <Text style={styles.welcomeText}>
                {mode === "genius" && "Ask anything. Expect brilliance."}
                {mode === "coder" && "Bring your toughest engineering challenge."}
                {mode === "strategist" && "What problem needs solving at scale?"}
                {mode === "oracle" && "What truth are you seeking today?"}
              </Text>
            </View>
          }
        />

        {/* Input */}
        <View
          style={[
            styles.inputContainer,
            { paddingBottom: bottomPad + 8 },
          ]}
        >
          <View style={styles.inputRow}>
            <TextInput
              ref={inputRef}
              style={styles.input}
              placeholder="Ask anything..."
              placeholderTextColor={Colors.textMuted}
              value={input}
              onChangeText={setInput}
              multiline
              maxLength={4000}
              blurOnSubmit={false}
              onSubmitEditing={handleSend}
              returnKeyType="send"
            />
            <Pressable
              onPress={() => {
                handleSend();
                inputRef.current?.focus();
              }}
              disabled={!input.trim() || isStreaming}
              style={[
                styles.sendBtn,
                { backgroundColor: accentColor },
                (!input.trim() || isStreaming) && styles.sendBtnDisabled,
              ]}
            >
              {isStreaming ? (
                <ActivityIndicator size="small" color={Colors.bg} />
              ) : (
                <Ionicons name="arrow-up" size={18} color={Colors.bg} />
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  modePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  modePillText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
  },
  headerSubtitle: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    color: Colors.textMuted,
    letterSpacing: 2,
  },
  divider: {
    height: 1,
    marginHorizontal: 16,
  },
  chatContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  messageRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    marginBottom: 4,
  },
  messageRowUser: {
    justifyContent: "flex-end",
  },
  messageRowAI: {
    justifyContent: "flex-start",
  },
  aiAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  bubble: {
    maxWidth: "80%",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 18,
  },
  userBubble: {
    backgroundColor: Colors.userBubble,
    borderWidth: 1,
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: Colors.aiBubble,
    borderWidth: 1,
    borderColor: Colors.aiBubbleBorder,
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
    lineHeight: 22,
  },
  userBubbleText: {
    color: Colors.text,
  },
  typingContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  typingBubble: {
    flexDirection: "row",
    gap: 5,
    backgroundColor: Colors.aiBubble,
    borderWidth: 1,
    borderColor: Colors.aiBubbleBorder,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  typingDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  welcomeContainer: {
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 32,
    gap: 16,
    transform: [{ scaleY: -1 }],
  },
  welcomeIconRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  welcomeIconInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  welcomeTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    textAlign: "center",
  },
  welcomeText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  inputContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.bg,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    backgroundColor: Colors.bgInput,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.borderBright,
    paddingLeft: 16,
    paddingRight: 6,
    paddingVertical: 6,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
    maxHeight: 120,
    paddingVertical: 6,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: {
    opacity: 0.35,
  },
});
