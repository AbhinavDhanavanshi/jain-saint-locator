import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  TextInput,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import {
  Feather,
  MaterialCommunityIcons,
  FontAwesome,
} from "@expo/vector-icons";
import * as Location from "expo-location";
import { Link } from "expo-router";
import Colors from "../../constants/Colors";
import { db } from "../../firebaseConfig";
import { collection, getDocs, GeoPoint } from "firebase/firestore";

// Define a type for our Saint data
export type SaintOnMap = {
  id: string;
  name: string;
  location: string;
  lastSeen?: string;
  coordinates: GeoPoint;
  distance?: number;

};


// Haversine formula to calculate distance between two lat/lng points
const getDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) => {
  const R = 6371; // Radius of the earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
};

// Function to open Google Maps for directions
const openDirections = (latitude: number, longitude: number, label: string) => {
  const scheme = Platform.OS === "ios" ? "maps:0,0?q=" : "geo:0,0?q=";
  const url = `${scheme}${latitude},${longitude}(${label})`;
  Linking.openURL(url);
};

const SaintMapCard = ({ saint, onPress, isSelected }: { saint: SaintOnMap, onPress: () => void, isSelected: boolean }) => (
    <TouchableOpacity onPress={onPress} style={[styles.saintCard, isSelected && styles.selectedCard]}>
        <View style={styles.saintInfo}>
            <Text style={styles.saintName}>{saint.name}</Text>
            <Text style={styles.saintLocation}>{saint.location}</Text>
            {saint.distance != null && <Text style={styles.saintDistance}>{saint.distance.toFixed(1)} km away</Text>}
        </View>
        <TouchableOpacity 
            style={styles.detailsButton}
            onPress={() => openDirections(saint.coordinates.latitude, saint.coordinates.longitude, saint.name)}
        >
            <Text style={styles.detailsButtonText}>Directions</Text>
        </TouchableOpacity>
    </TouchableOpacity>
);


