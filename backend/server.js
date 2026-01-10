require("dotenv").config();

const express = require("express");
const axios = require("axios");
const cors = require("cors");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
app.use(cors());
app.use(express.json());

const OPENWEATHER_KEY = process.env.OPENWEATHER_KEY;
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const model = genAI.getGenerativeModel({
  model: "models/gemini-2.5-flash"
});



/* ================= GEMINI PROMPT ================= */
function buildGeminiPrompt(input) {
  return `
You are an agricultural decision-support system.
You do NOT chat.
You return ONLY valid JSON.

Context:
Location: ${input.location.name}
Season: ${input.season}
Soil: ${input.soil}
Budget: ${input.budget}
Previous crop: ${input.previous_crop}
Risk tolerance: ${input.risk_level}

Weather:
Temperature: ${input.weather.temp} °C
Humidity: ${input.weather.humidity} %
Rainfall: ${input.weather.rainfall} mm

Rules:
- Avoid water-intensive crops if rainfall is low
- Prefer low-input crops if budget is low
- Be conservative
- This is decision support, NOT yield prediction

Return JSON ONLY:

{
  "best_crops": [
    { "name": "", "water_need": "", "reason": "" }
  ],
  "budget_friendly": [],
  "not_recommended": [],
  "explanation": ""
}
`;
}

/* ================= ROUTE ================= */
app.post("/recommend", async (req, res) => {
  const { location } = req.body;
  let weather;

  /* --------- 1️⃣ TRY REAL WEATHER FIRST --------- */
  try {
    const weatherRes = await axios.get(
      "https://api.openweathermap.org/data/2.5/weather",
      {
        params: {
          lat: location.lat,
          lon: location.lon,
          units: "metric",
          appid: OPENWEATHER_KEY
        }
      }
    );

    weather = {
      temp: weatherRes.data.main.temp,
      humidity: weatherRes.data.main.humidity,
      rainfall: weatherRes.data.rain?.["1h"] || 0
    };

    console.log("✅ Real weather fetched");

  } catch (err) {
    /* --------- 2️⃣ FALLBACK ONLY IF REAL FAILS --------- */
    console.warn("⚠️ Weather API failed, using mock data");

    weather = {
      temp: 32,
      humidity: 60,
      rainfall: 2
    };
  }

  /* --------- 3️⃣ GEMINI REASONING --------- */
  try {
    const prompt = buildGeminiPrompt({
      ...req.body,
      weather
    });

    const result = await model.generateContent(prompt);
    const rawText = result.response.text();

    const cleanJson = rawText.replace(/```json|```/g, "").trim();
    const aiResponse = JSON.parse(cleanJson);

    res.json({
      weather,
      ai: aiResponse
    });

  } catch (err) {
    console.error("❌ Gemini failed", err);
    res.status(500).json({ error: "AI reasoning failed" });
  }
});

app.listen(5000, () => {
  console.log("✅ Backend running on http://localhost:5000");
});
