import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { Feather } from '@expo/vector-icons';
import Colors from '../../constants/Colors';

// Dummy data for saints on the map
const saintsOnMap = [
  {
    id: '1',
    name: 'Sant Ramesh Das',
    location: 'Varanasi, Uttar Pradesh',
    lastSeen: '15 days ago • by ashram_coordinator',
    coordinate: { latitude: 25.3176, longitude: 82.9739 },
  },
  {
    id: '2',
    name: 'Mata Anandamayi',
    location: 'Vrindavan, Uttar Pradesh',
    lastSeen: '15 days ago • by seva_team',
    coordinate: { latitude: 27.5699, longitude: 77.6783 },
  },
  {
    id: '3',
    name: 'Swami Krishnanand',
    location: 'Pune, Maharashtra',
    lastSeen: '16 days ago • by anugrah_center',
    coordinate: { latitude: 18.5204, longitude: 73.8567 },
  },
];

const SaintMapCard = ({ saint }: { saint: typeof saintsOnMap[0] }) => (
    <View style={styles.saintCard}>
        <View style={styles.saintIcon}>
            <Feather name="clock" size={20} color={Colors.light.maroon} />
        </View>
        <View style={styles.saintInfo}>
            <Text style={styles.saintName}>{saint.name}</Text>
            <Text style={styles.saintLocation}>{saint.location}</Text>
            <Text style={styles.saintLastSeen}>Last known • {saint.lastSeen}</Text>
        </View>
        <TouchableOpacity style={styles.detailsButton}>
            <Text style={styles.detailsButtonText}>View Details</Text>
        </TouchableOpacity>
    </View>
);


export default function MapScreen() {
  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: 24.8, // Centered on India
          longitude: 80,
          latitudeDelta: 20,
          longitudeDelta: 20,
        }}
      >
        {saintsOnMap.map(saint => (
          <Marker
            key={saint.id}
            coordinate={saint.coordinate}
            title={saint.name}
            pinColor={Colors.light.maroon}
          />
        ))}
      </MapView>

      <View style={styles.listContainer}>
        <Text style={styles.listHeader}>Saints on Map</Text>
        <ScrollView>
            {saintsOnMap.map(saint => <SaintMapCard key={saint.id} saint={saint} />)}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F7F7',
  },
  map: {
    height: '55%',
  },
  listContainer: {
    flex: 1,
    backgroundColor: Colors.light.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: -20, // Pulls the list up over the map slightly
    padding: 20,
  },
  listHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: Colors.light.darkGray,
  },
  saintCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    padding: 12,
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee'
  },
  saintIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFEAE5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  saintInfo: {
    flex: 1,
  },
  saintName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.darkGray,
  },
  saintLocation: {
    fontSize: 14,
    color: Colors.light.mediumGray,
    marginVertical: 2,
  },
  saintLastSeen: {
      fontSize: 12,
      color: Colors.light.mediumGray,
  },
  detailsButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: Colors.light.saffron,
    borderRadius: 20,
  },
  detailsButtonText: {
    color: Colors.light.saffron,
    fontWeight: '600',
  },
});

