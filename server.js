require("dotenv").config();

const express = require("express");
const http = require("http");
const https = require("https");

const app = express();

const PORT = process.env.PORT || 3030;
const LHM_URL = process.env.LHM_URL || "http://YOUR_PC_IP:8085/data.json";

const WEATHER_LAT = process.env.WEATHER_LAT || "55.6761";
const WEATHER_LON = process.env.WEATHER_LON || "12.5683";
const WEATHER_TZ = process.env.WEATHER_TZ || "Europe/Copenhagen";
const WEATHER_LOCATION = process.env.WEATHER_LOCATION || "Local Area";

let weatherCache = {
  updatedAt: 0,
  data: null,
  error: null
};

app.use(express.static("public"));

function getJson(url, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https://") ? https : http;

    const req = client.get(url, { timeout: timeoutMs }, (res) => {
      let body = "";

      res.on("data", (chunk) => {
        body += chunk;
      });

      res.on("end", () => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(`HTTP ${res.statusCode} from ${url}`));
          return;
        }

        try {
          resolve(JSON.parse(body));
        } catch (err) {
          reject(new Error(`JSON parse failed from ${url}: ${err.message}`));
        }
      });
    });

    req.on("timeout", () => {
      req.destroy(new Error(`Timeout while requesting ${url}`));
    });

    req.on("error", reject);
  });
}

app.get("/api/sensors", async (req, res) => {
  try {
    const data = await getJson(LHM_URL, 3500);

    res.json({
      ok: true,
      mode: "pc",
      source: LHM_URL,
      updatedAt: new Date().toISOString(),
      data
    });
  } catch (err) {
    res.status(502).json({
      ok: false,
      mode: "fallback",
      source: LHM_URL,
      error: err.message
    });
  }
});

app.get("/api/weather", async (req, res) => {
  const now = Date.now();
  const maxAgeMs = 10 * 60 * 1000;

  if (weatherCache.data && now - weatherCache.updatedAt < maxAgeMs) {
    res.json({
      ok: true,
      cached: true,
      location: WEATHER_LOCATION,
      updatedAt: new Date(weatherCache.updatedAt).toISOString(),
      data: weatherCache.data
    });
    return;
  }

  const weatherUrl =
    "https://api.open-meteo.com/v1/forecast" +
    `?latitude=${encodeURIComponent(WEATHER_LAT)}` +
    `&longitude=${encodeURIComponent(WEATHER_LON)}` +
    `&timezone=${encodeURIComponent(WEATHER_TZ)}` +
    "&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m" +
    "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max" +
    "&forecast_days=3";

  try {
    const data = await getJson(weatherUrl, 6000);

    weatherCache = {
      updatedAt: now,
      data,
      error: null
    };

    res.json({
      ok: true,
      cached: false,
      location: WEATHER_LOCATION,
      updatedAt: new Date(now).toISOString(),
      data
    });
  } catch (err) {
    weatherCache.error = err.message;

    res.status(502).json({
      ok: false,
      location: WEATHER_LOCATION,
      error: err.message
    });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Dashboard running on http://localhost:${PORT}`);
  console.log(`Using LibreHardwareMonitor source: ${LHM_URL}`);
  console.log(`Weather location: ${WEATHER_LOCATION} (${WEATHER_LAT}, ${WEATHER_LON})`);
});
