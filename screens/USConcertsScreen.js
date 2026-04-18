// screens/USConcertsScreen.js
import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { API_BASE_URL } from '../config';
import ConcertCard from '../components/ConcertCard';

export default function USConcertsScreen() {
  const [concerts, setConcerts]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]           = useState(null);

  const fetchConcerts = useCallback(async () => {
    try {
      setError(null);
      const res  = await fetch(`${API_BASE_URL}/concerts/us?limit=200`);
      const data = await res.json();
      const sorted = data.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
      setConcerts(sorted);
    } catch (e) {
      setError('Could not load US concerts.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchConcerts(); }, []);

  const onRefresh = () => { setRefreshing(true); fetchConcerts(); };

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#f0a500" />
      <Text style={styles.loadingText}>Loading US shows...</Text>
    </View>
  );

  if (error) return (
    <View style={styles.center}>
      <Text style={styles.errorText}>{error}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.banner}>
        <Text style={styles.bannerText}>🇺🇸 {concerts.length} US show{concerts.length !== 1 ? 's' : ''} found</Text>
      </View>
      <FlatList
        data={concerts}
        keyExtractor={(item) => item.hash || String(Math.random())}
        renderItem={({ item }) => <ConcertCard concert={item} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f0a500" />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🎸</Text>
            <Text style={styles.empty}>No US concerts found yet.</Text>
            <Text style={styles.emptySub}>Pull to refresh or check back later!</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1a',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  banner: {
    backgroundColor: '#1e1a10',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#f0a500',
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  bannerText: {
    color: '#f0a500',
    fontSize: 15,
    fontWeight: 'bold',
  },
  list: { paddingBottom: 20 },
  center: {
    flex: 1,
    backgroundColor: '#0f0f1a',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: { color: '#f0a500', fontSize: 14 },
  errorText: { color: '#ff6b6b', fontSize: 14, textAlign: 'center', paddingHorizontal: 32 },
  emptyContainer: { alignItems: 'center', marginTop: 60, gap: 8 },
  emptyIcon: { fontSize: 40 },
  empty: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  emptySub: { color: '#555570', fontSize: 13 },
});
