const STORAGE_KEY = "lhm-dashboard-card-presets-v1";

const DEFAULT_LAYOUT = {
  cpu: "default",
  gpu: "default",
  ram: "default",
  vram: "default",
  fans: "gpu",
  storage: "default"
};

const PRESETS = {
  cpu: [
    { id: "default", name: "CPU Overview", description: "Temperature, load, clock and package power.", title: "CPU", sub: "Processor", a: "cpu-temp", b: "cpu-load", bar: "cpu-load", x: "cpu-clock", y: "cpu-power", la: "Temp", lb: "Load", lx: "Clock", ly: "Power" },
    { id: "thermals", name: "CPU Thermals", description: "CPU temperature plus nearby thermal sensors where available.", title: "CPU", sub: "Thermals", a: "cpu-temp", b: "cpu-temp2", bar: "cpu-load", x: "cpu-temp3", y: "cpu-load", la: "Temp", lb: "Sensor 2", lx: "Sensor 3", ly: "Load" },
    { id: "power", name: "CPU Power", description: "CPU power, load, clock and temperature.", title: "CPU", sub: "Power", a: "cpu-power", b: "cpu-load", bar: "cpu-load", x: "cpu-clock", y: "cpu-temp", la: "Power", lb: "Load", lx: "Clock", ly: "Temp" }
  ],
  gpu: [
    { id: "default", name: "GPU Overview", description: "Core temperature, load, hotspot and memory junction.", title: "GPU", sub: "Graphics", a: "gpu-temp", b: "gpu-load", bar: "gpu-load", x: "gpu-hotspot", y: "gpu-mem", la: "Core", lb: "Load", lx: "Hotspot", ly: "Mem Junc." },
    { id: "thermals", name: "GPU Thermals", description: "Hotspot, memory junction, core and fan speed.", title: "GPU", sub: "Thermals", a: "gpu-hotspot", b: "gpu-mem", bar: "gpu-load", x: "gpu-temp", y: "gpu-fan-percent", la: "Hotspot", lb: "Mem Junc.", lx: "Core", ly: "Fan" },
    { id: "clocks", name: "GPU Clocks", description: "Core clock, memory clock, load and power.", title: "GPU", sub: "Clocks", a: "gpu-clock", b: "gpu-mem-clock", bar: "gpu-load", x: "gpu-load", y: "gpu-power", la: "Core", lb: "Memory", lx: "Load", ly: "Power" }
  ],
  ram: [
    { id: "default", name: "System RAM", description: "Physical memory load, used and free.", title: "RAM", sub: "System", a: "ram-load", bar: "ram-load", x: "ram-used", y: "ram-free", la: "Memory", lx: "Used", ly: "Free" },
    { id: "virtual", name: "Virtual Memory", description: "Virtual memory load, used and available.", title: "Virtual", sub: "Memory", a: "virtual-load", bar: "virtual-load", x: "virtual-used", y: "virtual-free", la: "Memory", lx: "Used", ly: "Available" }
  ],
  vram: [
    { id: "default", name: "GPU VRAM", description: "Dedicated GPU memory used, total and free.", title: "VRAM", sub: "GPU Memory", a: "vram-used", ratioUsed: "vram-used", ratioTotal: "vram-total", x: "vram-total", y: "vram-free", la: "Used", lx: "Total", ly: "Free" },
    { id: "free", name: "VRAM Free", description: "Free VRAM with used and total below.", title: "VRAM", sub: "Free", a: "vram-free", ratioUsed: "vram-used", ratioTotal: "vram-total", x: "vram-used", y: "vram-total", la: "Free", lx: "Used", ly: "Total" }
  ],
  fans: [
    { id: "gpu", name: "GPU Fans", description: "GPU fan 1, GPU fan 2 and fan percentage.", title: "GPU Fans", sub: "Cooling", a: "gpu-fan1", b: "gpu-fan2", x: "gpu-fan-percent", yStatic: "GPU", la: "Fan 1", lb: "Fan 2", lx: "Fan Speed", ly: "Source" },
    { id: "case", name: "Case Fans", description: "First available motherboard fan sensors.", title: "Case Fans", sub: "Motherboard", a: "case-fan1", b: "case-fan2", x: "case-fan3", y: "case-fan4", la: "Fan 1", lb: "Fan 2", lx: "Fan 3", ly: "Fan 4" },
    { id: "chipset", name: "Board Cooling", description: "Board fan and motherboard temperatures when available.", title: "Board", sub: "Cooling", a: "case-fan1", b: "board-temp1", x: "board-temp2", y: "board-temp3", la: "Fan", lb: "Temp 1", lx: "Temp 2", ly: "Temp 3" }
  ],
  storage: [
    { id: "default", name: "Main Disk", description: "Disk usage, temperature and free space.", title: "Storage", sub: "Disk", a: "disk-used", bar: "disk-used", x: "disk-temp", y: "disk-free", la: "Used", lx: "Temp", ly: "Free" },
    { id: "network", name: "Network Speed", description: "Upload, download, utilization and downloaded total.", title: "Network", sub: "Adapter", a: "net-upload", b: "net-download", bar: "net-util", x: "net-util", y: "net-downloaded", la: "Upload", lb: "Download", lx: "Utilization", ly: "Downloaded" },
    { id: "temps", name: "Board Temps", description: "Useful if you want this card to show board temperatures.", title: "Board", sub: "Temperatures", a: "board-temp1", bar: "board-temp1", x: "board-temp2", y: "board-temp3", la: "Temp 1", lx: "Temp 2", ly: "Temp 3" }
  ]
};

