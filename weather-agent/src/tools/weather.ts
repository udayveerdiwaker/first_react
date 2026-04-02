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
      console.error("Missing API key");
      return { error: "❌ API key missing" };
    }

    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}&units=metric`
    );

    const data = await res.json();
    console.log("Weather API:", data);

    if (!res.ok) {
      return { error: data.message || "City not found" };
    }

    return {
      city: data.name,
      temp: data.main.temp,
      weather: data.weather[0].description,
      humidity: data.main.humidity,
      wind: data.wind.speed,
      icon: data.weather[0].icon,
    };
  } catch (error) {
    console.error("Weather Error:", error);
    return {
      error: "❌ Unable to fetch weather. Try again.",
    };
  }
}
