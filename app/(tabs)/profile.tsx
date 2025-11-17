// app/(tabs)/profile.tsx
import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Switch,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import Colors from "../../constants/Colors";

// FIREBASE imports (ensure firebaseConfig exports `auth` and `db`)
import { db, auth } from "../../firebaseConfig";
import {
  addDoc,
  collection,
  doc,
  updateDoc,
  serverTimestamp,
  setDoc,
  getDoc,
  DocumentReference,
} from "firebase/firestore";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";

// ---------- Auth Modal (Sign In / Sign Up) ----------
const AuthModal = ({
  visible,
  onSuccess,
}: {
  visible: boolean;
  onSuccess: () => void;
}) => {
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [city, setCity] = useState("");
  const [loading, setLoading] = useState(false);

  // Reset fields when mode changes or modal hides
  useEffect(() => {
    if (!visible) {
      setMode("signup");
      setDisplayName("");
      setEmail("");
      setPassword("");
      setCity("");
      setLoading(false);
    }
  }, [visible]);

  const handleSignUp = async () => {
    if (!displayName.trim() || !email.trim() || !password.trim()) {
      Alert.alert(
        "Missing fields",
        "Please provide display name, email and password."
      );
      return;
    }
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );
      // update auth profile displayName
      if (auth.currentUser) {
        try {
          await updateProfile(auth.currentUser, {
            displayName: displayName.trim(),
          });
        } catch (e) {
          console.warn("Failed to set displayName on auth profile", e);
        }
      }
      // create users doc
      const userDocRef = doc(db, "users", cred.user.uid);
      await setDoc(userDocRef, {
        displayName: displayName.trim(),
        email: email.trim(),
        followedSaints: [],
        isVolunteer: false,
        notificationSettings: {
          eventReminders: true,
          newSaintsNearby: false,
          saintLocationUpdates: true,
        },
        createdAt: serverTimestamp(),
        city: city.trim() ?? "",
      });
      Alert.alert("Welcome!", "Account created successfully.");
      onSuccess();
    } catch (err: any) {
      console.error("Sign up error", err);
      const message = err?.message ?? "Could not create account";
      Alert.alert("Sign up failed", message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Missing fields", "Please provide email and password.");
      return;
    }
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      // nothing else here; onSuccess after fetching user doc in parent
      onSuccess();
    } catch (err: any) {
      console.error("Sign in error", err);
      const message = err?.message ?? "Could not sign in";
      Alert.alert("Sign in failed", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={() => {
        /* non-dismissable */
      }}
    >
      <SafeAreaView style={authStyles.modalRoot}>
        <View style={authStyles.modalInner}>
          <Text style={authStyles.title}>
            {mode === "signup" ? "Create an account" : "Sign in"}
          </Text>
          <Text style={authStyles.subtitle}>
            {mode === "signup"
              ? "Sign up to save preferences and apply as volunteer."
              : "Sign in to access your profile."}
          </Text>

          {mode === "signup" && (
            <TextInput
              placeholder="Display Name"
              value={displayName}
              onChangeText={setDisplayName}
              style={authStyles.input}
              placeholderTextColor={Colors.light.mediumGray}
            />
          )}

          <TextInput
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            style={authStyles.input}
            placeholderTextColor={Colors.light.mediumGray}
          />
          <TextInput
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            style={authStyles.input}
            placeholderTextColor={Colors.light.mediumGray}
          />

          {mode === "signup" && (
            <TextInput
              placeholder="City (optional)"
              value={city}
              onChangeText={setCity}
              style={authStyles.input}
              placeholderTextColor={Colors.light.mediumGray}
            />
          )}

          <View style={authStyles.row}>
            <TouchableOpacity
              style={[
                authStyles.authButton,
                { backgroundColor: Colors.light.lightGray },
              ]}
              onPress={() => setMode(mode === "signup" ? "signin" : "signup")}
              disabled={loading}
            >
              <Text style={{ color: Colors.light.darkGray }}>
                {mode === "signup"
                  ? "Have an account? Sign in"
                  : "Don't have account? Sign up"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                authStyles.authButton,
                { backgroundColor: Colors.light.saffron },
              ]}
              onPress={mode === "signup" ? handleSignUp : handleSignIn}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={Colors.light.white} />
              ) : (
                <Text style={{ color: Colors.light.white, fontWeight: "700" }}>
                  {mode === "signup" ? "Register" : "Sign in"}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={{ marginTop: 16 }}>
            <Text style={{ color: Colors.light.mediumGray, fontSize: 12 }}>
              By continuing you agree to terms & privacy.
            </Text>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

// ---------- Volunteer Signup Modal (unchanged behavior) ----------
const VolunteerSignupModal = ({
  visible,
  onClose,
  onSubmit,
  submitting,
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    city: string;
    designation?: string;
    password: string;
  }) => void;
  submitting: boolean;
}) => {
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [designation, setDesignation] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (!visible) {
      setName("");
      setCity("");
      setDesignation("");
      setPassword("");
    }
  }, [visible]);

  const handleSubmit = () => {
    if (!name.trim() || !city.trim() || !password.trim()) {
      Alert.alert(
        "Missing fields",
        "Please fill name, city and password for volunteer application."
      );
      return;
    }
    onSubmit({
      name: name.trim(),
      city: city.trim(),
      designation: designation.trim(),
      password: password.trim(),
    });
  };

  return (
    <Modal
      animationType="slide"
      transparent={false}
      visible={visible}
      onRequestClose={() => {
        /* non-dismissable while visible if you prefer */
      }}
    >
      <SafeAreaView style={authStyles.modalRoot}>
        <View style={authStyles.modalInner}>
          <Text style={authStyles.title}>Volunteer Signup</Text>
          <Text style={authStyles.subtitle}>
            Join our team to help support the community.
          </Text>

          <TextInput
            placeholder="Full Name *"
            value={name}
            onChangeText={setName}
            style={authStyles.input}
            placeholderTextColor={Colors.light.mediumGray}
          />
          <TextInput
            placeholder="Residence City *"
            value={city}
            onChangeText={setCity}
            style={authStyles.input}
            placeholderTextColor={Colors.light.mediumGray}
          />
          <TextInput
            placeholder="Designation (optional)"
            value={designation}
            onChangeText={setDesignation}
            style={authStyles.input}
            placeholderTextColor={Colors.light.mediumGray}
          />
          <TextInput
            placeholder="Password to confirm *"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            style={authStyles.input}
            placeholderTextColor={Colors.light.mediumGray}
          />

          <View style={authStyles.row}>
            <TouchableOpacity
              style={[
                authStyles.authButton,
                { backgroundColor: Colors.light.lightGray },
              ]}
              onPress={onClose}
              disabled={submitting}
            >
              <Text style={{ color: Colors.light.darkGray }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                authStyles.authButton,
                { backgroundColor: Colors.light.saffron },
              ]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color={Colors.light.white} />
              ) : (
                <Text style={{ color: Colors.light.white, fontWeight: "700" }}>
                  Submit
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

// ---------- UI helpers ----------
const ProfileSection = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <View style={styles.section}>
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
    {children}
  </View>
);

