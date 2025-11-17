import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, ActivityIndicator, TouchableOpacity, Linking, Platform, Alert } from 'react-native';
import { useLocalSearchParams, Stack, Link } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Calendar from 'expo-calendar';
import Colors from '../../constants/Colors';
import { db } from '../../firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import type { Saint, Event } from '../types';

/* -----------------------
   Defensive timestamp parser
   Accepts:
   - firebase.firestore.Timestamp (has toDate())
   - plain { seconds, nanoseconds }
   - number (seconds or ms)
   - Date instance
   - ISO string
   Returns Date | null
   ----------------------- */
const toDateSafe = (value: any): Date | null => {
  if (value === undefined || value === null) return null;

  // Firebase Timestamp (has toDate)
  if (typeof value === 'object' && typeof value.toDate === 'function') {
    try {
      const d = value.toDate();
      return d instanceof Date && !isNaN(d.getTime()) ? d : null;
    } catch {
      return null;
    }
  }

  // Plain serialized object { seconds, nanoseconds }
  if (typeof value === 'object' && typeof value.seconds === 'number') {
    const ns = typeof value.nanoseconds === 'number' ? value.nanoseconds : 0;
    const ms = value.seconds * 1000 + Math.round(ns / 1_000_000);
    const d = new Date(ms);
    return isNaN(d.getTime()) ? null : d;
  }

  // number: may be seconds (10 digits) or ms (13 digits)
  if (typeof value === 'number') {
    const s = String(value).length;
    const ms = s === 10 ? value * 1000 : value;
    const d = new Date(ms);
    return isNaN(d.getTime()) ? null : d;
  }

  // Date instance
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value;
  }

  // ISO/date string
  if (typeof value === 'string') {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  return null;
};

const formatDate = (value: any) => {
  const date = toDateSafe(value);
  if (!date) return 'Not available';
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
};

const formatTime = (value: any) => {
  const date = toDateSafe(value);
  if (!date) return 'Not available';
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
};

const openDirections = (latitude: number, longitude: number, label: string) => {
  const scheme = Platform.OS === 'ios' ? 'maps:0,0?q=' : 'geo:0,0?q=';
  const url = `${scheme}${latitude},${longitude}(${encodeURIComponent(label)})`;
  Linking.openURL(url).catch(err => console.error('Error opening maps:', err));
};

/* -----------------------
   Normalize and safely extract an ID from either:
   - DocumentReference (has .id or .path)
   - string path like 'saint/ID' or '/saint/ID'
   - direct id string
   ----------------------- */
const extractId = (value: any): string | null => {
  if (!value && value !== '') return null;
  if (typeof value === 'object') {
    if (typeof value.id === 'string' && value.id.length > 0) return value.id;
    if (typeof value.path === 'string') {
      const parts = value.path.split('/');
      return parts[parts.length - 1] || null;
    }
    return null;
  }
  if (typeof value === 'string') {
    const trimmed = value.startsWith('/') ? value.slice(1) : value;
    const parts = trimmed.split('/');
    return parts[parts.length - 1] || null;
  }
  return null;
};

/* -----------------------
   Add event to device calendar (uses toDateSafe)
   ----------------------- */
async function addToCalendarSafe(event: Event) {
  const startDate = toDateSafe((event as any).dateTime);
  if (!startDate) {
    Alert.alert('Invalid date', 'This event has an invalid date and cannot be added to the calendar.');
    return;
  }

  const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // default 1 hour

  try {
    const { status } = await Calendar.requestCalendarPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission denied', 'Calendar permission is required to add events.');
      return;
    }

    const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    const defaultCalendar = calendars.find(cal => cal.isPrimary) || calendars[0];
    if (!defaultCalendar) {
      Alert.alert('No calendar', 'Could not find a calendar on this device.');
      return;
    }

    await Calendar.createEventAsync(defaultCalendar.id, {
      title: event.title ?? 'Event',
      startDate,
      endDate,
      location: event.address ?? undefined,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      notes: event.description ?? undefined,
    });

    Alert.alert('Event added', `'${event.title ?? 'Event'}' has been added to your calendar.`);
  } catch (err) {
    console.error('Error adding to calendar:', err);
    Alert.alert('Error', 'Failed to add event to calendar.');
  }
}

/* -----------------------
   Screen component
   ----------------------- */
