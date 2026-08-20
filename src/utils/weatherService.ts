import { WeatherData } from "../types";

// Coordinates for Alexandrovka, Kostanay region, Kazakhstan
const DEFAULT_LAT = 53.2167;
const DEFAULT_LNG = 63.6333;
const CACHED_WEATHER_KEY = "zemlyane_cached_weather_v1";

/**
 * Weather code to Russian description mapping
 */
function getWeatherDescription(code: number): string {
  if (code === 0) return "Ясно, солнечно";
  if (code === 1 || code === 2) return "Малооблачно";
  if (code === 3) return "Пасмурно";
  if (code >= 45 && code <= 48) return "Туман";
  if (code >= 51 && code <= 55) return "Морось";
  if (code >= 61 && code <= 65) return "Дождь";
  if (code >= 71 && code <= 77) return "Снегопад";
  if (code >= 80 && code <= 82) return "Ливень";
  if (code >= 95) return "Гроза";
  return "Переменная облачность";
}

/**
 * Wind direction degrees to compass point
 */
function getWindDirectionName(degrees: number): string {
  const dirs = ["С", "СВ", "В", "ЮВ", "Ю", "ЮЗ", "З", "СЗ"];
  const index = Math.round(degrees / 45) % 8;
  return dirs[index];
}

/**
 * Fetches real-time weather data from Open-Meteo API with offline fallback caching
 */
export async function fetchRealTimeWeather(
  lat: number = DEFAULT_LAT,
  lng: number = DEFAULT_LNG
): Promise<WeatherData> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,surface_pressure,wind_speed_10m,wind_direction_10m,weather_code,precipitation&timezone=auto`;
    
    // Use AbortController for quick timeout when offline
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) throw new Error(`Weather fetch HTTP status: ${response.status}`);
    
    const data = await response.json();
    const current = data.current;

    const temp = current.temperature_2m;
    const humidity = current.relative_humidity_2m;
    // hPa to mm Hg
    const pressureMmHg = Math.round(current.surface_pressure * 0.750062);
    const windSpeed = current.wind_speed_10m;
    const windDir = getWindDirectionName(current.wind_direction_10m);
    const weatherDesc = getWeatherDescription(current.weather_code);
    const precipitation = current.precipitation || 0;

    const weatherResult: WeatherData = {
      station: "Александровка, Пост эко-мониторинга «Земляне»",
      temperature: `${temp > 0 ? "+" : ""}${Math.round(temp)}°C`,
      humidity: `${Math.round(humidity)}%`,
      pressure: `${pressureMmHg} мм рт. ст.`,
      windSpeed: `${windSpeed} м/с`,
      windDirection: windDir,
      cloudiness: weatherDesc,
      precipitation: `${precipitation} мм`,
      updatedAt: new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
      forecastUrl: "https://yandex.ru/pogoda/kostanay"
    };

    // Save to localStorage for instant offline access
    try {
      localStorage.setItem(CACHED_WEATHER_KEY, JSON.stringify({
        ...weatherResult,
        cachedAt: new Date().toISOString()
      }));
    } catch (e) {
      console.warn("Could not cache weather data:", e);
    }

    return weatherResult;
  } catch (error) {
    console.info("Offline or network issue, using cached/fallback weather data:", error);
    
    // Try to load cached weather from localStorage
    try {
      const cached = localStorage.getItem(CACHED_WEATHER_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        return {
          ...parsed,
          updatedAt: parsed.updatedAt ? `${parsed.updatedAt} (оффлайн-кэш)` : "Оффлайн-кэш"
        };
      }
    } catch (e) {
      console.warn("Could not read cached weather from localStorage:", e);
    }

    // Default offline fallback
    return {
      station: "Александровка, Пост эко-мониторинга «Земляне»",
      temperature: "+22°C",
      humidity: "55%",
      pressure: "752 мм рт. ст.",
      windSpeed: "3.2 м/с",
      windDirection: "СЗ",
      cloudiness: "Ясно (автономный режим)",
      precipitation: "0.0 мм",
      updatedAt: `${new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })} (оффлайн)`,
      forecastUrl: "https://yandex.ru/pogoda/kostanay"
    };
  }
}
