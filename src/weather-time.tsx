/*!
 * (C) 2024, Staffbase GmbH
 */
import React, { ReactElement, useState, useEffect, useRef } from "react";
import { BlockAttributes } from "widget-sdk";

/**
 * Map WeatherAPI `code` + day/night => custom SVG filenames
 */
function getIconFilename(code: number, timeOfDay: "day" | "night"): string {
  switch (code) {
    case 1000:
      return timeOfDay === "day" ? "sunny.svg" : "clear-moon.svg";
    case 1003:
      return timeOfDay === "day" ? "double-clouds.svg" : "partly-cloudy-moon.svg";
    case 1006:
    case 1009:
      return "cloudy.svg";
    case 1030:
    case 1135:
    case 1147:
      return "mist.svg";
    case 1063:
    case 1072:
    case 1150:
    case 1153:
    case 1168:
    case 1171:
      return "drizzle.svg";
    case 1180:
    case 1183:
    case 1186:
    case 1189:
    case 1192:
    case 1195:
    case 1198:
    case 1201:
    case 1240:
    case 1243:
    case 1246:
      return "rain.svg";
    case 1066:
    case 1069:
    case 1114:
    case 1117:
    case 1204:
    case 1207:
    case 1210:
    case 1213:
    case 1216:
    case 1219:
    case 1222:
    case 1225:
    case 1237:
    case 1249:
    case 1252:
    case 1255:
    case 1258:
    case 1261:
    case 1264:
      return "snow.svg";
    case 1087:
    case 1273:
    case 1276:
    case 1279:
    case 1282:
      return "thunderstorm.svg";
    default:
      return "default.svg";
  }
}

/**
 * Format date/time as "Nov 26th, 9:05:23am"
 */
function formatDateTime(date: Date): string {
  const month = date.toLocaleString("en-US", { month: "short" });
  const day = date.getDate();
  const hours = date.getHours() % 12 || 12;
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();
  const ampm = date.getHours() >= 12 ? "pm" : "am";

  const getOrdinalSuffix = (n: number): string => {
    if (n % 10 === 1 && n % 100 !== 11) return "st";
    if (n % 10 === 2 && n % 100 !== 12) return "nd";
    if (n % 10 === 3 && n % 100 !== 13) return "rd";
    return "th";
  };
  const suffix = getOrdinalSuffix(day);

  const timeString = `${hours}:${minutes.toString().padStart(2, "0")}${ampm}`;


  return `${month} ${day}${suffix}, ${timeString}`;
}

export interface WeatherTimeProps extends BlockAttributes {
  city: string;
}

