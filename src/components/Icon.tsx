import { Ionicons } from '@expo/vector-icons';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import type { ComponentProps } from 'react';
import { Platform } from 'react-native';

import { useTheme } from '@/theme';

import type { IconName } from './iconNames';


const SF_SYMBOLS: Record<IconName, SFSymbol> = {
  today: 'sun.max',
  list: 'list.bullet',
  settings: 'gearshape',
  plus: 'plus',
  check: 'checkmark',
  checkCircle: 'checkmark.circle.fill',
  circle: 'circle',
  circleDashed: 'circle.dashed',
  location: 'mappin.and.ellipse',
  nearby: 'location',
  map: 'map',
  clock: 'clock',
  calendar: 'calendar',
  repeat: 'arrow.triangle.2.circlepath',
  bell: 'bell',
  bellOff: 'bell.slash',
  shield: 'lock.shield',
  refresh: 'arrow.clockwise',
  trash: 'trash',
  pencil: 'pencil',
  snooze: 'zzz',
  chevronRight: 'chevron.right',
  chevronLeft: 'chevron.left',
  close: 'xmark',
  search: 'magnifyingglass',
  currentLocation: 'location.fill',
  info: 'info.circle',
  warning: 'exclamationmark.triangle',
  error: 'exclamationmark.circle',
  success: 'checkmark.circle',
  arrowUpRight: 'arrow.up.right',
  target: 'scope',
  navigation: 'location.north.line',
  store: 'cart',
  pharmacy: 'cross.case',
  bank: 'building.columns',
  fuel: 'fuelpump',
  atm: 'banknote',
  post: 'envelope',
  hospital: 'staroflife',
  hardware: 'wrench.and.screwdriver',
  laundry: 'washer',
  lock: 'lock',
  battery: 'battery.100',
  external: 'arrow.up.forward.square',
};

const IONICONS: Record<IconName, ComponentProps<typeof Ionicons>['name']> = {
  today: 'sunny-outline',
  list: 'list-outline',
  settings: 'settings-outline',
  plus: 'add',
  check: 'checkmark',
  checkCircle: 'checkmark-circle',
  circle: 'ellipse-outline',
  circleDashed: 'ellipse-outline',
  location: 'location-outline',
  nearby: 'navigate-outline',
  map: 'map-outline',
  clock: 'time-outline',
  calendar: 'calendar-outline',
  repeat: 'repeat-outline',
  bell: 'notifications-outline',
  bellOff: 'notifications-off-outline',
  shield: 'shield-checkmark-outline',
  refresh: 'refresh-outline',
  trash: 'trash-outline',
  pencil: 'pencil-outline',
  snooze: 'moon-outline',
  chevronRight: 'chevron-forward',
  chevronLeft: 'chevron-back',
  close: 'close',
  search: 'search-outline',
  currentLocation: 'locate',
  info: 'information-circle-outline',
  warning: 'warning-outline',
  error: 'alert-circle-outline',
  success: 'checkmark-circle-outline',
  arrowUpRight: 'arrow-up-outline',
  target: 'locate-outline',
  navigation: 'navigate',
  store: 'cart-outline',
  pharmacy: 'medkit-outline',
  bank: 'business-outline',
  fuel: 'car-outline',
  atm: 'cash-outline',
  post: 'mail-outline',
  hospital: 'medical-outline',
  hardware: 'hammer-outline',
  laundry: 'shirt-outline',
  lock: 'lock-closed-outline',
  battery: 'battery-half-outline',
  external: 'open-outline',
};

export type IconProps = {
  name: IconName;
  size?: number;
  color?: string;
  weight?: 'regular' | 'medium' | 'semibold' | 'bold';
  testID?: string;
};

export function Icon({ name, size = 20, color, weight = 'regular', testID }: IconProps) {
  const { colors } = useTheme();
  const tint = color ?? colors.secondaryText;

  if (Platform.OS === 'ios') {
    return (
      <SymbolView
        name={SF_SYMBOLS[name]}
        size={size}
        tintColor={tint}
        weight={weight}
        accessible={false}
        testID={testID}
      />
    );
  }

  return (
    <Ionicons
      name={IONICONS[name]}
      size={size}
      color={tint}
      accessible={false}
      testID={testID}
    />
  );
}