const SettingRow = ({
  icon,
  text,
  hasSwitch,
  value,
  onValueChange,
  saving,
}: any) => (
  <TouchableOpacity
    style={styles.row}
    onPress={() => {}}
    disabled={!!hasSwitch}
  >
    <Feather name={icon} size={20} color={Colors.light.mediumGray} />
    <Text style={styles.rowText}>{text}</Text>
    {hasSwitch ? (
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        {saving ? (
          <ActivityIndicator size="small" style={{ marginRight: 8 }} />
        ) : null}
        <Switch
          trackColor={{ false: "#E9E9EA", true: Colors.light.saffron }}
          thumbColor={Colors.light.white}
          onValueChange={onValueChange}
          value={value}
        />
      </View>
    ) : (
      <Feather name="chevron-right" size={20} color={Colors.light.mediumGray} />
    )}
  </TouchableOpacity>
);

// ---------- Main ProfileScreen ----------
export default function ProfileScreen() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  const [showVolunteerModal, setShowVolunteerModal] = useState(false);
  const [submittingVolunteer, setSubmittingVolunteer] = useState(false);

  const [isVolunteer, setIsVolunteer] = useState<boolean | null>(null);

  // notification switches (local UI)
  const [locationUpdates, setLocationUpdates] = useState(true);
  const [eventReminders, setEventReminders] = useState(true);
  const [newSaints, setNewSaints] = useState(false);

  // per-switch saving indicators
  const [savingLocation, setSavingLocation] = useState(false);
  const [savingEventReminders, setSavingEventReminders] = useState(false);
  const [savingNewSaints, setSavingNewSaints] = useState(false);

  // On mount: check auth and load user doc only if signed in.
  useEffect(() => {
    (async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        // Force the auth modal. Block UI behind it by rendering modal full-screen.
        setShowAuthModal(true);
        setAuthChecked(true);
        return;
      }

      // If signed in, fetch user doc
      try {
        const uRef = doc(db, "users", currentUser.uid);
        const uSnap = await getDoc(uRef);
        if (uSnap.exists()) {
          const data = uSnap.data() as any;
          const settings = data.notificationSettings ?? {};
          setLocationUpdates(settings.saintLocationUpdates ?? true);
          setEventReminders(settings.eventReminders ?? true);
          setNewSaints(settings.newSaintsNearby ?? false);
          setIsVolunteer(!!data.isVolunteer);
        } else {
          // create minimal user doc if missing
          await setDoc(uRef, {
            displayName: currentUser.displayName ?? "",
            email: currentUser.email ?? "",
            followedSaints: [],
            isVolunteer: false,
            notificationSettings: {
              eventReminders: true,
              newSaintsNearby: false,
              saintLocationUpdates: true,
            },
            createdAt: serverTimestamp(),
          });
          setLocationUpdates(true);
          setEventReminders(true);
          setNewSaints(false);
          setIsVolunteer(false);
        }
      } catch (err) {
        console.error("Error loading user doc:", err);
      } finally {
        setAuthChecked(true);
      }
    })();
  }, []);

  // Called after successful auth (sign in or sign up). Will hide the auth modal and re-run fetch logic.
  const handleAuthSuccess = async () => {
    // hide the modal first
    setShowAuthModal(false);
    // re-fetch the user doc so we can populate settings
    const currentUser = auth.currentUser;
    if (!currentUser) {
      // should not happen, but if it does, reopen modal
      setShowAuthModal(true);
      return;
    }
    try {
      const uRef = doc(db, "users", currentUser.uid);
      const uSnap = await getDoc(uRef);
      if (uSnap.exists()) {
        const data = uSnap.data() as any;
        const settings = data.notificationSettings ?? {};
        setLocationUpdates(settings.saintLocationUpdates ?? true);
        setEventReminders(settings.eventReminders ?? true);
        setNewSaints(settings.newSaintsNearby ?? false);
        setIsVolunteer(!!data.isVolunteer);
      } else {
        // create minimal doc if missing
        await setDoc(uRef, {
          displayName: currentUser.displayName ?? "",
          email: currentUser.email ?? "",
          followedSaints: [],
          isVolunteer: false,
          notificationSettings: {
            eventReminders: true,
            newSaintsNearby: false,
            saintLocationUpdates: true,
          },
          createdAt: serverTimestamp(),
        });
        setLocationUpdates(true);
        setEventReminders(true);
        setNewSaints(false);
        setIsVolunteer(false);
      }
    } catch (err) {
      console.error("Error after auth success:", err);
    }
  };

  // Volunteer submit
  const handleVolunteerSubmit = async (data: {
    name: string;
    city: string;
    designation?: string;
    password: string;
  }) => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      Alert.alert(
        "Not signed in",
        "You must be signed in to apply as a volunteer."
      );
      setShowAuthModal(true);
      return;
    }
    setSubmittingVolunteer(true);
    try {
      const userRef = doc(db, "users", currentUser.uid);
      const volunteersCollection = collection(db, "volunteers");
      await addDoc(volunteersCollection, {
        name: data.name,
        location: data.city,
        designation: data.designation ?? "",
        password: data.password, // note: storing raw password is insecure; replace with secure flow later
        isApproved: false,
        createdAt: serverTimestamp(),
        userID: userRef as DocumentReference,
      });
      await updateDoc(userRef, {
        isVolunteer: true,
        volunteerAppliedAt: serverTimestamp(),
      });
      setIsVolunteer(true);
      setShowVolunteerModal(false);
      Alert.alert(
        "Application submitted",
        "Volunteer application submitted for review."
      );
    } catch (err) {
      console.error("Volunteer submit error", err);
      Alert.alert(
        "Error",
        "Could not submit volunteer application. Try again later."
      );
    } finally {
      setSubmittingVolunteer(false);
    }
  };

  // ---------- Notification persistence ----------
  const updateNotificationSetting = async (
    key: "saintLocationUpdates" | "eventReminders" | "newSaintsNearby",
    value: boolean
  ) => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      Alert.alert("Sign in required", "Please sign in to change settings.");
      setShowAuthModal(true);
      return;
    }

    const userRef = doc(db, "users", currentUser.uid);
    const savingSetter =
      key === "saintLocationUpdates"
        ? setSavingLocation
        : key === "eventReminders"
        ? setSavingEventReminders
        : setSavingNewSaints;
    savingSetter(true);
    try {
      await updateDoc(userRef, {
        [`notificationSettings.${key}`]: value,
      });
    } catch (err) {
      console.error("Failed to update notification setting", key, err);
      Alert.alert("Error", "Could not save your preference. Try again.");
    } finally {
      savingSetter(false);
    }
  };

  const onToggleLocation = async () => {
    const next = !locationUpdates;
    setLocationUpdates(next);
    await updateNotificationSetting("saintLocationUpdates", next);
  };
  const onToggleEventReminders = async () => {
    const next = !eventReminders;
    setEventReminders(next);
    await updateNotificationSetting("eventReminders", next);
  };
  const onToggleNewSaints = async () => {
    const next = !newSaints;
    setNewSaints(next);
    await updateNotificationSetting("newSaintsNearby", next);
  };

  // If auth check hasn't completed yet, show loader (rare)
  if (!authChecked) {
    return (
      <SafeAreaView
        style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
      >
        <ActivityIndicator size="large" color={Colors.light.saffron} />
      </SafeAreaView>
    );
  }

  // If auth modal should be shown, render only the modal (blocks background content)
  if (showAuthModal) {
    return (
      <>
        <AuthModal visible={true} onSuccess={handleAuthSuccess} />
      </>
    );
  }

  // ---------- Normal profile UI (user is authenticated & user doc loaded) ----------
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F7F7F7" }}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Feather name="user" size={30} color={Colors.light.saffron} />
          </View>
          <Text style={styles.headerTitle}>
            {auth.currentUser?.displayName ?? "Welcome, Devotee"}
          </Text>
          <Text style={styles.headerSubtitle}>
            Your spiritual journey companion
          </Text>
        </View>

        {/* Prominent Volunteer CTA */}
        <View style={styles.volunteerCardWrapper}>
          <View style={styles.volunteerCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.volunteerTitle}>Become a Volunteer</Text>
              <Text style={styles.volunteerSub}>
                Help keep the community informed and support local events. Sign
                up now!
              </Text>
            </View>

            <View style={styles.volunteerActions}>
              {isVolunteer ? (
                <View style={styles.volunteerState}>
                  <Feather
                    name="check-circle"
                    size={20}
                    color={Colors.light.saffron}
                  />
                  <Text style={styles.volunteerStateText}>
                    You're a volunteer
                  </Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.volunteerButton}
                  onPress={() => setShowVolunteerModal(true)}
                >
                  <Text style={styles.volunteerButtonText}>Sign up</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        <ProfileSection title="Following (1)">
          <View style={styles.followedSaintCard}>
            <View style={styles.saintAvatar}>
              <Text style={styles.saintAvatarLetter}>M</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.saintName}>Mata Anandamayi</Text>
              <Text style={styles.lastSeen}>
                Last known • 15 days ago • by seva_team
              </Text>
            </View>
            <Text style={styles.followers}>2100 followers</Text>
          </View>
        </ProfileSection>

        <ProfileSection title="Notification Settings">
          <SettingRow
            icon="map-pin"
            text="Saint Location Updates"
            hasSwitch
            value={locationUpdates}
            onValueChange={onToggleLocation}
            saving={savingLocation}
          />
          <SettingRow
            icon="bell"
            text="Event Reminders"
            hasSwitch
            value={eventReminders}
            onValueChange={onToggleEventReminders}
            saving={savingEventReminders}
          />
          <SettingRow
            icon="users"
            text="New Saints Nearby"
            hasSwitch
            value={newSaints}
            onValueChange={onToggleNewSaints}
            saving={savingNewSaints}
          />
        </ProfileSection>

        <ProfileSection title="Settings">
          <SettingRow icon="edit-3" text="Edit Profile" />
          <SettingRow icon="shield" text="Privacy Settings" />
          <SettingRow icon="help-circle" text="Help & Support" />
          <SettingRow icon="user-plus" text="Sign up as Volunteer" />
        </ProfileSection>

        <ProfileSection title="About Saint Locator">
          <Text style={styles.aboutText}>
            Saint Locator helps you connect with spiritual teachers, track
            events, and join local volunteer efforts.
          </Text>
        </ProfileSection>

        <Text style={styles.footerText}>Version 1.0.0</Text>

        <VolunteerSignupModal
          visible={showVolunteerModal}
          onClose={() => setShowVolunteerModal(false)}
          onSubmit={handleVolunteerSubmit}
          submitting={submittingVolunteer}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------- Styles ----------
