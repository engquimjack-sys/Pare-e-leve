import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

// Lazy-loaded GenAI client to prevent crashes if key is initially absent
let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is required.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Endpoint for AI Stock Forecasting & Purchase Suggestions
  app.post("/api/gemini/forecast", async (req, res) => {
    try {
      const { products, recentSales } = req.body;

      if (!products || !Array.isArray(products)) {
        return res.status(400).json({ error: "No products array provided." });
      }

      const client = getAiClient();

      const systemInstruction = `Você é um Analista de Inteligência de Estoque especialista em supermercados. 
Analise os produtos e o histórico recente fornecidos e retorne obrigatoriamente um JSON puro contendo:
{
  "recommendations": [
    {
      "productId": "string",
      "demandForecast": "Alta" | "Média" | "Baixa",
      "suggestedQuantity": number,
      "reason": "string - justificativa da IA baseada em vendas/validade/mínimo"
    }
  ],
  "insights": [
    "string - comentários analíticos gerais sobre o que comprar prioritariamente ou promoções necessárias"
  ]
}`;

      const userMessage = `Produtos Atuais no Estoque:
${JSON.stringify(products.map(p => ({
        id: p.id,
        nome: p.nome,
        categoria: p.categoria,
        quantidade: p.quantidade,
        estoqueMinimo: p.estoqueMinimo,
        validade: p.validade,
        valorVenda: p.valorVenda
      })), null, 2)}

Histórico de Vendas Recentes:
${JSON.stringify(recentSales || [], null, 2)}

Forneça a previsão de demanda atualizada e sugestões inteligentes de compra de reposição de acordo com os níveis mínimos e o volume de vendas.`;

      const response = await client.models.generateContent({
        model: "gemini-3.5-flash",
        contents: userMessage,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          temperature: 0.2,
        },
      });

      const text = response.text || "{}";
      const parsedData = JSON.parse(text.trim());
      res.json(parsedData);
    } catch (error: any) {
      console.error("Gemini API Error:", error);
      res.status(500).json({
        error: "Erro ao gerar previsões do estoque usando IA de forma integrada.",
        details: error.message || error,
      });
    }
  });

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Setup Vite / Serve static pages
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
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
