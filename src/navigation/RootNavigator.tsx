import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';

import {HomeScreen} from '../screens/HomeScreen';
import {HistoryScreen} from '../screens/HistoryScreen';

export type RootStackParamList = {
  Home: undefined;
  History: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {backgroundColor: '#111827'},
          headerTintColor: '#fff',
          headerTitleStyle: {fontWeight: '700'},
        }}>
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{title: 'Attendance'}}
        />
        <Stack.Screen
          name="History"
          component={HistoryScreen}
          options={{title: 'Attendance history'}}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
