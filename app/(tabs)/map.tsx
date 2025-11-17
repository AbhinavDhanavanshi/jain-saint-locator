// app/(tabs)/map.tsx
import React, { useEffect, useRef, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Platform,
  TextInput,
  Modal,
  Alert,
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
import { db, auth } from "../../firebaseConfig";
import {
  collection,
  getDocs,
  addDoc,
  doc,
  getDoc,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import DateTimePicker from "@react-native-community/datetimepicker";
import type { Saint } from "../types";

// Local type extension
export type SaintOnMap = Saint & {
  parsedCoordinates?: { latitude: number; longitude: number };
  distance?: number;
};

const getDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Flexible coordinate parser
function parseCoordinatesFlexible(
  coords: any
): { latitude: number; longitude: number } | null {
  if (coords == null) return null;

  if (typeof coords === "object") {
    const maybeLat =
      (coords.latitude as number) ??
      (coords.lat as number) ??
      (coords._latitude as number) ??
      (coords._lat as number) ??
      coords.latitude;
    const maybeLon =
      (coords.longitude as number) ??
      (coords.lng as number) ??
      (coords._longitude as number) ??
      (coords._long as number) ??
      coords.longitude;
    if (typeof maybeLat === "number" && typeof maybeLon === "number") {
      return { latitude: Number(maybeLat), longitude: Number(maybeLon) };
    }
  }

  if (typeof coords === "string") {
    const s = coords.trim();
    const extractNumber = (str: string) => {
      const cleaned = str
        .replace(/[°º]/g, "")
        .replace(/[NSEW]/gi, "")
        .replace(/[()]/g, "")
        .trim();
      const num = cleaned.match(/-?\d+(\.\d+)?/);
      return num ? parseFloat(num[0]) : NaN;
    };

    const commaParts = s.split(",");
    if (commaParts.length >= 2) {
      const lat = extractNumber(commaParts[0]);
      const lon = extractNumber(commaParts[1]);
      if (!isNaN(lat) && !isNaN(lon)) return { latitude: lat, longitude: lon };
    }

    const spaceParts = s.split(/\s+/).filter(Boolean);
    if (spaceParts.length >= 2) {
      const lat = extractNumber(spaceParts[0]);
      const lon = extractNumber(spaceParts[1]);
      if (!isNaN(lat) && !isNaN(lon)) return { latitude: lat, longitude: lon };
    }

    const nums = s.match(/-?\d+(\.\d+)?/g);
    if (nums && nums.length >= 2) {
      const lat = parseFloat(nums[0]);
      const lon = parseFloat(nums[1]);
      if (!isNaN(lat) && !isNaN(lon)) return { latitude: lat, longitude: lon };
    }
  }

  return null;
}

const openDirections = (latitude: number, longitude: number, label: string) => {
  const scheme = Platform.OS === "ios" ? "maps:0,0?q=" : "geo:0,0?q=";
  const url = `${scheme}${latitude},${longitude}(${encodeURIComponent(label)})`;
  Linking.openURL(url).catch((e) => console.warn("Could not open maps:", e));
};

const SaintMapCard = (props: {
  saint: SaintOnMap;
  onPress: () => void;
  isSelected: boolean;
}) => {
  const { saint, onPress, isSelected } = props;
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.saintCard, isSelected && styles.selectedCard]}
    >
      <View style={styles.saintInfo}>
        <Text style={styles.saintName}>{(saint as any).name ?? "Unknown"}</Text>
        <Text style={styles.saintLocation}>{(saint as any).location ?? ""}</Text>
        {saint.distance != null && (
          <Text style={styles.saintDistance}>
            {saint.distance.toFixed(1)} km away
          </Text>
        )}
      </View>
      <View style={styles.buttonContainer}>
        <Link href={`/saint/${saint.id}`} asChild>
          <TouchableOpacity style={styles.detailsButton}>
            <Text style={styles.detailsButtonText}>Details</Text>
          </TouchableOpacity>
        </Link>
        {saint.parsedCoordinates ? (
          <TouchableOpacity
            style={[styles.detailsButton, styles.directionsButton]}
            onPress={() =>
              openDirections(
                saint.parsedCoordinates!.latitude,
                saint.parsedCoordinates!.longitude,
                (saint as any).name ?? ""
              )
            }
          >
            <Text style={styles.detailsButtonText}>Directions</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </TouchableOpacity>
  );
};

export default function MapScreen() {
  const [allSaints, setAllSaints] = useState<SaintOnMap[]>([]);
  const [filteredSaints, setFilteredSaints] = useState<SaintOnMap[]>([]);
  const [selectedSaintId, setSelectedSaintId] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [distanceFilter, setDistanceFilter] = useState<number>(Infinity);
  const mapRef = useRef<MapView>(null);

  const [isVolunteer, setIsVolunteer] = useState<boolean>(false);
  const [checkingVolunteer, setCheckingVolunteer] = useState<boolean>(true);

  // Add saint modal states
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [addingSaint, setAddingSaint] = useState(false);

  // inputs
  const [newName, setNewName] = useState("");
  const [newLocationText, setNewLocationText] = useState("");
  const [newLat, setNewLat] = useState("");
  const [newLon, setNewLon] = useState("");
  const [newAbout, setNewAbout] = useState("");
  const [newAmber, setNewAmber] = useState<"Digamber" | "Shwetamber">(
    "Digamber"
  );
  const [newDateOfDiksha, setNewDateOfDiksha] = useState<Date | null>(null);
  const [showDikshaDatePicker, setShowDikshaDatePicker] = useState(false);
  const [showDikshaTimePicker, setShowDikshaTimePicker] = useState(false);
  const [newDesignation, setNewDesignation] = useState("");
  const [newGender, setNewGender] = useState<"Male" | "Female" | "Other">(
    "Male"
  );

  // guru autocomplete and selected IDs
  const [guruQuery, setGuruQuery] = useState("");
  const [guruSuggestionsVisible, setGuruSuggestionsVisible] = useState(false);
  const [selectedGuruId, setSelectedGuruId] = useState<string | "">("");

  // groupLeader autocomplete and selected IDs
  const [groupLeaderQuery, setGroupLeaderQuery] = useState("");
  const [groupLeaderSuggestionsVisible, setGroupLeaderSuggestionsVisible] =
    useState(false);
  const [selectedGroupLeaderId, setSelectedGroupLeaderId] = useState<string | "">(
    ""
  );

  const distanceOptions = [
    { label: "10 km", value: 10 },
    { label: "50 km", value: 50 },
    { label: "100 km", value: 100 },
    { label: "All", value: Infinity },
  ];

  // saints lookup for suggestions
  const [saintsLookup, setSaintsLookup] = useState<{ id: string; name: string }[]>(
    []
  );

  // check volunteer status (onAuthStateChanged)
  useEffect(() => {
    const authInstance = getAuth();
    const unsub = onAuthStateChanged(authInstance, async (user) => {
      try {
        setCheckingVolunteer(true);
        if (user) {
          const uRef = doc(db, "users", user.uid);
          const snap = await getDoc(uRef);
          if (snap.exists()) {
            const data = snap.data() as any;
            setIsVolunteer(Boolean(data?.isVolunteer));
          } else {
            setIsVolunteer(false);
          }
        } else {
          setIsVolunteer(false);
        }
      } catch (err) {
        console.error("Volunteer check error:", err);
        setIsVolunteer(false);
      } finally {
        setCheckingVolunteer(false);
      }
    });
    return () => unsub();
  }, []);

  // fetch location and saints initially
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setErrorMsg("Permission to access location was denied");
          setLoading(false);
          return;
        }
        const loc = await Location.getCurrentPositionAsync({});
        setUserLocation(loc);

        const saintsCollectionRef = collection(db, "saint");
        const querySnapshot = await getDocs(saintsCollectionRef);

        const mapped: SaintOnMap[] = [];
        const lookup: { id: string; name: string }[] = [];

        querySnapshot.docs.forEach((d) => {
          const raw = d.data() as any;
          const candidate =
            raw.coordinates ??
            raw.locationGeo ??
            raw.coords ??
            raw.location ??
            raw.coordinatesText ??
            raw.locationText ??
            null;

          const parsed = parseCoordinatesFlexible(candidate);
          const distance =
            parsed && loc
              ? getDistance(
                  loc.coords.latitude,
                  loc.coords.longitude,
                  parsed.latitude,
                  parsed.longitude
                )
              : undefined;

          mapped.push({
            id: d.id,
            ...(raw as any),
            parsedCoordinates: parsed ?? undefined,
            distance,
          });

          lookup.push({ id: d.id, name: raw?.name ?? "" });
        });

        const sorted = mapped.sort(
          (a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity)
        );

        setAllSaints(sorted);
        setFilteredSaints(sorted);
        setSaintsLookup(lookup.sort((a, b) => a.name.localeCompare(b.name)));
      } catch (e) {
        console.error("Error in MapScreen fetch:", e);
        setErrorMsg("Failed to load data.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    let list = allSaints.slice();

    if (distanceFilter !== Infinity) {
      list = list.filter((s) => (s.distance ?? Infinity) <= distanceFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((s) =>
        ((s as any).name ?? "").toLowerCase().includes(q)
      );
    }

    setFilteredSaints(list);
  }, [allSaints, distanceFilter, searchQuery]);

  const handleSaintCardPress = (saint: SaintOnMap) => {
    setSelectedSaintId(saint.id);
    if (saint.parsedCoordinates && mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: saint.parsedCoordinates.latitude,
          longitude: saint.parsedCoordinates.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        },
        700
      );
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

  const resetAddForm = () => {
    setNewName("");
    setNewLocationText("");
    setNewLat("");
    setNewLon("");
    setNewAbout("");
    setNewAmber("Digamber");
    setNewDateOfDiksha(null);
    setNewDesignation("");
    setNewGender("Male");
    setGuruQuery("");
    setGuruSuggestionsVisible(false);
    setSelectedGuruId("");
    setGroupLeaderQuery("");
    setGroupLeaderSuggestionsVisible(false);
    setSelectedGroupLeaderId("");
  };

  const validateLatLon = (latS: string, lonS: string) => {
    const lat = Number(latS);
    const lon = Number(lonS);
    if (Number.isNaN(lat) || Number.isNaN(lon)) return false;
    if (lat < -90 || lat > 90) return false;
    if (lon < -180 || lon > 180) return false;
    return true;
  };

  // submit: store guru & groupLeader as DocumentReference
  const submitNewSaint = async () => {
    if (!newName.trim()) {
      Alert.alert("Missing name", "Please enter the saint's name.");
      return;
    }

    let parsedCoordinates = null;
    if (newLat.trim() && newLon.trim()) {
      if (!validateLatLon(newLat, newLon)) {
        Alert.alert("Invalid coordinates", "Please enter valid lat/lon values.");
        return;
      }
      parsedCoordinates = { latitude: Number(newLat), longitude: Number(newLon) };
    } else if (newLocationText.trim()) {
      const parsed = parseCoordinatesFlexible(newLocationText.trim());
      if (parsed) parsedCoordinates = parsed;
    }

    const payload: any = {
      name: newName.trim(),
      location: newLocationText.trim(),
      about: newAbout.trim(),
      amber: newAmber,
      designation: newDesignation.trim(),
      gender: newGender,
      createdAt: serverTimestamp(),
    };

    if (parsedCoordinates) {
      payload.coordinates = parsedCoordinates;
      payload.locationGeo = parsedCoordinates;
    }

    if (newDateOfDiksha) {
      payload.dateOfDiksha = newDateOfDiksha;
    }

    // Save guru as DocumentReference if selected, else save typed name
    if (selectedGuruId) {
      payload.guru = doc(db, "saint", selectedGuruId);
      payload.guruName = saintsLookup.find((s) => s.id === selectedGuruId)?.name ?? "";
    } else if (guruQuery.trim()) {
      payload.guruName = guruQuery.trim();
    }

    if (selectedGroupLeaderId) {
      payload.groupLeader = doc(db, "saint", selectedGroupLeaderId);
      payload.groupLeaderName =
        saintsLookup.find((s) => s.id === selectedGroupLeaderId)?.name ?? "";
    } else if (groupLeaderQuery.trim()) {
      payload.groupLeaderName = groupLeaderQuery.trim();
    }

    const currentUser = auth.currentUser;
    if (currentUser) {
      payload.createdBy = doc(db, "users", currentUser.uid); // store as reference to user doc
    }

    setAddingSaint(true);
    try {
      const saintsRef = collection(db, "saint");
      await addDoc(saintsRef, payload);

      // re-fetch saints (simple refresh)
      const q = await getDocs(collection(db, "saint"));
      const arr: SaintOnMap[] = q.docs.map((d) => {
        const raw = d.data() as any;
        const candidate =
          raw.coordinates ?? raw.locationGeo ?? raw.coords ?? raw.location ?? raw.coordinatesText ?? null;
        const parsedNow = parseCoordinatesFlexible(candidate);
        return {
          id: d.id,
          ...(raw as any),
          parsedCoordinates: parsedNow ?? undefined,
          distance:
            userLocation && parsedNow
              ? getDistance(
                  userLocation.coords.latitude,
                  userLocation.coords.longitude,
                  parsedNow.latitude,
                  parsedNow.longitude
                )
              : undefined,
        };
      });
      const sorted = arr.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
      setAllSaints(sorted);
      setFilteredSaints(sorted);

      // refresh saintsLookup
      const lookupArr = q.docs.map((d) => ({ id: d.id, name: (d.data() as any).name ?? "" }));
      setSaintsLookup(lookupArr.sort((a, b) => a.name.localeCompare(b.name)));

      Alert.alert("Success", "Saint added successfully.");
      resetAddForm();
      setAddModalVisible(false);
    } catch (err) {
      console.error("Error adding saint:", err);
      Alert.alert("Error", "Could not add saint. Try again later.");
    } finally {
      setAddingSaint(false);
    }
  };

  // Suggestions handlers
  const onGuruQueryChange = (text: string) => {
    setGuruQuery(text);
    setGuruSuggestionsVisible(true);
    setSelectedGuruId("");
  };
  const selectGuruSuggestion = (id: string, name: string) => {
    setSelectedGuruId(id);
    setGuruQuery(name);
    setGuruSuggestionsVisible(false);
  };

  const onGroupLeaderQueryChange = (text: string) => {
    setGroupLeaderQuery(text);
    setGroupLeaderSuggestionsVisible(true);
    setSelectedGroupLeaderId("");
  };
  const selectGroupLeaderSuggestion = (id: string, name: string) => {
    setSelectedGroupLeaderId(id);
    setGroupLeaderQuery(name);
    setGroupLeaderSuggestionsVisible(false);
  };

  // date/time handlers
  const onDikshaDateChange = (event: any, selected?: Date) => {
    setShowDikshaDatePicker(false);
    if (selected) {
      if (newDateOfDiksha) {
        const newD = new Date(selected);
        newD.setHours(newDateOfDiksha.getHours(), newDateOfDiksha.getMinutes(), 0, 0);
        setNewDateOfDiksha(newD);
      } else {
        setNewDateOfDiksha(selected);
      }
    }
  };
  const onDikshaTimeChange = (event: any, selected?: Date) => {
    setShowDikshaTimePicker(false);
    if (selected) {
      if (newDateOfDiksha) {
        const newD = new Date(newDateOfDiksha);
        newD.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
        setNewDateOfDiksha(newD);
      } else {
        const now = new Date();
        now.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
        setNewDateOfDiksha(now);
      }
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
        {allSaints.map((s) => {
          if (s.parsedCoordinates) {
            return (
              <Marker
                key={s.id}
                coordinate={s.parsedCoordinates}
                title={(s as any).name ?? "Saint"}
                description={(s as any).location ?? ""}
                pinColor={
                  selectedSaintId === s.id ? Colors.light.saffron : Colors.light.maroon
                }
              />
            );
          }
          return null;
        })}
      </MapView>

      <TouchableOpacity style={styles.myLocationButton} onPress={centerOnUser}>
        <MaterialCommunityIcons
          name="crosshairs-gps"
          size={24}
          color={Colors.light.darkGray}
        />
      </TouchableOpacity>

      {/* Search moved to top area */}
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

      {checkingVolunteer ? (
        <ActivityIndicator
          size="small"
          style={{ position: "absolute", top: 18, right: 20 }}
          color={Colors.light.saffron}
        />
      ) : null}

      {/* Add saint FAB only for volunteers */}
      {isVolunteer && (
        <TouchableOpacity
          style={styles.addSaintFab}
          onPress={() => setAddModalVisible(true)}
        >
          <Feather name="plus" size={22} color={Colors.light.white} />
        </TouchableOpacity>
      )}

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
            {filteredSaints.length === 0 && (
              <Text style={styles.noResultsText}>
                No saints found matching your criteria.
              </Text>
            )}
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

      {/* Add Saint Modal */}
      <Modal
        visible={addModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setAddModalVisible(false)}
      >
        <View style={{ flex: 1, padding: 16, backgroundColor: Colors.light.background }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <Text style={{ fontSize: 20, fontWeight: "700", color: Colors.light.darkGray }}>Add New Saint</Text>
            <TouchableOpacity onPress={() => setAddModalVisible(false)} disabled={addingSaint}>
              <Feather name="x" size={24} color={Colors.light.mediumGray} />
            </TouchableOpacity>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled">
            <TextInput
              placeholder="Name *"
              value={newName}
              onChangeText={setNewName}
              style={styles.input}
              placeholderTextColor={Colors.light.mediumGray}
            />

            <TextInput
              placeholder="Location (address or coordinates text)"
              value={newLocationText}
              onChangeText={setNewLocationText}
              style={styles.input}
              placeholderTextColor={Colors.light.mediumGray}
            />

            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <TextInput
                placeholder="Latitude (optional)"
                value={newLat}
                onChangeText={setNewLat}
                style={[styles.input, { flex: 1, marginRight: 8 }]}
                placeholderTextColor={Colors.light.mediumGray}
                keyboardType={Platform.OS === "ios" ? "numbers-and-punctuation" : "numeric"}
              />
              <TextInput
                placeholder="Longitude (optional)"
                value={newLon}
                onChangeText={setNewLon}
                style={[styles.input, { flex: 1, marginLeft: 8 }]}
                placeholderTextColor={Colors.light.mediumGray}
                keyboardType={Platform.OS === "ios" ? "numbers-and-punctuation" : "numeric"}
              />
            </View>

            <TextInput
              placeholder="About"
              value={newAbout}
              onChangeText={setNewAbout}
              style={[styles.input, { height: 100 }]}
              placeholderTextColor={Colors.light.mediumGray}
              multiline
            />

            {/* Amber */}
            <View style={{ marginBottom: 12 }}>
              <Text style={{ color: Colors.light.darkGray, marginBottom: 6, fontWeight: "600" }}>Amber</Text>
              <View style={{ flexDirection: "row" }}>
                {(["Digamber", "Shwetamber"] as const).map((a) => (
                  <TouchableOpacity
                    key={a}
                    onPress={() => setNewAmber(a)}
                    style={[
                      styles.typeOption,
                      newAmber === a && styles.typeOptionActive,
                    ]}
                  >
                    <Text style={newAmber === a ? { color: "#fff", fontWeight: "700" } : { color: Colors.light.darkGray }}>
                      {a}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* dateOfDiksha */}
            <View style={{ marginBottom: 12 }}>
              <Text style={{ color: Colors.light.darkGray, marginBottom: 6, fontWeight: "600" }}>Date of Diksha (optional)</Text>
              <View style={{ flexDirection: "row" }}>
                <TouchableOpacity style={[styles.dateButton, { marginRight: 8 }]} onPress={() => setShowDikshaDatePicker(true)}>
                  <Text style={{ color: Colors.light.darkGray }}>{newDateOfDiksha ? newDateOfDiksha.toLocaleDateString() : "Pick date"}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.dateButton} onPress={() => setShowDikshaTimePicker(true)}>
                  <Text style={{ color: Colors.light.darkGray }}>{newDateOfDiksha ? newDateOfDiksha.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Pick time"}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {showDikshaDatePicker && (
              <DateTimePicker value={newDateOfDiksha ?? new Date()} mode="date" display="default" onChange={onDikshaDateChange} />
            )}
            {showDikshaTimePicker && (
              <DateTimePicker value={newDateOfDiksha ?? new Date()} mode="time" display="default" onChange={onDikshaTimeChange} />
            )}

            <TextInput
              placeholder="Designation (e.g. Sage)"
              value={newDesignation}
              onChangeText={setNewDesignation}
              style={styles.input}
              placeholderTextColor={Colors.light.mediumGray}
            />

            {/* gender */}
            <View style={{ marginBottom: 12 }}>
              <Text style={{ color: Colors.light.darkGray, marginBottom: 6, fontWeight: "600" }}>Gender</Text>
              <View style={{ flexDirection: "row" }}>
                {(["Male", "Female", "Other"] as const).map((g) => (
                  <TouchableOpacity
                    key={g}
                    onPress={() => setNewGender(g)}
                    style={[styles.typeOption, newGender === g && styles.typeOptionActive]}
                  >
                    <Text style={newGender === g ? { color: "#fff", fontWeight: "700" } : { color: Colors.light.darkGray }}>{g}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Guru input + suggestions */}
            <View style={{ marginBottom: 12 }}>
              <Text style={{ color: Colors.light.darkGray, marginBottom: 6, fontWeight: "600" }}>Guru (type and select)</Text>
              <TextInput
                placeholder="Type guru name..."
                value={guruQuery}
                onChangeText={onGuruQueryChange}
                style={styles.input}
                placeholderTextColor={Colors.light.mediumGray}
                autoCorrect={false}
                autoCapitalize="words"
              />
              {guruSuggestionsVisible && guruQuery.trim().length > 0 && (
                <View style={styles.suggestionsBox}>
                  {saintsLookup.filter(s => s.name.toLowerCase().includes(guruQuery.toLowerCase())).slice(0,8).map(s => (
                    <TouchableOpacity key={s.id} style={styles.suggestionItem} onPress={() => selectGuruSuggestion(s.id, s.name)}>
                      <Text style={{ color: Colors.light.darkGray }}>{s.name}</Text>
                    </TouchableOpacity>
                  ))}
                  {saintsLookup.filter(s => s.name.toLowerCase().includes(guruQuery.toLowerCase())).length === 0 && (
                    <Text style={{ padding: 8, color: Colors.light.mediumGray }}>No suggestions</Text>
                  )}
                </View>
              )}
            </View>

            {/* Group leader input + suggestions */}
            <View style={{ marginBottom: 12 }}>
              <Text style={{ color: Colors.light.darkGray, marginBottom: 6, fontWeight: "600" }}>Group Leader (optional)</Text>
              <TextInput
                placeholder="Type group leader name..."
                value={groupLeaderQuery}
                onChangeText={onGroupLeaderQueryChange}
                style={styles.input}
                placeholderTextColor={Colors.light.mediumGray}
                autoCorrect={false}
                autoCapitalize="words"
              />
              {groupLeaderSuggestionsVisible && groupLeaderQuery.trim().length > 0 && (
                <View style={styles.suggestionsBox}>
                  {saintsLookup.filter(s => s.name.toLowerCase().includes(groupLeaderQuery.toLowerCase())).slice(0,8).map(s => (
                    <TouchableOpacity key={s.id} style={styles.suggestionItem} onPress={() => selectGroupLeaderSuggestion(s.id, s.name)}>
                      <Text style={{ color: Colors.light.darkGray }}>{s.name}</Text>
                    </TouchableOpacity>
                  ))}
                  {saintsLookup.filter(s => s.name.toLowerCase().includes(groupLeaderQuery.toLowerCase())).length === 0 && (
                    <Text style={{ padding: 8, color: Colors.light.mediumGray }}>No suggestions</Text>
                  )}
                </View>
              )}
            </View>

            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 12 }}>
              <TouchableOpacity
                style={[styles.detailsButton, { backgroundColor: Colors.light.lightGray }]}
                onPress={() => { resetAddForm(); setAddModalVisible(false); }}
                disabled={addingSaint}
              >
                <Text style={{ color: Colors.light.darkGray }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.detailsButton, { backgroundColor: Colors.light.saffron }]}
                onPress={submitNewSaint}
                disabled={addingSaint}
              >
                {addingSaint ? <ActivityIndicator color="#fff" /> : <Text style={{ color: "#fff", fontWeight: "700" }}>Add Saint</Text>}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
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
    zIndex: 1000,
  },
  // Search bar location (moved up)
  searchContainer: {
    position: "absolute",
    top: 18,
    left: 16,
    right: 80,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    elevation: 8,
    zIndex: 1010,
  },
  searchIcon: { marginRight: 12 },
  searchInput: { flex: 1, height: 40, fontSize: 15, color: Colors.light.darkGray },
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
  filterContainer: { flexDirection: "row", marginBottom: 16 },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 10,
    backgroundColor: "#eee",
  },
  filterActive: { backgroundColor: Colors.light.saffron },
  filterText: { fontWeight: "600", color: Colors.light.mediumGray },
  filterActiveText: { color: "white" },
  saintCard: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    padding: 12,
    backgroundColor: "#FAFAFA",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "transparent",
  },
  selectedCard: { borderColor: Colors.light.saffron },
  saintInfo: { flex: 1, marginRight: 8 },
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
  buttonContainer: { flexDirection: "row" },
  detailsButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: Colors.light.saffron,
    borderRadius: 20,
  },
  directionsButton: { backgroundColor: Colors.light.darkGray, marginLeft: 8 },
  detailsButtonText: {
    color: Colors.light.white,
    fontWeight: "600",
    fontSize: 12,
  },
  errorText: { textAlign: "center", marginTop: 20, fontSize: 16, color: "red" },
  noResultsText: {
    textAlign: "center",
    marginTop: 20,
    fontSize: 16,
    color: Colors.light.mediumGray,
  },

  // Add saint FAB
  addSaintFab: {
    position: "absolute",
    top: 12,
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.light.saffron,
    alignItems: "center",
    justifyContent: "center",
    elevation: 10,
    zIndex: 1050,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },

  // Add modal inputs
  input: {
    backgroundColor: Colors.light.white,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 12,
    color: Colors.light.darkGray,
    borderWidth: 1,
    borderColor: Colors.light.lightGray,
  },

  typeOption: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: "#F3F3F3",
    marginRight: 8,
    marginBottom: 8,
  },
  typeOptionActive: {
    backgroundColor: Colors.light.saffron,
  },

  suggestionsBox: {
    maxHeight: 200,
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.light.lightGray,
    marginTop: 6,
    overflow: "hidden",
  },
  suggestionItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F3F3",
  },

  dateButton: {
    backgroundColor: Colors.light.white,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.light.lightGray,
  },
});
