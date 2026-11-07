// Flat, calm palette: few colours so nothing distracts from the fractions.
export const HEX = {
  cream: '#F3E9D2',
  wall: '#EBDDBF',
  sand: '#E7D3A8',
  floor: '#D9C39A',
  paper: '#FFF8EC',
  navy: '#2E3A59',
  terra: '#D9734E',
  olive: '#8A9A5B',
  oliveLight: '#A9B57E',
  mustard: '#E0B04A',
  mustardDark: '#C9973A',
  cheese: '#F2CF7A',
  water: '#9DBBC0',
  white: '#FFFFFF',
} as const;

type Palette = { [K in keyof typeof HEX]: number };
export const C = Object.fromEntries(
  Object.entries(HEX).map(([k, v]) => [k, parseInt(v.slice(1), 16)]),
) as Palette;

export const W = 1920;
export const H = 1080;
export const FONT = 'Nunito, sans-serif';
