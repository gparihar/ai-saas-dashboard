import Groq from "groq-sdk";

export const runtime = "nodejs";

type GenerateBody = {
  prompt?: string;
};

type ToolType = "ai" | "weather" | "news";

type NewsArticle = {
  title?: string;
};

const encoder = new TextEncoder();

function detectTool(prompt: string): ToolType {
  const text = prompt.toLowerCase();

  if (text.includes("weather")) {
    return "weather";
  }

  if (text.includes("news")) {
    return "news";
  }

  return "ai";
}

function textStreamResponse(text: string, tool: ToolType, status = 200) {
  const chunks = text.match(/\S+\s*/g) || [text];

  const stream = new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }

      controller.close();
    },
  });

  return new Response(stream, {
    status,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-AI-Tool": tool,
    },
  });
}

function getGroqClient() {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new Error("Missing GROQ_API_KEY");
  }

  return new Groq({ apiKey });
}

function getWeatherCity(prompt: string) {
  const match = prompt.match(/\bweather(?:\s+(?:in|for|at))?\s+([a-zA-Z\s,.-]+)?/i);
  const city = match?.[1]?.replace(/[?.!]+$/g, "").trim();

  return city || "Surat";
}

async function getWeatherText(prompt: string) {
  const apiKey = process.env.WEATHER_API_KEY;

  if (!apiKey) {
    return {
      text: "Weather API key is missing on the server.",
      status: 500,
    };
  }

  const city = getWeatherCity(prompt);
  const params = new URLSearchParams({
    q: city,
    appid: apiKey,
    units: "metric",
  });

  const res = await fetch(
    `https://api.openweathermap.org/data/2.5/weather?${params.toString()}`,
    { cache: "no-store" }
  );
  const data = await res.json();

  if (!res.ok || !data?.main || !data?.weather?.[0]) {
    return {
      text: `Could not find weather for ${city}.`,
      status: res.ok ? 404 : res.status,
    };
  }

  return {
    text: `Weather in ${data.name}: ${Math.round(data.main.temp)} C, ${data.weather[0].description}.`,
    status: 200,
  };
}

async function getNewsText() {
  const apiKey = process.env.NEWS_API_KEY;

  if (!apiKey) {
    return {
      text: "News API key is missing on the server.",
      status: 500,
    };
  }

  const params = new URLSearchParams({
    country: "in",
    pageSize: "5",
    apiKey,
  });

  let res = await fetch(`https://newsapi.org/v2/top-headlines?${params.toString()}`, {
    cache: "no-store",
  });
  let data = await res.json();
  let articles = Array.isArray(data?.articles) ? data.articles : [];

  if (res.ok && articles.length === 0) {
    const fallbackParams = new URLSearchParams({
      q: "India",
      language: "en",
      sortBy: "publishedAt",
      pageSize: "5",
      apiKey,
    });

    res = await fetch(`https://newsapi.org/v2/everything?${fallbackParams.toString()}`, {
      cache: "no-store",
    });
    data = await res.json();
    articles = Array.isArray(data?.articles) ? data.articles : [];
  }

  if (!res.ok || articles.length === 0) {
    return {
      text: data?.message || "No news found right now.",
      status: res.ok ? 404 : res.status,
    };
  }

  const headlines = articles
    .slice(0, 5)
    .map((article: NewsArticle) => `- ${article.title || "Untitled"}`)
    .join("\n");

  return {
    text: `Top news:\n\n${headlines}`,
    status: 200,
  };
}

async function getAIResponse(prompt: string) {
  const groq = getGroqClient();
  const completion = await groq.chat.completions.create({
    model: process.env.GROQ_MODEL || "openai/gpt-oss-120b",
    messages: [
      { role: "system", content: "You are a helpful AI assistant." },
      { role: "user", content: prompt },
    ],
    stream: true,
    temperature: 0.7,
  });

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of completion) {
          const content = chunk.choices[0]?.delta?.content;

          if (content) {
            controller.enqueue(encoder.encode(content));
          }
        }

        controller.close();
      } catch (error) {
        console.error("Groq stream error:", error);
        controller.enqueue(encoder.encode("\nError while streaming AI response."));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-AI-Tool": "ai",
    },
  });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as GenerateBody;
    const prompt = body.prompt?.trim();

    if (!prompt) {
      return textStreamResponse("Please enter a prompt.", "ai", 400);
    }

    const tool = detectTool(prompt);

    if (tool === "weather") {
      const result = await getWeatherText(prompt);

      return textStreamResponse(result.text, "weather", result.status);
    }

    if (tool === "news") {
      const result = await getNewsText();

      return textStreamResponse(result.text, "news", result.status);
    }

    return getAIResponse(prompt);
  } catch (error) {
    console.error("Generate API error:", error);

    return textStreamResponse(
      "Error from server. Please check API keys and server logs.",
      "ai",
      500
    );
  }
}
