const tintColorLight = '#2f95dc';
const tintColorDark = '#fff';

// Your app's specific color palette
const COLORS = {
  saffron: '#F9A826', // A vibrant saffron/orange color
  maroon: '#800000',   // A deep maroon
  white: '#FFFFFF',
  lightGray: '#F5F5F5',
  mediumGray: '#B0B0B0',
  darkGray: '#333333',
  // background: '#FFF9F2' // A very light, warm off-white for the main background
};

export default {
  light: {
    text: COLORS.darkGray,
    background: COLORS.white,
    tint: COLORS.saffron,
    tabIconDefault: COLORS.mediumGray,
    tabIconSelected: COLORS.saffron,
    ...COLORS
  },
  dark: {
    text: COLORS.white,
    background: COLORS.darkGray,
    tint: tintColorDark,
    tabIconDefault: COLORS.mediumGray,
    tabIconSelected: tintColorDark,
    ...COLORS
  },
};
