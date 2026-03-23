export async function getWeather(city: string) {
  const API_KEY = import.meta.env.VITE_WEATHER_API_KEY;

  const res = await fetch(
    `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}&units=metric`
  );

  const data = await res.json();

  return {
    city: data.name,
    temp: data.main.temp,
    weather: data.weather[0].description,
  };
}
