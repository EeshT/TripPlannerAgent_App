import os
import requests
from collections import defaultdict, Counter
from typing import List
from schema import WeatherForecast, Suitability, PlannerState
from dotenv import load_dotenv

load_dotenv()

OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY")

def fetch_weather(destination: str) -> List[WeatherForecast]:
    """
    Fetch weather forecast for a destination and aggregate OpenWeather's 3-hour forecasts into daily forecasts.
    Returns: List[WeatherForecast]
    """

    if not OPENWEATHER_API_KEY:
        raise ValueError("OPENWEATHER_API_KEY environment variable is not set.")

    url = "https://api.openweathermap.org/data/2.5/forecast"

    params = {
        "q": destination,
        "appid": OPENWEATHER_API_KEY,
        "units": "metric"
    }

    try:
        response = requests.get(
            url,
            params=params,
            timeout=10
        )

        response.raise_for_status()

    except requests.exceptions.RequestException as e:
        raise RuntimeError(f"Failed to fetch weather for '{destination}': {e}")

    data = response.json()

    if "list" not in data:
        raise RuntimeError(f"Unexpected API response for '{destination}': {data}")

    daily_forecasts = defaultdict(list)

    # Group 3-hour forecasts by date
    for forecast in data["list"]:
        date = forecast["dt_txt"].split()[0]
        daily_forecasts[date].append(forecast)

    results: List[WeatherForecast] = []

    for date in sorted(daily_forecasts.keys()):

        forecasts = daily_forecasts[date]

        temps = [f["main"]["temp"] for f in forecasts]

        humidities = [ f["main"]["humidity"] for f in forecasts ]

        wind_speeds = [ f["wind"]["speed"] for f in forecasts]

        rain_probs = [ f.get("pop", 0.0) for f in forecasts]

        conditions = [ f["weather"][0]["main"] for f in forecasts]

        # Aggregate metrics
        avg_temp = round( sum(temps) / len(temps), 1)

        min_temp = round( min(temps), 1)

        max_temp = round(max(temps),1)

        avg_rain_prob = round( sum(rain_probs) / len(rain_probs), 2)

        avg_humidity = round(sum(humidities) / len(humidities))

        avg_wind_speed = round(sum(wind_speeds) / len(wind_speeds), 1)

        dominant_condition = (Counter(conditions).most_common(1)[0][0])

        # Travel suitability logic
        if (avg_rain_prob >= 0.7 or dominant_condition in {"Thunderstorm","Snow"}):
            suitability = Suitability.INDOOR

        elif avg_temp >= 40:
            suitability = Suitability.INDOOR

        elif (avg_temp >= 35 or avg_wind_speed > 10):
            suitability = Suitability.LIGHT_OUTDOOR

        else:
            suitability = Suitability.OUTDOOR

        weather = WeatherForecast(
            date=date,
            condition=dominant_condition,
            temperature=avg_temp,
            min_temp=min_temp,
            max_temp=max_temp,
            rain_probability=avg_rain_prob,
            humidity=avg_humidity,
            wind_speed=avg_wind_speed,
            suitability=suitability
        )

        results.append(weather)

    return results

def get_weather(state: PlannerState):
    
    print("\n========== ENTERED WEATHER NODE ==========")
    try:
        destination = state["user_request"].destination

        weather = fetch_weather(destination)

        state["weather"] = weather

    except Exception as e:

        print(f"Weather discovery failed: {e}")

        state["weather"] = []
        
    print("\n========== EXITED WEATHER NODE ==========")

    return state

        