export default function MapScreen() {
  const [allSaints, setAllSaints] = useState<SaintOnMap[]>([]);
  const [filteredSaints, setFilteredSaints] = useState<SaintOnMap[]>([]);
  const [selectedSaintId, setSelectedSaintId] = useState<string | null>(null);
  const [userLocation, setUserLocation] =
    useState<Location.LocationObject | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [distanceFilter, setDistanceFilter] = useState<number>(Infinity);
  const mapRef = useRef<MapView>(null);

  const distanceOptions = [
    { label: "10 km", value: 10 },
    { label: "50 km", value: 50 },
    { label: "100 km", value: 100 },
    { label: "All", value: Infinity },
  ];

  // Effect to fetch user location and saints data
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setErrorMsg("Permission to access location was denied");
        setLoading(false);
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      setUserLocation(location);

      try {
        const saintsCollectionRef = collection(db, "saint");
        const querySnapshot = await getDocs(saintsCollectionRef);
        const saintsData = querySnapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() } as SaintOnMap))
          .filter(
            (saint) =>
              saint.coordinates &&
              typeof saint.coordinates.latitude === "number"
          )
          .map((saint) => {
            const distance = getDistance(
              location.coords.latitude,
              location.coords.longitude,
              saint.coordinates.latitude,
              saint.coordinates.longitude
            );
            return { ...saint, distance };
          })
          .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));

        setAllSaints(saintsData);
      } catch (error) {
        console.error("Error fetching saints:", error);
        setErrorMsg("Failed to fetch saints data.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Effect to apply search and distance filters
  useEffect(() => {
    let processedSaints = allSaints;

    // 1. Apply distance filter
    if (distanceFilter !== Infinity) {
      processedSaints = processedSaints.filter(
        (saint) => (saint.distance ?? Infinity) <= distanceFilter
      );
    }

    // 2. Apply search filter
    if (searchQuery.trim() !== "") {
      const lowercasedQuery = searchQuery.toLowerCase();
      processedSaints = processedSaints.filter((saint) =>
        saint.name.toLowerCase().includes(lowercasedQuery)
      );
    }

    setFilteredSaints(processedSaints);
  }, [searchQuery, distanceFilter, allSaints]);

  // Function to handle tapping on a saint card
  const handleSaintCardPress = (saint: SaintOnMap) => {
    setSelectedSaintId(saint.id);
    if (mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: saint.coordinates.latitude,
          longitude: saint.coordinates.longitude,
          latitudeDelta: 0.1, // Zoom in closer
          longitudeDelta: 0.1,
        },
        1000
      ); // Animate over 1 second
    }
  };

  const centerOnUser = () => {
    if (userLocation && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: userLocation.coords.latitude,
        longitude: userLocation.coords.longitude,
        latitudeDelta: 0.5,
        longitudeDelta: 0.5,
      });
    }
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={{
          latitude: 24.8,
          longitude: 80,
          latitudeDelta: 20,
          longitudeDelta: 20,
        }}
        showsUserLocation={true}
      >
        {filteredSaints.map((saint) => (
          <Marker
            key={saint.id}
            coordinate={{
              latitude: saint.coordinates.latitude,
              longitude: saint.coordinates.longitude,
            }}
            title={saint.name}
            description={saint.location}
            // Highlight the selected marker
            pinColor={
              selectedSaintId === saint.id
                ? Colors.light.saffron
                : Colors.light.maroon
            }
          />
        ))}
      </MapView>

      <TouchableOpacity style={styles.myLocationButton} onPress={centerOnUser}>
        <MaterialCommunityIcons
          name="crosshairs-gps"
          size={24}
          color={Colors.light.darkGray}
        />
      </TouchableOpacity>

      <View style={styles.searchContainer}>
        <FontAwesome
          name="search"
          size={20}
          color={Colors.light.mediumGray}
          style={styles.searchIcon}
        />
        <TextInput
          placeholder="Search saint by name..."
          placeholderTextColor={Colors.light.mediumGray}
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <View style={styles.listContainer}>
        <Text style={styles.listHeader}>Saints Nearby</Text>

        <View style={styles.filterContainer}>
          {distanceOptions.map((option) => (
            <TouchableOpacity
              key={option.label}
              style={[
                styles.filterButton,
                distanceFilter === option.value && styles.filterActive,
              ]}
              onPress={() => setDistanceFilter(option.value)}
            >
              <Text
                style={[
                  styles.filterText,
                  distanceFilter === option.value && styles.filterActiveText,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={Colors.light.saffron} />
        ) : errorMsg ? (
          <Text style={styles.errorText}>{errorMsg}</Text>
        ) : (
          <ScrollView>
            {filteredSaints.map((saint) => (
              <SaintMapCard
                key={saint.id}
                saint={saint}
                onPress={() => handleSaintCardPress(saint)}
                isSelected={selectedSaintId === saint.id}
              />
            ))}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // --- Most styles remain the same ---
  container: { flex: 1, backgroundColor: "#F7F7F7" },
  map: { flex: 1 },
  myLocationButton: {
    position: "absolute",
    top: 60,
    right: 20,
    backgroundColor: "white",
    padding: 12,
    borderRadius: 30,
    elevation: 5,
  },
  searchContainer: {
    position: "absolute",
    top: 120,
    left: 20,
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 12,
    paddingHorizontal: 16,
    elevation: 5,
  },
  searchIcon: { marginRight: 12 },
  searchInput: { flex: 1, height: 50, fontSize: 16 },
  listContainer: {
    height: "45%",
    backgroundColor: Colors.light.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
    elevation: 10,
  },
  listHeader: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
    color: Colors.light.darkGray,
  },
  filterContainer: {
    flexDirection: "row",
    marginBottom: 16,
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 10,
    backgroundColor: "#eee",
  },
  filterActive: {
    backgroundColor: Colors.light.saffron,
  },
  filterText: {
    fontWeight: "600",
    color: Colors.light.mediumGray,
  },
  filterActiveText: {
    color: "white",
  },
  saintCard: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    padding: 12,
    backgroundColor: "#FAFAFA",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "transparent", // Default no border
  },
  selectedCard: {
    borderColor: Colors.light.saffron, // Highlight border for selected card
  },
  saintInfo: { flex: 1 },
  saintName: { fontSize: 16, fontWeight: "600", color: Colors.light.darkGray },
  saintLocation: {
    fontSize: 14,
    color: Colors.light.mediumGray,
    marginVertical: 2,
  },
  saintDistance: {
    fontSize: 12,
    color: Colors.light.saffron,
    fontWeight: "bold",
  },
  detailsButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: Colors.light.saffron,
    borderRadius: 20,
  },
  detailsButtonText: { color: Colors.light.white, fontWeight: "600" },
  errorText: { textAlign: "center", marginTop: 20, fontSize: 16, color: "red" },
  noResultsText: {
    textAlign: "center",
    marginTop: 20,
    fontSize: 16,
    color: Colors.light.mediumGray,
  },
});
