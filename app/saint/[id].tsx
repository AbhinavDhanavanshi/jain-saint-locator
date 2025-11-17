import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import Colors from '../../constants/Colors';
import { db } from '../../firebaseConfig';
import { doc, getDoc, DocumentReference, Timestamp as FireTimestamp } from 'firebase/firestore';

// Import Saint type if you have it, otherwise the file still works because we cast.
// If your types file has a different path, change this import accordingly.
import { Saint } from '../types';

/**
 * InfoRow component
 * value accepts string | null | undefined to be flexible after normalization
 */
const InfoRow = ({ icon, label, value }: { icon: any; label: string; value: string | null | undefined }) => (
  <View style={styles.infoRow}>
    <Feather name={icon} size={20} color={Colors.light.mediumGray} style={styles.infoIcon} />
    <View>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value ?? 'Not available'}</Text>
    </View>
  </View>
);

/* -----------------------
   Helper: formatTimestamp
   Accepts:
     - Firestore Timestamp (has toDate())
     - plain object { seconds, nanoseconds }
     - number (ms or unix seconds)
     - Date
     - string
   Returns localized date string or 'Not available' / 'Invalid Date'
   ----------------------- */
const formatTimestamp = (value: any): string => {
  if (value === undefined || value === null) return 'Not available';

  // Firestore Timestamp instance (from firebase/firestore)
  if (value?.toDate && typeof value.toDate === 'function') {
    try {
      return value.toDate().toLocaleDateString();
    } catch {
      return 'Invalid Date';
    }
  }

  // Plain object with seconds/nanoseconds (e.g., serialized)
  if (typeof value === 'object' && typeof value.seconds === 'number') {
    const ns = typeof value.nanoseconds === 'number' ? value.nanoseconds : 0;
    const ms = value.seconds * 1000 + Math.round(ns / 1_000_000);
    try {
      return new Date(ms).toLocaleDateString();
    } catch {
      return 'Invalid Date';
    }
  }

  // number: decide if it's seconds (10 digits) or ms (13 digits)
  if (typeof value === 'number') {
    const len = String(value).length;
    const ms = len === 10 ? value * 1000 : value;
    try {
      return new Date(ms).toLocaleDateString();
    } catch {
      return 'Invalid Date';
    }
  }

  // Date instance
  if (value instanceof Date) {
    if (isNaN(value.getTime())) return 'Invalid Date';
    return value.toLocaleDateString();
  }

  // string representation
  if (typeof value === 'string') {
    const d = new Date(value);
    return isNaN(d.getTime()) ? 'Not available' : d.toLocaleDateString();
  }

  return 'Invalid Date';
};

/* -----------------------
   Helper: formatDocRef
   Accepts:
     - Firestore DocumentReference (has .path)
     - string path like '/saint/ID' or 'saint/ID'
     - plain ID string
   Returns the ID string (last path segment) or 'Not available'
   ----------------------- */
const formatDocRef = (value: any): string => {
  if (value === undefined || value === null || value === '') return 'Not available';

  // DocumentReference (firestore)
  if (typeof value === 'object' && typeof value.path === 'string') {
    const parts = value.path.split('/');
    return parts[parts.length - 1] || 'Not available';
  }

  // String path or id
  if (typeof value === 'string') {
    const trimmed = value.startsWith('/') ? value.slice(1) : value;
    const parts = trimmed.split('/');
    return parts[parts.length - 1] || 'Not available';
  }

  return 'Not available';
};

