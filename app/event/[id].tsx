import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, ActivityIndicator, TouchableOpacity, Linking, Platform, Alert } from 'react-native';
import { useLocalSearchParams, Stack, Link } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Calendar from 'expo-calendar';
import Colors from '../../constants/Colors';
import { db } from '../../firebaseConfig';
import { doc, getDoc, Timestamp, GeoPoint } from 'firebase/firestore';
import { Saint, Event } from '../types';

// --- Helper functions ---
const formatDate = (timestamp: Timestamp) => {
  const date = timestamp.toDate();
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
};
const formatTime = (timestamp: Timestamp) => {
  const date = timestamp.toDate();
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
};
const openDirections = (latitude: number, longitude: number, label: string) => {
    const scheme = Platform.OS === 'ios' ? 'maps:0,0?q=' : 'geo:0,0?q=';
    const url = `${scheme}${latitude},${longitude}(${label})`;
    Linking.openURL(url);
};

// --- Calendar Functionality ---
async function addToCalendar(event: Event) {
  const { status } = await Calendar.requestCalendarPermissionsAsync();
  if (status === 'granted') {
    const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    const defaultCalendar = calendars.find(cal => cal.isPrimary) || calendars[0];
    if (!defaultCalendar) {
        Alert.alert("No Calendar Found", "Could not find a default calendar on your device.");
        return;
    }
    const startDate = event.dateTime.toDate();
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
    try {
        await Calendar.createEventAsync(defaultCalendar.id, {
            title: event.title,
            startDate,
            endDate,
            location: event.locationName,
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            notes: event.description,
        });
        Alert.alert("Event Added", `'${event.title}' has been added to your calendar.`);
    } catch (error) {
        console.error("Error creating event:", error);
        Alert.alert("Error", "Could not add the event to your calendar.");
    }
  } else {
      Alert.alert("Permission Denied", "You need to grant calendar permissions to save events.");
  }
}

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams();
  const [event, setEvent] = useState<Event | null>(null);
  const [saint, setSaint] = useState<Saint | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id || typeof id !== 'string') { setLoading(false); return; }
    const fetchDetails = async () => {
      try {
        const eventDocRef = doc(db, 'events', id);
        const eventDocSnap = await getDoc(eventDocRef);
        if (eventDocSnap.exists()) {
          const eventData = { id: eventDocSnap.id, ...eventDocSnap.data() } as Event;
          setEvent(eventData);
          if (eventData.saintId) {
            const saintDocRef = doc(db, 'saint', eventData.saintId);
            const saintDocSnap = await getDoc(saintDocRef);
            if (saintDocSnap.exists()) {
              setSaint({ id: saintDocSnap.id, ...saintDocSnap.data() } as Saint);
            }
          }
        }
      } catch (error) { console.error("Error fetching details:", error); } 
      finally { setLoading(false); }
    };
    fetchDetails();
  }, [id]);

  const hasValidCoordinates = event?.locationGeo && typeof event.locationGeo.latitude === 'number' && typeof event.locationGeo.longitude === 'number';

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={Colors.light.saffron} /></View>;
  }

  if (!event) {
    return <View style={styles.center}><Text>Event not found.</Text></View>;
  }

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ title: 'Event Details', headerBackTitle: 'Back' }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <View style={styles.header}>
            <Text style={styles.title}>{event.title}</Text>
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
                <View style={{flex: 1}}>
                    <Text style={styles.infoLabel}>Location</Text>
                    <Text style={styles.infoValue}>{event.locationName}</Text>
                </View>
            </View>
        </View>

        {event.description && (
             <View style={styles.section}>
                <Text style={styles.sectionTitle}>About the Event</Text>
                <Text style={styles.descriptionText}>{event.description}</Text>
            </View>
        )}

        {hasValidCoordinates && (
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Event Location</Text>
                 <MapView
                    provider={PROVIDER_GOOGLE}
                    style={styles.map}
                    initialRegion={{
                        latitude: event.locationGeo.latitude,
                        longitude: event.locationGeo.longitude,
                        latitudeDelta: 0.01,
                        longitudeDelta: 0.01,
                    }}
                    showsUserLocation={true}
                    scrollEnabled={true}
                    zoomEnabled={true}
                >
                    <Marker 
                        coordinate={{
                            latitude: event.locationGeo.latitude,
                            longitude: event.locationGeo.longitude,
                        }} 
                        pinColor={Colors.light.saffron} 
                    />
                </MapView>
            </View>
        )}

        {saint && (
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>About the Host</Text>
                <View style={styles.saintCard}>
                     <View style={styles.saintAvatar}>
                        <Text style={styles.saintAvatarLetter}>{saint.name.charAt(0)}</Text>
                    </View>
                    <View style={styles.saintInfo}>
                        <Text style={styles.saintName}>{saint.name}</Text>
                        <Text style={styles.saintDesignation}>{saint.designation}</Text>
                    </View>
                    <Link href={`/saint/${saint.id}`} asChild>
                        <TouchableOpacity style={styles.profileButton}>
                           <Feather name="arrow-right" size={20} color={Colors.light.saffron} />
                        </TouchableOpacity>
                    </Link>
                </View>
            </View>
        )}
      </ScrollView>

      {/* Sticky Footer */}
      <View style={styles.footer}>
         <TouchableOpacity 
            style={[styles.actionButton, !hasValidCoordinates && styles.disabledButton]}
            onPress={() => openDirections(event.locationGeo.latitude, event.locationGeo.longitude, event.title)}
            disabled={!hasValidCoordinates}
        >
            <Feather name="navigation" size={20} color={Colors.light.white} />
            <Text style={styles.actionButtonText}>Get Directions</Text>
        </TouchableOpacity>
         <TouchableOpacity 
            style={[styles.actionButton, styles.calendarButton]}
            onPress={() => addToCalendar(event)}
         >
            <Feather name="calendar" size={20} color={Colors.light.saffron} />
            <Text style={[styles.actionButtonText, styles.calendarButtonText]}>Add to Calendar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

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
    }
});

