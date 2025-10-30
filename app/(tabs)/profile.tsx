import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Switch,
  Modal,
  TextInput,
  Pressable,
  Alert,
  SafeAreaView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import Colors from '../../constants/Colors';

// --- 1. SIMPLIFIED FIREBASE IMPORTS ---
// We only need the database (db) from your config
import { db } from '../../firebaseConfig'; 
// We only need 'addDoc' (to create a new document) and 'collection'
import { addDoc, collection } from 'firebase/firestore';

// --- 2. Volunteer Signup Modal (unchanged) ---
const VolunteerSignupModal = ({
  visible,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
}) => {
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [phone, setPhone] = useState('');
  const [designation, setDesignation] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = () => {
    if (!name || !city || !phone || !password) {
      Alert.alert('Missing Fields', 'Please fill out all required fields.');
      return;
    }
    
    onSubmit({ name, city, phone, designation, password });
    
    setName('');
    setCity('');
    setPhone('');
    setDesignation('');
    setPassword('');
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <View style={styles.modalContainer} onStartShouldSetResponder={() => true}>
          <Text style={styles.modalTitle}>Volunteer Signup</Text>
          <Text style={styles.modalSubtitle}>
            Join our team to help support the community.
          </Text>

          <TextInput
            placeholder="Full Name *"
            value={name}
            onChangeText={setName}
            style={styles.input}
            placeholderTextColor={Colors.light.mediumGray}
          />
          <TextInput
            placeholder="Residence City (Location) *" 
            value={city}
            onChangeText={setCity}
            style={styles.input}
            placeholderTextColor={Colors.light.mediumGray}
          />
          <TextInput
            placeholder="Phone No (this will be your username) *"
            value={phone}
            onChangeText={setPhone}
            style={styles.input}
            keyboardType="phone-pad"
            placeholderTextColor={Colors.light.mediumGray}
          />
          <TextInput
            placeholder="Designation (Optional)"
            value={designation}
            onChangeText={setDesignation}
            style={styles.input}
            placeholderTextColor={Colors.light.mediumGray}
          />
          <TextInput
            placeholder="Password *"
            value={password}
            onChangeText={setPassword}
            style={styles.input}
            secureTextEntry
            placeholderTextColor={Colors.light.mediumGray}
          />

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onClose={onClose}
            >
              <Text style={[styles.buttonText, styles.cancelButtonText]}>
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.submitButton]}
              onPress={handleSubmit}
            >
              <Text style={[styles.buttonText, styles.submitButtonText]}>
                Submit
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Pressable>
    </Modal>
  );
};


// ProfileSection Component
const ProfileSection = ({ title, children }: { title: string, children: React.ReactNode }) => (
    <View style={styles.section}>
        <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{title}</Text>
        </View>
        {children}
    </View>
);

// SettingRow Component
const SettingRow = ({ icon, text, hasSwitch, value, onValueChange, onPress }: { icon: any, text: string, hasSwitch?: boolean, value?: boolean, onValueChange?: () => void, onPress?: () => void }) => (
    <TouchableOpacity style={styles.row} onPress={onPress} disabled={hasSwitch}>
        <Feather name={icon} size={20} color={Colors.light.mediumGray} />
        <Text style={styles.rowText}>{text}</Text>
        {hasSwitch ? (
            <Switch
                trackColor={{ false: "#E9E9EA", true: Colors.light.saffron }}
                thumbColor={Colors.light.white}
                ios_backgroundColor="#3e3e3e"
                onValueChange={onValueChange}
                value={value}
            />
        ) : (
            <Feather name="chevron-right" size={20} color={Colors.light.mediumGray} />
        )}
    </TouchableOpacity>
);


