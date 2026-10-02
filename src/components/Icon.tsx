import React from 'react';
import Feather from '@expo/vector-icons/Feather';
import Ionicons from '@expo/vector-icons/Ionicons';

type FeatherGlyph = React.ComponentProps<typeof Feather>['name'];
type IoniconGlyph = React.ComponentProps<typeof Ionicons>['name'];

/**
 * The website draws its icons with `lucide-react` (1.9 px stroke, 24px grid).
 * Feather is the closest match on React Native, and Ionicons covers the few
 * shapes Feather lacks (school, wallet, balloon …).
 */
const FEATHER = {
  /* navigation / shell */
  search: 'search',
  bell: 'bell',
  menu: 'menu',
  logout: 'log-out',
  login: 'log-in',
  chevronDown: 'chevron-down',
  chevronRight: 'chevron-right',
  chevronLeft: 'chevron-left',
  chevronUp: 'chevron-up',
  arrowLeft: 'arrow-left',
  arrowRight: 'arrow-right',
  moreVertical: 'more-vertical',
  sidebar: 'sidebar',

  /* entity glyphs */
  user: 'user',
  users: 'users',
  userPlus: 'user-plus',
  userCheck: 'user-check',
  mail: 'mail',
  lock: 'lock',
  shield: 'shield',
  key: 'key',
  phone: 'phone',
  mapPin: 'map-pin',
  tag: 'tag',
  hash: 'hash',
  briefcase: 'briefcase',

  /* domain glyphs */
  calendar: 'calendar',
  clock: 'clock',
  clipboard: 'clipboard',
  book: 'book',
  bookOpen: 'book-open',
  fileText: 'file-text',
  folder: 'folder',
  award: 'award',
  star: 'star',
  gift: 'gift',
  home: 'home',
  layers: 'layers',
  grid: 'grid',
  list: 'list',
  table: 'table',
  activity: 'activity',
  barChart: 'bar-chart-2',
  pieChart: 'pie-chart',
  trendingUp: 'trending-up',
  dollarSign: 'dollar-sign',
  creditCard: 'credit-card',
  percent: 'percent',
  package: 'package',
  truck: 'truck',
  send: 'send',
  messageSquare: 'message-square',

  /* actions */
  plus: 'plus',
  minus: 'minus',
  close: 'x',
  edit: 'edit-3',
  trash: 'trash-2',
  save: 'save',
  download: 'download',
  upload: 'upload',
  filter: 'filter',
  refresh: 'refresh-cw',
  printer: 'printer',
  externalLink: 'external-link',
  eye: 'eye',
  check: 'check',
  slash: 'slash',
  settings: 'settings',
  sliders: 'sliders',
  copy: 'copy',

  /* status */
  checkCircle: 'check-circle',
  alertCircle: 'alert-circle',
  alertTriangle: 'alert-triangle',
  info: 'info',
  helpCircle: 'help-circle',
  xCircle: 'x-circle',
  toggleLeft: 'toggle-left',
  toggleRight: 'toggle-right',
  zap: 'zap',
  inbox: 'inbox',
} satisfies Record<string, FeatherGlyph>;

const IONICONS = {
  /* sidebar entries — the site uses filled/outline `School`/`Users`/… icons */
  school: 'school-outline',
  schoolSolid: 'school',
  student: 'person-outline',
  teachers: 'people-outline',
  library: 'library-outline',
  calendarDays: 'calendar-outline',
  clipboardCheck: 'clipboard-outline',
  scrollText: 'document-text-outline',
  wallet: 'wallet-outline',
  chat: 'chatbubble-ellipses-outline',
  events: 'balloon-outline',
  stats: 'stats-chart-outline',
  history: 'time-outline',
  profile: 'person-circle-outline',
  person: 'person-outline',

  /* domain glyphs */
  building: 'business-outline',
  receipt: 'receipt-outline',
  megaphone: 'megaphone-outline',
  sparkles: 'sparkles-outline',
  ribbon: 'ribbon-outline',
  trophy: 'trophy-outline',
  idCard: 'id-card-outline',
  notificationsOff: 'notifications-off-outline',
  checkmarkCircle: 'checkmark-circle-outline',
  userRemove: 'person-remove-outline',
  userAdd: 'person-add-outline',
} satisfies Record<string, IoniconGlyph>;

const FEATHER_NAMES = Object.keys(FEATHER) as (keyof typeof FEATHER)[];
const IONICON_NAMES = Object.keys(IONICONS) as (keyof typeof IONICONS)[];

export type IconName = keyof typeof FEATHER | keyof typeof IONICONS;

export interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  style?: React.ComponentProps<typeof Feather>['style'];
}

export function Icon({ name, size = 20, color = '#0f172a', style }: IconProps) {
  if (IONICON_NAMES.includes(name as keyof typeof IONICONS)) {
    return (
      <Ionicons
        name={IONICONS[name as keyof typeof IONICONS]}
        size={size}
        color={color}
        style={style}
      />
    );
  }

  const glyph = FEATHER_NAMES.includes(name as keyof typeof FEATHER)
    ? FEATHER[name as keyof typeof FEATHER]
    : 'circle';

  return <Feather name={glyph} size={size} color={color} style={style} />;
}

export default Icon;