export const WeatherTime = ({ city }: WeatherTimeProps): ReactElement => {
  const containerRef = useRef<HTMLDivElement>(null);

  // State
  const [condition, setCondition] = useState<string>("Loading...");
  const [iconUrl, setIconUrl] = useState<string>("");
  const [temperatureC, setTemperatureC] = useState<number | null>(null);
  const [temperatureF, setTemperatureF] = useState<number | null>(null);
  const [isFahrenheit, setIsFahrenheit] = useState<boolean>(false);
  const [localTime, setLocalTime] = useState<Date | null>(null);

  // Defaults
  const defaultCity = "New York City";
  const defaultCondition = "Patchy light snow";
  const defaultTemperatureC = 27;
  const defaultTemperatureF = (27 * 9) / 5 + 32;

  // Local dev path
  const LOCAL_BASE = "./weather";
  // GH Pages fallback
  const GITHUB_WEATHER_PATH =
    "https://eirastaffbase.github.io/weather-time/resources/weather";
  const fallbackGHDefault = `${GITHUB_WEATHER_PATH}/default.svg`;

  const displayCity = city || defaultCity;

  // Fetch weather & time
  const fetchWeatherAndTime = async () => {
    try {
      const apiKey = "2316f440769c440d92051647240512";
      if (!apiKey) {
        console.error("Weather API key is not set.");
        return;
      }

      // Fetch weather data
      const response = await fetch(
        `https://api.weatherapi.com/v1/current.json?key=${apiKey}&q=${encodeURIComponent(
          displayCity
        )}`
      );
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      const data = await response.json();
      if (data && data.current && data.current.condition) {
        setCondition(data.current.condition.text.toLowerCase());
        setTemperatureC(data.current.temp_c);
        setTemperatureF(data.current.temp_f);
        setIsFahrenheit(data.location?.country === "United States of America");

        // Get correct icon
        const weatherCode = data.current.condition.code || 1000;
        const timeOfDay = data.current.is_day === 1 ? "day" : "night";
        const filename = getIconFilename(weatherCode, timeOfDay as "day" | "night");
        setIconUrl(`${LOCAL_BASE}/${filename}`);

        // Use the coordinates from the weather API to fetch the current time
        if (
          data.location &&
          data.location.lat != null &&
          data.location.lon != null
        ) {
          const { lat, lon } = data.location;
          const timeResponse = await fetch(
            `https://timeapi.io/api/Time/current/coordinate?latitude=${encodeURIComponent(
              lat
            )}&longitude=${encodeURIComponent(lon)}`
          );
          if (timeResponse.ok) {
            const timeData = await timeResponse.json();
            if (timeData.dateTime) {
              setLocalTime(new Date(timeData.dateTime));
            } else {
              setLocalTime(new Date());
            }
          } else {
            setLocalTime(new Date());
          }
        } else {
          setLocalTime(new Date());
        }
      } else {
        throw new Error("Invalid data received from weather API");
      }
    } catch (error) {
      console.error("Error fetching weather data:", error);
      setCondition(defaultCondition.toLowerCase());
      setTemperatureC(defaultTemperatureC);
      setTemperatureF(defaultTemperatureF);
      setLocalTime(new Date());
      setIsFahrenheit(false);
      setIconUrl(`${LOCAL_BASE}/default.svg`);
    }
  };

  useEffect(() => {
    fetchWeatherAndTime();
  }, [displayCity]);

  // Start the live clock only once when localTime is set
  const clockStartedRef = useRef(false);
  useEffect(() => {
    if (!localTime || clockStartedRef.current) return;
    clockStartedRef.current = true;

    const interval = setInterval(() => {
      setLocalTime((prev) => {
        if (!prev) return prev;
        return new Date(prev.getTime() + 1000);
      });
    }, 1000);

    return () => {
      clearInterval(interval);
      clockStartedRef.current = false;
    };
  }, [localTime]);

  // Refresh weather data every 5 minutes to keep the API time in sync
  useEffect(() => {
    const weatherInterval = setInterval(() => {
      fetchWeatherAndTime();
    }, 300000); // 5 minutes

    return () => clearInterval(weatherInterval);
  }, []);

  // Toggle temperature
  const toggleTemperatureUnit = () => {
    setIsFahrenheit((prev) => !prev);
  };

  // Refresh on click (time, temp, or icon)
  const handleRefresh = () => {
    fetchWeatherAndTime();
  };

  const temperature = isFahrenheit ? temperatureF : temperatureC;
  const dateTimeString = localTime
    ? formatDateTime(localTime)
    : formatDateTime(new Date());

  return (
    <div
      ref={containerRef}
      style={{
        display: "flex",
        flexDirection: "row",
        flexWrap: "nowrap",
        justifyContent: "space-between",
        alignItems: "flex-start",
        padding: "10px",
        position: "relative",
      }}
    >
      <div style={{ marginBottom: 0 }}>
        {temperature !== null && (
          <p
            onClick={toggleTemperatureUnit}
            style={{
              cursor: "pointer",
              fontSize: "32px",
              fontWeight: "bold",
              margin: "0 0 10px 0",
            }}
          >
            {Math.round(temperature)}°{isFahrenheit ? "F" : "C"}
          </p>
        )}
        <p
          onClick={handleRefresh}
          style={{ fontSize: "16px", margin: "0 0 10px 0" }}
        >
          {dateTimeString}
        </p>
      </div>

      {iconUrl && (
        <div
          style={{
            marginTop: "-20px",
            marginLeft: "20px",
            display: "flex",
            alignItems: "center",
          }}
        >
          <img
            src={iconUrl}
            onClick={handleRefresh}
            alt="Weather Icon"
            style={{ width: "130px", marginTop: "-45px", marginLeft: "-7px" }}
            onError={(e) => {
              const imgEl = e.currentTarget as HTMLImageElement;
              if (!imgEl.dataset.fallback) {
                imgEl.dataset.fallback = "true";
                const filenameFromLocalPath = iconUrl.split("/").pop();
                imgEl.src = `${GITHUB_WEATHER_PATH}/${filenameFromLocalPath}`;
              } else if (!imgEl.dataset.fallback2) {
                imgEl.dataset.fallback2 = "true";
                imgEl.src = fallbackGHDefault;
              } else {
                console.warn("All icon fallbacks failed. Stopping.");
              }
            }}
          />
        </div>
      )}
    </div>
  );
};
