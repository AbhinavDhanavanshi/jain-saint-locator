// app/(tabs)/events.tsx
import React, { useEffect, useRef, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Modal,
  Alert,
  Platform,
} from "react-native";
import {
  Feather,
  MaterialCommunityIcons,
  FontAwesome,
} from "@expo/vector-icons";
import { Link } from "expo-router";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import Colors from "../../constants/Colors";
import { db, auth } from "../../firebaseConfig";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import {
  collection,
  getDocs,
  addDoc,
  doc,
  getDoc,
  query,
  orderBy,
} from "firebase/firestore";
import DateTimePicker from "@react-native-community/datetimepicker";
import type { Event } from "../types";

/* ---------- Helpers ---------- */
const toDateOrNull = (value: any): Date | null => {
  if (value === undefined || value === null) return null;
  if (value?.toDate && typeof value.toDate === "function") {
    try {
      const d = value.toDate();
      return d instanceof Date && !isNaN(d.getTime()) ? d : null;
    } catch {
      return null;
    }
  }
  if (typeof value === "object" && typeof value.seconds === "number") {
    const ns = typeof value.nanoseconds === "number" ? value.nanoseconds : 0;
    const ms = value.seconds * 1000 + Math.round(ns / 1_000_000);
    const d = new Date(ms);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof value === "number") {
    const s = String(value).length;
    const ms = s === 10 ? value * 1000 : value;
    const d = new Date(ms);
    return isNaN(d.getTime()) ? null : d;
  }
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === "string") {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
};

const formatDate = (value: any) => {
  const date = toDateOrNull(value);
  if (!date) return "Not available";
  const options: Intl.DateTimeFormatOptions = {
    weekday: "short",
    month: "short",
    day: "numeric",
  };
  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  };
  return `${date.toLocaleDateString(
    "en-US",
    options
  )}, ${date.toLocaleTimeString("en-US", timeOptions)}`;
};

const extractId = (value: any): string | null => {
  if (!value && value !== "") return null;
  if (typeof value === "object") {
    if (typeof value.id === "string" && value.id.length > 0) return value.id;
    if (typeof value.path === "string") {
      const parts = value.path.split("/");
      return parts[parts.length - 1] || null;
    }
    return null;
  }
  if (typeof value === "string") {
    const trimmed = value.startsWith("/") ? value.slice(1) : value;
    const parts = trimmed.split("/");
    return parts[parts.length - 1] || null;
  }
  return null;
};

/* ---------------- EventCard ---------------- */
const EventCard = ({
  event,
  onPress,
  isSelected,
}: {
  event: Event;
  onPress: () => void;
  isSelected: boolean;
}) => {
  const saintId = extractId((event as any).saintId) ?? "";

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.card, isSelected && styles.selectedCard]}
    >
      <View style={styles.cardHeader}>
        <View
          style={[
            styles.tag,
            event.type === "Satsang" ? styles.tagSatsang : styles.tagPravachan,
          ]}
        >
          <Text style={styles.tagText}>{event.type}</Text>
        </View>
      </View>

      <Text style={styles.eventTitle}>{event.title ?? "Untitled event"}</Text>

      <View style={styles.infoRow}>
        <Feather name="user" size={16} color={Colors.light.mediumGray} />
        <Link href={`/saint/${saintId}`} asChild>
          <TouchableOpacity>
            <Text style={styles.saintLink}>{event.saintName ?? "Unknown"}</Text>
          </TouchableOpacity>
        </Link>
      </View>

      <View style={styles.infoRow}>
        <Feather name="calendar" size={16} color={Colors.light.mediumGray} />
        <Text style={styles.infoText}>{formatDate(event.dateTime)}</Text>
      </View>

      <View style={styles.infoRow}>
        <Feather name="map-pin" size={16} color={Colors.light.mediumGray} />
        <Text style={styles.infoText}>
          {event.address ?? "Address not available"}
        </Text>
      </View>

      <View style={styles.buttonContainer}>
        <Link href={`/event/${event.id}`} asChild>
          <TouchableOpacity style={styles.detailsButton}>
            <Text style={styles.detailsButtonText}>View Details</Text>
          </TouchableOpacity>
        </Link>
      </View>
    </TouchableOpacity>
  );
};

