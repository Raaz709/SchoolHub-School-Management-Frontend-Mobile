import { colors } from './colors';
import {
  spacing,
  borderRadius,
  fontSize,
  fontWeight,
  lineHeight,
  shadows,
  transitions,
} from './tokens';

export const theme = {
  colors,
  spacing,
  borderRadius,
  fontSize,
  fontWeight,
  lineHeight,
  shadows,
  transitions,
};

export type Theme = typeof theme;

export const getTheme = () => theme;

/** Tone → tile/icon colours, matching the web `StatCard` TONES map. */
export const statCardTones = {
  amber: { tile: colors.amber[50], icon: colors.amber[500] },
  blue: { tile: colors.blue[50], icon: colors.blue[500] },
  violet: { tile: colors.violet[50], icon: colors.violet[500] },
  green: { tile: colors.mint[50], icon: colors.mint[600] },
  rose: { tile: colors.rose[50], icon: colors.rose[500] },
  sky: { tile: colors.sky[50], icon: colors.sky[500] },
};

export type StatTone = keyof typeof statCardTones;

/**
 * Shared style fragments. Anything that maps to a repeated web utility
 * (`.rounded-2xl`, `.border-line`, `.bg-white` …) lives here so screens do not
 * re-declare the same surface over and over.
 */
export const commonStyles = {
  container: {
    flex: 1,
    backgroundColor: colors.canvas,
  },

  /* ---------------------------------------------------------------- surfaces */
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius['2xl'],
    borderWidth: 1,
    borderColor: colors.line,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing[3],
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  cardContent: {
    padding: spacing[5],
  },
  dashedPanel: {
    borderRadius: borderRadius['2xl'],
    borderWidth: 1,
    borderColor: colors.line,
    borderStyle: 'dashed',
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[8],
  },
  /* ------------------------------------------------------------------ inputs */
  input: {
    width: '100%',
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2.5],
    fontSize: fontSize.base,
    color: colors.ink[900],
  },
  inputDisabled: {
    backgroundColor: colors.lineSoft,
    color: colors.ink[500],
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.ink[700],
    marginBottom: spacing[1.5],
  },
  /* ----------------------------------------------------------------- buttons */
  buttonPrimary: {
    borderRadius: borderRadius.xl,
    backgroundColor: colors.mint[500],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2.5],
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
  },
  buttonPrimaryText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
  buttonGhost: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2.5],
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
  },
  buttonGhostText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.ink[700],
  },
  buttonDanger: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.rose[200],
    backgroundColor: colors.rose[50],
    paddingHorizontal: spacing[2.5],
    paddingVertical: spacing[1.5],
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDangerText: {
    fontSize: fontSize.tiny,
    fontWeight: fontWeight.semibold,
    color: colors.rose[600],
  },
  buttonMint: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.mint[200],
    backgroundColor: colors.mint[50],
    paddingHorizontal: spacing[2.5],
    paddingVertical: spacing[1.5],
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonMintText: {
    fontSize: fontSize.tiny,
    fontWeight: fontWeight.semibold,
    color: colors.mint[600],
  },
  buttonLink: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[1],
  },
  buttonLinkText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.mint[600],
  },
  /* --------------------------------------------------------------- typography */
  badge: {
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing[2.5],
    paddingVertical: spacing[0.5],
  },
  badgeText: {
    fontSize: fontSize.tiny,
    fontWeight: fontWeight.medium,
  },
  divider: {
    height: 1,
    backgroundColor: colors.line,
  },
  screenHeader: {
    marginBottom: spacing[6],
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing[4],
  },
  screenTitle: {
    fontSize: fontSize['5xl'],
    fontWeight: fontWeight.bold,
    color: colors.ink[900],
  },
  screenSubtitle: {
    fontSize: fontSize.md,
    color: colors.ink[500],
    marginTop: spacing[1],
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.ink[900],
  },
  sectionSubtitle: {
    fontSize: fontSize.sm,
    color: colors.ink[500],
    marginTop: spacing[0.5],
  },
  /* ------------------------------------------------------------------ tables */
  tableHeader: {
    backgroundColor: colors.lineSoft,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  tableHeaderText: {
    fontSize: fontSize.micro,
    fontWeight: fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: colors.ink[500],
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  tableCell: {
    fontSize: fontSize.base,
    color: colors.ink[700],
  },
  tableCellStrong: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.ink[900],
  },
  /* ------------------------------------------------------------- empty states */
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[10],
  },
  emptyStateText: {
    fontSize: fontSize.md,
    color: colors.ink[500],
    textAlign: 'center',
  },
  /* ------------------------------------------------------------------ modals */
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[4],
  },
  modalContent: {
    width: '100%',
    maxWidth: 460,
    maxHeight: '88%',
    borderRadius: borderRadius['3xl'],
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  modalTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.ink[900],
  },
  modalSubtitle: {
    fontSize: fontSize.sm,
    color: colors.ink[500],
    marginTop: spacing[0.5],
  },
  modalClose: {
    padding: spacing[1],
    borderRadius: borderRadius.lg,
  },
  modalBody: {
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[5],
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing[2],
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[4],
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  /* ------------------------------------------------------------------ misc */
  searchInput: {
    flex: 1,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
    paddingHorizontal: spacing[3],
    paddingLeft: spacing[9],
    paddingVertical: spacing[2.5],
    fontSize: fontSize.base,
    color: colors.ink[900],
  },
  select: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2.5],
    fontSize: fontSize.base,
    color: colors.ink[900],
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.mint[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: fontSize.tiny,
    fontWeight: fontWeight.bold,
    color: colors.mint[600],
  },
  scrollContent: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[5],
    paddingBottom: spacing[12],
  },
} as const;

export { colors, spacing, borderRadius, fontSize, fontWeight, lineHeight, shadows, transitions };
export default theme;
