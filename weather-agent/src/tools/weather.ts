/**
 * Fetches current weather for a given city using the OpenWeather API.
 *
 * This function:
 * 1. Validates that an API key is configured
 * 2. Cleans the city name to ensure valid API calls
 * 3. Sets a 5-second timeout to prevent hanging requests
 * 4. Calls the OpenWeather API with metric units (Celsius)
 * 5. Returns weather data or a friendly error message
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
      return { error: "❌ Invalid city name" };
    }

    // Set up a timeout so the request doesn't hang forever (5 seconds max)
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    // Make the API request to OpenWeather
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${cleanCity}&appid=${API_KEY}&units=metric`,
      { signal: controller.signal }
    );

    // Clear the timeout since the request completed
    clearTimeout(timeout);

    // Parse the response JSON
    const data = await res.json();

    // Check if the request was successful and the API returned weather data
    if (!res.ok || !data.main) {
      return { error: data.message || "City not found" };
    }

    // Extract and format weather data to return
    return {
      city: data.name,
      temp: Math.round(data.main.temp), // Round to nearest degree
      weather: data.weather?.[0]?.description || "N/A",
      humidity: data.main.humidity,
      wind: data.wind.speed,
      icon: data.weather?.[0]?.icon,
    };
  } catch (error: any) {
    // Handle timeout errors specifically
    if (error.name === "AbortError") {
      return { error: "⏱ Weather request timeout" };
    }

    // Generic error for any other issues
    return { error: "❌ Unable to fetch weather" };
  }
}