/* ---------------- Main screen ---------------- */
export default function EventsScreen() {
  const [allEvents, setAllEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<
    "All" | "Pravachan" | "Satsang"
  >("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [isVolunteer, setIsVolunteer] = useState<boolean>(false);

  const [addModalVisible, setAddModalVisible] = useState(false);
  const [adding, setAdding] = useState(false);

  // Form fields for add event
  const EVENT_TYPES = ["Pravachan", "Satsang", "Workshop"];
  const [evTitle, setEvTitle] = useState("");
  const [evType, setEvType] = useState(EVENT_TYPES[0]);
  const [evSaintId, setEvSaintId] = useState("");
  const [evSaintName, setEvSaintName] = useState("");
  const [evAddress, setEvAddress] = useState("");
  const [evDescription, setEvDescription] = useState("");
  const [evLatitude, setEvLatitude] = useState("");
  const [evLongitude, setEvLongitude] = useState("");
  const [evDate, setEvDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Saints for autocomplete (id + name)
  const [saintsList, setSaintsList] = useState<{ id: string; name: string }[]>(
    []
  );
  const [saintQuery, setSaintQuery] = useState("");
  const [showSaintSuggestions, setShowSaintSuggestions] = useState(false);

  const [checkingVolunteer, setCheckingVolunteer] = useState<boolean>(true);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        setCheckingVolunteer(true);
        if (user) {
          const userRef = doc(db, "users", user.uid);
          const userSnap = await getDoc(userRef);
          if (!userSnap.exists()) {
            setIsVolunteer(false);
          } else {
            const data = userSnap.data();
            setIsVolunteer(Boolean(data?.isVolunteer));
          }
        } else {
          setIsVolunteer(false);
        }
      } catch (err) {
        console.error("Error checking volunteer status:", err);
        setIsVolunteer(false);
      } finally {
        setCheckingVolunteer(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        const eventsCollectionRef = collection(db, "events");
        const querySnapshot = await getDocs(eventsCollectionRef);

        const eventsData = querySnapshot.docs
          .map((doc) => {
            const raw = doc.data() as any;

            let loc = null;
            if (raw?.locationGeo) {
              if (
                typeof raw.locationGeo.latitude === "number" &&
                typeof raw.locationGeo.longitude === "number"
              ) {
                loc = {
                  latitude: raw.locationGeo.latitude,
                  longitude: raw.locationGeo.longitude,
                };
              } else if (
                raw.locationGeo._latitude &&
                raw.locationGeo._longitude
              ) {
                loc = {
                  latitude: raw.locationGeo._latitude,
                  longitude: raw.locationGeo._longitude,
                };
              } else if (Array.isArray(raw.locationGeo)) {
                loc = {
                  latitude: raw.locationGeo[0],
                  longitude: raw.locationGeo[1],
                };
              }
            }

            const normalizedDate =
              raw?.dateTime?.toDate?.() ??
              (raw?.dateTime && typeof raw.dateTime.seconds === "number"
                ? new Date(
                    raw.dateTime.seconds * 1000 +
                      Math.round((raw.dateTime.nanoseconds ?? 0) / 1_000_000)
                  )
                : raw?.dateTime ?? null);

            const normalizedSaintId = raw?.saintId ?? raw?.saint ?? null;
            const normalizedSaintName = raw?.saintName ?? "";

            return {
              id: doc.id,
              title: raw?.title ?? "",
              type: raw?.type ?? "",
              saintId: normalizedSaintId,
              description: raw?.description ?? "",
              saintName: normalizedSaintName,
              dateTime: normalizedDate,
              address: raw?.address ?? "",
              locationGeo: loc,
            } as Event;
          })
          .filter(
            (event) =>
              event.locationGeo &&
              typeof event.locationGeo.latitude === "number"
          );

        setAllEvents(eventsData);
        setFilteredEvents(eventsData);
      } catch (error) {
        console.error("Error fetching events:", error);
      } finally {
        setLoading(false);
      }
    };

    const fetchSaints = async () => {
      try {
        const saintsRef = collection(db, "saint");
        const q = query(saintsRef, orderBy("name"));
        const snap = await getDocs(q);
        const arr: { id: string; name: string }[] = snap.docs.map((d) => {
          const data = d.data() as any;
          return { id: d.id, name: data.name ?? "" };
        });
        setSaintsList(arr);
      } catch (err) {
        console.error("Error loading saints list:", err);
      }
    };

    fetchEvents();
    fetchSaints();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          setIsVolunteer(false);
          return;
        }
        const uRef = doc(db, "users", user.uid);
        const snap = await getDoc(uRef);
        if (snap.exists()) {
          const data = snap.data() as any;
          setIsVolunteer(!!data.isVolunteer);
        } else {
          setIsVolunteer(false);
        }
      } catch (err) {
        console.error("Error checking volunteer status:", err);
        setIsVolunteer(false);
      }
    })();
  }, []);

  useEffect(() => {
    let processedEvents = allEvents;
    if (selectedFilter !== "All") {
      processedEvents = processedEvents.filter(
        (event) => event.type === selectedFilter
      );
    }
    if (searchQuery.trim() !== "") {
      const lowercasedQuery = searchQuery.toLowerCase();
      processedEvents = processedEvents.filter(
        (event) =>
          (event.title ?? "").toLowerCase().includes(lowercasedQuery) ||
          (event.saintName ?? "").toLowerCase().includes(lowercasedQuery) ||
          (event.address ?? "").toLowerCase().includes(lowercasedQuery)
      );
    }
    setFilteredEvents(processedEvents);
  }, [selectedFilter, searchQuery, allEvents]);

  const handleEventCardPress = (event: Event) => {
    setSelectedEventId(event.id);
    if (mapRef.current && event.locationGeo) {
      mapRef.current.animateToRegion(
        {
          latitude: event.locationGeo.latitude,
          longitude: event.locationGeo.longitude,
          latitudeDelta: 0.5,
          longitudeDelta: 0.5,
        },
        1000
      );
    }
  };

  /* ---------- Add Event: helpers ---------- */
  const resetAddForm = () => {
    setEvTitle("");
    setEvType(EVENT_TYPES[0]);
    setEvSaintId("");
    setEvSaintName("");
    setEvAddress("");
    setEvDescription("");
    setEvLatitude("");
    setEvLongitude("");
    setEvDate(null);
    setSaintQuery("");
    setShowSaintSuggestions(false);
  };

  const validateLatLon = (latS: string, lonS: string) => {
    const lat = Number(latS);
    const lon = Number(lonS);
    if (Number.isNaN(lat) || Number.isNaN(lon)) return false;
    if (lat < -90 || lat > 90) return false;
    if (lon < -180 || lon > 180) return false;
    return true;
  };

  const submitNewEvent = async () => {
    if (!evTitle.trim()) {
      Alert.alert("Missing title", "Please enter a title for the event.");
      return;
    }
    if (!evSaintId.trim() || !evSaintName.trim()) {
      Alert.alert("Missing saint", "Please select a saint from suggestions.");
      return;
    }
    if (!evAddress.trim()) {
      Alert.alert("Missing address", "Please enter the event address.");
      return;
    }
    if (!validateLatLon(evLatitude, evLongitude)) {
      Alert.alert(
        "Invalid coordinates",
        "Please provide valid latitude and longitude."
      );
      return;
    }
    if (!evDate) {
      Alert.alert(
        "Missing date/time",
        "Please pick a date and time for the event."
      );
      return;
    }

    setAdding(true);
    try {
      const eventsRef = collection(db, "events");
      const locationGeo = {
        latitude: Number(evLatitude),
        longitude: Number(evLongitude),
      };
      const saintIdPath = evSaintId.includes("/")
        ? evSaintId
        : `saint/${evSaintId}`;

      const payload: any = {
        title: evTitle.trim(),
        type: evType,
        saintId: saintIdPath,
        saintName: evSaintName.trim(),
        address: evAddress.trim(),
        description: evDescription.trim(),
        locationGeo,
        dateTime: evDate, // Firestore accepts JS Date
      };

      await addDoc(eventsRef, payload);

      Alert.alert("Success", "Event created.");
      // refresh events quickly
      const q = await getDocs(collection(db, "events"));
      const eventsData = q.docs
        .map((doc) => {
          const raw = doc.data() as any;
          let loc = null;
          if (raw?.locationGeo) {
            if (
              typeof raw.locationGeo.latitude === "number" &&
              typeof raw.locationGeo.longitude === "number"
            ) {
              loc = {
                latitude: raw.locationGeo.latitude,
                longitude: raw.locationGeo.longitude,
              };
            } else if (
              raw.locationGeo._latitude &&
              raw.locationGeo._longitude
            ) {
              loc = {
                latitude: raw.locationGeo._latitude,
                longitude: raw.locationGeo._longitude,
              };
            } else if (Array.isArray(raw.locationGeo)) {
              loc = {
                latitude: raw.locationGeo[0],
                longitude: raw.locationGeo[1],
              };
            }
          }
          const normalizedDate =
            raw?.dateTime?.toDate?.() ??
            (raw?.dateTime && typeof raw.dateTime.seconds === "number"
              ? new Date(
                  raw.dateTime.seconds * 1000 +
                    Math.round((raw.dateTime.nanoseconds ?? 0) / 1_000_000)
                )
              : raw?.dateTime ?? null);
          return {
            id: doc.id,
            title: raw?.title ?? "",
            type: raw?.type ?? "",
            saintId: raw?.saintId ?? null,
            description: raw?.description ?? "",
            saintName: raw?.saintName ?? "",
            dateTime: normalizedDate,
            address: raw?.address ?? "",
            locationGeo: loc,
          } as Event;
        })
        .filter(
          (event) =>
            event.locationGeo && typeof event.locationGeo.latitude === "number"
        );

      setAllEvents(eventsData);
      setFilteredEvents(eventsData);
      resetAddForm();
      setAddModalVisible(false);
    } catch (err) {
      console.error("Error creating event:", err);
      Alert.alert("Error", "Could not create event. Try again later.");
    } finally {
      setAdding(false);
    }
  };

  /* ---------- Saint autocomplete helpers ---------- */
  const onSaintQueryChange = (text: string) => {
    setSaintQuery(text);
    setEvSaintName(text);
    setShowSaintSuggestions(true);
    setEvSaintId("");
  };

  const selectSaintSuggestion = (id: string, name: string) => {
    setEvSaintId(id);
    setEvSaintName(name);
    setSaintQuery(name);
    setShowSaintSuggestions(false);
  };

  /* ---------- Date/time picker handlers ---------- */
  const onChangeDate = (event: any, selected?: Date) => {
    setShowDatePicker(false);
    if (selected) {
      if (evDate) {
        const newDate = new Date(selected);
        newDate.setHours(evDate.getHours(), evDate.getMinutes(), 0, 0);
        setEvDate(newDate);
      } else {
        setEvDate(selected);
      }
    }
  };

  const onChangeTime = (event: any, selected?: Date) => {
    setShowTimePicker(false);
    if (selected) {
      if (evDate) {
        const newDate = new Date(evDate);
        newDate.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
        setEvDate(newDate);
      } else {
        const now = new Date();
        now.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
        setEvDate(now);
      }
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <MaterialCommunityIcons
          name="calendar-star"
          size={24}
          color={Colors.light.white}
        />
        <Text style={styles.headerTitle}>Spiritual Events</Text>
      </View>

      <View style={styles.searchContainer}>
        <FontAwesome
          name="search"
          size={20}
          color={Colors.light.mediumGray}
          style={styles.searchIcon}
        />
        <TextInput
          placeholder="Search events, saints, or locations..."
          placeholderTextColor={Colors.light.mediumGray}
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

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
      >
        {filteredEvents.map((event) => (
          <Marker
            key={event.id}
            coordinate={{
              latitude: event.locationGeo.latitude,
              longitude: event.locationGeo.longitude,
            }}
            title={event.title ?? ""}
            description={event.address ?? ""}
            pinColor={
              selectedEventId === event.id ? Colors.light.saffron : Colors.light.maroon
            }
          />
        ))}
      </MapView>

      {checkingVolunteer ? (
        <View style={{ position: "absolute", bottom: 140, right: 20 }}>
          <ActivityIndicator size="small" color={Colors.light.saffron} />
        </View>
      ) : null}

      <View style={styles.listSection}>
        <View style={styles.filterContainer}>
          {["All", "Pravachan", "Satsang"].map((type) => (
            <TouchableOpacity
              key={type}
              style={[
                styles.filterButton,
                selectedFilter === type && styles.filterActive,
              ]}
              onPress={() =>
                setSelectedFilter(type as "All" | "Pravachan" | "Satsang")
              }
            >
              <Text
                style={[
                  styles.filterText,
                  selectedFilter === type && styles.filterActiveText,
                ]}
              >
                {type === "All" ? "All Events" : type}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <ActivityIndicator
            size="large"
            color={Colors.light.saffron}
            style={{ marginTop: 50 }}
          />
        ) : (
          <FlatList
            data={filteredEvents}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <EventCard
                event={item}
                onPress={() => handleEventCardPress(item)}
                isSelected={selectedEventId === item.id}
              />
            )}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}
            ListEmptyComponent={<Text style={styles.noEventsText}>No events found.</Text>}
            initialNumToRender={8}
          />
        )}
      </View>

      {/* FAB - volunteers only */}
      {isVolunteer && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => {
            setAddModalVisible(true);
          }}
          accessibilityLabel="Add Event"
        >
          <Feather name="plus" size={22} color={Colors.light.white} />
        </TouchableOpacity>
      )}

      {/* Add Event Modal */}
      <Modal
        visible={addModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setAddModalVisible(false)}
      >
        <View
          style={{
            flex: 1,
            padding: 16,
            backgroundColor: Colors.light.background,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 12,
            }}
          >
            <Text
              style={{
                fontSize: 20,
                fontWeight: "700",
                color: Colors.light.darkGray,
              }}
            >
              Create Event
            </Text>
            <TouchableOpacity
              onPress={() => setAddModalVisible(false)}
              disabled={adding}
            >
              <Feather name="x" size={24} color={Colors.light.mediumGray} />
            </TouchableOpacity>
          </View>

          {/* IMPORTANT: FlatList must include renderItem - we use a single dummy item and renderItem returns null.
              The form is provided in ListHeaderComponent so the list can scroll when content exceeds screen height.
          */}
          <FlatList
            data={[{ id: "form" }]}
            keyExtractor={(item) => item.id}
            renderItem={() => null}
            ListHeaderComponent={
              <>
                <TextInput
                  placeholder="Title"
                  value={evTitle}
                  onChangeText={setEvTitle}
                  style={styles.input}
                  placeholderTextColor={Colors.light.mediumGray}
                />

                <View style={{ marginBottom: 12 }}>
                  <Text
                    style={{
                      marginBottom: 6,
                      color: Colors.light.darkGray,
                      fontWeight: "600",
                    }}
                  >
                    Type
                  </Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                    {EVENT_TYPES.map((t) => (
                      <TouchableOpacity
                        key={t}
                        onPress={() => setEvType(t)}
                        style={[
                          styles.typeOption,
                          evType === t && styles.typeOptionActive,
                        ]}
                      >
                        <Text
                          style={[
                            evType === t
                              ? { color: "#fff", fontWeight: "700" }
                              : { color: Colors.light.darkGray },
                          ]}
                        >
                          {t}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={{ marginBottom: 12 }}>
                  <Text
                    style={{
                      marginBottom: 6,
                      color: Colors.light.darkGray,
                      fontWeight: "600",
                    }}
                  >
                    Saint
                  </Text>
                  <TextInput
                    placeholder="Type saint name..."
                    value={saintQuery}
                    onChangeText={onSaintQueryChange}
                    style={styles.input}
                    placeholderTextColor={Colors.light.mediumGray}
                    autoCorrect={false}
                    autoCapitalize="words"
                  />

                  {showSaintSuggestions && saintQuery.trim().length > 0 && (
                    <View style={styles.suggestionsBox}>
                      <FlatList
                        data={saintsList
                          .filter((s) =>
                            s.name.toLowerCase().includes(saintQuery.toLowerCase())
                          )
                          .slice(0, 8)}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item }) => (
                          <TouchableOpacity
                            style={styles.suggestionItem}
                            onPress={() =>
                              selectSaintSuggestion(item.id, item.name)
                            }
                          >
                            <Text style={{ color: Colors.light.darkGray }}>
                              {item.name}
                            </Text>
                          </TouchableOpacity>
                        )}
                        ListEmptyComponent={
                          <Text style={{ padding: 8, color: Colors.light.mediumGray }}>
                            No suggestions
                          </Text>
                        }
                        nestedScrollEnabled={true}
                        keyboardShouldPersistTaps="handled"
                        style={{ maxHeight: 180 }}
                      />
                    </View>
                  )}
                </View>

                {evSaintId ? (
                  <View style={{ marginBottom: 12 }}>
                    <Text style={{ color: Colors.light.mediumGray }}>
                      Selected: {evSaintName}
                    </Text>
                  </View>
                ) : null}

                <TextInput
                  placeholder="Address"
                  value={evAddress}
                  onChangeText={setEvAddress}
                  style={styles.input}
                  placeholderTextColor={Colors.light.mediumGray}
                />
                <TextInput
                  placeholder="Description"
                  value={evDescription}
                  onChangeText={setEvDescription}
                  style={[styles.input, { height: 100 }]}
                  placeholderTextColor={Colors.light.mediumGray}
                  multiline
                />

                <View
                  style={{ flexDirection: "row", justifyContent: "space-between" }}
                >
                  <TextInput
                    placeholder="Latitude (26.917)"
                    value={evLatitude}
                    onChangeText={setEvLatitude}
                    style={[styles.input, { flex: 1, marginRight: 8 }]}
                    placeholderTextColor={Colors.light.mediumGray}
                    keyboardType={
                      Platform.OS === "ios" ? "numbers-and-punctuation" : "numeric"
                    }
                  />
                  <TextInput
                    placeholder="Longitude (75.783)"
                    value={evLongitude}
                    onChangeText={setEvLongitude}
                    style={[styles.input, { flex: 1, marginLeft: 8 }]}
                    placeholderTextColor={Colors.light.mediumGray}
                    keyboardType={
                      Platform.OS === "ios" ? "numbers-and-punctuation" : "numeric"
                    }
                  />
                </View>

                <View style={{ marginTop: 12 }}>
                  <Text
                    style={{
                      marginBottom: 6,
                      color: Colors.light.darkGray,
                      fontWeight: "600",
                    }}
                  >
                    Date & Time
                  </Text>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <TouchableOpacity
                      style={[styles.dateButton, { marginRight: 8 }]}
                      onPress={() => setShowDatePicker(true)}
                    >
                      <Text style={{ color: Colors.light.darkGray }}>
                        {evDate ? evDate.toLocaleDateString() : "Pick date"}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.dateButton}
                      onPress={() => setShowTimePicker(true)}
                    >
                      <Text style={{ color: Colors.light.darkGray }}>
                        {evDate
                          ? evDate.toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "Pick time"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {showDatePicker && (
                  <DateTimePicker
                    value={evDate ?? new Date()}
                    mode="date"
                    display="default"
                    onChange={onChangeDate}
                  />
                )}
                {showTimePicker && (
                  <DateTimePicker
                    value={evDate ?? new Date()}
                    mode="time"
                    display="default"
                    onChange={onChangeTime}
                  />
                )}

                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    marginTop: 12,
                    marginBottom: 24,
                  }}
                >
                  <TouchableOpacity
                    style={[
                      styles.detailsButton,
                      { backgroundColor: Colors.light.lightGray },
                    ]}
                    onPress={() => {
                      resetAddForm();
                      setAddModalVisible(false);
                    }}
                    disabled={adding}
                  >
                    <Text style={{ color: Colors.light.darkGray }}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.detailsButton,
                      { backgroundColor: Colors.light.saffron },
                    ]}
                    onPress={submitNewEvent}
                    disabled={adding}
                  >
                    {adding ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={{ color: "#fff", fontWeight: "700" }}>
                        Create Event
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            }
            // empty list body; header holds form
          />
        </View>
      </Modal>
    </View>
  );
}

