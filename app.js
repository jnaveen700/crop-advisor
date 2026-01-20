/* ================= DOM HELPER ================= */
const $ = (s) => document.querySelector(s);

/* ================= GLOBAL MAP ================= */
let map, marker;

/* ================= INIT ================= */
window.addEventListener("load", () => {
  detectSeason();
  detectUserLocation();
  setupForm();
});

/* ================= SEASON ================= */
function detectSeason() {
  const month = new Date().getMonth() + 1;
  let season = "zaid";

  if (month >= 6 && month <= 10) season = "kharif";
  else if (month >= 11 || month <= 3) season = "rabi";

  document.body.dataset.season = season;
  $('[data-context="season"]').innerText = `🌱 ${season} season detected`;
}

/* ================= LOCATION (FIXED) ================= */
function detectUserLocation() {
  if (!navigator.geolocation) {
    showLocationError("Geolocation not supported");
    manualFallback();
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;

      console.log("📍 Location detected:", lat, lon);

      setLocation(lat, lon, "Detected location");
      autoDetectSoil();
      initMap(lat, lon);
    },
    (err) => {
      console.warn("❌ Geolocation error:", err.message);
      showLocationError("Permission denied — using default location");
      manualFallback();
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    }
  );
}

function showLocationError(msg) {
  $("#location-name").innerText = msg;
  $('[data-context="location"]').innerText = "📍 Manual location";
}

function manualFallback() {
  const lat = 20.5937;
  const lon = 78.9629;

  setLocation(lat, lon, "Default location (India)");
  autoDetectSoil();
  initMap(lat, lon);
}

function setLocation(lat, lon, name) {
  $('input[name="latitude"]').value = lat.toFixed(4);
  $('input[name="longitude"]').value = lon.toFixed(4);
  $('input[name="location_name"]').value = name;

  $("#location-name").innerText = `${name}`;
  $('[data-context="location"]').innerText = "📍 Location set";
}

/* ================= MAP ================= */
function initMap(lat, lon) {
  if (map) return;

  map = L.map("map").setView([lat, lon], 13);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap contributors"
  }).addTo(map);

  marker = L.marker([lat, lon], { draggable: true }).addTo(map);

  marker.on("dragend", () => {
    const pos = marker.getLatLng();
    $('input[name="latitude"]').value = pos.lat.toFixed(4);
    $('input[name="longitude"]').value = pos.lng.toFixed(4);

    $("#location-name").innerText =
      `Selected location (${pos.lat.toFixed(2)}, ${pos.lng.toFixed(2)})`;
  });
}

/* ================= SOIL ================= */
function autoDetectSoil() {
  document.body.dataset.soil = "loamy";
  $('[data-context="soil"]').innerText = "🪴 Soil: Loamy (auto-filled)";
}

/* ================= FORM ================= */
function setupForm() {
  $("#crop-form").addEventListener("submit", submitForm);
}

function buildPayload() {
  return {
    location: {
      name: $('input[name="location_name"]').value,
      lat: $('input[name="latitude"]').value,
      lon: $('input[name="longitude"]').value
    },
    season: document.body.dataset.season,
    soil: document.body.dataset.soil,
    budget: $('select[name="budget"]').value,
    crop_preference: $('select[name="crop_preference"]').value,
    previous_crop: $('select[name="previous_crop"]').value,
    risk_level: $('select[name="risk_level"]').value
  };
}

/* ================= SUBMIT ================= */
async function submitForm(e) {
  e.preventDefault();

  const payload = buildPayload();

  const res = await fetch(
    "https://crop-advisor-mwyo.onrender.com/recommend",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }
  );

  const data = await res.json();
  console.log("AI response:", data);
}
