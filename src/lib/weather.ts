/** Weather words (same keys as the intro's weather); the overlay shows them as the Figma weather logo. */
export const WEATHERS = {
  sunny: "Sunny", partly: "Partly Cloudy", cloudy: "Cloudy", fog: "Fog", drizzle: "Drizzle", rain: "Rain", snow: "Snow", storm: "Thunderstorm",
} as const;
export type Weather = keyof typeof WEATHERS;
export const WEATHER_KEYS = Object.keys(WEATHERS) as [Weather, ...Weather[]];
