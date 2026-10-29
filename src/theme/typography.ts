import type { TextStyle } from 'react-native';

import { spacing } from './tokens';

export const type = {
  largeTitle: {
    fontSize: 34,
    lineHeight: 41,
    fontWeight: '700',
    letterSpacing: 0.1,
  } satisfies TextStyle,
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
    letterSpacing: 0.1,
  } satisfies TextStyle,
  heading: {
    fontSize: 20,
    lineHeight: 25,
    fontWeight: '600',
    letterSpacing: 0.1,
  } satisfies TextStyle,
  subheading: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '600',
  } satisfies TextStyle,
  body: {
    fontSize: 17,
    lineHeight: 23,
    fontWeight: '400',
  } satisfies TextStyle,
  bodyMedium: {
    fontSize: 17,
    lineHeight: 23,
    fontWeight: '500',
  } satisfies TextStyle,
  callout: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '400',
  } satisfies TextStyle,
  footnote: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '400',
  } satisfies TextStyle,
  caption: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400',
  } satisfies TextStyle,
  captionMedium: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  } satisfies TextStyle,
  overline: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  } satisfies TextStyle,
  button: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '600',
  } satisfies TextStyle,
} as const;

export const layout = {
  screenPadding: spacing.lg,
  groupedInset: spacing.lg,
  rowMinHeight: 52,
  touchTarget: 44,
  maxContentWidth: 640,
} as const;
