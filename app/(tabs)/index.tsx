import React from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, SafeAreaView, StatusBar } from 'react-native';
import { FontAwesome, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import Colors from '../../constants/Colors';

// Dummy data for nearby saints
const nearbySaints = [
  {
    id: '1',
    name: 'Sant Ramesh Das',
    title: 'Spiritual Guide',
    location: 'Varanasi, Uttar Pradesh',
    lastSeen: '15 days ago • by ashram_coordinator',
    followers: 1250,
    isFollowing: false,
  },
  {
    id: '2',
    name: 'Mata Anandamayi',
    title: 'Divine Mother',
    location: 'Vrindavan, Uttar Pradesh',
    lastSeen: '15 days ago • by seva_team',
    followers: 2100,
    isFollowing: true,
  },
];

// Reusable component for the Quick Action buttons
const ActionButton = ({ icon, label }: { icon: React.ReactNode; label: string }) => (
  <TouchableOpacity style={styles.actionButton}>
    {icon}
    <Text style={styles.actionButtonText}>{label}</Text>
  </TouchableOpacity>
);

// Reusable component for the Saint information cards
const SaintCard = ({ saint }: { saint: typeof nearbySaints[0] }) => (
    <View style={styles.card}>
        <View style={styles.cardHeader}>
            <View style={styles.avatar}>
                <Text style={styles.avatarLetter}>{saint.name.charAt(0)}</Text>
            </View>
            <View style={styles.cardHeaderText}>
                <Text style={styles.saintName}>{saint.name}</Text>
                <Text style={styles.saintTitle}>{saint.title}</Text>
            </View>
            {saint.isFollowing && (
                <View style={styles.followingChip}>
                    <Text style={styles.followingText}>Following</Text>
                </View>
            )}
        </View>
        <View style={styles.cardBody}>
            <View style={styles.infoRow}>
                <Feather name="map-pin" size={16} color={Colors.light.mediumGray} />
                <Text style={styles.infoText}>{saint.location}</Text>
            </View>
            <View style={styles.infoRow}>
                <Feather name="clock" size={16} color={Colors.light.mediumGray} />
                <Text style={styles.infoText}>Last known • {saint.lastSeen}</Text>
            </View>
            <View style={styles.infoRow}>
                <Feather name="users" size={16} color={Colors.light.mediumGray} />
                <Text style={styles.infoText}>{saint.followers.toLocaleString()} followers</Text>
            </View>
        </View>
    </View>
);


export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 20 }}>
        <StatusBar barStyle="light-content" />

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <FontAwesome name="search" size={20} color={Colors.light.mediumGray} style={styles.searchIcon} />
          <TextInput
            placeholder="Search saint, city, or location..."
            placeholderTextColor={Colors.light.mediumGray}
            style={styles.searchInput}
          />
        </View>

        {/* Quick Actions Grid */}
        <View style={styles.actionsGrid}>
            <View style={styles.actionsRow}>
                <ActionButton icon={<Feather name="navigation" size={24} color={Colors.light.saffron} />} label="Find Near Me" />
                <ActionButton icon={<Feather name="users" size={24} color={Colors.light.saffron} />} label="Browse Saints" />
            </View>
             <View style={styles.actionsRow}>
                <ActionButton icon={<Feather name="map" size={24} color={Colors.light.saffron} />} label="Map View" />
                <ActionButton icon={<MaterialCommunityIcons name="calendar-star" size={24} color={Colors.light.saffron} />} label="Events" />
            </View>
        </View>

        {/* Nearby Saints List */}
        <View style={styles.listContainer}>
          <Text style={styles.listHeader}>Nearby Saints</Text>
          {nearbySaints.map(saint => (
            <SaintCard key={saint.id} saint={saint} />
          ))}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  container: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.white,
    borderRadius: 12,
    margin: 16,
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
  actionsGrid: {
    marginHorizontal: 16,
    marginTop: 8,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.white,
    paddingVertical: 20,
    borderRadius: 12,
    marginHorizontal: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  actionButtonText: {
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.darkGray,
  },
  listContainer: {
    marginTop: 16,
    marginHorizontal: 16,
  },
  listHeader: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.light.darkGray,
    marginBottom: 16,
  },
  card: {
    backgroundColor: Colors.light.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.light.saffron,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarLetter: {
    color: Colors.light.white,
    fontSize: 22,
    fontWeight: 'bold',
  },
  cardHeaderText: {
    flex: 1,
  },
  saintName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.light.darkGray,
  },
  saintTitle: {
    fontSize: 14,
    color: Colors.light.mediumGray,
    marginTop: 2,
  },
  followingChip: {
    backgroundColor: '#FFF0D4',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: Colors.light.saffron,
  },
  followingText: {
    color: Colors.light.saffron,
    fontWeight: '600',
    fontSize: 12,
  },
  cardBody: {
    // Add styles if needed
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  infoText: {
    marginLeft: 12,
    fontSize: 14,
    color: Colors.light.mediumGray,
  },
});
