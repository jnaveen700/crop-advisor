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

/* ================= HEALTH ================= */
app.get("/", (req, res) => {
  res.send("SmartCrop Advisor API running");
});

app.get("/healthz", (req, res) => {
  res.json({ status: "ok" });
});

/* ================= GEMINI PROMPT ================= */
function buildGeminiPrompt(input) {
  return `
Return ONLY valid JSON.

Location: ${input.location.name}
Season: ${input.season}
Soil: ${input.soil}
Budget: ${input.budget}
Risk: ${input.risk_level}

Weather:
Temp: ${input.weather.temp}
Humidity: ${input.weather.humidity}
Rainfall: ${input.weather.rainfall}

JSON FORMAT:
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
  } catch {
    weather = { temp: 32, humidity: 60, rainfall: 2 };
  }

  try {
    const prompt = buildGeminiPrompt({ ...req.body, weather });
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const clean = text.replace(/```json|```/g, "").trim();

    res.json({
      weather,
      ai: JSON.parse(clean)
    });
  } catch (err) {
    res.status(500).json({ error: "AI failed" });
  }
});

/* ================= START ================= */
const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Backend running on port ${PORT}`);
});
