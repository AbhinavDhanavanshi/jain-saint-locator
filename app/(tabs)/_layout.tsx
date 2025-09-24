import React from 'react';
import { Tabs } from 'expo-router';
import { FontAwesome, MaterialIcons } from '@expo/vector-icons';
import Colors from '../../constants/Colors';
import { useColorScheme } from 'react-native';

// You can explore the built-in icon families and icons on the web at https://icons.expo.fyi/
function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={28} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.saffron,
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopWidth: 0,
          elevation: 5,
          shadowOpacity: 0.1,
        },
        headerStyle: {
          backgroundColor: colors.saffron,
        },
        headerTintColor: colors.white,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Saint Locator',
          tabBarIcon: ({ color }) => <TabBarIcon name="home" color={color} />,
          tabBarLabel: 'Home',
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: 'Map View',
          tabBarIcon: ({ color }) => <TabBarIcon name="map" color={color} />,
          tabBarLabel: 'Map',
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: 'Events',
          tabBarIcon: ({ color }) => <MaterialIcons name="event" size={28} color={color} style={{ marginBottom: -3 }} />,
          tabBarLabel: 'Events',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <TabBarIcon name="user" color={color} />,
          tabBarLabel: 'Profile',
        }}
      />
    </Tabs>
  );
}

