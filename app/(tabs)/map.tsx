import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { Feather } from '@expo/vector-icons';
import { Link } from 'expo-router'; // Import the Link component
import Colors from '../../constants/Colors';
import { db } from '../../firebaseConfig';
import { collection, getDocs, GeoPoint } from 'firebase/firestore';

// Define a type for our Saint data that includes the GeoPoint and lastSeen
export type SaintOnMap = {
  id: string;
  name: string;
  location: string;
  lastSeen?: string; // Added lastSeen to the type
  coordinates: GeoPoint;
};

const SaintMapCard = ({ saint }: { saint: SaintOnMap }) => (
    <View style={styles.saintCard}>
        <View style={styles.saintIcon}>
            <Feather name="clock" size={20} color={Colors.light.maroon} />
        </View>
        <View style={styles.saintInfo}>
            <Text style={styles.saintName}>{saint.name}</Text>
            <Text style={styles.saintLocation}>{saint.location}</Text>
            {saint.lastSeen && <Text style={styles.saintLastSeen}>Last known • {saint.lastSeen}</Text>}
        </View>
        {/* Wrap the button with a Link component to handle navigation */}
        <Link href={`/saint/${saint.id}`} asChild>
            <TouchableOpacity style={styles.detailsButton}>
                <Text style={styles.detailsButtonText}>View Details</Text>
            </TouchableOpacity>
        </Link>
    </View>
);


export default function MapScreen() {
  const [saints, setSaints] = useState<SaintOnMap[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSaintsForMap = async () => {
      try {
        const saintsCollectionRef = collection(db, 'saint');
        const querySnapshot = await getDocs(saintsCollectionRef);
        
        const rawData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        
        const saintsData = rawData
          .map(data => data as SaintOnMap)
          .filter(saint => {
            // This filter ensures we only try to display saints with valid coordinates
            return saint.coordinates && typeof saint.coordinates.latitude === 'number' && typeof saint.coordinates.longitude === 'number';
          });
        
        if (rawData.length > 0 && saintsData.length === 0) {
            Alert.alert(
                "Data Issue",
                "Saints were fetched, but none have a valid 'coordinates' field. Please go to your Firebase Console and ensure each saint document has a 'coordinates' field of type 'geopoint' with a latitude and longitude."
            );
        }

        setSaints(saintsData);
      } catch (error) {
        console.error("Error fetching saints for map:", error);
        Alert.alert("Error", "Could not fetch data from Firebase. Please check the console for more details.");
      } finally {
        setLoading(false);
      }
    };

    fetchSaintsForMap();
  }, []);

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
        {saints.map(saint => (
          <Marker
            key={saint.id}
            coordinate={{
                latitude: saint.coordinates.latitude,
                longitude: saint.coordinates.longitude
            }}
            title={saint.name}
            pinColor={Colors.light.maroon}
          />
        ))}
      </MapView>

      <View style={styles.listContainer}>
        <Text style={styles.listHeader}>Saints on Map</Text>
        {loading ? (
            <ActivityIndicator size="large" color={Colors.light.saffron} />
        ) : (
            <ScrollView>
                {saints.length > 0 ? (
                    saints.map(saint => <SaintMapCard key={saint.id} saint={saint} />)
                ) : (
                    <Text style={styles.noDataText}>No saints with location data found.</Text>
                )}
            </ScrollView>
        )}
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
    backgroundColor: '#FAFAFA', // Slightly different background for cards
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
  noDataText: {
      textAlign: 'center',
      marginTop: 20,
      fontSize: 16,
      color: Colors.light.mediumGray,
  }
});

