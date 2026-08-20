import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

// Initialize Gemini Client safely
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// Endpoint for AI Ecological Analysis & Hypothesis Generation
app.post("/api/ai-analyze", async (req, res) => {
  try {
    const { category, stationCode, stationName, currentRecord, historyRecords, query } = req.body;

    const ai = getGeminiClient();
    
    // Construct rich scientific context for the prompt
    const prompt = `
Ты — профессиональный ИИ-эко-аналитик и научный руководитель школьной экспедиции клуба «Земляне» (поселок Александровка).
Проанализируй внесенные результаты эко-мониторинга.

Контекст наблюдения:
- Станция мониторинга: ${stationCode || "ALX-GEN-01"} (${stationName || "Александровка"})
- Категория исследований: ${category || "Комплексный мониторинг"}
- Новые текущие замеры: ${JSON.stringify(currentRecord || {}, null, 2)}
- Архив прошлых замеров на этой станции (если есть): ${JSON.stringify(historyRecords || [], null, 2)}
- Дополнительный запрос или гипотеза: ${query || "Сделай подробный научный разбор, выяви возможные аномалии, сравни с прошлыми показателями и задай 2-3 наводящих вопроса школьникам для формулирования исследовательской гипотезы."}

Инструкция по ответу:
1. Краткий научный вердикт (норма, отклонение, сезоны).
2. Подсветка аномалий или резких скачков (например, прозрачность воды, pH, CO2, биоразнообразие).
3. Сравнение с исторической динамикой (если есть данные прошлых лет).
4. Наводящие интерактивные вопросы для школьников (почему это могло произойти, какие внешние или антропогенные факторы могли повлиять).
5. Рекомендуемая гипотеза для школьной исследовательской работы (например: "Если в мае уровень pH снизился до 6.2, то это может быть связано с весенним талым стоком...").

Отвечай на русском языке, в вдохновляющем, научном и доступном для школьников стиле. Используй сфокусированные абзацы и списки.
`;

    if (!ai) {
      // Fallback rule-based intelligent eco-analysis if API key is not configured yet
      return res.json({
        summary: `Анализ по станции ${stationCode || "ALX-HYD-01"}: Все ключевые физико-химические параметры находятся в пределах сезонной нормы. Зафиксированы характерные колебания, требующие регулярного наблюдения.`,
        anomalies: [
          "Обратите внимание на динамику прозрачности и pH в связи с естественным весенним/летним прогревом водоема."
        ],
        guidingQuestions: [
          "Как температура воды влияет на растворимость кислорода и жизнедеятельность гидробионтов?",
          "Какие антропогенные объекты находятся выше по течению относительно выбранного пункта замеров?",
          "Связаны ли изменения прозрачности с недавними атмосферными осадками?"
        ],
        hypothesis: "В период сезонных изменений гидрологического режима колебания прозрачности обусловлены притоком взвешенных частиц с прилегающих территорий.",
        isSimulated: true
      });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
      config: {
        systemInstruction: "Ты опытный методист-эколог и научный аналитик эко-клуба «Земляне» (Александровка). Помогаешь школьникам проводить долговременный мониторинг и делать научные открытия.",
        temperature: 0.7,
      },
    });

    return res.json({
      text: response.text,
      isSimulated: false
    });
  } catch (error: any) {
    console.error("AI Analysis Error:", error);
    return res.status(500).json({ error: error.message || "Ошибка обработки ИИ" });
  }
});

// Weather API endpoint for Aleksandrovka observation post
app.get("/api/weather/aleksandrovka", (req, res) => {
  res.json({
    station: "Александровка, Пост эко-мониторинга",
    temperature: "+21°C",
    humidity: "62%",
    pressure: "752 мм рт. ст.",
    windSpeed: "3.4 м/с",
    windDirection: "СЗ (Северо-Западный)",
    cloudiness: "30% (Малооблачно)",
    precipitation: "0.0 мм",
    updatedAt: new Date().toISOString(),
    forecastUrl: "https://yandex.ru/pogoda/aleksandrovka"
  });
});

async function startServer() {
  // Vite middleware for dev / static for production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server Zemlyane.DataSpace listening on http://localhost:${PORT}`);
  });
}

startServer();
