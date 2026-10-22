import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import {
  DefaultTheme,
  NavigationContainer,
  type Theme,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from './types';
import { useAuth } from '../context/AuthContext';
import { colors, fonts } from '../theme';
import { BrandMark } from '../components/BrandMark';
import { LoginScreen } from '../screens/LoginScreen';
import { DashboardScreen } from '../screens/DashboardScreen';
import { AddLoanScreen } from '../screens/AddLoanScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

const navigationTheme: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.forest,
    background: colors.paper,
    card: colors.paper,
    text: colors.ink,
    border: colors.border,
    notification: colors.coral,
  },
};

const BootScreen = () => (
  <View style={styles.boot}>
    <BrandMark size={54} />
    <Text style={styles.bootTitle}>MiniLedger</Text>
    <ActivityIndicator color={colors.forest} style={styles.spinner} />
  </View>
);

export const RootNavigator = () => {
  const { status } = useAuth();

  if (status === 'loading') return <BootScreen />;

  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.paper },
          animation: 'slide_from_right',
        }}
      >
        {status === 'signedIn' ? (
          <>
            <Stack.Screen name="Dashboard" component={DashboardScreen} />
            <Stack.Screen
              name="AddLoan"
              component={AddLoanScreen}
              options={{
                presentation: 'modal',
                animation: 'slide_from_bottom',
                gestureEnabled: true,
              }}
            />
          </>
        ) : (
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ animation: 'fade' }}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    backgroundColor: colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  bootTitle: {
    fontFamily: fonts.displaySemibold,
    fontSize: 20,
    letterSpacing: -0.4,
    color: colors.ink,
  },
  spinner: { marginTop: 8 },
});
