export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type AiProvider = "groq" | "gemini" | "openai";

function mergeGeminiContents(
  messages: ChatMessage[],
): { role: "user" | "model"; parts: { text: string }[] }[] {
  const tail = messages.filter((m) => m.role !== "system");
  const out: { role: "user" | "model"; parts: { text: string }[] }[] = [];
  for (const m of tail) {
    const role: "user" | "model" = m.role === "assistant" ? "model" : "user";
    const last = out[out.length - 1];
    if (last && last.role === role) {
      last.parts[0].text += `\n\n${m.content}`;
    } else {
      out.push({ role, parts: [{ text: m.content }] });
    }
  }
  return out;
}

async function geminiChatCompletion(
  messages: ChatMessage[],
  opts?: { temperature?: number; json?: boolean },
): Promise<{ text: string; provider: "gemini" }> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY missing");

  const systemText = messages
    .filter((m) => m.role === "system")
    .map((m) => m.content)
    .join("\n\n")
    .trim();

  const contents = mergeGeminiContents(messages);
  if (!contents.length) {
    throw new Error("Gemini needs at least one user or assistant message.");
  }

  const model = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`;

  const generationConfig: Record<string, unknown> = {
    temperature: opts?.temperature ?? 0.35,
  };
  if (opts?.json) {
    generationConfig.responseMimeType = "application/json";
  }

  const body: Record<string, unknown> = { contents, generationConfig };
  if (systemText) {
    body.systemInstruction = { parts: [{ text: systemText }] };
  }

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`);

  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const parts = data.candidates?.[0]?.content?.parts;
  const text = parts?.map((p) => p.text ?? "").join("") ?? "";
  return { text, provider: "gemini" };
}

export async function chatCompletion(
  messages: ChatMessage[],
  opts?: { temperature?: number; json?: boolean },
): Promise<{ text: string; provider: AiProvider }> {
  const temperature = opts?.temperature ?? 0.35;

  if (process.env.GEMINI_API_KEY) {
    return geminiChatCompletion(messages, opts);
  }

  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey) {
    const body: Record<string, unknown> = {
      model: process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile",
      messages,
      temperature,
    };
    if (opts?.json) body.response_format = { type: "json_object" };

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${groqKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Groq ${res.status}: ${await res.text()}`);
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = data.choices?.[0]?.message?.content ?? "";
    return { text, provider: "groq" };
  }

  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    throw new Error(
      "No AI key configured. Add GEMINI_API_KEY to .env.local (Google AI Studio — free tier). Optional: GROQ_API_KEY or OPENAI_API_KEY as fallbacks.",
    );
  }

  const body: Record<string, unknown> = {
    model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
    messages,
    temperature,
  };
  if (opts?.json) body.response_format = { type: "json_object" };

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openaiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const text = data.choices?.[0]?.message?.content ?? "";
  return { text, provider: "openai" };
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY required for embeddings.");

  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small",
      input: texts,
    }),
  });
  if (!res.ok) throw new Error(`Embeddings ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as {
    data?: { embedding: number[] }[];
  };
  const out = data.data?.map((d) => d.embedding) ?? [];
  if (out.length !== texts.length) throw new Error("Embedding count mismatch.");
  return out;
}
