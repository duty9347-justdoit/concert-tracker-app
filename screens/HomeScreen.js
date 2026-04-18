// screens/HomeScreen.js
import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  ActivityIndicator, RefreshControl, TextInput,
} from 'react-native';
import { API_BASE_URL } from '../config';
import ConcertCard from '../components/ConcertCard';

export default function HomeScreen() {
  const [concerts, setConcerts]     = useState([]);
  const [filtered, setFiltered]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]           = useState(null);
  const [search, setSearch]         = useState('');

  const fetchConcerts = useCallback(async () => {
    try {
      setError(null);
      const res  = await fetch(`${API_BASE_URL}/concerts?limit=200`);
      const data = await res.json();
      // Sort: US first, then by date
      const parseDate = (dateStr) => {
        if (!dateStr) return 0;
        const d = new Date(dateStr);
        return isNaN(d.getTime()) ? 0 : d.getTime();
      };

	  const sorted = data.sort((a, b) => {
	  if (b.is_us !== a.is_us) return b.is_us - a.is_us;
		return parseDate(b.date) - parseDate(a.date);  // descending: latest first
	  });
      setConcerts(sorted);
      setFiltered(sorted);
    } catch (e) {
      setError('Could not load concerts. Check your API URL in config.js.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchConcerts(); }, []);

  useEffect(() => {
    if (!search.trim()) {
      setFiltered(concerts);
    } else {
      const q = search.toLowerCase();
      setFiltered(concerts.filter(c =>
        (c.venue   || '').toLowerCase().includes(q) ||
        (c.city    || '').toLowerCase().includes(q) ||
        (c.country || '').toLowerCase().includes(q) ||
        (c.artist_id || '').toLowerCase().includes(q)
      ));
    }
  }, [search, concerts]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchConcerts();
  };

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#7c6af7" />
      <Text style={styles.loadingText}>Loading concerts...</Text>
    </View>
  );

  if (error) return (
    <View style={styles.center}>
      <Text style={styles.errorText}>{error}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.search}
        placeholder="Search venue, city, artist..."
        placeholderTextColor="#555570"
        value={search}
        onChangeText={setSearch}
      />
      <Text style={styles.count}>
        {filtered.length} concert{filtered.length !== 1 ? 's' : ''}
        {search ? ` matching "${search}"` : ''}
      </Text>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.hash || String(Math.random())}
        renderItem={({ item }) => <ConcertCard concert={item} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7c6af7" />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>No concerts found.</Text>}
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
  search: {
    backgroundColor: '#1a1a2e',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#ffffff',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#2a2a3e',
    marginBottom: 10,
  },
  count: {
    color: '#555570',
    fontSize: 12,
    marginBottom: 10,
  },
  list: {
    paddingBottom: 20,
  },
  center: {
    flex: 1,
    backgroundColor: '#0f0f1a',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#7c6af7',
    fontSize: 14,
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  empty: {
    color: '#555570',
    textAlign: 'center',
    marginTop: 40,
    fontSize: 14,
  },
});