let currentMode = "pc";
let currentSensors = {};
let sensorList = [];
let lastWeatherUpdate = 0;
let layout = loadLayout();

const els = {
  pcPage: byId("pc-page"), fallbackPage: byId("fallback-page"), clock: byId("clock"), statusDot: byId("status-dot"), statusText: byId("status-text"),
  modal: byId("preset-modal"), modalTitle: byId("modal-title"), modalClose: byId("modal-close"), modalBackdrop: byId("modal-backdrop"), presetList: byId("preset-list"), resetLayout: byId("reset-layout"),
  fallbackTime: byId("fallback-time"), fallbackDate: byId("fallback-date"), weatherLocation: byId("weather-location"), weatherIcon: byId("weather-icon"), weatherTemp: byId("weather-temp"), weatherSummary: byId("weather-summary"), weatherFeels: byId("weather-feels"), weatherWind: byId("weather-wind"), weatherHumidity: byId("weather-humidity"),
  day0Name: byId("day-0-name"), day0Temp: byId("day-0-temp"), day0Rain: byId("day-0-rain"), day1Name: byId("day-1-name"), day1Temp: byId("day-1-temp"), day1Rain: byId("day-1-rain"), day2Name: byId("day-2-name"), day2Temp: byId("day-2-temp"), day2Rain: byId("day-2-rain")
};

function byId(id) { return document.getElementById(id); }
function cardEl(card, suffix) { return byId(`${card}-${suffix}`); }
function setText(el, value) { if (el) el.textContent = value || "--"; }

