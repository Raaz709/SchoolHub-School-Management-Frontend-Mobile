import React, { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { navItemsForRole } from '../../navigation/navItems';
import { useAppNavigation } from '../../navigation/NavigationContext';
import { useAuth } from '../../context/AuthContext';
import { theme } from '../../theme';
import { Icon } from '../Icon';
import type { RouteId } from '../../navigation/types';

const PANEL_WIDTH = 268;

/** The website's sidebar, rebuilt as a slide-in drawer. */
export function Drawer() {
  const { user } = useAuth();
  const { activeId, navigate, drawerOpen, closeDrawer } = useAppNavigation();
  const insets = useSafeAreaInsets();
  const items = useMemo(() => navItemsForRole(user?.role), [user?.role]);

  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: drawerOpen ? 1 : 0,
      duration: theme.transitions.normal,
      useNativeDriver: true,
    }).start();
  }, [drawerOpen, progress]);

  if (!drawerOpen) return null;

  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-PANEL_WIDTH, 0],
  });

  const screenWidth = Dimensions.get('window').width;
  const maxWidth = Math.min(PANEL_WIDTH, screenWidth * 0.82);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View style={[styles.backdrop, { opacity: progress }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={closeDrawer} />
      </Animated.View>

      <Animated.View
        style={[
          styles.panel,
          { width: maxWidth, paddingTop: insets.top, transform: [{ translateX }] },
        ]}
      >
        <View style={styles.brand}>
          <View style={styles.brandIcon}>
            <Icon name="schoolSolid" size={17} color={theme.colors.mint[600]} />
          </View>
          <Text style={styles.brandName}>SchoolHub</Text>
        </View>

        <ScrollView
          style={styles.nav}
          contentContainerStyle={[styles.navContent, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
        >
          {items.map((item) => {
            const active = item.id === activeId;

            return (
              <Pressable
                key={item.id}
                onPress={() => navigate(item.id as RouteId)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={styles.itemWrapper}
              >
                {active ? (
                  <LinearGradient
                    colors={['#dcf6cd', '#b7eaa5']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={StyleSheet.absoluteFill}
                  />
                ) : null}
                <View style={styles.itemInner}>
                  <Icon
                    name={item.icon}
                    size={20}
                    color={active ? theme.colors.ink[900] : theme.colors.ink[500]}
                  />
                  <Text style={[styles.itemLabel, active ? styles.itemLabelActive : null]}>
                    {item.label}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.overlay,
  },
  panel: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: theme.colors.white,
    borderRightWidth: 1,
    borderRightColor: theme.colors.line,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[2],
    paddingHorizontal: theme.spacing[5],
    paddingTop: theme.spacing[5],
    paddingBottom: theme.spacing[4],
  },
  brandIcon: {
    width: 32,
    height: 32,
    borderRadius: theme.borderRadius.xl,
    backgroundColor: theme.colors.mint[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: {
    fontSize: 19,
    fontWeight: theme.fontWeight.bold,
    letterSpacing: -0.3,
    color: theme.colors.ink[900],
  },
  nav: {
    flex: 1,
  },
  navContent: {
    paddingHorizontal: theme.spacing[3],
    gap: theme.spacing[1],
  },
  itemWrapper: {
    borderRadius: theme.borderRadius.xl,
    overflow: 'hidden',
  },
  itemInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[3],
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[2.5],
  },
  itemLabel: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.ink[700],
  },
  itemLabelActive: {
    color: theme.colors.ink[900],
  },
});
