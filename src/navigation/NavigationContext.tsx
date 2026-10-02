import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { RouteId } from './types';
import { DEFAULT_NAV_ID } from './navItems';

interface NavigationValue {
  activeId: RouteId;
  navigate: (id: RouteId) => void;
  drawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
}

const NavigationContext = createContext<NavigationValue | null>(null);

/**
 * Tiny page router for the authenticated shell.
 *
 * The website uses react-router; the mobile app has a single shell with a
 * drawer, so a flat `activeId` is enough and avoids nesting navigators.
 */
export function NavigationProvider({
  children,
  initialId = DEFAULT_NAV_ID,
}: {
  children: React.ReactNode;
  initialId?: RouteId;
}) {
  const [activeId, setActiveId] = useState<RouteId>(initialId);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const navigate = useCallback((id: RouteId) => {
    setActiveId(id);
    setDrawerOpen(false);
  }, []);

  const openDrawer = useCallback(() => setDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  const value = useMemo<NavigationValue>(
    () => ({ activeId, navigate, drawerOpen, openDrawer, closeDrawer }),
    [activeId, navigate, drawerOpen, openDrawer, closeDrawer],
  );

  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>;
}

export function useAppNavigation(): NavigationValue {
  const ctx = useContext(NavigationContext);
  if (!ctx) throw new Error('useAppNavigation must be used within a NavigationProvider');
  return ctx;
}
