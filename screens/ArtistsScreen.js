// screens/ArtistsScreen.js
import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator,
  RefreshControl, TouchableOpacity, Alert, Modal,
  TextInput, ScrollView, Switch, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE_URL } from '../config';
import { apiFetch } from '../utils/apiFetch';

const EMPTY_FORM = {
  id: '', name: '', enabled: true,
  setlistfm_query: '', songkick_query: '', bandsintown_id: '',
};

export default function ArtistsScreen() {
  const [artists, setArtists]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [scraping, setScraping]     = useState(null);
  const [error, setError]           = useState(null);

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing]       = useState(false);
  const [saving, setSaving]             = useState(false);
  const [bitLooking, setBitLooking]     = useState(false);  // bandsintown lookup
  const [form, setForm]                 = useState(EMPTY_FORM);

  const fetchArtists = useCallback(async () => {
    try {
      setError(null);
      const res  = await apiFetch(`/artists`);
      const data = await res.json();

      // Real artists alphabetically first, placeholder artistX ids at bottom
      const sorted = data.sort((a, b) => {
        const aIsPlaceholder = /^artist\d+$/.test(a.id);
        const bIsPlaceholder = /^artist\d+$/.test(b.id);
        if (aIsPlaceholder && !bIsPlaceholder) return 1;
        if (!aIsPlaceholder && bIsPlaceholder) return -1;
        return a.name.localeCompare(b.name);
      });
      setArtists(sorted);
    } catch (e) {
      setError('Could not load artists.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchArtists(); }, []);

  const onRefresh = () => { setRefreshing(true); fetchArtists(); };

  // ── Open modals ──────────────────────────────
  const openAdd = () => {
    if (artists.length >= 5) {
      Alert.alert('Limit Reached', 'Maximum of 5 artists allowed.');
      return;
    }
    setForm(EMPTY_FORM);
    setIsEditing(false);
    setModalVisible(true);
  };

  const openEdit = (artist) => {
    setForm({
      id:              artist.id,
      name:            artist.name,
      enabled:         !!artist.enabled,
      setlistfm_query: artist.setlistfm_query || '',
      songkick_query:  artist.songkick_query  || '',
      bandsintown_id:  artist.bandsintown_id  || '',
    });
    setIsEditing(true);
    setModalVisible(true);
  };

  // ── Bandsintown ID lookup ─────────────────────
  const lookupBandsintown = async () => {
    const query = (form.name || form.songkick_query || form.setlistfm_query).trim();
    if (!query) {
      Alert.alert('Lookup', 'Enter a Name or search query first.');
      return;
    }
    setBitLooking(true);
    try {
      const res  = await apiFetch(
        `/bandsintown-lookup?name=${encodeURIComponent(query)}`
      );
      const data = await res.json();
      if (data.found && data.bandsintown_id) {
        setForm(f => ({ ...f, bandsintown_id: data.bandsintown_id }));
        Alert.alert('✅ Found', `Artist: ${data.name}\nID set to:\n${data.bandsintown_id}`);
      } else {
        Alert.alert(
          'Not Found Automatically',
          `Could not find "${query}" on Bandsintown.\n\nTo get the ID manually:\n1. Go to bandsintown.com\n2. Search for the artist\n3. Copy the ID from the URL:\n   bandsintown.com/a/6240-celtic-woman\n   → enter: 6240-celtic-woman`,
          [{ text: 'OK' }]
        );
      }
    } catch (e) {
      Alert.alert('Error', 'Could not reach the API.');
    } finally {
      setBitLooking(false);
    }
  };

  // ── Save ─────────────────────────────────────
  const handleSave = async () => {
    if (!form.name.trim()) {
      Alert.alert('Validation', 'Name is required.');
      return;
    }
    if (!isEditing && !form.id.trim()) {
      Alert.alert('Validation', 'ID is required.');
      return;
    }
    setSaving(true);
    try {
      let res;
      if (isEditing) {
        res = await apiFetch(`/artists/${form.id}`, {
          method:  'PUT',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            name:            form.name,
            enabled:         form.enabled,
            setlistfm_query: form.setlistfm_query,
            songkick_query:  form.songkick_query,
            bandsintown_id:  form.bandsintown_id,
          }),
        });
      } else {
        res = await apiFetch(`/artists`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(form),
        });
      }
      const data = await res.json();
      if (!res.ok) {
        Alert.alert('Error', data.detail || 'Failed to save artist.');
      } else {
        setModalVisible(false);
        fetchArtists();
      }
    } catch (e) {
      Alert.alert('Error', 'Could not reach the API.');
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ────────────────────────────────────
  const handleDelete = () => {
    Alert.alert(
      'Delete Artist',
      `Are you sure you want to delete "${form.name}"?\n\nThis will also delete all their concert records.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            setSaving(true);
            try {
              const res = await apiFetch(`/artists/${form.id}`, { method: 'DELETE' });
              const data = await res.json();
              if (!res.ok) {
                Alert.alert('Error', data.detail || 'Failed to delete artist.');
              } else {
                setModalVisible(false);
                fetchArtists();
              }
            } catch (e) {
              Alert.alert('Error', 'Could not reach the API.');
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  // ── Scrape ───────────────────────────────────
  const triggerScrape = async (artist) => {
    if (!artist.enabled) {
      Alert.alert('Artist Disabled', `${artist.name} is currently disabled.`);
      return;
    }
    setScraping(artist.id);
    try {
      const res  = await apiFetch(`/scrape/${artist.id}`, { method: 'POST' });
      const data = await res.json();
      Alert.alert(
        '✅ Scrape Complete',
        `${artist.name}\n\nFound: ${data.total_found} concerts\nNew: ${data.new_concerts}\nUS: ${data.us_concerts}`
      );
    } catch (e) {
      Alert.alert('Error', `Failed to scrape ${artist.name}.`);
    } finally {
      setScraping(null);
    }
  };

  // ── Render ───────────────────────────────────
  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#7c6af7" />
    </View>
  );

  if (error) return (
    <View style={styles.center}>
      <Text style={styles.errorText}>{error}</Text>
    </View>
  );

  return (
    <View style={styles.container}>

      {/* Header row */}
      <View style={styles.headerRow}>
        <Text style={styles.slotText}>{artists.length}/5 slots used</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.addBtnText}>Add Artist</Text>
        </TouchableOpacity>
      </View>

      {/* Artist list */}
      <FlatList
        data={artists}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7c6af7" />}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={[styles.card, !item.enabled && styles.cardDisabled]}>
            <TouchableOpacity style={styles.cardLeft} onPress={() => openEdit(item)} activeOpacity={0.7}>
              <View style={[styles.dot, item.enabled ? styles.dotOn : styles.dotOff]} />
              <View>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.id}>ID: {item.id}</Text>
                <Text style={styles.status}>{item.enabled ? 'Active' : 'Disabled'}</Text>
              </View>
            </TouchableOpacity>
            <View style={styles.cardActions}>
              <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(item)}>
                <Ionicons name="pencil" size={16} color="#7c6af7" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.scrapeBtn, !item.enabled && styles.scrapeBtnDisabled]}
                onPress={() => triggerScrape(item)}
                disabled={scraping === item.id || !item.enabled}
              >
                {scraping === item.id
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Ionicons name="refresh" size={18} color={item.enabled ? '#fff' : '#444'} />
                }
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>No artists configured. Tap Add Artist to get started.</Text>
        }
      />

      {/* Add / Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{isEditing ? 'Edit Artist' : 'Add Artist'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* ID — only editable when adding */}
              <Text style={styles.label}>Artist ID <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={[styles.input, isEditing && styles.inputDisabled]}
                value={form.id}
                onChangeText={(v) => setForm({ ...form, id: v.toLowerCase().replace(/\s/g, '_') })}
                placeholder="e.g. ado  (lowercase, no spaces)"
                placeholderTextColor="#444460"
                editable={!isEditing}
                autoCapitalize="none"
              />
              {!isEditing && (
                <Text style={styles.hint}>Used as a unique key. Cannot be changed later.</Text>
              )}

              <Text style={styles.label}>Display Name <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={styles.input}
                value={form.name}
                onChangeText={(v) => setForm({ ...form, name: v })}
                placeholder="e.g. Ado"
                placeholderTextColor="#444460"
              />

              <Text style={styles.label}>Setlist.fm Search Query</Text>
              <TextInput
                style={styles.input}
                value={form.setlistfm_query}
                onChangeText={(v) => setForm({ ...form, setlistfm_query: v })}
                placeholder="e.g. ado"
                placeholderTextColor="#444460"
                autoCapitalize="none"
              />

              <Text style={styles.label}>Songkick Search Query</Text>
              <TextInput
                style={styles.input}
                value={form.songkick_query}
                onChangeText={(v) => setForm({ ...form, songkick_query: v })}
                placeholder="e.g. ado"
                placeholderTextColor="#444460"
                autoCapitalize="none"
              />

              <Text style={styles.label}>Bandsintown ID</Text>
              <View style={styles.rowInput}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={form.bandsintown_id}
                  onChangeText={(v) => setForm({ ...form, bandsintown_id: v })}
                  placeholder="e.g. 12345678-ado  (optional)"
                  placeholderTextColor="#444460"
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={styles.lookupBtn}
                  onPress={lookupBandsintown}
                  disabled={bitLooking}
                >
                  {bitLooking
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Ionicons name="search" size={18} color="#fff" />
                  }
                </TouchableOpacity>
              </View>
              <Text style={styles.hint}>Tap 🔍 to auto-fill from Bandsintown using the artist name.</Text>

              <View style={styles.switchRow}>
                <Text style={styles.label}>Enabled</Text>
                <Switch
                  value={form.enabled}
                  onValueChange={(v) => setForm({ ...form, enabled: v })}
                  trackColor={{ false: '#2a2a3e', true: '#7c6af7' }}
                  thumbColor={form.enabled ? '#fff' : '#555570'}
                />
              </View>

              <TouchableOpacity
                style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.saveBtnText}>{isEditing ? 'Save Changes' : 'Add Artist'}</Text>
                }
              </TouchableOpacity>

              {isEditing && (
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={handleDelete}
                  disabled={saving}
                >
                  <Ionicons name="trash-outline" size={16} color="#ff6b6b" />
                  <Text style={styles.deleteBtnText}>Delete Artist</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        </View>
        </KeyboardAvoidingView>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: '#0f0f1a',
    paddingHorizontal: 16, paddingTop: 12,
  },
  headerRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 12,
  },
  slotText: { color: '#555570', fontSize: 13 },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#7c6af7', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 8,
  },
  addBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  list: { paddingBottom: 20 },
  card: {
    backgroundColor: '#1a1a2e', borderRadius: 12, padding: 16,
    marginBottom: 10, borderWidth: 1, borderColor: '#2a2a3e',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  cardDisabled: { opacity: 0.5 },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  cardActions: { flexDirection: 'row', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  dotOn:  { backgroundColor: '#4caf50' },
  dotOff: { backgroundColor: '#555570' },
  name:   { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  id:     { color: '#555570', fontSize: 12, marginTop: 2 },
  status: { color: '#7c6af7', fontSize: 12, marginTop: 2 },
  editBtn: {
    backgroundColor: '#1a1a3e', borderRadius: 8, padding: 10,
    width: 40, height: 40, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#7c6af7',
  },
  scrapeBtn: {
    backgroundColor: '#7c6af7', borderRadius: 8, padding: 10,
    width: 40, height: 40, alignItems: 'center', justifyContent: 'center',
  },
  scrapeBtnDisabled: { backgroundColor: '#2a2a3e' },
  center: {
    flex: 1, backgroundColor: '#0f0f1a',
    justifyContent: 'center', alignItems: 'center',
  },
  errorText: { color: '#ff6b6b', fontSize: 14, textAlign: 'center', paddingHorizontal: 32 },
  empty: { color: '#555570', textAlign: 'center', marginTop: 40, fontSize: 14 },

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    backgroundColor: '#0f0f1a', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, maxHeight: '90%',
    borderTopWidth: 1, borderColor: '#2a2a3e',
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 20,
  },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  label: { color: '#9999bb', fontSize: 13, marginBottom: 6, marginTop: 14 },
  required: { color: '#ff6b6b' },
  hint: { color: '#444460', fontSize: 11, marginTop: 4 },
  input: {
    backgroundColor: '#1a1a2e', borderRadius: 8, borderWidth: 1,
    borderColor: '#2a2a3e', color: '#fff', fontSize: 14,
    paddingHorizontal: 12, paddingVertical: 10,
  },
  rowInput: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  lookupBtn: {
    backgroundColor: '#7c6af7', borderRadius: 8,
    width: 42, height: 42, alignItems: 'center', justifyContent: 'center',
  },
  switchRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginTop: 14,
  },
  saveBtn: {
    backgroundColor: '#7c6af7', borderRadius: 10, padding: 14,
    alignItems: 'center', marginTop: 24, marginBottom: 10,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, padding: 14, marginBottom: 20,
    borderRadius: 10, borderWidth: 1, borderColor: '#ff6b6b',
  },
  deleteBtnText: { color: '#ff6b6b', fontSize: 15, fontWeight: '600' },
});