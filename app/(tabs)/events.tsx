import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import Colors from '../../constants/Colors';

const events = [
    {
        id: '1',
        type: 'Pravachan',
        title: 'Evening Pravachan',
        saint: 'Sant Ramesh Das',
        date: 'Mon, Sep 8',
        time: '6:00 PM',
        location: 'Varanasi Ghat',
    },
    {
        id: '2',
        type: 'Satsang',
        title: 'Divine Satsang',
        saint: 'Mata Anandamayi',
        date: 'Wed, Sep 10',
        time: '6:00 AM',
        location: 'Vrindavan Temple',
    }
];

const EventCard = ({ event }: { event: typeof events[0] }) => (
    <View style={styles.card}>
        <View style={styles.cardHeader}>
            <View style={[styles.tag, event.type === 'Satsang' ? styles.tagSatsang : styles.tagPravachan]}>
                <Text style={styles.tagText}>{event.type}</Text>
            </View>
        </View>
        <Text style={styles.eventTitle}>{event.title}</Text>
        <View style={styles.infoRow}>
            <Feather name="user" size={16} color={Colors.light.mediumGray} />
            <Text style={styles.infoText}>{event.saint}</Text>
        </View>
        <View style={styles.infoRow}>
            <Feather name="calendar" size={16} color={Colors.light.mediumGray} />
            <Text style={styles.infoText}>{event.date}</Text>
        </View>
        <View style={styles.infoRow}>
            <Feather name="clock" size={16} color={Colors.light.mediumGray} />
            <Text style={styles.infoText}>{event.time}</Text>
        </View>
         <View style={styles.infoRow}>
            <Feather name="map-pin" size={16} color={Colors.light.mediumGray} />
            <Text style={styles.infoText}>{event.location}</Text>
        </View>
        <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.directionsButton}>
                <Text style={styles.directionsButtonText}>Get Directions</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.calendarButton}>
                <Text style={styles.calendarButtonText}>Add to Calendar</Text>
            </TouchableOpacity>
        </View>
    </View>
);

export default function EventsScreen() {
  return (
    <ScrollView style={styles.container}>
        <View style={styles.header}>
            <MaterialCommunityIcons name="calendar-star" size={24} color={Colors.light.white} />
            <Text style={styles.headerTitle}>Spiritual Events</Text>
        </View>
        <View style={styles.filterContainer}>
            <TouchableOpacity style={[styles.filterButton, styles.filterActive]}>
                <Text style={[styles.filterText, styles.filterActiveText]}>All Events</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.filterButton}>
                <Text style={styles.filterText}>Pravachan</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.filterButton}>
                <Text style={styles.filterText}>Satsang</Text>
            </TouchableOpacity>
        </View>
        {events.map(event => <EventCard key={event.id} event={event} />)}
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
  filterContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: Colors.light.saffron,
    paddingTop: 0,
  },
  filterButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 10,
  },
  filterActive: {
      backgroundColor: Colors.light.white,
  },
  filterText: {
    color: Colors.light.white,
    fontWeight: '500',
  },
  filterActiveText: {
      color: Colors.light.saffron,
  },
  card: {
    backgroundColor: Colors.light.white,
    margin: 16,
    marginTop: 0,
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
    color: Colors.light.saffron
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
  buttonContainer: {
      flexDirection: 'row',
      marginTop: 16,
      justifyContent: 'space-between',
      borderTopWidth: 1,
      borderTopColor: '#eee',
      paddingTop: 16,
  },
  directionsButton: {
      backgroundColor: Colors.light.maroon,
      flex: 1,
      padding: 12,
      borderRadius: 8,
      alignItems: 'center',
      marginRight: 8,
  },
  directionsButtonText: {
      color: Colors.light.white,
      fontWeight: 'bold',
  },
  calendarButton: {
      borderWidth: 1,
      borderColor: Colors.light.saffron,
      padding: 12,
      borderRadius: 8,
  },
  calendarButtonText: {
      color: Colors.light.saffron,
      fontWeight: 'bold',
  }
});