function loadLayout() {
  try { return { ...DEFAULT_LAYOUT, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") }; }
  catch { return { ...DEFAULT_LAYOUT }; }
}
function saveLayout() { localStorage.setItem(STORAGE_KEY, JSON.stringify(layout)); }
function resetLayout() { layout = { ...DEFAULT_LAYOUT }; saveLayout(); closePresetModal(); renderAllCards(); }

function showPage(mode) {
  currentMode = mode;
  if (mode === "pc") {
    els.pcPage.classList.add("active");
    els.fallbackPage.classList.remove("active");
  } else {
    els.pcPage.classList.remove("active");
    els.fallbackPage.classList.add("active");
    updateWeatherIfNeeded(true);
  }
}

function flattenSensors(node, parent = "", result = {}) {
  if (!node || typeof node !== "object") return result;
  const path = parent ? `${parent} / ${node.Text || ""}` : (node.Text || "");
  if (node.SensorId) {
    const item = { id: node.SensorId, text: node.Text || "", type: node.Type || "", value: node.Value || "", path };
    result[node.SensorId] = item;
    sensorList.push(item);
  }
  if (Array.isArray(node.Children)) node.Children.forEach((child) => flattenSensors(child, path, result));
  return result;
}

function findSensor({ type, text, path, index = 0 }) {
  const matches = sensorList.filter((s) => {
    const okType = !type || String(s.type).toLowerCase() === type.toLowerCase();
    const hay = `${s.path} ${s.text}`.toLowerCase();
    const okText = !text || hay.includes(text.toLowerCase());
    const okPath = !path || hay.includes(path.toLowerCase());
    return okType && okText && okPath;
  });
  return matches[index]?.value || "--";
}

function valueFor(key) {
  const first = (type, text, path, index = 0) => findSensor({ type, text, path, index });
  const direct = (id) => currentSensors[id]?.value || "--";

  const map = {
    "cpu-temp": () => direct("/amdcpu/0/temperature/2") !== "--" ? direct("/amdcpu/0/temperature/2") : first("Temperature", "cpu"),
    "cpu-temp2": () => first("Temperature", "cpu", "", 1),
    "cpu-temp3": () => first("Temperature", "cpu", "", 2),
    "cpu-load": () => direct("/amdcpu/0/load/0") !== "--" ? direct("/amdcpu/0/load/0") : first("Load", "cpu"),
    "cpu-clock": () => first("Clock", "cpu"),
    "cpu-power": () => first("Power", "cpu"),
    "gpu-temp": () => direct("/gpu-nvidia/0/temperature/0") !== "--" ? direct("/gpu-nvidia/0/temperature/0") : first("Temperature", "gpu"),
    "gpu-hotspot": () => direct("/gpu-nvidia/0/temperature/2") !== "--" ? direct("/gpu-nvidia/0/temperature/2") : first("Temperature", "hotspot"),
    "gpu-mem": () => direct("/gpu-nvidia/0/temperature/3") !== "--" ? direct("/gpu-nvidia/0/temperature/3") : first("Temperature", "memory"),
    "gpu-load": () => direct("/gpu-nvidia/0/load/0") !== "--" ? direct("/gpu-nvidia/0/load/0") : first("Load", "gpu"),
    "gpu-clock": () => first("Clock", "gpu"),
    "gpu-mem-clock": () => first("Clock", "memory"),
    "gpu-power": () => first("Power", "gpu"),
    "gpu-fan1": () => direct("/gpu-nvidia/0/fan/1") !== "--" ? direct("/gpu-nvidia/0/fan/1") : first("Fan", "gpu"),
    "gpu-fan2": () => direct("/gpu-nvidia/0/fan/2") !== "--" ? direct("/gpu-nvidia/0/fan/2") : first("Fan", "gpu", "", 1),
    "gpu-fan-percent": () => direct("/gpu-nvidia/0/control/1") !== "--" ? direct("/gpu-nvidia/0/control/1") : first("Control", "gpu"),
    "ram-load": () => direct("/ram/load/0") !== "--" ? direct("/ram/load/0") : first("Load", "memory"),
    "ram-used": () => direct("/ram/data/0") !== "--" ? direct("/ram/data/0") : first("Data", "used memory"),
    "ram-free": () => direct("/ram/data/1") !== "--" ? direct("/ram/data/1") : first("Data", "available memory"),
    "virtual-load": () => first("Load", "virtual memory"),
    "virtual-used": () => first("Data", "used virtual"),
    "virtual-free": () => first("Data", "available virtual"),
    "vram-used": () => direct("/gpu-nvidia/0/smalldata/1") !== "--" ? direct("/gpu-nvidia/0/smalldata/1") : first("SmallData", "used gpu"),
    "vram-free": () => direct("/gpu-nvidia/0/smalldata/0") !== "--" ? direct("/gpu-nvidia/0/smalldata/0") : first("SmallData", "free gpu"),
    "vram-total": () => direct("/gpu-nvidia/0/smalldata/2") !== "--" ? direct("/gpu-nvidia/0/smalldata/2") : first("SmallData", "total gpu"),
    "disk-used": () => first("Load", "used space"),
    "disk-temp": () => first("Temperature", "", "nvme"),
    "disk-free": () => first("Data", "available space"),
    "net-upload": () => first("Throughput", "upload speed"),
    "net-download": () => first("Throughput", "download speed"),
    "net-util": () => first("Load", "network utilization"),
    "net-downloaded": () => first("Data", "data downloaded"),
    "case-fan1": () => first("Fan", "", "", 0),
    "case-fan2": () => first("Fan", "", "", 1),
    "case-fan3": () => first("Fan", "", "", 2),
    "case-fan4": () => first("Fan", "", "", 3),
    "board-temp1": () => first("Temperature", "", "lpc", 0),
    "board-temp2": () => first("Temperature", "", "lpc", 1),
    "board-temp3": () => first("Temperature", "", "lpc", 2)
  };
  return map[key] ? map[key]() : "--";
}

function getNumber(value) {
  if (!value || value === "--" || value === "-") return 0;
  const parsed = Number.parseFloat(String(value).replace(",", ".").replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function setSplitValue(valueElement, unitElement, value) {
  if (!valueElement || !unitElement) return;
  const text = String(value || "--").trim();
  const match = text.match(/^([\d.,-]+)\s*(.*)$/);
  valueElement.textContent = match ? match[1] : text;
  let unit = match ? (match[2] || "") : "";
  if (unit.includes("°C")) { unit = "°"; unitElement.className = "unit degree"; }
  else if (unit.includes("%")) { unit = "%"; unitElement.className = "unit percent"; }
  else if (unit.includes("/s")) { unitElement.className = "unit throughput"; }
  else { unitElement.className = "unit"; }
  unitElement.textContent = unit;
}

function setBar(element, value) {
  if (!element) return;
  const n = Math.max(0, Math.min(100, getNumber(value)));
  element.style.width = `${n}%`;
}

function setStatus(ok, text) {
  els.statusDot.classList.remove("ok", "bad");
  els.statusDot.classList.add(ok ? "ok" : "bad");
  els.statusText.textContent = text;
}

function getPreset(cardKey) {
  const presets = PRESETS[cardKey] || [];
  return presets.find((preset) => preset.id === layout[cardKey]) || presets[0];
}

function renderCard(cardKey) {
  const preset = getPreset(cardKey);
  if (!preset) return;
  setText(cardEl(cardKey, "title"), preset.title);
  setText(cardEl(cardKey, "sub"), preset.sub);
  setText(cardEl(cardKey, "primary-a-label"), preset.la);
  setText(cardEl(cardKey, "primary-b-label"), preset.lb || "");
  setText(cardEl(cardKey, "extra-a-label"), preset.lx);
  setText(cardEl(cardKey, "extra-b-label"), preset.ly);

  const a = valueFor(preset.a);
  const b = preset.b ? valueFor(preset.b) : "";

  if (cardKey === "fans") {
    setText(cardEl(cardKey, "primary-a"), a);
    setText(cardEl(cardKey, "primary-b"), b);
  } else {
    setSplitValue(cardEl(cardKey, "primary-a"), cardEl(cardKey, "primary-a-unit"), a);
    if (preset.b) setSplitValue(cardEl(cardKey, "primary-b"), cardEl(cardKey, "primary-b-unit"), b);
  }

  setText(cardEl(cardKey, "extra-a"), preset.xStatic || valueFor(preset.x));
  setText(cardEl(cardKey, "extra-b"), preset.yStatic || valueFor(preset.y));

  const bar = cardEl(cardKey, "bar");
  if (preset.ratioUsed && preset.ratioTotal) {
    const used = getNumber(valueFor(preset.ratioUsed));
    const total = getNumber(valueFor(preset.ratioTotal));
    bar.style.width = `${total > 0 ? Math.max(0, Math.min(100, (used / total) * 100)) : 0}%`;
  } else if (preset.bar) {
    setBar(bar, valueFor(preset.bar));
  }

  setTemperatureClass(cardEl("gpu", "extra-a"), valueFor("gpu-hotspot"), 85, 95);
  setTemperatureClass(cardEl("gpu", "extra-b"), valueFor("gpu-mem"), 90, 100);
}

function renderAllCards() { Object.keys(DEFAULT_LAYOUT).forEach(renderCard); }

function updateClock() {
  const now = new Date();
  const time = now.toLocaleTimeString("da-DK", { hour: "2-digit", minute: "2-digit" });
  const date = now.toLocaleDateString("da-DK", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
  setText(els.clock, time); setText(els.fallbackTime, time); setText(els.fallbackDate, date);
}

function setTemperatureClass(element, value, warnAt, alertAt) {
  if (!element) return;
  element.classList.remove("warn", "bad");
  const n = getNumber(value);
  if (n >= alertAt) element.classList.add("bad");
  else if (n >= warnAt) element.classList.add("warn");
}

function weatherCodeToText(code) {
  const map = { 0:["☀️","Clear sky"], 1:["🌤️","Mainly clear"], 2:["⛅","Partly cloudy"], 3:["☁️","Cloudy"], 45:["🌫️","Fog"], 48:["🌫️","Fog"], 51:["🌦️","Light drizzle"], 53:["🌦️","Drizzle"], 55:["🌧️","Heavy drizzle"], 61:["🌧️","Light rain"], 63:["🌧️","Rain"], 65:["🌧️","Heavy rain"], 71:["🌨️","Light snow"], 73:["🌨️","Snow"], 75:["❄️","Heavy snow"], 80:["🌦️","Rain showers"], 81:["🌦️","Rain showers"], 82:["⛈️","Heavy showers"], 95:["⛈️","Thunderstorm"] };
  return map[code] || ["🌡️", "Weather"];
}
function round(value) { const n = Number(value); return Number.isFinite(n) ? Math.round(n).toString() : "--"; }
function formatWeatherDate(dateString, fallback) {
  const date = new Date(`${dateString}T12:00:00`);
  return Number.isNaN(date.getTime()) ? fallback : date.toLocaleDateString("da-DK", { weekday: "short" });
}

async function updateWeatherIfNeeded(force = false) {
  const now = Date.now();
  if (!force && now - lastWeatherUpdate < 10 * 60 * 1000) return;
  try {
    const response = await fetch("/api/weather", { cache: "no-store" });
    const payload = await response.json();
    if (!payload.ok) throw new Error(payload.error || "Weather API error");
    lastWeatherUpdate = now;
    const current = payload.data.current;
    const daily = payload.data.daily;
    const [icon, text] = weatherCodeToText(current.weather_code);
    setText(els.weatherLocation, payload.location || "Local Area");
    setText(els.weatherIcon, icon);
    setText(els.weatherTemp, round(current.temperature_2m));
    setText(els.weatherSummary, text);
    setText(els.weatherFeels, `${round(current.apparent_temperature)} °C`);
    setText(els.weatherWind, `${round(current.wind_speed_10m)} km/t`);
    setText(els.weatherHumidity, `${round(current.relative_humidity_2m)} %`);
    [[els.day0Name, els.day0Temp, els.day0Rain], [els.day1Name, els.day1Temp, els.day1Rain], [els.day2Name, els.day2Temp, els.day2Rain]].forEach((parts, i) => {
      setText(parts[0], i === 0 ? "Today" : formatWeatherDate(daily.time[i], `Day ${i + 1}`));
      setText(parts[1], `${round(daily.temperature_2m_min[i])}° / ${round(daily.temperature_2m_max[i])}°`);
      setText(parts[2], `${daily.precipitation_probability_max[i] ?? "--"}% rain`);
    });
  } catch {
    setText(els.weatherIcon, "⚠️");
    setText(els.weatherSummary, "Weather unavailable");
  }
}

async function updateDashboard() {
  try {
    const response = await fetch("/api/sensors", { cache: "no-store" });
    const payload = await response.json();
    if (!payload.ok) throw new Error(payload.error || "Sensor API error");
    if (currentMode !== "pc") showPage("pc");
    sensorList = [];
    currentSensors = flattenSensors(payload.data);
    renderAllCards();
    setStatus(true, "Live");
  } catch {
    setStatus(false, "Offline");
    if (currentMode !== "fallback") showPage("fallback");
    updateWeatherIfNeeded(false);
  }
}

function openPresetModal(cardKey) {
  const presets = PRESETS[cardKey] || [];
  els.modalTitle.textContent = `${cardKey.toUpperCase()} preset`;
  els.presetList.innerHTML = "";
  presets.forEach((preset) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `preset-button${preset.id === layout[cardKey] ? " active" : ""}`;
    button.innerHTML = `<strong>${preset.name}</strong><span>${preset.description}</span>`;
    button.addEventListener("click", () => { layout[cardKey] = preset.id; saveLayout(); renderAllCards(); closePresetModal(); });
    els.presetList.appendChild(button);
  });
  els.modal.classList.remove("hidden");
}
function closePresetModal() { els.modal.classList.add("hidden"); }

document.querySelectorAll(".card.configurable").forEach((card) => card.addEventListener("click", () => openPresetModal(card.dataset.card)));
els.modalClose.addEventListener("click", closePresetModal);
els.modalBackdrop.addEventListener("click", closePresetModal);
els.resetLayout.addEventListener("click", resetLayout);

updateClock();
setInterval(updateClock, 1000);
updateDashboard();
setInterval(updateDashboard, 3000);
