import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Colors from '../../constants/Colors';

const ProfileSection = ({ title, children }: { title: string, children: React.ReactNode }) => (
    <View style={styles.section}>
        <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{title}</Text>
        </View>
        {children}
    </View>
);

const SettingRow = ({ icon, text, hasSwitch, value, onValueChange }: { icon: any, text: string, hasSwitch?: boolean, value?: boolean, onValueChange?: () => void }) => (
    <TouchableOpacity style={styles.row}>
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

export default function ProfileScreen() {
  const [locationUpdates, setLocationUpdates] = React.useState(true);
  const [eventReminders, setEventReminders] = React.useState(true);
  const [newSaints, setNewSaints] = React.useState(false);

  return (
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
        <SettingRow icon="edit-3" text="Edit Profile" />
        <SettingRow icon="shield" text="Privacy Settings" />
        <SettingRow icon="help-circle" text="Help & Support" />
      </ProfileSection>

      <ProfileSection title="About Saint Locator">
        <Text style={styles.aboutText}>
          Saint Locator helps you connect with spiritual teachers and stay updated on their journeys, events, and teachings. Find peace, wisdom, and community through our platform.
        </Text>
      </ProfileSection>
      <Text style={styles.footerText}>Version 1.0.0</Text>
    </ScrollView>
  );
}

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
    marginTop: -24, // Overlap effect
    marginBottom: 32,
    padding: 16,
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
  }
});
