import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, Stack, Link } from 'expo-router';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import Colors from '../../constants/Colors';
import { db } from '../../firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';

// Define the full Saint type to match your Firestore data
// This should eventually be moved to a shared types file
export type Saint = {
  id: string;
  name: string;
  designation: string;
  location: string;
  guruName: string;
  sect: string;
  about: string;
  dateOfDiksha: string;
  gender: string;
  amber: string;
  groupLeader: string;
};

// A reusable component for displaying a piece of information
const InfoRow = ({ icon, label, value }: { icon: any, label: string, value: string | undefined }) => (
    <View style={styles.infoRow}>
        <Feather name={icon} size={20} color={Colors.light.mediumGray} style={styles.infoIcon} />
        <View>
            <Text style={styles.infoLabel}>{label}</Text>
            <Text style={styles.infoValue}>{value || 'Not available'}</Text>
        </View>
    </View>
);


export default function SaintProfileScreen() {
  const { id } = useLocalSearchParams();
  const [saint, setSaint] = useState<Saint | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id || typeof id !== 'string') return;

    const fetchSaintDetails = async () => {
      try {
        const saintDocRef = doc(db, 'saint', id);
        const docSnap = await getDoc(saintDocRef);

        if (docSnap.exists()) {
          setSaint({ id: docSnap.id, ...docSnap.data() } as Saint);
        } else {
          console.log("No such document!");
        }
      } catch (error) {
        console.error("Error fetching saint details:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSaintDetails();
  }, [id]);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={Colors.light.saffron} /></View>;
  }

  if (!saint) {
    return <View style={styles.center}><Text>Saint not found.</Text></View>;
  }

  return (
    <>
      {/* This configures the header for this specific screen */}
      <Stack.Screen options={{ title: saint.name, headerBackTitle: 'Back' }} />
      <ScrollView style={styles.container}>
        <View style={styles.header}>
            <View style={styles.avatar}>
                <Text style={styles.avatarLetter}>{saint.name.charAt(0)}</Text>
            </View>
            <Text style={styles.name}>{saint.name}</Text>
            <Text style={styles.designation}>{saint.designation}</Text>
            <TouchableOpacity style={styles.followButton}>
                <Text style={styles.followButtonText}>Follow</Text>
            </TouchableOpacity>
        </View>
        
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.aboutText}>{saint.about || 'No information available.'}</Text>
        </View>

        <View style={styles.section}>
            <Text style={styles.sectionTitle}>Details</Text>
            <InfoRow icon="user" label="Guru Name" value={saint.guruName} />
            <InfoRow icon="book-open" label="Sect" value={saint.sect} />
            <InfoRow icon="calendar" label="Date of Diksha" value={saint.dateOfDiksha} />
            <InfoRow icon="info" label="Gender" value={saint.gender} />
            <InfoRow icon="shield" label="Amber" value={saint.amber} />
            <InfoRow icon="users" label="Group Leader" value={saint['groupLeader']} />
        </View>

      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F7F7F7',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        backgroundColor: Colors.light.white,
        alignItems: 'center',
        padding: 24,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: Colors.light.saffron,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    avatarLetter: {
        color: Colors.light.white,
        fontSize: 36,
        fontWeight: 'bold',
    },
    name: {
        fontSize: 22,
        fontWeight: 'bold',
        color: Colors.light.darkGray,
    },
    designation: {
        fontSize: 16,
        color: Colors.light.mediumGray,
        marginTop: 4,
        marginBottom: 16,
    },
    followButton: {
        backgroundColor: Colors.light.saffron,
        paddingVertical: 10,
        paddingHorizontal: 30,
        borderRadius: 20,
    },
    followButtonText: {
        color: Colors.light.white,
        fontWeight: 'bold',
        fontSize: 16,
    },
    section: {
        backgroundColor: Colors.light.white,
        marginTop: 12,
        padding: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.light.darkGray,
        marginBottom: 16,
    },
    aboutText: {
        fontSize: 15,
        lineHeight: 22,
        color: Colors.light.darkGray,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 20,
    },
    infoIcon: {
        marginRight: 16,
        marginTop: 2,
    },
    infoLabel: {
        fontSize: 13,
        color: Colors.light.mediumGray,
        marginBottom: 2,
    },
    infoValue: {
        fontSize: 15,
        color: Colors.light.darkGray,
        fontWeight: '500',
    }
});
// ```

// ***

// ### Step 2: Link the "View Details" Buttons

// Now, you need to update your **Home Screen** and **Map Screen** so the "View Details" button navigates to this new profile page.

// You'll need to import the `<Link>` component from `expo-router` and wrap your `TouchableOpacity` with it.

// #### **In `app/(tabs)/index.tsx`:**

// 1.  Add `Link` to your imports:
//     `import { Link } from 'expo-router';`
// 2.  Find your `SaintCard` component.
// 3.  Wrap the entire card in a `<Link>` component. Pass the saint's ID in the `href`.

//     ```jsx
//     // In app/(tabs)/index.tsx

//     const SaintCard = ({ saint }: { saint: Saint }) => (
//       <Link href={`/saint/${saint.id}`} asChild>
//         <TouchableOpacity>
//           {/* ... Keep the entire <View style={styles.card}> ... content here ... */}
//         </TouchableOpacity>
//       </Link>
//     );
//     ```

// #### **In `app/(tabs)/map.tsx`:**

// 1.  Add `Link` to your imports:
//     `import { Link } from 'expo-router';`
// 2.  Find your `SaintMapCard` component.
// 3.  Wrap the "View Details" `TouchableOpacity` in a `<Link>` component.

//     ```jsx
//     // In app/(tabs)/map.tsx

//     const SaintMapCard = ({ saint }: { saint: SaintOnMap }) => (
//       <View style={styles.saintCard}>
//         {/* ... saintIcon and saintInfo views ... */}
//         <Link href={`/saint/${saint.id}`} asChild>
//           <TouchableOpacity style={styles.detailsButton}>
//               <Text style={styles.detailsButtonText}>View Details</Text>
//           </TouchableOpacity>
//         </Link>
//       </View>
//     );
    
