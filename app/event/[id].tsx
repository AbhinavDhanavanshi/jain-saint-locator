import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, Stack, Link } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import Colors from '../../constants/Colors';
import { db } from '../../firebaseConfig';
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import { Saint } from '../../app/(tabs)'; // Assuming Saint type is in index.tsx

// Define the full Event type
export type Event = {
  id: string;
  title: string;
  type: string;
  saintId: string;
  saintName: string;
  dateTime: Timestamp;
  locationName: string;
  description?: string;
};

// Helper to format the date and time
const formatDate = (timestamp: Timestamp) => {
  const date = timestamp.toDate();
  return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
};
const formatTime = (timestamp: Timestamp) => {
  const date = timestamp.toDate();
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
};

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
        // Fetch Event Details
        const eventDocRef = doc(db, 'events', id);
        const eventDocSnap = await getDoc(eventDocRef);

        if (eventDocSnap.exists()) {
          const eventData = { id: eventDocSnap.id, ...eventDocSnap.data() } as Event;
          setEvent(eventData);

          // Fetch Saint Details using saintId from the event
          if (eventData.saintId) {
            const saintDocRef = doc(db, 'saint', eventData.saintId);
            const saintDocSnap = await getDoc(saintDocRef);
            if (saintDocSnap.exists()) {
              setSaint({ id: saintDocSnap.id, ...saintDocSnap.data() } as Saint);
            }
          }
        } else {
          console.log("No such event document!");
        }
      } catch (error) {
        console.error("Error fetching details:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [id]);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={Colors.light.saffron} /></View>;
  }

  if (!event) {
    return <View style={styles.center}><Text>Event not found.</Text></View>;
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Event Details', headerBackTitle: 'Back' }} />
      <ScrollView style={styles.container}>
        <View style={styles.header}>
            <View style={[styles.tag, event.type === 'Satsang' ? styles.tagSatsang : styles.tagPravachan]}>
                <Text style={styles.tagText}>{event.type}</Text>
            </View>
            <Text style={styles.title}>{event.title}</Text>
        </View>
        
        <View style={styles.section}>
             <View style={styles.infoRow}>
                <Feather name="calendar" size={20} color={Colors.light.mediumGray} style={styles.infoIcon} />
                <View>
                    <Text style={styles.infoLabel}>Date & Time</Text>
                    <Text style={styles.infoValue}>{formatDate(event.dateTime)} at {formatTime(event.dateTime)}</Text>
                </View>
            </View>
             <View style={styles.infoRow}>
                <Feather name="map-pin" size={20} color={Colors.light.mediumGray} style={styles.infoIcon} />
                <View>
                    <Text style={styles.infoLabel}>Location</Text>
                    <Text style={styles.infoValue}>{event.locationName}</Text>
                </View>
            </View>
        </View>

         <View style={styles.section}>
            <Text style={styles.sectionTitle}>About the Event</Text>
            <Text style={styles.descriptionText}>
                {event.description || 'More details about this event will be available soon. Join us for a session of peace and wisdom.'}
            </Text>
        </View>

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
                            <Text style={styles.profileButtonText}>View Profile</Text>
                        </TouchableOpacity>
                    </Link>
                </View>
            </View>
        )}

        <View style={styles.buttonContainer}>
             <TouchableOpacity style={styles.directionsButton}>
                <Text style={styles.buttonText}>Get Directions</Text>
            </TouchableOpacity>
             <TouchableOpacity style={styles.calendarButton}>
                <Text style={styles.calendarButtonText}>Add to Calendar</Text>
            </TouchableOpacity>
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
        padding: 24,
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
        fontWeight: '600',
        color: Colors.light.saffron,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: Colors.light.darkGray,
    },
    section: {
        backgroundColor: Colors.light.white,
        marginTop: 12,
        padding: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 16,
        color: Colors.light.darkGray,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 24,
    },
    infoIcon: {
        marginRight: 16,
        marginTop: 2,
    },
    infoLabel: {
        fontSize: 14,
        color: Colors.light.mediumGray,
        marginBottom: 4,
    },
    infoValue: {
        fontSize: 16,
        color: Colors.light.darkGray,
        fontWeight: '500',
    },
    descriptionText: {
        fontSize: 15,
        lineHeight: 22,
        color: Colors.light.darkGray,
    },
    saintCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FAFAFA',
        padding: 12,
        borderRadius: 12,
    },
    saintAvatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: Colors.light.saffron,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    saintAvatarLetter: {
        color: Colors.light.white,
        fontSize: 22,
        fontWeight: 'bold',
    },
    saintInfo: {
        flex: 1,
    },
    saintName: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    saintDesignation: {
        fontSize: 14,
        color: Colors.light.mediumGray,
        marginTop: 2,
    },
    profileButton: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: Colors.light.saffron,
        borderRadius: 20,
    },
    profileButtonText: {
        color: Colors.light.saffron,
        fontWeight: '600',
    },
    buttonContainer: {
        padding: 20,
    },
    directionsButton: {
        backgroundColor: Colors.light.maroon,
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: 12,
    },
    buttonText: {
        color: Colors.light.white,
        fontWeight: 'bold',
        fontSize: 16,
    },
    calendarButton: {
        backgroundColor: Colors.light.white,
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.light.saffron,
    },
    calendarButtonText: {
        color: Colors.light.saffron,
        fontWeight: 'bold',
        fontSize: 16,
    }
});

