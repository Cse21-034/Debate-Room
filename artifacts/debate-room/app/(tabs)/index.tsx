import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { api } from '@/lib/api';
import type { Room } from '@/lib/api';
import RoomCard from '@/components/RoomCard';
import CategoryFilter from '@/components/CategoryFilter';
import { RoomCardSkeleton } from '@/components/Skeleton';
import { useAuth } from '@/context/AuthContext';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();

  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['rooms', category, search],
    queryFn: () =>
      api.rooms.list({
        category: category === 'all' ? undefined : category,
        search: search.trim() || undefined,
        limit: 30,
      }),
    staleTime: 15000,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const rooms = data?.rooms ?? [];

  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Good debate,</Text>
          <Text style={styles.username}>@{user?.username ?? '...'}</Text>
        </View>
        <TouchableOpacity
          style={styles.createBtn}
          onPress={() => router.push('/room/create')}
          activeOpacity={0.8}
        >
          <Feather name="plus" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Search bar */}
      <View style={styles.searchContainer}>
        <Feather name="search" size={16} color="#8A8A9A" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search debates..."
          placeholderTextColor="#8A8A9A"
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Feather name="x" size={16} color="#8A8A9A" />
          </TouchableOpacity>
        )}
      </View>

      {/* Category filter */}
      <CategoryFilter selected={category} onSelect={setCategory} />

      {/* Room list */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          {[1, 2, 3, 4, 5].map((i) => <RoomCardSkeleton key={i} />)}
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Feather name="alert-circle" size={40} color="#EF4444" />
          <Text style={styles.errorText}>Failed to load debates</Text>
          <TouchableOpacity onPress={() => refetch()} style={styles.retryBtn}>
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={rooms}
          keyExtractor={(r) => r.id}
          renderItem={({ item }) => (
            <RoomCard
              room={item}
              onPress={() => router.push(`/room/${item.id}`)}
            />
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#3B82F6"
              colors={['#3B82F6']}
            />
          }
          ListEmptyComponent={() => (
            <View style={styles.centered}>
              <Feather name="message-circle" size={48} color="#2A2A35" />
              <Text style={styles.emptyTitle}>No debates found</Text>
              <Text style={styles.emptySubtitle}>
                {search ? 'Try a different search' : 'Be the first to start one!'}
              </Text>
              <TouchableOpacity
                style={styles.createDebateBtn}
                onPress={() => router.push('/room/create')}
                activeOpacity={0.8}
              >
                <Text style={styles.createDebateText}>Start a debate</Text>
              </TouchableOpacity>
            </View>
          )}
          contentContainerStyle={rooms.length === 0 ? styles.emptyList : styles.listContent}
          scrollEnabled
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D0F' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  greeting: { fontSize: 13, fontFamily: 'Inter_400Regular', color: '#8A8A9A' },
  username: { fontSize: 20, fontFamily: 'Inter_700Bold', color: '#F0F0F5' },
  createBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1F',
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#2A2A35',
    height: 42,
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: '#F0F0F5',
    height: '100%',
  },
  loadingContainer: { paddingTop: 8 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  errorText: { fontSize: 16, fontFamily: 'Inter_500Medium', color: '#EF4444' },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#1A1A1F',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2A2A35',
  },
  retryText: { color: '#3B82F6', fontSize: 15, fontFamily: 'Inter_500Medium' },
  emptyTitle: { fontSize: 18, fontFamily: 'Inter_600SemiBold', color: '#F0F0F5' },
  emptySubtitle: { fontSize: 14, fontFamily: 'Inter_400Regular', color: '#8A8A9A', textAlign: 'center' },
  createDebateBtn: {
    backgroundColor: '#3B82F6',
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginTop: 4,
  },
  createDebateText: { color: '#FFF', fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  listContent: { paddingTop: 4, paddingBottom: 100 },
  emptyList: { flex: 1 },
});
