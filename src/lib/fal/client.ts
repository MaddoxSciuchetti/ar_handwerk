type FalLlmResult = {
    output?: string;
    error?: string;
};

export function getFalApiKey(): string | undefined {
    return process.env.FAL_API_KEY?.trim() || process.env.FAL_KEY?.trim();
}

export async function callFalLlm(
    prompt: string,
    systemPrompt: string,
): Promise<string> {
    const apiKey = getFalApiKey();
    if (!apiKey) {
        throw new Error("FAL_API_KEY is not set");
    }

    const response = await fetch("https://fal.run/fal-ai/any-llm", {
        method: "POST",
        headers: {
            Authorization: `Key ${apiKey}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            prompt,
            system_prompt: systemPrompt,
            model: process.env.FAL_MODEL ?? "google/gemini-2.5-flash-lite",
            temperature: 0.3,
            max_tokens: 2048,
        }),
    });

    if (!response.ok) {
        const detail = await response.text().catch(() => "");
        throw new Error(`fal request failed (${response.status}): ${detail}`);
    }

    const json = (await response.json()) as FalLlmResult;
    if (json.error) {
        throw new Error(json.error);
    }
    if (!json.output?.trim()) {
        throw new Error("fal returned empty output");
    }
    return json.output.trim();
}

export function extractJsonFromLlm(text: string): unknown {
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    const candidate = fenced?.[1]?.trim() ?? text.trim();

    try {
        return JSON.parse(candidate);
    } catch {
        const start = candidate.indexOf("{");
        const end = candidate.lastIndexOf("}");
        if (start >= 0 && end > start) {
            return JSON.parse(candidate.slice(start, end + 1));
        }
        throw new Error("Could not parse JSON from LLM response");
    }
}