export default function SaintProfileScreen() {
  const { id } = useLocalSearchParams();
  // We'll cast normalized object to Saint for compatibility; normalized shape is safe
  const [saint, setSaint] = useState<Saint | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id || typeof id !== 'string') return;

    const fetchSaintDetails = async () => {
      setLoading(true);
      try {
        const saintDocRef = doc(db, 'saint', id);
        const docSnap = await getDoc(saintDocRef);

        if (!docSnap.exists()) {
          console.log('No such document!', id);
          setSaint(null);
          return;
        }

        const raw = docSnap.data();

        /**
         * Normalise fields used in UI:
         * - dateOfDiksha -> Date | null (we'll still pass it through formatTimestamp when rendering)
         * - groupLeader -> ID string | null
         * - other textual fields -> string or null
         *
         * Note: we keep normalisation conservative: convert to primitives only for fields shown in UI.
         */
        const normalised = {
          id: docSnap.id,
          name: raw?.name ?? '',
          designation: raw?.designation ?? '',
          about: raw?.about ?? '',
          guruName: raw?.guruName ?? '',
          sect: raw?.sect ?? '',
          gender: raw?.gender ?? '',
          amber: raw?.amber ?? '',
          // Try to convert to a Date if possible, otherwise keep raw (formatTimestamp handles many shapes)
          dateOfDiksha:
            raw?.dateOfDiksha?.toDate?.() ??
            (raw?.dateOfDiksha && typeof raw.dateOfDiksha.seconds === 'number'
              ? new Date(raw.dateOfDiksha.seconds * 1000 + Math.round((raw.dateOfDiksha.nanoseconds ?? 0) / 1_000_000))
              : raw?.dateOfDiksha ?? null),
          // normalise groupLeader to an ID string if possible
          groupLeader:
            typeof raw?.groupLeader === 'string'
              ? raw.groupLeader
              : (raw?.groupLeader?.path ? raw.groupLeader.path : raw?.groupLeader ?? null),
        };

        // cast to your Saint type for compatibility (if your Saint type expects other fields they'll remain undefined)
        setSaint(normalised as unknown as Saint);
      } catch (error) {
        console.error('Error fetching saint details:', error);
        setSaint(null);
      } finally {
        setLoading(false);
      }
    };

    fetchSaintDetails();
  }, [id]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.light.saffron} />
      </View>
    );
  }

  if (!saint) {
    return (
      <View style={styles.center}>
        <Text>Saint not found.</Text>
      </View>
    );
  }

  // Render screen
  return (
    <>
      <Stack.Screen options={{ title: saint.name ?? 'Saint', headerBackTitle: 'Back' }} />
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarLetter}>{(saint.name && saint.name.charAt(0)) || 'S'}</Text>
          </View>
          <Text style={styles.name}>{saint.name ?? ''}</Text>
          <Text style={styles.designation}>{saint.designation ?? ''}</Text>
          <TouchableOpacity style={styles.followButton}>
            <Text style={styles.followButtonText}>Follow</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.aboutText}>{saint.about ?? 'No information available.'}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Details</Text>

          <InfoRow icon="user" label="Guru Name" value={saint.guruName ?? undefined} />
          <InfoRow icon="book-open" label="Sect" value={saint.sect ?? undefined} />

          {/* Use formatTimestamp helper; our state.dateOfDiksha may be Date, object, or null */}
          <InfoRow icon="calendar" label="Date of Diksha" value={formatTimestamp((saint as any).dateOfDiksha)} />

          <InfoRow icon="info" label="Gender" value={saint.gender ?? undefined} />
          <InfoRow icon="shield" label="Amber" value={saint.amber ?? undefined} />

          {/* Format groupLeader (string path, DocumentReference, or ID) */}
          <InfoRow icon="users" label="Group Leader" value={formatDocRef((saint as any).groupLeader)} />
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F7F7',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: Colors.light.white,
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.light.saffron,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarLetter: {
    color: Colors.light.white,
    fontSize: 36,
    fontWeight: 'bold',
  },
  name: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.light.darkGray,
  },
  designation: {
    fontSize: 16,
    color: Colors.light.mediumGray,
    marginTop: 4,
    marginBottom: 16,
  },
  followButton: {
    backgroundColor: Colors.light.saffron,
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 20,
  },
  followButtonText: {
    color: Colors.light.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
  section: {
    backgroundColor: Colors.light.white,
    marginTop: 12,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.light.darkGray,
    marginBottom: 16,
  },
  aboutText: {
    fontSize: 15,
    lineHeight: 22,
    color: Colors.light.darkGray,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  infoIcon: {
    marginRight: 16,
    marginTop: 2,
  },
  infoLabel: {
    fontSize: 13,
    color: Colors.light.mediumGray,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
    color: Colors.light.darkGray,
    fontWeight: '500',
  },
});