// Main ProfileScreen Component
export default function ProfileScreen() {
  const [locationUpdates, setLocationUpdates] = useState(true);
  const [eventReminders, setEventReminders] = useState(true);
  const [newSaints, setNewSaints] = useState(false);
  
  const [modalVisible, setModalVisible] = useState(false);
  
  // --- 3. SIMPLIFIED SUBMIT HANDLER ---
  const handleVolunteerSubmit = async (data: any) => {
    try {
      // Step 1: Create a reference to the 'volunteers' collection
      const volunteersCollection = collection(db, 'volunteers');

      // Step 2: Add a new document with an auto-generated ID
      await addDoc(volunteersCollection, {
        // Your requested fields:
        name: data.name,
        location: data.city,
        phonenumber: data.phone,
        designation: data.designation,
        password: data.password, // Storing the password
        
        // System fields:
        isApproved: false, // For admin approval
        createdAt: new Date(),
      });

      // Success
      setModalVisible(false);
      Alert.alert(
        'Success',
        'Your volunteer application has been submitted for review.'
      );
    } catch (error: any) {
      console.error("Error submitting volunteer application: ", error);
      Alert.alert('Error', 'Could not submit your application.');
    }
  };
  

  return (
    <SafeAreaView style={{ flex: 1 }}> 
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Feather name="user" size={30} color={Colors.light.saffron} />
          </View>
          <Text style={styles.headerTitle}>Welcome, Devotee</Text>
          <Text style={styles.headerSubtitle}>Your spiritual journey companion</Text>
        </View>

        <ProfileSection title="Following (1)">
          <View style={styles.followedSaintCard}>
            <View style={styles.saintAvatar}>
              <Text style={styles.saintAvatarLetter}>M</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.saintName}>Mata Anandamayi</Text>
              <Text style={styles.lastSeen}>Last known • 15 days ago • by seva_team</Text>
            </View>
            <Text style={styles.followers}>2100 followers</Text>
          </View>
        </ProfileSection>

        <ProfileSection title="Notification Settings">
          <SettingRow icon="map-pin" text="Saint Location Updates" hasSwitch value={locationUpdates} onValueChange={() => setLocationUpdates(!locationUpdates)} />
          <SettingRow icon="bell" text="Event Reminders" hasSwitch value={eventReminders} onValueChange={() => setEventReminders(!eventReminders)} />
          <SettingRow icon="users" text="New Saints Nearby" hasSwitch value={newSaints} onValueChange={() => setNewSaints(!newSaints)} />
        </ProfileSection>

        <ProfileSection title="Settings">
          <SettingRow icon="edit-3" text="Edit Profile" onPress={() => {}} />
          <SettingRow icon="shield" text="Privacy Settings" onPress={() => {}} />
          <SettingRow icon="help-circle" text="Help & Support" onPress={() => {}} />
          <SettingRow
            icon="user-plus"
            text="Sign up as Volunteer"
            onPress={() => setModalVisible(true)}
          />
        </ProfileSection>

        <ProfileSection title="About Saint Locator">
          <Text style={styles.aboutText}>
            Saint Locator helps you connect with spiritual teachers...
          </Text>
        </ProfileSection>
        <Text style={styles.footerText}>Version 1.0.0</Text>

        <VolunteerSignupModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          onSubmit={handleVolunteerSubmit}
        />
        
      </ScrollView>
    </SafeAreaView>
  );
}

// --- Styles (Same as before) ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F7F7',
  },
  header: {
    backgroundColor: Colors.light.saffron,
    alignItems: 'center',
    padding: 24,
    paddingBottom: 48,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.light.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitle: {
    color: Colors.light.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    marginTop: 4,
  },
  section: {
    backgroundColor: Colors.light.white,
    marginHorizontal: 16,
    borderRadius: 12,
    marginTop: -24,
    marginBottom: 32,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.light.darkGray,
  },
  followedSaintCard: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
  },
  saintAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: Colors.light.saffron,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
  },
  saintAvatarLetter: {
      color: Colors.light.white,
      fontSize: 18,
      fontWeight: 'bold',
  },
  saintName: {
      fontSize: 15,
      fontWeight: '600',
      color: Colors.light.darkGray,
  },
  lastSeen: {
      fontSize: 12,
      color: Colors.light.mediumGray,
      marginTop: 2,
  },
  followers: {
      fontSize: 12,
      color: Colors.light.mediumGray,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
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
      textAlign: 'center',
      color: Colors.light.mediumGray,
      marginBottom: 32,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContainer: {
    width: '100%',
    backgroundColor: Colors.light.white,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.light.darkGray,
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: Colors.light.mediumGray,
    marginBottom: 20,
  },
  input: {
    backgroundColor: '#F7F7F7',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 12,
    color: Colors.light.darkGray,
    borderWidth: 1,
    borderColor: '#EFEFEF',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
  },
  button: {
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginLeft: 12,
  },
  cancelButton: {
    backgroundColor: 'transparent',
  },
  cancelButtonText: {
    color: Colors.light.mediumGray,
    fontSize: 15,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: Colors.light.saffron,
  },
  submitButtonText: {
    color: Colors.light.white,
    fontSize: 15,
    fontWeight: '600',
  },
});
