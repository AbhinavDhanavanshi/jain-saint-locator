import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, SafeAreaView, ActivityIndicator
} from 'react-native';
import { FontAwesome, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { Link } from 'expo-router';
import Colors from '../../constants/Colors';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebaseConfig';

// Updated Saint type
export type Saint = {
  id: string;
  name: string;
  designation: string;
  location: string;
  guruName: string;
  sect: string;
  about?: string;
  amber: string;
  groupLeader: string;
};

// ActionButton component is now updated to handle navigation
const ActionButton = ({ icon, label, href }: { icon: React.ReactNode; label: string; href?: string; }) => {
  const content = (
    <TouchableOpacity style={styles.actionButton} activeOpacity={0.7}>
      {icon}
      <Text style={styles.actionButtonText}>{label}</Text>
    </TouchableOpacity>
  );

  if (href) {
    return <Link href={href} asChild>{content}</Link>;
  }

  return content;
};

// SaintCard component with "View Details" button
const SaintCard = ({ saint }: { saint: Saint }) => (
    <View style={styles.card}>
        <View style={styles.cardHeader}>
            <View style={styles.avatar}>
                <Text style={styles.avatarLetter}>{saint.name ? saint.name.charAt(0) : 'S'}</Text>
            </View>
            <View style={styles.cardHeaderText}>
                <Text style={styles.saintName}>{saint.name}</Text>
                <Text style={styles.saintTitle}>{saint.designation}</Text>
            </View>
        </View>
        <View style={styles.cardBody}>
            <View style={styles.infoRow}>
                <Feather name="map-pin" size={16} color={Colors.light.mediumGray} />
                <Text style={styles.infoText}>{saint.location}</Text>
            </View>
            <View style={styles.infoRow}>
                <MaterialCommunityIcons name="meditation" size={16} color={Colors.light.mediumGray} />
                <Text style={styles.infoText}>Guru: {saint.guruName}</Text>
            </View>
        </View>
        <View style={styles.cardFooter}>
            <Link href={`/saint/${saint.id}`} asChild>
                <TouchableOpacity style={styles.detailsButton}>
                    <Text style={styles.detailsButtonText}>View Details</Text>
                </TouchableOpacity>
            </Link>
        </View>
    </View>
);


export default function HomeScreen() {
  const [allSaints, setAllSaints] = useState<Saint[]>([]); // Master list of saints
  const [filteredSaints, setFilteredSaints] = useState<Saint[]>([]); // Saints to display
  const [searchQuery, setSearchQuery] = useState(''); // Current search text
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Effect to fetch all saints from Firebase once
  useEffect(() => {
    const fetchSaints = async () => {
      try {
        const saintsCollectionRef = collection(db, 'saint');
        const querySnapshot = await getDocs(saintsCollectionRef);
        
        const saintsData = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                name: data.name || '',
                designation: data.designation || '',
                location: data.location || '',
                guruName: data.guruName || '',
                sect: data.sect || '',
                about: data.about || '',
                amber: data.Amber || data.amber || '', 
                groupLeader: data['Group Leader'] || data.groupLeader || '',
            };
        }) as Saint[];

        setAllSaints(saintsData);
        setFilteredSaints(saintsData); // Initially, display all saints
      } catch (err) {
        console.error("Error fetching saints: ", err);
        setError('Failed to fetch data from Firebase.');
      } finally {
        setLoading(false);
      }
    };

    fetchSaints();
  }, []);

  // Effect to filter saints whenever the search query changes
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredSaints(allSaints);
    } else {
      const lowercasedQuery = searchQuery.toLowerCase();
      const filtered = allSaints.filter(saint => 
        saint.name.toLowerCase().includes(lowercasedQuery) ||
        saint.location.toLowerCase().includes(lowercasedQuery) ||
        saint.designation.toLowerCase().includes(lowercasedQuery)
      );
      setFilteredSaints(filtered);
    }
  }, [searchQuery, allSaints]);


  const renderContent = () => {
    if (loading) {
      return <ActivityIndicator size="large" color={Colors.light.saffron} style={{ marginTop: 20 }} />;
    }
    if (error) {
      return <Text style={styles.errorText}>{error}</Text>;
    }
    if (filteredSaints.length === 0) {
        return <Text style={styles.noResultsText}>No saints found matching your search.</Text>;
    }
    return filteredSaints.map(saint => <SaintCard key={saint.id} saint={saint} />);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 20 }}>
        <View style={styles.searchContainer}>
          <FontAwesome name="search" size={20} color={Colors.light.mediumGray} style={styles.searchIcon} />
          <TextInput
            placeholder="Search saint, city, or location..."
            placeholderTextColor={Colors.light.mediumGray}
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery} // Link TextInput to state
          />
        </View>

        <View style={styles.actionsGrid}>
            <View style={styles.actionsRow}>
                <ActionButton icon={<Feather name="navigation" size={24} color={Colors.light.saffron} />} label="Find Near Me" />
                <ActionButton icon={<Feather name="users" size={24} color={Colors.light.saffron} />} label="Browse Saints" />
            </View>
              <View style={styles.actionsRow}>
                {/* Add href props for navigation */}
                <ActionButton icon={<Feather name="map" size={24} color={Colors.light.saffron} />} label="Map View" href="/map" />
                <ActionButton icon={<MaterialCommunityIcons name="calendar-star" size={24} color={Colors.light.saffron} />} label="Events" href="/events" />
            </View>
        </View>

        <View style={styles.listContainer}>
          <Text style={styles.listHeader}>Saints</Text>
          {renderContent()}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.light.background },
  container: { flex: 1 },
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
  searchIcon: { marginRight: 12 },
  searchInput: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: Colors.light.darkGray,
  },
  actionsGrid: { marginHorizontal: 16, marginTop: 8 },
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
  listContainer: { marginTop: 16, marginHorizontal: 16 },
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
  cardHeaderText: { flex: 1 },
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
  cardBody: {
    marginBottom: 16,
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
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 16,
    alignItems: 'flex-end',
  },
  detailsButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: Colors.light.saffron,
    borderRadius: 20,
  },
  detailsButtonText: {
    color: Colors.light.saffron,
    fontWeight: '600',
  },
  errorText: {
    textAlign: 'center',
    marginTop: 20,
    color: 'red',
    fontSize: 16,
  },
  noResultsText: {
      textAlign: 'center',
      marginTop: 20,
      fontSize: 16,
      color: Colors.light.mediumGray,
  }
});

