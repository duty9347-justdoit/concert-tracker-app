// components/ConcertCard.js
import { View, Text, TouchableOpacity, Linking, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function ConcertCard({ concert }) {
  const isUS = concert.is_us === 1 || concert.is_us === true;

  const openLink = () => {
    if (concert.link) Linking.openURL(concert.link);
  };

  return (
    <TouchableOpacity style={[styles.card, isUS && styles.cardUS]} onPress={openLink} activeOpacity={0.8}>
      {isUS && (
        <View style={styles.usBadge}>
          <Text style={styles.usBadgeText}>🇺🇸 UNITED STATES</Text>
        </View>
      )}
      <View style={styles.row}>
        <View style={styles.dateBlock}>
          <Text style={styles.dateText}>{formatDate(concert.date)}</Text>
        </View>
        <View style={styles.details}>
          <Text style={styles.venue} numberOfLines={1}>{concert.venue || '—'}</Text>
          <Text style={styles.location} numberOfLines={1}>
            {[concert.city, concert.country].filter(Boolean).join(', ') || '—'}
          </Text>
          <View style={styles.footer}>
            <Text style={styles.source}>{concert.source}</Text>
            {concert.artist_id && (
              <Text style={styles.artistTag}>{concert.artist_id.toUpperCase()}</Text>
            )}
          </View>
        </View>
        <Ionicons name="chevron-forward" size={16} color="#444460" />
      </View>
    </TouchableOpacity>
  );
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  // Handle "2026-Jan-24" or "2026-01-24" formats
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#2a2a3e',
  },
  cardUS: {
    borderColor: '#f0a500',
    backgroundColor: '#1e1a10',
  },
  usBadge: {
    backgroundColor: '#f0a500',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  usBadgeText: {
    color: '#000',
    fontSize: 11,
    fontWeight: 'bold',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dateBlock: {
    backgroundColor: '#7c6af7',
    borderRadius: 8,
    padding: 8,
    minWidth: 56,
    alignItems: 'center',
  },
  dateText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  details: {
    flex: 1,
    gap: 3,
  },
  venue: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  location: {
    color: '#9999bb',
    fontSize: 13,
  },
  footer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  source: {
    color: '#7c6af7',
    fontSize: 11,
    fontWeight: '500',
  },
  artistTag: {
    color: '#555570',
    fontSize: 11,
  },
});
