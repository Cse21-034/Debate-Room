// DebateRoom — forced dark theme (both light and dark keys are identical)
const dark = {
  text: '#F0F0F5',
  tint: '#3B82F6',

  background: '#0D0D0F',
  foreground: '#F0F0F5',

  card: '#1A1A1F',
  cardForeground: '#F0F0F5',

  primary: '#3B82F6',
  primaryForeground: '#FFFFFF',

  secondary: '#F97316',
  secondaryForeground: '#FFFFFF',

  muted: '#2A2A35',
  mutedForeground: '#8A8A9A',

  accent: '#1E293B',
  accentForeground: '#60A5FA',

  destructive: '#EF4444',
  destructiveForeground: '#FFFFFF',

  border: '#2A2A35',
  input: '#2A2A35',

  // Chat-specific
  myBubble: '#3B82F6',
  myBubbleText: '#FFFFFF',
  otherBubble: '#1E1E28',
  otherBubbleText: '#F0F0F5',
  onlineGreen: '#10B981',
  warningAmber: '#F59E0B',
};

const colors = {
  light: dark,
  dark: {
    text: '#F0F0F5',
    tint: '#3B82F6',

    background: '#0D0D0F',
    foreground: '#F0F0F5',

    card: '#1A1A1F',
    cardForeground: '#F0F0F5',

    primary: '#3B82F6',
    primaryForeground: '#FFFFFF',

    secondary: '#F97316',
    secondaryForeground: '#FFFFFF',

    muted: '#2A2A35',
    mutedForeground: '#8A8A9A',

    accent: '#1E293B',
    accentForeground: '#60A5FA',

    destructive: '#EF4444',
    destructiveForeground: '#FFFFFF',

    border: '#2A2A35',
    input: '#2A2A35',

    // Chat-specific
    myBubble: '#3B82F6',
    myBubbleText: '#FFFFFF',
    otherBubble: '#1E1E28',
    otherBubbleText: '#F0F0F5',
    onlineGreen: '#10B981',
    warningAmber: '#F59E0B',
  },
  radius: 12,
};

export default colors;

// 12 preset avatar colors
export const AVATAR_COLORS: Record<string, string> = {
  rose: '#FB7185',
  orange: '#FB923C',
  amber: '#FBBF24',
  lime: '#A3E635',
  emerald: '#34D399',
  cyan: '#22D3EE',
  blue: '#60A5FA',
  violet: '#A78BFA',
  purple: '#C084FC',
  pink: '#F472B6',
  slate: '#94A3B8',
  teal: '#2DD4BF',
};

export const AVATAR_COLOR_KEYS = Object.keys(AVATAR_COLORS);