/* ---------------- Styles ---------------- */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF9F2" },
  header: {
    backgroundColor: Colors.light.saffron,
    padding: 20,
    paddingTop: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: Colors.light.white,
    fontSize: 20,
    fontWeight: "bold",
    marginLeft: 10,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.white,
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 16,
    paddingHorizontal: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  searchIcon: { marginRight: 12 },
  searchInput: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: Colors.light.darkGray,
  },
  map: {
    height: 200,
    marginTop: 16,
  },
  listSection: {
    flex: 1,
  },
  filterContainer: { flexDirection: "row", padding: 16 },
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
  filterText: { color: Colors.light.darkGray, fontWeight: "500" },
  filterActiveText: { color: Colors.light.white },
  card: {
    backgroundColor: Colors.light.white,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
    borderWidth: 2,
    borderColor: "transparent",
  },
  selectedCard: {
    borderColor: Colors.light.saffron,
  },
  cardHeader: { flexDirection: "row" },
  tag: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginBottom: 12,
  },
  tagPravachan: { backgroundColor: "#FFEAD5" },
  tagSatsang: { backgroundColor: "#FFDCE0" },
  tagText: { fontSize: 12, fontWeight: "600", color: Colors.light.saffron },
  eventTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.light.darkGray,
    marginBottom: 8,
  },
  infoRow: { flexDirection: "row", alignItems: "center", marginVertical: 6 },
  infoText: { marginLeft: 12, fontSize: 14, color: Colors.light.darkGray },
  saintLink: {
    marginLeft: 12,
    fontSize: 14,
    color: Colors.light.saffron,
    fontWeight: "600",
  },
  buttonContainer: {
    flexDirection: "row",
    marginTop: 16,
    justifyContent: "flex-end",
    borderTopWidth: 1,
    borderTopColor: "#eee",
    paddingTop: 16,
  },
  detailsButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: Colors.light.saffron,
    borderRadius: 20,
  },
  detailsButtonText: { color: Colors.light.saffron, fontWeight: "600" },
  noEventsText: {
    textAlign: "center",
    color: Colors.light.mediumGray,
    marginTop: 40,
    fontSize: 16,
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

  fab: {
    position: "absolute",
    bottom: 24,
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.light.saffron,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    elevation: 50,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
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
    maxHeight: 180,
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
