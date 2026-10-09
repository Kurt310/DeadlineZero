/** DeadlineZero color tokens — ported from Flutter AppTheme. Light-only theme. */

export const DZ = {
  primary: '#276A52',
  primaryDark: '#1E523F',
  primaryLight: '#388B6E',
  mainBackground: '#F5F6F2',
  cardSurface: '#FFFFFF',
  sidebarBackground: '#EAEFE7',
  softAccent: '#DCE6D7',
  mainText: '#243B36',
  secondaryText: '#687871',
  borders: '#E0E6DE',
  warningBackground: '#FFF6E7',
  warningText: '#916323',
  warningBorder: '#F0D49C',
  errorBackground: '#FFECEE',
  errorText: '#BA1A1A',
  successBackground: '#E6F4EA',
  successText: '#137333',
} as const;

export type DZColor = keyof typeof DZ;
