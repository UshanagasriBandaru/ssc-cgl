export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export async function chatCompletion(
  messages: ChatMessage[],
  opts?: { temperature?: number; json?: boolean },
): Promise<{ text: string; provider: "groq" | "openai" }> {
  const temperature = opts?.temperature ?? 0.35;
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
      "No AI key configured. Set GROQ_API_KEY or OPENAI_API_KEY in .env.local.",
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
