// export async function getWeather(city: string) {
//   try {
//     const API_KEY = import.meta.env.VITE_WEATHER_API_KEY;

//     const res = await fetch(
//       `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}&units=metric`
//     );

//     if (!res.ok) {
//       throw new Error("City not found");
//     }

//     const data = await res.json();

//     return {
//       city: data.name,
//       temp: data.main.temp,
//       weather: data.weather[0].description,
//       humidity: data.main.humidity,
//       wind: data.wind.speed,
//       icon: data.weather[0].icon,
//     };
//   } catch (error) {
//     return {
//       error: "❌ Unable to fetch weather. Try another city.",
//     };
//   }
// }
export async function getWeather(city: string) {
  try {
    const API_KEY = import.meta.env.VITE_WEATHER_API_KEY;

    if (!API_KEY) {
      return { error: "❌ API key missing" };
    }

    // 🔥 clean city input
    const cleanCity = city
      .toLowerCase()
      .replace(/[^a-z\s]/gi, "")
      .trim();

    if (!cleanCity) {
      return { error: "❌ Invalid city name" };
    }

    // 🔥 timeout (important)
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${cleanCity}&appid=${API_KEY}&units=metric`,
      { signal: controller.signal }
    );

    clearTimeout(timeout);

    const data = await res.json();

    if (!res.ok || !data.main) {
      return { error: data.message || "City not found" };
    }

    return {
      city: data.name,
      temp: Math.round(data.main.temp),
      weather: data.weather?.[0]?.description || "N/A",
      humidity: data.main.humidity,
      wind: data.wind.speed,
      icon: data.weather?.[0]?.icon,
    };
  } catch (error: any) {
    if (error.name === "AbortError") {
      return { error: "⏱ Weather request timeout" };
    }

    return { error: "❌ Unable to fetch weather" };
  }
}
