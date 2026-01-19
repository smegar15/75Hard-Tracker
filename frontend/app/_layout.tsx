import React, { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useChallengeStore, ChallengeState } from '../store/challengeStore';

const STORAGE_KEY = '75hard-challenge-data';

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  const setState = useChallengeStore((s) => s.setState);
  const initializeDay = useChallengeStore((s) => s.initializeDay);

  // Load from storage on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        let data: string | null = null;
        
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          data = window.localStorage.getItem(STORAGE_KEY);
        } else {
          data = await AsyncStorage.getItem(STORAGE_KEY);
        }

        if (data) {
          const parsed: ChallengeState = JSON.parse(data);
          setState({
            currentDay: parsed.currentDay ?? 0,
            startDate: parsed.startDate ?? null,
            lastCompletedDate: parsed.lastCompletedDate ?? null,
            totalResets: parsed.totalResets ?? 0,
            bestStreak: parsed.bestStreak ?? 0,
            dailyLog: parsed.dailyLog ?? {},
          });
        }
      } catch (e) {
        console.log('Error loading data:', e);
      }
      
      // Initialize today after loading
      initializeDay();
      setIsReady(true);
    };

    loadData();
  }, []);

  // Subscribe to store changes and save
  useEffect(() => {
    const unsubscribe = useChallengeStore.subscribe((state) => {
      const dataToSave: ChallengeState = {
        currentDay: state.currentDay,
        startDate: state.startDate,
        lastCompletedDate: state.lastCompletedDate,
        totalResets: state.totalResets,
        bestStreak: state.bestStreak,
        dailyLog: state.dailyLog,
      };

      const jsonData = JSON.stringify(dataToSave);

      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.localStorage.setItem(STORAGE_KEY, jsonData);
      } else {
        AsyncStorage.setItem(STORAGE_KEY, jsonData).catch((e) => {
          console.log('Error saving data:', e);
        });
      }
    });

    return () => unsubscribe();
  }, []);

  if (!isReady) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#0a0a0a' },
        }}
      />
    </SafeAreaProvider>
  );
}