export default function EventDetailScreen() {
  const { id } = useLocalSearchParams();
  const [event, setEvent] = useState<Event | null>(null);
  const [saint, setSaint] = useState<Saint | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id || typeof id !== 'string') {
      setLoading(false);
      return;
    }

    const fetchDetails = async () => {
      try {
        const eventDocRef = doc(db, 'events', id);
        const eventDocSnap = await getDoc(eventDocRef);

        if (!eventDocSnap.exists()) {
          setEvent(null);
          setLoading(false);
          return;
        }

        const raw = eventDocSnap.data() as any;

        // Normalize event fields we use
        const normalizedEvent: Event = {
          id: eventDocSnap.id,
          title: raw?.title ?? '',
          type: raw?.type ?? '',
          saintId: raw?.saintId ?? raw?.saint ?? null,
          description: raw?.description ?? '',
          saintName: raw?.saintName ?? (raw?.saintName ?? ''),
          // leave dateTime as-is (could be Timestamp or {seconds,..}); toDateSafe will handle it
          dateTime: raw?.dateTime ?? null,
          address: raw?.address ?? '',
          locationGeo:
            raw?.locationGeo && typeof raw.locationGeo.latitude === 'number' && typeof raw.locationGeo.longitude === 'number'
              ? { latitude: raw.locationGeo.latitude, longitude: raw.locationGeo.longitude } as any
              : raw?.locationGeo && typeof raw.locationGeo._latitude === 'number' && typeof raw.locationGeo._longitude === 'number'
              ? { latitude: raw.locationGeo._latitude, longitude: raw.locationGeo._longitude } as any
              : null,
        };

        setEvent(normalizedEvent);

        // Resolve saint (if saintId is a DocumentReference or string)
        const saintId = extractId(normalizedEvent.saintId);
        if (saintId) {
          try {
            const saintDocRef = doc(db, 'saint', saintId);
            const saintSnap = await getDoc(saintDocRefOrFallback(saintDocRef, normalizedEvent.saintId));
            // Note: getDoc accepts a DocumentReference; if normalizedEvent.saintId was a DocumentReference we used it,
            // otherwise we used a doc(db,'saint',id) above. staintDocRefOrFallback ensures we supply the correct ref.
            if (saintSnap && saintSnap.exists()) {
              const sraw = saintSnap.data() as any;
              const normalizedSaint: Saint = {
                id: saintSnap.id,
                name: sraw?.name ?? '',
                designation: sraw?.designation ?? '',
                location: sraw?.location ?? '',
                coordinates: sraw?.coordinates ?? '',
                guruName: sraw?.guruName ?? '',
                guru: sraw?.guru ?? null,
                sect: sraw?.sect ?? '',
                about: sraw?.about ?? '',
                dateOfDiksha: sraw?.dateOfDiksha ?? null,
                gender: sraw?.gender ?? '',
                amber: sraw?.amber ?? '',
                groupLeader: sraw?.groupLeader ?? null,
              };
              setSaint(normalizedSaint);
            }
          } catch (err) {
            // fallback: try reading via a doc ref created from id (already covered), but silence errors
            console.error('Error fetching saint doc:', err);
          }
        }
      } catch (error) {
        console.error('Error fetching details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [id]);

  // Helper to prefer using the original DocumentReference if available (so getDoc works for both shapes)
  function saintDocRefOrFallback(createdRef: any, originalSaintIdValue: any) {
    // If the original value is an object with a .path or is a DocumentReference, use it directly
    if (originalSaintIdValue && typeof originalSaintIdValue === 'object' && (originalSaintIdValue.path || originalSaintIdValue.id)) {
      return originalSaintIdValue;
    }
    // Otherwise return the created doc ref
    return createdRef;
  }

  const hasValidCoordinates =
    event?.locationGeo &&
    typeof (event.locationGeo as any).latitude === 'number' &&
    typeof (event.locationGeo as any).longitude === 'number';

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.light.saffron} />
      </View>
    );
  }

  if (!event) {
    return (
      <View style={styles.center}>
        <Text>Event not found.</Text>
      </View>
    );
  }

  const lat = (event.locationGeo as any)?.latitude;
  const lng = (event.locationGeo as any)?.longitude;

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ title: 'Event Details', headerBackTitle: 'Back' }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>{event.title ?? ''}</Text>
        </View>

        <View style={styles.section}>
          <View style={styles.infoRow}>
            <Feather name="calendar" size={24} color={Colors.light.saffron} style={styles.infoIcon} />
            <View>
              <Text style={styles.infoLabel}>Date & Time</Text>
              <Text style={styles.infoValue}>{formatDate(event.dateTime)}</Text>
              <Text style={styles.infoSubValue}>{formatTime(event.dateTime)}</Text>
            </View>
          </View>

          <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
            <Feather name="map-pin" size={24} color={Colors.light.saffron} style={styles.infoIcon} />
            <View style={{ flex: 1 }}>
              <Text style={styles.infoLabel}>Location</Text>
              <Text style={styles.infoValue}>{event.address ?? 'Not available'}</Text>
            </View>
          </View>
        </View>

        {event.description ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About the Event</Text>
            <Text style={styles.descriptionText}>{event.description}</Text>
          </View>
        ) : null}

        {hasValidCoordinates ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Event Location</Text>
            <MapView
              provider={PROVIDER_GOOGLE}
              style={styles.map}
              initialRegion={{
                latitude: lat,
                longitude: lng,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}
              showsUserLocation={true}
              scrollEnabled={true}
              zoomEnabled={true}
            >
              <Marker coordinate={{ latitude: lat, longitude: lng }} pinColor={Colors.light.saffron} />
            </MapView>
          </View>
        ) : null}

        {saint ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About the Host</Text>
            <View style={styles.saintCard}>
              <View style={styles.saintAvatar}>
                <Text style={styles.saintAvatarLetter}>{(saint.name && saint.name.charAt(0)) || 'S'}</Text>
              </View>
              <View style={styles.saintInfo}>
                <Text style={styles.saintName}>{saint.name ?? ''}</Text>
                <Text style={styles.saintDesignation}>{saint.designation ?? ''}</Text>
              </View>
              <Link href={`/saint/${saint.id}`} asChild>
                <TouchableOpacity style={styles.profileButton}>
                  <Feather name="arrow-right" size={20} color={Colors.light.saffron} />
                </TouchableOpacity>
              </Link>
            </View>
          </View>
        ) : null}
      </ScrollView>

      {/* Sticky Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.actionButton, !hasValidCoordinates && styles.disabledButton]}
          onPress={() => {
            if (!hasValidCoordinates) return;
            openDirections(lat, lng, event.title ?? 'Event Location');
          }}
          disabled={!hasValidCoordinates}
        >
          <Feather name="navigation" size={20} color={Colors.light.white} />
          <Text style={styles.actionButtonText}>Get Directions</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionButton, styles.calendarButton]} onPress={() => addToCalendarSafe(event)}>
          <Feather name="calendar" size={20} color={Colors.light.saffron} />
          <Text style={[styles.actionButtonText, styles.calendarButtonText]}>Add to Calendar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/* -----------------------
   Styles (kept from your original file)
   ----------------------- */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  contentContainer: {
    paddingBottom: 100, // Extra padding to ensure content is not hidden by the sticky footer
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.light.background,
  },
  header: {
    backgroundColor: Colors.light.saffron,
    paddingTop: 40,
    paddingVertical: 20,
    paddingHorizontal: 24,
    alignItems: 'flex-start',
  },
  tag: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginBottom: 12,
  },
  tagPravachan: { backgroundColor: '#FFEAD5' },
  tagSatsang: { backgroundColor: '#FFDCE0' },
  tagText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: Colors.light.saffron,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: Colors.light.white,
  },
  section: {
    backgroundColor: Colors.light.white,
    marginTop: 0,
    paddingVertical: 8, // Reduced vertical padding
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    marginTop: 8,
    color: Colors.light.darkGray,
    paddingHorizontal: 24,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoIcon: {
    marginRight: 20,
  },
  infoLabel: {
    fontSize: 14,
    color: Colors.light.mediumGray,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: Colors.light.darkGray,
    fontWeight: '600',
  },
  infoSubValue: {
    fontSize: 14,
    color: Colors.light.mediumGray,
  },
  map: {
    height: 180,
    marginHorizontal: 24,
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
    marginBottom: 16,
  },
  descriptionText: {
    fontSize: 15,
    lineHeight: 24,
    color: Colors.light.darkGray,
    paddingHorizontal: 24,
  },
  saintCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.background,
    padding: 0,
    borderRadius: 12,
    marginHorizontal: 24,
  },
  saintAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.light.saffron,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  saintAvatarLetter: {
    color: Colors.light.white,
    fontSize: 22,
    fontWeight: 'bold',
  },
  saintInfo: { flex: 1 },
  saintName: { fontSize: 16, fontWeight: 'bold' },
  saintDesignation: { fontSize: 14, color: Colors.light.mediumGray, marginTop: 2 },
  profileButton: {
    padding: 10,
    backgroundColor: Colors.light.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.light.lightGray,
  },
  footer: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    backgroundColor: Colors.light.white,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    flex: 1,
    backgroundColor: Colors.light.maroon,
  },
  disabledButton: {
    backgroundColor: Colors.light.lightGray,
  },
  actionButtonText: {
    color: Colors.light.white,
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 10,
  },
  calendarButton: {
    backgroundColor: Colors.light.white,
    borderWidth: 1,
    borderColor: Colors.light.saffron,
    marginLeft: 12,
  },
  calendarButtonText: {
    color: Colors.light.saffron,
  },
});