const authStyles = StyleSheet.create({
  modalRoot: { flex: 1, backgroundColor: Colors.light.background },
  modalInner: { padding: 24, flex: 1, justifyContent: "center" },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: Colors.light.darkGray,
    marginBottom: 8,
  },
  subtitle: { fontSize: 14, color: Colors.light.mediumGray, marginBottom: 16 },
  input: {
    backgroundColor: "#F7F7F7",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 12,
    color: Colors.light.darkGray,
    borderWidth: 1,
    borderColor: "#EFEFEF",
  },
  row: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  authButton: {
    flex: 1,
    marginHorizontal: 6,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F7F7" },
  header: {
    backgroundColor: Colors.dark.saffron,
    alignItems: "center",
    marginTop: 0,
    padding: 24,
    paddingBottom: 48,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.light.white,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  headerTitle: { color: Colors.light.white, fontSize: 18, fontWeight: "bold" },
  headerSubtitle: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
    marginTop: 4,
  },

  // Volunteer CTA
  volunteerCardWrapper: {
    marginHorizontal: 16,
    marginTop: -24,
    marginBottom: 12,
  },
  volunteerCard: {
    backgroundColor: Colors.light.white,
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  volunteerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.light.darkGray,
    marginBottom: 6,
  },
  volunteerSub: {
    color: Colors.light.mediumGray,
    fontSize: 13,
    maxWidth: "78%",
  },
  volunteerActions: {
    marginLeft: 12,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  volunteerButton: {
    backgroundColor: Colors.light.saffron,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  volunteerButtonText: { color: Colors.light.white, fontWeight: "700" },
  volunteerState: { flexDirection: "row", alignItems: "center" },
  volunteerStateText: {
    marginLeft: 6,
    color: Colors.light.saffron,
    fontWeight: "700",
  },

  section: {
    backgroundColor: Colors.light.white,
    marginHorizontal: 16,
    borderRadius: 12,
    marginTop: 12,
    marginBottom: 32,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: Colors.light.darkGray,
  },

  followedSaintCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  saintAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.light.saffron,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  saintAvatarLetter: {
    color: Colors.light.white,
    fontSize: 18,
    fontWeight: "bold",
  },
  saintName: { fontSize: 15, fontWeight: "600", color: Colors.light.darkGray },
  lastSeen: { fontSize: 12, color: Colors.light.mediumGray, marginTop: 2 },
  followers: { fontSize: 12, color: Colors.light.mediumGray },

  row: { flexDirection: "row", alignItems: "center", paddingVertical: 14 },
  rowText: {
    flex: 1,
    marginLeft: 16,
    fontSize: 15,
    color: Colors.light.darkGray,
  },

  aboutText: {
    fontSize: 14,
    color: Colors.light.mediumGray,
    lineHeight: 20,
    paddingVertical: 8,
  },
  footerText: {
    textAlign: "center",
    color: Colors.light.mediumGray,
    marginBottom: 32,
  },
});
