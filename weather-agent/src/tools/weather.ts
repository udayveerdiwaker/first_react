/**
 * Fetches current weather for a given city using the OpenWeather API.
 *
 * This function:
 * 1. Validates that an API key is configured
 * 2. Cleans the city name to ensure valid API calls
 * 3. Sets a 5-second timeout to prevent hanging requests
 * 4. Calls the OpenWeather API with metric units (Celsius)
 * 5. Fetches AQI data using coordinates from weather response
 * 6. Returns weather data + AQI or a friendly error message
 *
 * The function handles several types of errors gracefully:
 * - Missing API key: Returns a clear error message
 * - Invalid city name: Detected and reported
 * - API timeout: Happens if the request takes too long
 * - Invalid response: City not found or API error
 *
 * Success returns an object with:
 * - city: The city name from the API response
 * - temp: Temperature rounded to nearest degree (Celsius)
 * - weather: Description of conditions (e.g., "Sunny", "Rainy")
 * - humidity: Percentage humidity (0-100)
 * - wind: Wind speed in m/s
 * - icon: OpenWeather icon code for the condition
 * - aqi: Air Quality Index (1-5)
 * - aqiLevel: Human-readable AQI level
 *
 * @param city - City name to get weather for (e.g., "London", "Tokyo")
 * @returns Promise resolving to weather data object or error object
 * @throws Never throws - always returns an object, either with data or error
 */
export async function getWeather(city: string) {
  try {
    // Get the API key from environment variables
    const API_KEY = import.meta.env.VITE_WEATHER_API_KEY;

    // If no API key is configured, return a helpful error
    if (!API_KEY) {
      console.error("Weather API key is not configured");
      return { error: "❌ API key missing" };
    }

    // Clean the city input to ensure it's valid for the API
    // Remove special characters but keep spaces for multi-word cities like "New York"
    const cleanCity = city
      .toLowerCase()
      .replace(/[^a-z\s]/gi, "")
      .trim();

    // If the city name is empty after cleaning, it was invalid
    if (!cleanCity) {
      console.error("Invalid city name after cleaning:", city);
      return { error: "❌ Invalid city name" };
    }

    console.log("Fetching weather for city:", cleanCity);

    // Set up a timeout so the request doesn't hang forever (5 seconds max)
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      console.warn("Weather request timeout for city:", cleanCity);
      controller.abort();
    }, 5000);

    try {
      // Make the API request to OpenWeather
      const res = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${cleanCity}&appid=${API_KEY}&units=metric`,
        { signal: controller.signal }
      );

      // Clear the timeout since the request completed
      clearTimeout(timeout);

      // Parse the response JSON
      const data = await res.json();

      console.log("Weather API response:", res.status, data);

      // Check if the request was successful and the API returned weather data
      if (!res.ok || !data.main) {
        const errorMsg = data.message || "City not found";
        console.error("Weather API error:", errorMsg);
        return { error: errorMsg };
      }

      // Fetch AQI data using the coordinates from weather response
      let aqi = null;
      let aqiLevel = "N/A";

      if (data.coord) {
        try {
          console.log("Fetching AQI data for coordinates:", data.coord);
          const aqiRes = await fetch(
            `https://api.openweathermap.org/data/2.5/air_pollution?lat=${data.coord.lat}&lon=${data.coord.lon}&appid=${API_KEY}`,
            { signal: controller.signal }
          );

          if (aqiRes.ok) {
            const aqiData = await aqiRes.json();
            aqi = aqiData.list?.[0]?.main?.aqi;
            console.log("AQI data:", aqi);

            // Convert numeric AQI to human-readable level
            const aqiLevels: { [key: number]: string } = {
              1: "Good",
              2: "Fair",
              3: "Moderate",
              4: "Poor",
              5: "Very Poor",
            };
            aqiLevel = aqiLevels[aqi] || "N/A";
          }
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (e) {
          // AQI fetch failed, but weather data is still valid
          console.warn("AQI fetch failed:", e);
        }
      }

      const result = {
        city: data.name,
        temp: Math.round(data.main.temp), // Round to nearest degree
        weather: data.weather?.[0]?.description || "N/A",
        humidity: data.main.humidity,
        wind: data.wind.speed,
        icon: data.weather?.[0]?.icon,
        aqi: aqi,
        aqiLevel: aqiLevel,
      };

      console.log("Weather tool result:", result);
      return result;
    } finally {
      clearTimeout(timeout);
    }
  } catch (error: any) {
    console.error("Weather tool error:", error);

    // Handle timeout errors specifically
    if (error.name === "AbortError") {
      return { error: "⏱ Weather request timeout" };
    }

    // Generic error for any other issues
    return { error: "❌ Unable to fetch weather" };
  }
}
