import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, TextInput } from 'react-native';
import { Feather, MaterialCommunityIcons, FontAwesome } from '@expo/vector-icons';
import { Link } from 'expo-router';
import Colors from '../../constants/Colors';
import { db } from '../../firebaseConfig';
import { collection, getDocs, Timestamp } from 'firebase/firestore';

export type Event = {
  id: string;
  title: string;
  type: string;
  saintId: string; // Added saintId to link to the saint's profile
  saintName: string;
  dateTime: Timestamp;
  locationName: string;
};

const formatDate = (timestamp: Timestamp) => {
  const date = timestamp.toDate();
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  };
  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  };
  return `${date.toLocaleDateString('en-US', options)}, ${date.toLocaleTimeString('en-US', timeOptions)}`;
};

const EventCard = ({ event }: { event: Event }) => (
  <View style={styles.card}>
    <View style={styles.cardHeader}>
      <View style={[styles.tag, event.type === 'Satsang' ? styles.tagSatsang : styles.tagPravachan]}>
        <Text style={styles.tagText}>{event.type}</Text>
      </View>
    </View>
    <Text style={styles.eventTitle}>{event.title}</Text>
    <View style={styles.infoRow}>
      <Feather name="user" size={16} color={Colors.light.mediumGray} />
      {/* Link the saint's name to their profile page */}
      <Link href={`/saint/${event.saintId}`} asChild>
          <TouchableOpacity>
            <Text style={styles.saintLink}>{event.saintName}</Text>
          </TouchableOpacity>
      </Link>
    </View>
    <View style={styles.infoRow}>
      <Feather name="calendar" size={16} color={Colors.light.mediumGray} />
      <Text style={styles.infoText}>{formatDate(event.dateTime)}</Text>
    </View>
    <View style={styles.infoRow}>
      <Feather name="map-pin" size={16} color={Colors.light.mediumGray} />
      <Text style={styles.infoText}>{event.locationName}</Text>
    </View>
    <View style={styles.buttonContainer}>
        {/* Add the "View Details" button with navigation */}
        <Link href={`/event/${event.id}`} asChild>
            <TouchableOpacity style={styles.detailsButton}>
                <Text style={styles.detailsButtonText}>View Details</Text>
            </TouchableOpacity>
        </Link>
    </View>
  </View>
);

export default function EventsScreen() {
  const [allEvents, setAllEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<'All' | 'Pravachan' | 'Satsang'>('All');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const eventsCollectionRef = collection(db, 'events');
        const querySnapshot = await getDocs(eventsCollectionRef);
        const eventsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Event[];
        setAllEvents(eventsData);
        setFilteredEvents(eventsData);
      } catch (error) {
        console.error('Error fetching events:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, []);

  useEffect(() => {
    let processedEvents = allEvents;
    if (selectedFilter !== 'All') {
      processedEvents = processedEvents.filter(event => event.type === selectedFilter);
    }
    if (searchQuery.trim() !== '') {
      const lowercasedQuery = searchQuery.toLowerCase();
      processedEvents = processedEvents.filter(event =>
        event.title.toLowerCase().includes(lowercasedQuery) ||
        event.saintName.toLowerCase().includes(lowercasedQuery) ||
        event.locationName.toLowerCase().includes(lowercasedQuery)
      );
    }
    setFilteredEvents(processedEvents);
  }, [selectedFilter, searchQuery, allEvents]);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <MaterialCommunityIcons name="calendar-star" size={24} color={Colors.light.white} />
        <Text style={styles.headerTitle}>Spiritual Events</Text>
      </View>

      <View style={styles.searchContainer}>
          <FontAwesome name="search" size={20} color={Colors.light.mediumGray} style={styles.searchIcon} />
          <TextInput
            placeholder="Search events, saints, or locations..."
            placeholderTextColor={Colors.light.mediumGray}
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
      </View>

      <View style={styles.filterContainer}>
        {['All', 'Pravachan', 'Satsang'].map(type => (
          <TouchableOpacity
            key={type}
            style={[
              styles.filterButton,
              selectedFilter === type && styles.filterActive,
            ]}
            onPress={() => setSelectedFilter(type as 'All' | 'Pravachan' | 'Satsang')}
          >
            <Text
              style={[
                styles.filterText,
                selectedFilter === type && styles.filterActiveText,
              ]}
            >
              {type === 'All' ? 'All Events' : type}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={Colors.light.saffron} style={{ marginTop: 50 }} />
      ) : filteredEvents.length > 0 ? (
        filteredEvents.map(event => <EventCard key={event.id} event={event} />)
      ) : (
        <Text style={styles.noEventsText}>No events found.</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF9F2',
  },
  header: {
    backgroundColor: Colors.light.saffron,
    padding: 20,
    paddingTop: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: Colors.light.white,
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 10,
  },
   searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.white,
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 16,
    paddingHorizontal: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: Colors.light.darkGray,
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 16,
  },
  filterButton: {
    backgroundColor: Colors.light.white,
    borderWidth: 1,
    borderColor: Colors.light.lightGray,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 10,
  },
  filterActive: {
    backgroundColor: Colors.light.saffron,
    borderColor: Colors.light.saffron,
  },
  filterText: {
    color: Colors.light.darkGray,
    fontWeight: '500',
  },
  filterActiveText: {
    color: Colors.light.white,
  },
  card: {
    backgroundColor: Colors.light.white,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  cardHeader: {
    flexDirection: 'row',
  },
  tag: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginBottom: 12,
  },
  tagPravachan: {
    backgroundColor: '#FFEAD5',
  },
  tagSatsang: {
    backgroundColor: '#FFDCE0',
  },
  tagText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.saffron,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.light.darkGray,
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 6,
  },
  infoText: {
    marginLeft: 12,
    fontSize: 14,
    color: Colors.light.darkGray,
  },
  saintLink: {
      marginLeft: 12,
      fontSize: 14,
      color: Colors.light.saffron,
      fontWeight: '600',
  },
  buttonContainer: {
    flexDirection: 'row',
    marginTop: 16,
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 16,
  },
  detailsButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: Colors.light.saffron,
    borderRadius: 20,
  },
  detailsButtonText: {
    color: Colors.light.saffron,
    fontWeight: '600',
  },
  noEventsText: {
    textAlign: 'center',
    color: Colors.light.mediumGray,
    marginTop: 40,
    fontSize: 16,
  },
});

