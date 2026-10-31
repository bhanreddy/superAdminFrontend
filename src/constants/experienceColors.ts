/**
 * Color roles for the Nexsyrus experience.
 * Navy anchors the brand; blue consistently identifies interaction.
 * Gold is a restrained brand accent. Feedback retains its own semantic colors.
 */
export const brandColors = {
  navy: '#14243A',
  navyDeep: '#0C1729',
  blue: '#2455C6',
  blueHover: '#1C46AB',
  gold: '#E4B86B',
  goldInk: '#3D2B13',
  white: '#FFFFFF',
} as const;

export const experienceColors = {
  light: {
    canvas: '#F5F7FA',
    surface: '#FFFFFF',
    inset: '#EDF2FA',
    ink: '#1D2A3E',
    muted: '#5D687A',
    line: '#DFE6EF',
    action: brandColors.blue,
    actionFill: brandColors.blue,
    hero: brandColors.navy,
    heroText: '#F7FAFF',
  },
  dark: {
    canvas: '#0E1726',
    surface: '#172338',
    inset: '#21314B',
    ink: '#F1F5FC',
    muted: '#BCC9DC',
    line: '#33435C',
    action: '#A8C2FF',
    actionFill: brandColors.blue,
    hero: '#14243A',
    heroText: '#F7FAFF',
  },
} as const;
