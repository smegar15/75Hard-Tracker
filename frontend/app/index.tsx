import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useChallengeStore, DailyTasks } from '../store/challengeStore';

const TASKS = [
  { key: 'diet', label: 'Follow Diet', description: 'No alcohol or cheat meals', icon: 'nutrition' },
  { key: 'workout1', label: 'Workout 1', description: '45 min (Indoor/Outdoor)', icon: 'fitness' },
  { key: 'workout2Outdoor', label: 'Workout 2', description: '45 min (Outdoor ONLY)', icon: 'sunny' },
  { key: 'water', label: 'Drink Water', description: '1 gallon (3.8 liters)', icon: 'water' },
  { key: 'reading', label: 'Read 10 Pages', description: 'Non-fiction book', icon: 'book' },
  { key: 'progressPhoto', label: 'Progress Photo', description: 'Take daily photo', icon: 'camera' },
] as const;

export default function HomeScreen() {
  // Subscribe to store with selector for better performance
  const currentDay = useChallengeStore((state) => state.currentDay);
  const bestStreak = useChallengeStore((state) => state.bestStreak);
  const totalResets = useChallengeStore((state) => state.totalResets);
  const dailyLog = useChallengeStore((state) => state.dailyLog);
  const toggleTask = useChallengeStore((state) => state.toggleTask);
  const resetChallenge = useChallengeStore((state) => state.resetChallenge);
  const checkAndAdvanceDay = useChallengeStore((state) => state.checkAndAdvanceDay);
  const initializeDay = useChallengeStore((state) => state.initializeDay);

  const [showResetModal, setShowResetModal] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  // Animation values
  const celebrationScale = useSharedValue(0);
  const celebrationOpacity = useSharedValue(0);

  // Get today's date string
  const getDateString = () => new Date().toISOString().split('T')[0];
  const today = getDateString();
  
  // Get today's tasks from store
  const todaysTasks = dailyLog[today] || {
    diet: false,
    workout1: false,
    workout2Outdoor: false,
    water: false,
    reading: false,
    progressPhoto: false,
    completedAt: null,
  };

  // Initialize day on mount
  useEffect(() => {
    initializeDay();
  }, []);

  // Count completed tasks
  const completedCount = [
    todaysTasks.diet,
    todaysTasks.workout1,
    todaysTasks.workout2Outdoor,
    todaysTasks.water,
    todaysTasks.reading,
    todaysTasks.progressPhoto,
  ].filter(Boolean).length;

  const allComplete = completedCount === 6;
  const wasComplete = todaysTasks.completedAt !== null;

  // Handle task toggle
  const handleToggleTask = useCallback(async (taskKey: keyof DailyTasks) => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    toggleTask(taskKey);

    // Check for day completion after a brief delay
    setTimeout(() => {
      const currentTasks = useChallengeStore.getState().dailyLog[today];
      if (currentTasks) {
        const nowComplete = 
          currentTasks.diet &&
          currentTasks.workout1 &&
          currentTasks.workout2Outdoor &&
          currentTasks.water &&
          currentTasks.reading &&
          currentTasks.progressPhoto;

        if (nowComplete && !wasComplete) {
          triggerCelebration();
          checkAndAdvanceDay();
        }
      }
    }, 100);
  }, [today, wasComplete, toggleTask, checkAndAdvanceDay]);

  // Celebration animation
  const triggerCelebration = useCallback(async () => {
    if (Platform.OS !== 'web') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setShowCelebration(true);
    celebrationScale.value = withSequence(
      withSpring(1.2, { damping: 8 }),
      withSpring(1, { damping: 12 })
    );
    celebrationOpacity.value = withTiming(1, { duration: 300 });
    
    setTimeout(() => {
      celebrationOpacity.value = withTiming(0, { duration: 500 });
      setTimeout(() => setShowCelebration(false), 500);
    }, 2500);
  }, []);

  const celebrationAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: celebrationScale.value }],
    opacity: celebrationOpacity.value,
  }));

  // Handle reset
  const handleReset = useCallback(async () => {
    if (Platform.OS !== 'web') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
    resetChallenge();
    setShowResetModal(false);
  }, [resetChallenge]);

  const displayDay = currentDay === 0 ? 1 : currentDay;
  const isChallengeComplete = currentDay >= 75 && allComplete;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>75 HARD</Text>
          <Text style={styles.subtitle}>Mental Toughness Challenge</Text>
        </View>

        {/* Progress Card */}
        <View style={styles.progressCard}>
          <View style={styles.dayContainer}>
            <Text style={styles.dayLabel}>DAY</Text>
            <Text style={styles.dayNumber}>{displayDay}</Text>
            <Text style={styles.dayTotal}>of 75</Text>
          </View>
          
          {/* Progress Bar */}
          <View style={styles.progressBarContainer}>
            <View 
              style={[
                styles.progressBar, 
                { width: `${(displayDay / 75) * 100}%` }
              ]} 
            />
          </View>
          <Text style={styles.progressText}>
            {Math.round((displayDay / 75) * 100)}% Complete
          </Text>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Ionicons name="flame" size={24} color="#f97316" />
            <Text style={styles.statValue}>{bestStreak}</Text>
            <Text style={styles.statLabel}>Best Streak</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="refresh" size={24} color="#ef4444" />
            <Text style={styles.statValue}>{totalResets}</Text>
            <Text style={styles.statLabel}>Resets</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="checkmark-circle" size={24} color="#22c55e" />
            <Text style={styles.statValue}>{completedCount}/6</Text>
            <Text style={styles.statLabel}>Today</Text>
          </View>
        </View>

        {/* Today's Tasks */}
        <View style={styles.tasksSection}>
          <Text style={styles.sectionTitle}>Today's Tasks</Text>
          
          {TASKS.map((task) => {
            const isComplete = todaysTasks[task.key as keyof DailyTasks];
            return (
              <TouchableOpacity
                key={task.key}
                style={[
                  styles.taskCard,
                  isComplete && styles.taskCardComplete
                ]}
                onPress={() => handleToggleTask(task.key as keyof DailyTasks)}
                activeOpacity={0.7}
              >
                <View style={[
                  styles.checkbox,
                  isComplete && styles.checkboxComplete
                ]}>
                  {isComplete && (
                    <Ionicons name="checkmark" size={20} color="#fff" />
                  )}
                </View>
                <View style={styles.taskInfo}>
                  <Text style={[
                    styles.taskLabel,
                    isComplete && styles.taskLabelComplete
                  ]}>
                    {task.label}
                  </Text>
                  <Text style={styles.taskDescription}>{task.description}</Text>
                </View>
                <Ionicons 
                  name={task.icon as any} 
                  size={24} 
                  color={isComplete ? '#22c55e' : '#6b7280'} 
                />
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Reset Button */}
        <TouchableOpacity
          style={styles.resetButton}
          onPress={() => setShowResetModal(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="warning" size={20} color="#fff" />
          <Text style={styles.resetButtonText}>I FAILED - RESET</Text>
        </TouchableOpacity>

        {/* Challenge Complete Message */}
        {isChallengeComplete && (
          <View style={styles.completeMessage}>
            <Ionicons name="trophy" size={40} color="#fbbf24" />
            <Text style={styles.completeText}>CHALLENGE COMPLETE!</Text>
            <Text style={styles.completeSubtext}>You did it! 75 days of mental toughness.</Text>
          </View>
        )}
      </ScrollView>

      {/* Celebration Overlay */}
      {showCelebration && (
        <View style={styles.celebrationOverlay}>
          <Animated.View style={[styles.celebrationContent, celebrationAnimatedStyle]}>
            <Ionicons name="ribbon" size={80} color="#22c55e" />
            <Text style={styles.celebrationTitle}>DAY COMPLETE!</Text>
            <Text style={styles.celebrationSubtitle}>You're crushing it!</Text>
          </Animated.View>
        </View>
      )}

      {/* Reset Confirmation Modal */}
      <Modal
        visible={showResetModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowResetModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Ionicons name="alert-circle" size={60} color="#ef4444" />
            <Text style={styles.modalTitle}>Reset Challenge?</Text>
            <Text style={styles.modalText}>
              This will reset your progress to Day 1. Your best streak will be saved.
            </Text>
            <Text style={styles.modalWarning}>
              Current progress: Day {displayDay}
            </Text>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowResetModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={handleReset}
              >
                <Text style={styles.confirmButtonText}>Reset</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 36,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
    letterSpacing: 1,
  },
  progressCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  dayContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 16,
  },
  dayLabel: {
    fontSize: 18,
    color: '#6b7280',
    marginRight: 8,
    fontWeight: '600',
  },
  dayNumber: {
    fontSize: 72,
    fontWeight: '900',
    color: '#22c55e',
  },
  dayTotal: {
    fontSize: 24,
    color: '#6b7280',
    marginLeft: 8,
    fontWeight: '600',
  },
  progressBarContainer: {
    width: '100%',
    height: 8,
    backgroundColor: '#2a2a2a',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#22c55e',
    borderRadius: 4,
  },
  progressText: {
    color: '#6b7280',
    marginTop: 8,
    fontSize: 14,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  tasksSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 16,
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    minHeight: 72,
  },
  taskCardComplete: {
    backgroundColor: '#14532d20',
    borderColor: '#22c55e40',
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#4b5563',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  checkboxComplete: {
    backgroundColor: '#22c55e',
    borderColor: '#22c55e',
  },
  taskInfo: {
    flex: 1,
  },
  taskLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  taskLabelComplete: {
    color: '#22c55e',
  },
  taskDescription: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#dc2626',
    borderRadius: 16,
    padding: 18,
    gap: 10,
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 1,
  },
  completeMessage: {
    alignItems: 'center',
    marginTop: 24,
    padding: 24,
    backgroundColor: '#422006',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#fbbf2440',
  },
  completeText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#fbbf24',
    marginTop: 12,
  },
  completeSubtext: {
    fontSize: 14,
    color: '#fbbf2480',
    marginTop: 8,
  },
  celebrationOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  celebrationContent: {
    alignItems: 'center',
    padding: 40,
  },
  celebrationTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#22c55e',
    letterSpacing: 2,
    marginTop: 16,
  },
  celebrationSubtitle: {
    fontSize: 18,
    color: '#fff',
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    marginTop: 16,
  },
  modalText: {
    fontSize: 15,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 22,
  },
  modalWarning: {
    fontSize: 14,
    color: '#ef4444',
    fontWeight: '600',
    marginTop: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    marginTop: 24,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#374151',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  confirmButton: {
    flex: 1,
    backgroundColor: '#dc2626',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
