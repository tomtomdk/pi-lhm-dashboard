require("dotenv").config();

const crypto = require("crypto");
const express = require("express");
const http = require("http");
const https = require("https");
const jwt = require("jsonwebtoken");

const app = express();

const PORT = process.env.PORT || 3030;
const LHM_URL = process.env.LHM_URL || "http://YOUR_PC_IP:8085/data.json";

const WEATHER_LAT = process.env.WEATHER_LAT || "55.6761";
const WEATHER_LON = process.env.WEATHER_LON || "12.5683";
const WEATHER_TZ = process.env.WEATHER_TZ || "Europe/Copenhagen";
const WEATHER_LOCATION = process.env.WEATHER_LOCATION || "Local Area";

const COINBASE_API_KEY_NAME = process.env.COINBASE_API_KEY_NAME || process.env.COINBASE_CDP_API_KEY_NAME || "";
const COINBASE_API_PRIVATE_KEY = process.env.COINBASE_API_PRIVATE_KEY || process.env.COINBASE_CDP_PRIVATE_KEY || "";
const COINBASE_API_HOST = process.env.COINBASE_API_HOST || "api.coinbase.com";
const COINBASE_ACCOUNTS_PATH = process.env.COINBASE_ACCOUNTS_PATH || "/api/v3/brokerage/accounts";
const ADA_BALANCE_MANUAL = process.env.ADA_BALANCE_MANUAL || "";
const CRYPTO_QUOTE_CURRENCY = process.env.CRYPTO_QUOTE_CURRENCY || "DKK";

let weatherCache = {
  updatedAt: 0,
  data: null,
  error: null
};

let adaCache = {
  updatedAt: 0,
  data: null,
  error: null
};

app.use(express.static("public"));

function getJson(url, timeoutMs = 5000, headers = {}) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https://") ? https : http;

    const req = client.get(url, { timeout: timeoutMs, headers }, (res) => {
      let body = "";

      res.on("data", (chunk) => {
        body += chunk;
      });

      res.on("end", () => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(`HTTP ${res.statusCode} from ${url}: ${body.slice(0, 200)}`));
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

function normalizePrivateKey(key) {
  return String(key || "").replace(/\\n/g, "\n").trim();
}

function toBase64Url(buffer) {
  return Buffer.from(buffer)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function buildPrivateKeyObject(rawKey) {
  const key = normalizePrivateKey(rawKey);

  if (!key) {
    throw new Error("Missing Coinbase private key");
  }

  if (key.includes("BEGIN")) {
    return crypto.createPrivateKey(key);
  }

  const privateKeyBytes = Buffer.from(key, "base64");

  if (privateKeyBytes.length === 32) {
    const ecdh = crypto.createECDH("prime256v1");
    ecdh.setPrivateKey(privateKeyBytes);
    const publicKey = ecdh.getPublicKey(null, "uncompressed");

    return crypto.createPrivateKey({
      format: "jwk",
      key: {
        kty: "EC",
        crv: "P-256",
        d: toBase64Url(privateKeyBytes),
        x: toBase64Url(publicKey.subarray(1, 33)),
        y: toBase64Url(publicKey.subarray(33, 65))
      }
    });
  }

  try {
    return crypto.createPrivateKey({
      key: privateKeyBytes,
      format: "der",
      type: "sec1"
    });
  } catch {
    return crypto.createPrivateKey({
      key: privateKeyBytes,
      format: "der",
      type: "pkcs8"
    });
  }
}

function createCoinbaseJwt(method, host, path) {
  const keyName = COINBASE_API_KEY_NAME.trim();

  if (!keyName || !COINBASE_API_PRIVATE_KEY) {
    throw new Error("Missing Coinbase API credentials");
  }

  const privateKey = buildPrivateKeyObject(COINBASE_API_PRIVATE_KEY);
  const now = Math.floor(Date.now() / 1000);
  const uri = `${method.toUpperCase()} ${host}${path}`;

  return jwt.sign(
    {
      iss: "cdp",
      nbf: now,
      exp: now + 120,
      sub: keyName,
      uri
    },
    privateKey,
    {
      algorithm: "ES256",
      header: {
        kid: keyName,
        nonce: crypto.randomBytes(16).toString("hex")
      }
    }
  );
}

async function getCoinbaseAdaBalance() {
  if (ADA_BALANCE_MANUAL !== "") {
    const amount = Number.parseFloat(ADA_BALANCE_MANUAL.replace(",", "."));
    if (!Number.isFinite(amount)) {
      throw new Error("ADA_BALANCE_MANUAL is not a valid number");
    }
    return amount;
  }

  const token = createCoinbaseJwt("GET", COINBASE_API_HOST, COINBASE_ACCOUNTS_PATH);
  const payload = await getJson(`https://${COINBASE_API_HOST}${COINBASE_ACCOUNTS_PATH}`, 7000, {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json"
  });

  const accounts = Array.isArray(payload.accounts) ? payload.accounts : [];
  const adaAccount = accounts.find((account) => String(account.currency || "").toUpperCase() === "ADA");

  if (!adaAccount) {
    return 0;
  }

  const value = adaAccount.available_balance?.value || adaAccount.balance?.value || "0";
  const amount = Number.parseFloat(String(value).replace(",", "."));

  return Number.isFinite(amount) ? amount : 0;
}

async function getAdaSpotPrice() {
  const quote = CRYPTO_QUOTE_CURRENCY.toUpperCase();
  const payload = await getJson(`https://api.coinbase.com/v2/prices/ADA-${quote}/spot`, 7000);
  const price = Number.parseFloat(String(payload.data?.amount || "0"));

  if (!Number.isFinite(price)) {
    throw new Error(`Could not parse ADA-${quote} price`);
  }

  return price;
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

app.get("/api/crypto/ada", async (req, res) => {
  const now = Date.now();
  const maxAgeMs = 5 * 60 * 1000;

  if (adaCache.data && now - adaCache.updatedAt < maxAgeMs) {
    res.json({
      ok: true,
      cached: true,
      updatedAt: new Date(adaCache.updatedAt).toISOString(),
      data: adaCache.data
    });
    return;
  }

  if (!ADA_BALANCE_MANUAL && (!COINBASE_API_KEY_NAME || !COINBASE_API_PRIVATE_KEY)) {
    res.json({
      ok: false,
      enabled: false,
      error: "Missing Coinbase API credentials or ADA_BALANCE_MANUAL"
    });
    return;
  }

  try {
    const [adaAmount, adaPrice] = await Promise.all([
      getCoinbaseAdaBalance(),
      getAdaSpotPrice()
    ]);

    const quote = CRYPTO_QUOTE_CURRENCY.toUpperCase();
    const data = {
      asset: "ADA",
      quoteCurrency: quote,
      amount: adaAmount,
      price: adaPrice,
      value: adaAmount * adaPrice
    };

    adaCache = {
      updatedAt: now,
      data,
      error: null
    };

    res.json({
      ok: true,
      cached: false,
      updatedAt: new Date(now).toISOString(),
      data
    });
  } catch (err) {
    adaCache.error = err.message;

    res.status(502).json({
      ok: false,
      enabled: true,
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
  console.log(`ADA balance display: ${ADA_BALANCE_MANUAL || COINBASE_API_KEY_NAME ? "enabled" : "disabled"}`);
});
