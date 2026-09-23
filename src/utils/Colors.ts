
// Gajra Gears theme. `blue` is kept as the name of the primary colour because 500+ places use it;
// it is now the brand charcoal (was FieldKonnect blue #395299).
export const colors = {
  black: "#000000",
  white: "#fff",
  blue: "#2B2B2B",
  primary: "#2B2B2B",
  gold: "#F2B705",
  goldLight: "#FFD84D",
  goldSoft: "#FFF3C4",
  gray: "#8E8E93",
  lightBlue: "#127AF3",
  bgColor: "#FAF7EF",
  offWHite:"#F6F2E7"
};

// Same yellow -> white gradient as the splash and login screens
export const brandGradient = {
  colors: ['#FFC928', '#FFE27A', '#FFF6D6'],
  locations: [0, 0.5, 1],
  start: { x: 0.1, y: 0 },
  end: { x: 0.9, y: 1 },
};


export const graySteps = 8
// latest grey color to change all screens background and top bar
export function grayStep(step: number, alpha: number = 1.0): string {
  if (step > graySteps) {
    console.warn(
      `function getGray called with step greater than configured steps. Using ${graySteps} instead.`,
    )
    step = graySteps
  } else if (step < 0) {
    console.warn(
      'function getGray called with step less than zero. Using 0 instead.',
    )
    step = 0
  }
  return `hsla(0, 0%, ${(1 / graySteps) * 100 * (graySteps - step)}%, ${alpha})`
  // return latestGrey
}

// export const black1212 = '#121212'
// export const grey9898 = '#989898'