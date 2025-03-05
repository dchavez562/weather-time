/*!
 * (C) 2024, Staffbase GmbH
 */
import React, { ReactElement, useState, useEffect, useRef } from "react";
import { BlockAttributes } from "widget-sdk";

// Single function that maps condition `code` -> one of your icons
function getIconFilename(code: number, timeOfDay: "day" | "night"): string {

  switch (code) {
    // -- Clear / Sunny
    case 1000:
      return timeOfDay === "day" ? "sunny.svg" : "clear-moon.svg";

    // -- Partly cloudy
    case 1003:
      return timeOfDay === "day"
        ? "double-clouds.svg"
        : "partly-cloudy-moon.svg";

    // -- Cloudy / Overcast
    case 1006:
    case 1009:
      return "cloudy.svg";

    // -- Mist / Fog
    case 1030:
    case 1135:
    case 1147:
      return "mist.svg";

    // -- Drizzle
    case 1063:
    case 1072:
    case 1150:
    case 1153:
    case 1168:
    case 1171:
      return "drizzle.svg";

    // -- Rain
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

    // -- Snow / Sleet / Ice Pellets
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

    // -- Thunderstorm
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


// Format date/time as "Nov 26th, 9am"
function formatDateTime(date: Date): string {
  const month = date.toLocaleString("en-US", { month: "short" });
  const day = date.getDate();
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
  // We'll use default.svg if we can't find a code
  const defaultLocalIcon = "default.svg";

  // If your index.html is in `resources/`, and images are in `weather/`,
  // you can use a relative path like `./weather`.
  // On GitHub Pages, you might need something like `/weather-time/resources/weather`.
  // Adjust as needed for your hosting structure:
  const basePath = "./weather";

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
          // Condition text
          setCondition(data.current.condition.text.toLowerCase());

          // Temperature
          setTemperatureC(data.current.temp_c);
          setTemperatureF(data.current.temp_f);

          // Fahrenheit vs Celsius logic
          setIsFahrenheit(data.location?.country === "United States of America");

          // Use the WeatherAPI condition code
          const weatherCode = data.current.condition.code || 1000;

          // **Use WeatherAPI's `is_day` field for day/night detection**
          const timeOfDay = data.current.is_day === 1 ? "day" : "night"; // 1 = day, 0 = night


          // Get the correct image filename from the big switch
          const filename = getIconFilename(weatherCode, timeOfDay as "day" | "night");

          // Build final icon URL from `basePath`
          setIconUrl(`${basePath}/${filename}`);

          // Set local time (static, no auto-update)
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
        // Fallback values
        setCondition(defaultCondition.toLowerCase());
        setTemperatureC(defaultTemperatureC);
        setTemperatureF(defaultTemperatureF);
        setLocalTime(null);
        setIsFahrenheit(false);
        setIconUrl(`${basePath}/${defaultLocalIcon}`);
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
        position: "relative"
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

      {/* Right Column: Weather icon (with single fallback on error) */}
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
              // If the icon can't be loaded, fallback to `default.svg`
              (e.currentTarget as HTMLImageElement).src = `${basePath}/${defaultLocalIcon}`;
            }}
          />
        </div>
      )}
    </div>
  );
};
