import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { NavigationContainer, DefaultTheme, type Theme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import { LoginScreen } from './src/screens/auth/LoginScreen';
import { RegisterScreen } from './src/screens/auth/RegisterScreen';
import { AppShell } from './src/navigation/AppShell';
import { theme } from './src/theme';
import type { AuthStackParamList, RootStackParamList } from './src/navigation/types';

const RootStack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();

/** The app never shows a default header; each page draws its own PageHeader. */
const screenOptions = {
  headerShown: false,
  contentStyle: { backgroundColor: theme.colors.canvas },
} as const;

const navigationTheme: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: theme.colors.canvas,
    card: theme.colors.white,
    border: theme.colors.line,
    primary: theme.colors.mint[500],
    text: theme.colors.ink[900],
  },
};

function AuthFlow() {
  return (
    <AuthStack.Navigator screenOptions={screenOptions}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
  );
}

function RootNavigator() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color={theme.colors.mint[500]} />
      </View>
    );
  }

  return (
    <RootStack.Navigator screenOptions={screenOptions}>
      {isAuthenticated ? (
        <RootStack.Screen name="Main" component={AppShell} />
      ) : (
        <RootStack.Screen name="Auth" component={AuthFlow} />
      )}
    </RootStack.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer theme={navigationTheme}>
          <StatusBar style="dark" />
          <RootNavigator />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.canvas,
  },
});
