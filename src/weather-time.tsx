/*!
 * (C) 2024, Staffbase GmbH
 */
import React, { ReactElement, useState, useEffect, useRef } from "react";
import { BlockAttributes } from "widget-sdk";

/**
 * 1) Map WeatherAPI `code` + day/night =>  custom SVG filenames
 */
function getIconFilename(code: number, timeOfDay: "day" | "night"): string {
  switch (code) {
    // Clear / Sunny
    case 1000:
      return timeOfDay === "day" ? "sunny.svg" : "clear-moon.svg";

    // Partly cloudy
    case 1003:
      return timeOfDay === "day"
        ? "double-clouds.svg"
        : "partly-cloudy-moon.svg";

    // Cloudy / Overcast
    case 1006:
    case 1009:
      return "cloudy.svg";

    // Mist / Fog
    case 1030:
    case 1135:
    case 1147:
      return "mist.svg";

    // Drizzle
    case 1063:
    case 1072:
    case 1150:
    case 1153:
    case 1168:
    case 1171:
      return "drizzle.svg";

    // Rain
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

    // Snow / Sleet / Ice Pellets
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

    // Thunderstorm
    case 1087:
    case 1273:
    case 1276:
    case 1279:
    case 1282:
      return "thunderstorm.svg";

    // Anything else
    default:
      return "default.svg";
  }
}

/**
 * 2) Format date/time as "Nov 26th, 9am"
 */
function formatDateTime(date: Date): string {
  const month = date.toLocaleString("en-US", { month: "short" }); // e.g. "Nov"
  const day = date.getDate(); // e.g. 26
  const hours = date.getHours() % 12 || 12;
  const minutes = date.getMinutes();
  const ampm = date.getHours() >= 12 ? "pm" : "am";

  const getOrdinalSuffix = (n: number): string => {
    if (n % 10 === 1 && n % 100 !== 11) return "st";
    if (n % 10 === 2 && n % 100 !== 12) return "nd";
    if (n % 10 === 3 && n % 100 !== 13) return "rd";
    return "th";
  };
  const suffix = getOrdinalSuffix(day);

  const timeString =
    minutes === 0
      ? `${hours}${ampm}`
      : `${hours}:${minutes.toString().padStart(2, "0")}${ampm}`;

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

  // 3) For local dev, we can try a relative path first:
  const LOCAL_BASE = "./weather";  // e.g. "weather/filename.svg" relative to your local index.html
  // Then if that fails, we fallback to GH Pages:
  // Adjust this to your actual GH Pages path:
  const GITHUB_WEATHER_PATH = "https://eirastaffbase.github.io/weather-time/resources/weather";

  // If you want a single "default.svg" on GH Pages:
  // https://eirastaffbase.github.io/weather-time/resources/weather/default.svg
  const fallbackGHDefault = `${GITHUB_WEATHER_PATH}/default.svg`;

  const displayCity = city || defaultCity;

  useEffect(() => {
    const fetchWeatherAndTime = async () => {
      try {
        const apiKey = "2316f440769c440d92051647240512";
        if (!apiKey) {
          console.error("Weather API key is not set.");
          return;
        }

        const response = await fetch(
          `https://api.weatherapi.com/v1/current.json?key=${apiKey}&q=${encodeURIComponent(displayCity)}`
        );
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }

        const data = await response.json();
        if (data && data.current && data.current.condition) {
          setCondition(data.current.condition.text.toLowerCase());

          setTemperatureC(data.current.temp_c);
          setTemperatureF(data.current.temp_f);

          // Decide Fahrenheit vs Celsius
          setIsFahrenheit(data.location?.country === "United States of America");

          // Get code + is_day to pick correct icon
          const weatherCode = data.current.condition.code || 1000;
          const timeOfDay = data.current.is_day === 1 ? "day" : "night";
          const filename = getIconFilename(weatherCode, timeOfDay as "day" | "night");

          // Start with local path
          setIconUrl(`${LOCAL_BASE}/${filename}`);

          // Set a static local time
          if (data.location?.localtime) {
            setLocalTime(new Date(data.location.localtime));
          } else {
            setLocalTime(null);
          }
        } else {
          throw new Error("Invalid data received from weather API");
        }
      } catch (error) {
        console.error("Error fetching weather data:", error);

        // If the API call fails, fallback to defaults
        setCondition(defaultCondition.toLowerCase());
        setTemperatureC(defaultTemperatureC);
        setTemperatureF(defaultTemperatureF);
        setLocalTime(null);
        setIsFahrenheit(false);

        // Just set local fallback by default:
        setIconUrl(`${LOCAL_BASE}/default.svg`);
      }
    };

    fetchWeatherAndTime();
  }, [displayCity]);

  // Toggle units
  const toggleTemperatureUnit = () => {
    setIsFahrenheit((prev) => !prev);
  };

  // Format temperature & time
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
      {/* Left Column */}
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
        <p style={{ fontSize: "16px", margin: "0 0 10px 0" }}>{dateTimeString}</p>
      </div>

      {/* Right Column: Weather icon */}
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
            alt="Weather Icon"
            style={{ width: "110px", marginTop: "-40px" }}
            onError={(e) => {
              const imgEl = e.currentTarget as HTMLImageElement;

              // If we haven't tried GH fallback yet, do so:
              if (!imgEl.dataset.fallback) {
                imgEl.dataset.fallback = "true";
                // Attempt to load the same filename from GH Pages
                // e.g. "rain.svg" => "https://eirastaffbase.github.io/weather-time/resources/weather/rain.svg"
                const filenameFromLocalPath = iconUrl.split("/").pop(); // "rain.svg", "cloudy.svg", etc.
                imgEl.src = `${GITHUB_WEATHER_PATH}/${filenameFromLocalPath}`;
              } 
              else if (!imgEl.dataset.fallback2) {
                // If GH also fails, do a final fallback to GH default.svg
                imgEl.dataset.fallback2 = "true";
                imgEl.src = fallbackGHDefault;
              } 
              else {
                // If even that fails, just stop to avoid infinite loop
                console.warn("All icon fallbacks failed. Stopping.");
              }
            }}
          />
        </div>
      )}
    </div>
  );
};
