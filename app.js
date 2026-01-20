/* ================= DOM HELPER ================= */
const $ = (s) => document.querySelector(s);

/* ================= IMAGE CONFIG ================= */
const UNSPLASH = "?auto=format&fit=crop&w=900&q=60";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1501004318641-b39e6451bec6" + UNSPLASH;

/* ================= CROP IMAGE MAP (CORRECT) ================= */
/*
Keys MUST match normalized AI crop names
*/
const CROP_IMAGES = {
  chickpea:
    "https://images.unsplash.com/photo-1600180758890-6b94519a62c8" + UNSPLASH,
  gram:
    "https://images.unsplash.com/photo-1600180758890-6b94519a62c8" + UNSPLASH,

  lentil:
    "https://images.unsplash.com/photo-1615485925873-0c9c1d9c02f1" + UNSPLASH,

  barley:
    "https://images.unsplash.com/photo-1598032895397-b9472444bf93" + UNSPLASH,

  rice:
    "https://images.unsplash.com/photo-1605000797499-95a51c5269ae" + UNSPLASH,
  wheat:
    "https://images.unsplash.com/photo-1501430654243-cf24a3b8b6f0" + UNSPLASH,
  maize:
    "https://images.unsplash.com/photo-1600431521340-491eca880813" + UNSPLASH
};

/* ================= NORMALIZE AI CROP NAME ================= */
function normalizeCropName(name) {
  return name
    .toLowerCase()
    .replace(/\(.*?\)/g, "")   // remove (gram)
    .replace(/[^a-z\s]/g, "") // remove symbols
    .trim();
}

function getCropImage(name) {
  const key = normalizeCropName(name);

  // Debug once if needed
  console.log("Crop image key:", key);

  return CROP_IMAGES[key] || FALLBACK_IMAGE;
}

/* ================= GLOBAL MAP STATE ================= */
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

/* ================= LOCATION ================= */
function detectUserLocation() {
  if (!navigator.geolocation) {
    manualFallback();
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;

      setLocation(lat, lon, "Detected location");
      autoDetectSoil();
      initMap(lat, lon);
    },
    manualFallback,
    { enableHighAccuracy: true, timeout: 8000 }
  );
}

function manualFallback() {
  const lat = 20.5937;
  const lon = 78.9629;

  setLocation(lat, lon, "Location not detected (manual)");
  autoDetectSoil();
  initMap(lat, lon);
}

function setLocation(lat, lon, name) {
  $('input[name="latitude"]').value = lat.toFixed(4);
  $('input[name="longitude"]').value = lon.toFixed(4);
  $('input[name="location_name"]').value = name;

  $("#location-name").innerText = `${name} — adjust on map`;
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
  renderResults(data);
}

/* ================= RENDER RESULTS (BACKGROUND IMAGE CARDS) ================= */
function renderResults(data) {
  const results = $("#results");
  const best = $("#best-crops");
  const budget = $("#budget-crops");
  const avoid = $("#avoid-crops");
  const explanation = $("#ai-explanation");

  results.hidden = false;
  explanation.innerText = data.ai.explanation;

  /* ===== BEST CROPS ===== */
  best.innerHTML = "";

  data.ai.best_crops.forEach((crop) => {
    const card = document.createElement("div");
    card.className = "card crop-card";

    const imageUrl = getCropImage(crop.name);

    card.style.backgroundImage = `
      linear-gradient(
        180deg,
        rgba(255,255,255,0.85),
        rgba(255,255,255,0.95)
      ),
      url(${imageUrl})
    `;

    card.innerHTML = `
      <div class="crop-info">
        <h4>${crop.name}</h4>
        <p>💧 <strong>Water need:</strong> ${crop.water_need}</p>
        <p>${crop.reason}</p>
      </div>
    `;

    best.appendChild(card);
  });

  /* ===== BUDGET FRIENDLY ===== */
  budget.innerHTML = "";
  data.ai.budget_friendly.forEach((c) => {
    const li = document.createElement("li");
    li.innerText = c;
    budget.appendChild(li);
  });

  /* ===== AVOID ===== */
  avoid.innerHTML = "";
  data.ai.not_recommended.forEach((c) => {
    const li = document.createElement("li");
    li.innerText = c;
    avoid.appendChild(li);
  });
}
