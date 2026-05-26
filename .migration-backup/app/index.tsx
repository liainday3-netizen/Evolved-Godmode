import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Platform,
  Animated,
  Alert,
  Dimensions,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { SacredGeometry } from "@/components/SacredGeometry";

const SCREEN_W = Dimensions.get("window").width;

const STORAGE_KEY = "godmode_conversations";

export type GodMode = "genius" | "coder" | "strategist" | "oracle";

export interface Conversation {
  id: string;
  title: string;
  lastMessage: string;
  mode: GodMode;
  timestamp: number;
  messageCount: number;
}

const MODES: { id: GodMode; label: string; desc: string }[] = [
  { id: "genius", label: "Genius", desc: "All-knowing intellect" },
  { id: "coder", label: "Coder", desc: "Elite engineer" },
  { id: "strategist", label: "Strategist", desc: "Supreme tactician" },
  { id: "oracle", label: "Oracle", desc: "Visionary wisdom" },
];

function ModeChip({
  mode,
  selected,
  onPress,
}: {
  mode: (typeof MODES)[0];
  selected: boolean;
  onPress: () => void;
}) {
  const modeColors = Colors.modes[mode.id];
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.93,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start();
    onPress();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable
        onPress={handlePress}
        style={[
          styles.modeChip,
          selected && {
            backgroundColor: modeColors.bg,
            borderColor: modeColors.color,
          },
        ]}
      >
        <Ionicons
          name={modeColors.icon as any}
          size={14}
          color={selected ? modeColors.color : Colors.textMuted}
        />
        <Text
          style={[
            styles.modeChipText,
            selected && { color: modeColors.color },
          ]}
        >
          {mode.label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

function ConversationCard({
  item,
  onPress,
  onDelete,
}: {
  item: Conversation;
  onPress: () => void;
  onDelete: () => void;
}) {
  const modeColors = Colors.modes[item.mode];
  const pressAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.timing(pressAnim, {
      toValue: 0.97,
      duration: 100,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.timing(pressAnim, {
      toValue: 1,
      duration: 150,
      useNativeDriver: true,
    }).start();
  };

  const handleLongPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert("Delete Session", "Remove this conversation from history?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: onDelete,
      },
    ]);
  };

  const timeAgo = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <Animated.View style={{ transform: [{ scale: pressAnim }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onLongPress={handleLongPress}
        style={styles.card}
      >
        <View style={styles.cardLeft}>
          <View
            style={[styles.modeDot, { backgroundColor: modeColors.color }]}
          />
        </View>
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.cardTime}>{timeAgo(item.timestamp)}</Text>
          </View>
          <Text style={styles.cardPreview} numberOfLines={1}>
            {item.lastMessage || "New conversation"}
          </Text>
          <View style={styles.cardFooter}>
            <View
              style={[styles.modeBadge, { backgroundColor: modeColors.bg }]}
            >
              <Ionicons
                name={modeColors.icon as any}
                size={10}
                color={modeColors.color}
              />
              <Text style={[styles.modeBadgeText, { color: modeColors.color }]}>
                {item.mode.toUpperCase()}
              </Text>
            </View>
            <Text style={styles.cardCount}>
              {item.messageCount}{" "}
              {item.messageCount === 1 ? "message" : "messages"}
            </Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
      </Pressable>
    </Animated.View>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedMode, setSelectedMode] = useState<GodMode>("genius");
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    loadConversations();
    startPulse();
  }, []);

  const startPulse = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.06,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const loadConversations = async () => {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (data) setConversations(JSON.parse(data));
    } catch {}
  };

  const saveConversations = async (convs: Conversation[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(convs));
    } catch {}
  };

  const createConversation = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const id = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const modeLabel = MODES.find((m) => m.id === selectedMode)?.label ?? "Genius";
    const newConv: Conversation = {
      id,
      title: `${modeLabel} Session`,
      lastMessage: "",
      mode: selectedMode,
      timestamp: Date.now(),
      messageCount: 0,
    };
    const updated = [newConv, ...conversations];
    setConversations(updated);
    saveConversations(updated);
    router.push({ pathname: "/chat/[id]", params: { id, mode: selectedMode } });
  }, [selectedMode, conversations]);

  const deleteConversation = useCallback(
    (id: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      const updated = conversations.filter((c) => c.id !== id);
      setConversations(updated);
      saveConversations(updated);
    },
    [conversations]
  );

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const geoSize = Math.min(SCREEN_W * 0.88, 320);
  const modeColors = Colors.modes[selectedMode];

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      {/* Sacred geometry background */}
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            alignItems: "center",
            top: topPad - 30,
            bottom: undefined,
            height: geoSize + 60,
            opacity: 0.55,
          },
        ]}
        pointerEvents="none"
      >
        <SacredGeometry
          size={geoSize}
          accentColor={modeColors.color}
          goldColor={Colors.accentGold}
        />
      </View>

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerEyebrow}>EVOLVED AI</Text>
          <Text style={styles.headerTitle}>GODMODE</Text>
        </View>
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <View style={styles.statusDot}>
            <View style={styles.statusDotInner} />
          </View>
        </Animated.View>
      </View>

      {/* Mode Selector */}
      <View style={styles.modeSection}>
        <Text style={styles.sectionLabel}>SELECT MODE</Text>
        <View style={styles.modeRow}>
          {MODES.map((mode) => (
            <ModeChip
              key={mode.id}
              mode={mode}
              selected={selectedMode === mode.id}
              onPress={() => {
                setSelectedMode(mode.id);
                Haptics.selectionAsync();
              }}
            />
          ))}
        </View>
        <Text style={styles.modeDesc}>
          {MODES.find((m) => m.id === selectedMode)?.desc}
        </Text>
      </View>

      {/* New Session Button */}
      <Pressable
        onPress={createConversation}
        style={({ pressed }) => [
          styles.newButton,
          pressed && styles.newButtonPressed,
        ]}
      >
        <Ionicons name="add" size={20} color={Colors.bg} />
        <Text style={styles.newButtonText}>New Session</Text>
      </Pressable>

      {/* Conversations */}
      <View style={styles.listHeader}>
        <Text style={styles.sectionLabel}>SESSIONS</Text>
        {conversations.length > 0 && (
          <Text style={styles.sectionCount}>{conversations.length}</Text>
        )}
      </View>

      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ConversationCard
            item={item}
            onPress={() =>
              router.push({
                pathname: "/chat/[id]",
                params: { id: item.id, mode: item.mode },
              })
            }
            onDelete={() => deleteConversation(item.id)}
          />
        )}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: bottomPad + 16 },
        ]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="flash-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No sessions yet</Text>
            <Text style={styles.emptyText}>
              Choose a mode and start a new session
            </Text>
          </View>
        }
        scrollEnabled={conversations.length > 0}
      />
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
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingBottom: 20,
    paddingTop: 8,
  },
  headerEyebrow: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    color: Colors.accent,
    letterSpacing: 3,
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 34,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    letterSpacing: -1,
  },
  statusDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,212,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(0,212,255,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  statusDotInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.accent,
  },
  modeSection: {
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textMuted,
    letterSpacing: 2,
    marginBottom: 10,
  },
  modeRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  modeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modeChipText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textMuted,
  },
  modeDesc: {
    marginTop: 10,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  newButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginHorizontal: 24,
    marginBottom: 24,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: Colors.accent,
  },
  newButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  newButtonText: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: Colors.bg,
    letterSpacing: 0.3,
  },
  listHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    marginBottom: 8,
  },
  sectionCount: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.textMuted,
  },
  listContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.bgCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    gap: 12,
  },
  cardLeft: {
    alignItems: "center",
    justifyContent: "center",
  },
  modeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  cardContent: {
    flex: 1,
    gap: 4,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
    flex: 1,
    marginRight: 8,
  },
  cardTime: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
  },
  cardPreview: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  modeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
  },
  modeBadgeText: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
  },
  cardCount: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    textAlign: "center",
    paddingHorizontal: 40,
  },
});
