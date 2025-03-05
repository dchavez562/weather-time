/*!
 * Copyright 2024, Staffbase GmbH and contributors.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import React, { ReactElement, useState, useEffect, useRef } from "react";
import { BlockAttributes } from "widget-sdk";

// Utility function to format date/time as "Nov 26th, 9am"
function formatDateTime(date: Date): string {
  const month = date.toLocaleString("en-US", { month: "short" }); // e.g. "Nov"
  const day = date.getDate(); // e.g. 26
  const hours = date.getHours() % 12 || 12; // convert to 12-hour
  const minutes = date.getMinutes();
  const ampm = date.getHours() >= 12 ? "pm" : "am";

  // Ordinal suffix helper (1st, 2nd, 3rd, 4th, etc.)
  const getOrdinalSuffix = (n: number): string => {
    if (n % 10 === 1 && n % 100 !== 11) return "st";
    if (n % 10 === 2 && n % 100 !== 12) return "nd";
    if (n % 10 === 3 && n % 100 !== 13) return "rd";
    return "th";
  };

  const suffix = getOrdinalSuffix(day);

  // Build time string; if minutes are zero, drop them to get "9am" instead of "9:00am"
  const timeString = minutes === 0 ? `${hours}${ampm}` : `${hours}:${minutes.toString().padStart(2, "0")}${ampm}`;

  return `${month} ${day}${suffix}, ${timeString}`;
}

export interface WeatherTimeProps extends BlockAttributes {
  city: string;
}

export const WeatherTime = ({ city }: WeatherTimeProps): ReactElement => {
  const containerRef = useRef<HTMLDivElement>(null);

  const [condition, setCondition] = useState<string>("Loading...");
  const [iconUrl, setIconUrl] = useState<string>("");
  const [temperatureC, setTemperatureC] = useState<number | null>(null);
  const [temperatureF, setTemperatureF] = useState<number | null>(null);
  const [isFahrenheit, setIsFahrenheit] = useState<boolean>(false);
  const [localTime, setLocalTime] = useState<Date | null>(null);

  const [isSmallScreen, setIsSmallScreen] = useState(false);

  // Defaults, in case the API fails
  const defaultCity = "New York City";
  const defaultCondition = "Patchy light snow";
  const defaultTemperatureC = 27;
  const defaultTemperatureF = (27 * 9) / 5 + 32; // Convert 27°C to °F
  const defaultLocalTime = "12:00 PM";
  const defaultIconUrl = "https://cdn.weatherapi.com/weather/64x64/night/323.png";

  const displayCity = city || defaultCity;

  // -- Detect container width changes for responsive layout
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setIsSmallScreen(entry.contentRect.width < 400);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // -- Fetch weather & time
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
          // Weather
          let icon = data.current.condition.icon;
          if (icon.startsWith("//")) {
            icon = `https:${icon}`;
          }
          setCondition(data.current.condition.text.toLowerCase());
          setIconUrl(icon);
          setTemperatureC(data.current.temp_c);
          setTemperatureF(data.current.temp_f);

          // If in the US, default to Fahrenheit; otherwise Celsius
          if (data.location?.country === "United States of America") {
            setIsFahrenheit(true);
          } else {
            setIsFahrenheit(false);
          }

          // Time
          if (data.location) {
            const latitude = data.location.lat;
            const longitude = data.location.lon;
            const timeResponse = await fetch(
              `https://timeapi.io/api/Time/current/coordinate?latitude=${encodeURIComponent(latitude)}&longitude=${encodeURIComponent(longitude)}`
            );

            if (!timeResponse.ok) {
              throw new Error("Network response was not ok for time data");
            }

            const timeData = await timeResponse.json();
            if (timeData?.dateTime) {
              setLocalTime(new Date(timeData.dateTime));
            } else {
              setLocalTime(null);
            }
          }
        } else {
          throw new Error("Invalid data received from weather API");
        }
      } catch (error) {
        console.error("Error fetching weather data:", error);
        // Fallback to defaults
        setCondition(defaultCondition.toLowerCase());
        setIconUrl(defaultIconUrl);
        setTemperatureC(defaultTemperatureC);
        setTemperatureF(defaultTemperatureF);
        setLocalTime(null);
        setIsFahrenheit(false);
      }
    };

    fetchWeatherAndTime();
  }, [displayCity]);

  // -- Update localTime every second
  useEffect(() => {
    if (!localTime) return;
    const intervalId = setInterval(() => {
      setLocalTime((prev) => (prev ? new Date(prev.getTime() + 1000) : prev));
    }, 1000);
    return () => clearInterval(intervalId);
  }, [localTime]);

  // -- Toggle between Fahrenheit/Celsius on click
  const toggleTemperatureUnit = () => {
    setIsFahrenheit((prev) => !prev);
  };

  const temperature = isFahrenheit ? temperatureF : temperatureC;
  // Format the date/time
  const dateTimeString = localTime ? formatDateTime(localTime) : `${formatDateTime(new Date())}`; // fallback

  return (
    <div
      ref={containerRef}
      style={{
        display: "flex",
        flexDirection: isSmallScreen ? "column" : "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        padding: "10px",
        position: "relative"
      }}
    >
      {/* Left Column */}
      <div style={{ marginBottom: isSmallScreen ? "20px" : "0" }}>
        {/* Temperature */}
        {temperature !== null && (
          <p
            onClick={toggleTemperatureUnit}
            style={{
              cursor: "pointer",
              fontSize: "32px",
              fontWeight: "bold",
              margin: "0 0 10px 0"
            }}
          >
            {temperature.toFixed(1)}°{isFahrenheit ? "F" : "C"}
          </p>
        )}

        {/* Date/Time */}
        <p style={{ fontSize: "16px", margin: "0 0 10px 0" }}>
          {dateTimeString}
        </p>

      </div>

      {/* Right Column: Weather icon (larger, negative top margin) */}
      {iconUrl && (
        <div
          style={{
            marginTop: "-20px", // negative margin to lift it above the container
            marginLeft: isSmallScreen ? "0" : "20px",
            display: "flex",
            alignItems: "center"
          }}
        >
          <img
            src={iconUrl}
            alt="Weather Icon"
            style={{
              width: "80px",
              height: "80px"
            }}
          />
        </div>
      )}
    </div>
  );
};
