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
      return timeOfDay === "day" ? "partly-cloudy-sun.svg" : "partly-cloudy-moon.svg";
    case 1006:
      return "cloudy.svg";
    case 1009:
      return "double-clouds.svg";
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
      return timeOfDay === "day" ? "drizzle.svg" : "drizzle-moon.svg";
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
 * Format date/time as "Nov 26th, 9:05am"
 */
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

  return `${month} ${day}${suffix}, ${hours}:${minutes.toString().padStart(2, "0")}${ampm}`;
}

export interface WeatherTimeProps extends BlockAttributes {
  city: string;
  allowcityoverride: boolean;
}

export const WeatherTime = (props: WeatherTimeProps): ReactElement => {
  const containerRef = useRef<HTMLDivElement>(null);

  const { city, allowcityoverride } = props;

  // State
  const [condition, setCondition] = useState<string>("Loading...");
  const [iconUrl, setIconUrl] = useState<string>("");
  const [temperatureC, setTemperatureC] = useState<number | null>(null);
  const [temperatureF, setTemperatureF] = useState<number | null>(null);
  const [isFahrenheit, setIsFahrenheit] = useState<boolean>(false);
  const [localTime, setLocalTime] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [overrideCity, setOverrideCity] = useState<string | null>(null);
  const [showPopup, setShowPopup] = useState<boolean>(false);
  const [overrideInput, setOverrideInput] = useState<string>("");
  const isCityOverrideAllowed =
    allowcityoverride === "true" ? true : allowcityoverride === "false" ? false : Boolean(allowcityoverride);

  // Layout-related state
  const [isSmallWidget, setIsSmallWidget] = useState(false);

  // Defaults
  const defaultCity = "New York City";
  const defaultCondition = "Patchy light snow";
  const defaultTemperatureC = 27;
  const defaultTemperatureF = (27 * 9) / 5 + 32;

  // Local dev path
  const LOCAL_BASE = "./img";
  // GH Pages fallback
  const GITHUB_WEATHER_PATH = "https://eirastaffbase.github.io/weather-time/resources/img";
  const fallbackGHDefault = `${GITHUB_WEATHER_PATH}/default.svg`;

  // City display
  const displayCity = overrideCity || city || defaultCity;

  const [cityName, setCity] = useState<string>(displayCity);
  const [region, setRegion] = useState<string>("");
  const [country, setCountry] = useState<string>("");

  // ======== Handle widget width to switch layout ========
  useEffect(() => {
    if (!containerRef.current) return;

    const handleResize = () => {
      if (containerRef.current) {
        setIsSmallWidget(containerRef.current.offsetWidth < 200);
      }
    };

    // Observe container size changes
    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    resizeObserver.observe(containerRef.current);

    // Do an initial size check
    handleResize();

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // ======== Fetch weather & time ========
  const fetchWeatherAndTime = async () => {
    setIsLoading(true); // start loading
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
        setIsFahrenheit(data.location?.country === "United States of America");

        // Get correct icon
        const weatherCode = data.current.condition.code || 1000;
        const timeOfDay = data.current.is_day === 1 ? "day" : "night";
        const filename = getIconFilename(weatherCode, timeOfDay as "day" | "night");
        setIconUrl(`${GITHUB_WEATHER_PATH}/${filename}`);

        if (data.location?.localtime) {
          setLocalTime(new Date(data.location.localtime));
        } else {
          setLocalTime(new Date());
        }

        if (data.location) {
          setCity(data.location.name);
          setRegion(data.location.region);
          setCountry(data.location.country);
        }

        // Use the coordinates from the weather API to fetch the current time
        if (data.location && data.location.lat != null && data.location.lon != null) {
          const { lat, lon } = data.location;
          const timeResponse = await fetch(
            `https://timeapi.io/api/Time/current/coordinate?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(
              lon
            )}`
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
      setIconUrl(`${GITHUB_WEATHER_PATH}/default.svg`);
    } finally {
      setIsLoading(false); // done loading
    }
  };

  useEffect(() => {
    fetchWeatherAndTime();
  }, [displayCity]);

  // Start live clock once localTime is set
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

  // Refresh weather data every 10 minutes
  useEffect(() => {
    const weatherInterval = setInterval(() => {
      fetchWeatherAndTime();
    }, 600_000); // 10 minutes

    return () => clearInterval(weatherInterval);
  }, []);

  // Toggles temperature unit
  const toggleTemperatureUnit = () => {
    setIsFahrenheit((prev) => !prev);
  };

  // Refresh on click
  const handleRefresh = () => {
    fetchWeatherAndTime();
  };

  // Popup city override
  const handleSetCityOverride = () => {
    setOverrideCity(overrideInput.trim() || null);
    setShowPopup(false);
  };

  const temperature = isFahrenheit ? temperatureF : temperatureC;
  const dateTimeString = localTime ? formatDateTime(localTime) : formatDateTime(new Date());

  return (
    <div
      ref={containerRef}
      style={{
        // Use flex but dynamically switch direction/alignment
        display: "flex",
        flexDirection: isSmallWidget ? "column" : "row",
        flexWrap: "nowrap",
        justifyContent: isSmallWidget ? "flex-end" : "space-between",
        alignItems: isSmallWidget ? "flex-end" : "flex-start",
        padding: "10px",
        position: "relative",
      }}
    >
      {isLoading && (
        <div
          style={{
            position: "absolute",
            top: -20,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(255,255,255,0.7)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 10,
          }}
        >
          <img
            src="https://eirastaffbase.github.io/weather-time/resources/img/loading.gif"
            alt="loading"
            style={{ width: "30px" }}
          />
        </div>
      )}

      {/** 
       * ------ SMALLEST LAYOUT -------
       * Hide date, stack temp under image, right-align.
       */}
      {isSmallWidget ? (
        <React.Fragment>
          {/* Icon on top */}
          {iconUrl && (
            <img
              src={iconUrl}
              onClick={handleRefresh}
              alt="Weather Icon"
              style={{ width: "80px", marginBottom: "10px", cursor: "pointer" }}
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
          )}

          {/* Temp below icon */}
          {temperature !== null && (
            <p
              onClick={toggleTemperatureUnit}
              style={{
                cursor: "pointer",
                fontSize: "24px",
                fontWeight: "bold",
                margin: "0",
              }}
            >
              {Math.round(temperature)}°{isFahrenheit ? "F" : "C"}
            </p>
          )}
          {/* Date is hidden in this layout */}
        </React.Fragment>
      ) : (
        /** 
         * ------ NORMAL LAYOUT ( >= 300px ) ------ 
         * Show date, place temp/date at left, icon at right. 
         */
        <>
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
            <p onClick={handleRefresh} style={{ fontSize: "16px", margin: "0 0 10px 0" }}>
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
                style={{ width: "165px", marginTop: "-60px", marginLeft: "-5px", cursor: "pointer" }}
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
        </>
      )}

      {isCityOverrideAllowed && (
        <div
          onClick={() => setShowPopup(true)}
          style={{
            position: "absolute",
            bottom: "5px",
            right: "5px",
            cursor: "pointer",
            opacity: 0.5,
          }}
        >
          <p>...</p>
        </div>
      )}

      {showPopup && (
        <div
          style={{
            position: "absolute",
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0,0,0,0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
        >
          <div
            style={{
              backgroundColor: "#fff",
              padding: "20px",
              borderRadius: "6px",
              minWidth: "250px",
            }}
          >
            <p>
              <b>Current City: </b>
              {cityName}
              {region ? `, ${region}` : ""}
              {country ? `, ${country}` : ""}
            </p>

            <input
              type="text"
              placeholder="Type a city..."
              value={overrideInput}
              onChange={(e) => setOverrideInput(e.target.value)}
              style={{ width: "100%", marginBottom: "10px", marginTop: "10px" }}
            />
            <div>
              <button onClick={handleSetCityOverride} style={{ marginBottom: "10px" }}>
                OK
              </button>
              <button onClick={() => setShowPopup(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};