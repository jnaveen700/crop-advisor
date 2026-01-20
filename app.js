/* ================= DOM HELPER ================= */
const $ = (s) => document.querySelector(s);

/* ================= MAP ================= */
let map, marker;

/* ================= DEFAULT LOCATION ================= */
const DEFAULT_LOCATION = {
  lat: 13.6288,
  lon: 79.4192,
  name: "Tirupati, Andhra Pradesh"
};

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

/* ================= LOCATION (ROBUST) ================= */
function detectUserLocation() {
  if (!navigator.geolocation) {
    useDefaultLocation("Geolocation not supported");
    return;
  }

  // Try high accuracy first
  navigator.geolocation.getCurrentPosition(
    handleLocationSuccess,
    () => {
      // Retry with low accuracy
      navigator.geolocation.getCurrentPosition(
        handleLocationSuccess,
        () => {
          useDefaultLocation("Location timeout — using default");
        },
        {
          enableHighAccuracy: false,
          timeout: 15000
        }
      );
    },
    {
      enableHighAccuracy: true,
      timeout: 8000
    }
  );
}

function handleLocationSuccess(pos) {
  const lat = pos.coords.latitude;
  const lon = pos.coords.longitude;

  setLocation(lat, lon, "Detected location");
  autoDetectSoil();
  initMap(lat, lon);
}

function useDefaultLocation(reason) {
  console.warn(reason);

  setLocation(
    DEFAULT_LOCATION.lat,
    DEFAULT_LOCATION.lon,
    DEFAULT_LOCATION.name
  );

  autoDetectSoil();
  initMap(DEFAULT_LOCATION.lat, DEFAULT_LOCATION.lon);

  $('[data-context="location"]').innerText =
    "📍 Default location used";
}

function setLocation(lat, lon, name) {
  $('input[name="latitude"]').value = lat.toFixed(4);
  $('input[name="longitude"]').value = lon.toFixed(4);
  $('input[name="location_name"]').value = name;

  $("#location-name").innerText = name;
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

  const button = document.querySelector(".primary-btn");
  button.disabled = true;
  button.innerText = "Analyzing…";

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

  button.disabled = false;
  button.innerText = "Submit";

  renderResults(data);
}

/* ================= RESULTS + AUTO SCROLL ================= */
function renderResults(data) {
  const results = $("#results");
  const best = $("#best-crops");
  const budget = $("#budget-crops");
  const avoid = $("#avoid-crops");
  const explanation = $("#ai-explanation");

  results.hidden = false;
  explanation.innerText = data.ai.explanation;

  best.innerHTML = "";
  data.ai.best_crops.forEach((crop) => {
    const card = document.createElement("div");
    card.className = "card crop-card";

    card.innerHTML = `
      <h4>${crop.name}</h4>
      <p>💧 <strong>Water need:</strong> ${crop.water_need}</p>
      <p>${crop.reason}</p>
    `;

    best.appendChild(card);
  });

  budget.innerHTML = "";
  data.ai.budget_friendly.forEach((c) => {
    const li = document.createElement("li");
    li.innerText = c;
    budget.appendChild(li);
  });

  avoid.innerHTML = "";
  data.ai.not_recommended.forEach((c) => {
    const li = document.createElement("li");
    li.innerText = c;
    avoid.appendChild(li);
  });

  // 🔥 UX FIX
  results.scrollIntoView({ behavior: "smooth" });
}
