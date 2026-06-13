/**
 * Multimodal video transcription.
 *
 * Converts an uploaded handyman video into a full transcript (speech + visual
 * context). Provider is selected via TRANSCRIPTION_PROVIDER or inferred from
 * env keys:
 *
 *   gemini  — GEMINI_API_KEY  (recommended: true video understanding)
 *   openai  — OPENAI_API_KEY  (Whisper: audio track only, very reliable)
 *   custom  — TRANSCRIPTION_API_URL + TRANSCRIPTION_API_KEY
 *   stub    — fallback when nothing is configured
 */

export type TranscriptionResult = {
  transcript: string;
  source: string;
  durationMs?: number;
};

type Provider = "gemini" | "openai" | "custom" | "stub";

const TRANSCRIPTION_PROMPT = `You are transcribing a field-service video for a German Heizungs- und Sanitär-Betrieb (HVAC, heating, plumbing, gas/water installation).

Transcribe ALL spoken dialogue and relevant visual context. Output plain text only — no markdown, no JSON. This transcript feeds an entity-extraction model for dispatch tasks.

SPELLING & DOMAIN KNOWLEDGE — apply correct German trade terminology. If audio sounds ambiguous, use visual context (logos, nameplates, packaging, labels on equipment) to pick the right spelling.

Heating & boiler manufacturers (common on German job sites):
- Vaillant (never "Walliant" — boilers, heat pumps, uniSTOR)
- Viessmann, Buderus, Wolf, Junkers / Bosch Thermotechnik, Stiebel Eltron
- Weishaupt, Brötje, Remeha, Ferroli, Elco, De Dietrich

Plumbing, fittings & bathroom:
- Grohe, Hansgrohe, Geberit, Viega, Uponor, Rehau, TECE, Dallmer
- Kaldewei, Duravit, Villeroy & Boch, Laufen

Pumps, valves, controls:
- Grundfos, Wilo, Honeywell, Oventrop, Heimeier, Danfoss, Esbe
- Siemens, Landis+Gyr (controls)

Tools & parts a Sanitär/Heizung crew uses daily (use standard German terms):
- Rohrzange, Wasserpumpenzange, Stillson, Rohrschneider, Presszange (Viega/Uponor)
- Siphon, Geruchsverschluss, WC-Spülkasten, Spülmenge, Schwimmerventil
- Haupthahn, Absperrventil, Kugelhahn, Entlüftungsventil (Entlüfter), AVR
- Kupferrohr, Edelstahlrohr, Mehrschichtverbundrohr, Pressfitting, Lötfitting
- Dichtung, Flachdichtung, Hanf, Dichtungsband, Teflonband (PTFE)
- Nasssauger, Rohrreinigungsspirale, Rohrkamera, Lecksuchgerät, Manometer
- Gasdruckprüfgerät, Füllschlauch, Spülstation, Heizungswasser aufbereiten

Brands for tools & consumables:
- Rothenberger, Ridgid, Rems, Knipex, Wera, Hilti, Würth, Fischer

Wholesalers & suppliers (common ordering partners):
- Bär und Ollenroth (Bär + Ollenroth), Bucher KG, REISSER Gruppe, Peter Jensen GmbH

Include in the transcript:
- All dialogue verbatim (German primary; English if spoken), with [MM:SS] timestamps at natural breaks
- Who is speaking when identifiable (Handwerker, Kunde, Kollege, Hausmeister, Mieter)
- Visible addresses, floor/flat numbers, boiler model plates, error codes (e.g. F.28, F.75), gauge readings
- Problems seen on camera (leaks, corrosion, error displays, wet ceilings, broken fittings)
- Materials or parts mentioned or shown that must be bought or replaced
- Decisions and deadlines ("bis Mittag", "heute noch", "morgen früh")

Do NOT invent content not present in the video. Do NOT anglicize German brand names. Prefer the spelling shown on equipment when audio is unclear.`;

/** Prompt sent to Gemini (or other multimodal provider) for video transcription. */
export function getTranscriptionPrompt(): string {
  return TRANSCRIPTION_PROMPT;
}

function resolveProvider(): Provider {
  const explicit = process.env.TRANSCRIPTION_PROVIDER?.toLowerCase();
  if (explicit === "gemini" || explicit === "openai" || explicit === "custom" || explicit === "stub") {
    return explicit;
  }
  if (process.env.GEMINI_API_KEY) return "gemini";
  if (process.env.OPENAI_API_KEY) return "openai";
  if (process.env.TRANSCRIPTION_API_URL && process.env.TRANSCRIPTION_API_KEY) return "custom";
  return "stub";
}

async function callMultimodalModel(
  video: ArrayBuffer,
  mimeType: string,
  fileName: string,
): Promise<TranscriptionResult> {
  const provider = resolveProvider();

  switch (provider) {
    case "gemini":
      return transcribeWithGemini(video, mimeType, fileName);
    case "openai":
      return transcribeWithOpenAI(video, mimeType, fileName);
    case "custom":
      return transcribeWithCustomEndpoint(video, mimeType);
    default:
      return { transcript: STUB_TRANSCRIPT, source: "stub" };
  }
}

/** Gemini — multimodal (video + audio). Needs GEMINI_API_KEY. */
async function transcribeWithGemini(
  video: ArrayBuffer,
  mimeType: string,
  fileName: string,
): Promise<TranscriptionResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set.");
  }

  const model = process.env.TRANSCRIPTION_MODEL?.trim() || "gemini-2.5-flash";
  const inlineLimit = 20 * 1024 * 1024;

  if (video.byteLength <= inlineLimit) {
    const transcript = await geminiGenerateFromInline(
      apiKey,
      model,
      video,
      mimeType,
    );
    return { transcript, source: `gemini/${model}` };
  }

  const fileUri = await geminiUploadFile(apiKey, video, mimeType, fileName);
  await geminiWaitForFile(apiKey, fileUri);

  try {
    const transcript = await geminiGenerateFromFile(apiKey, model, fileUri, mimeType);
    return { transcript, source: `gemini/${model}` };
  } finally {
    await geminiDeleteFile(apiKey, fileUri).catch(() => {});
  }
}

async function geminiGenerateFromInline(
  apiKey: string,
  model: string,
  video: ArrayBuffer,
  mimeType: string,
): Promise<string> {
  const base64 = Buffer.from(video).toString("base64");
  const json = await geminiGenerateContent(apiKey, model, {
    contents: [
      {
        parts: [
          { inline_data: { mime_type: mimeType, data: base64 } },
          { text: TRANSCRIPTION_PROMPT },
        ],
      },
    ],
    generationConfig: { temperature: 0.2 },
  });
  return extractGeminiText(json);
}

async function geminiGenerateFromFile(
  apiKey: string,
  model: string,
  fileUri: string,
  mimeType: string,
): Promise<string> {
  const json = await geminiGenerateContent(apiKey, model, {
    contents: [
      {
        parts: [
          { file_data: { mime_type: mimeType, file_uri: fileUri } },
          { text: TRANSCRIPTION_PROMPT },
        ],
      },
    ],
    generationConfig: { temperature: 0.2 },
  });
  return extractGeminiText(json);
}

async function geminiGenerateContent(
  apiKey: string,
  model: string,
  body: object,
): Promise<GeminiResponse> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(formatGeminiError(response.status, model, detail));
  }

  return response.json();
}

function formatGeminiError(status: number, model: string, detail: string): string {
  if (status === 429) {
    const deprecated =
      model.startsWith("gemini-2.0") ||
      detail.includes("limit: 0") ||
      detail.includes("free_tier_requests, limit: 0");

    if (deprecated) {
      return [
        `Gemini model "${model}" is unavailable (quota limit is 0).`,
        "gemini-2.0-flash was shut down — set TRANSCRIPTION_MODEL=gemini-2.5-flash in .env.local and restart the dev server.",
        "If it still fails, enable billing in Google AI Studio (some accounts need it even for free-tier models).",
      ].join(" ");
    }

    return `Gemini rate limit hit for "${model}". Wait a minute and retry, or check usage at https://ai.dev/rate-limit`;
  }

  return `Gemini transcription failed (${status}) for "${model}": ${detail}`;
}

function extractGeminiText(json: GeminiResponse): string {
  const text = json.candidates?.[0]?.content?.parts
    ?.map((p) => p.text ?? "")
    .join("")
    .trim();
  if (!text) {
    throw new Error("Gemini returned an empty transcript.");
  }
  return text;
}

async function geminiUploadFile(
  apiKey: string,
  video: ArrayBuffer,
  mimeType: string,
  fileName: string,
): Promise<string> {
  const start = await fetch(
    `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "X-Goog-Upload-Protocol": "resumable",
        "X-Goog-Upload-Command": "start",
        "X-Goog-Upload-Header-Content-Length": String(video.byteLength),
        "X-Goog-Upload-Header-Content-Type": mimeType,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ file: { display_name: fileName } }),
    },
  );

  if (!start.ok) {
    const detail = await start.text().catch(() => "");
    throw new Error(`Gemini file upload start failed (${start.status}): ${detail}`);
  }

  const uploadUrl = start.headers.get("x-goog-upload-url");
  if (!uploadUrl) {
    throw new Error("Gemini did not return an upload URL.");
  }

  const upload = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      "Content-Length": String(video.byteLength),
      "X-Goog-Upload-Offset": "0",
      "X-Goog-Upload-Command": "upload, finalize",
    },
    body: Buffer.from(video),
  });

  if (!upload.ok) {
    const detail = await upload.text().catch(() => "");
    throw new Error(`Gemini file upload failed (${upload.status}): ${detail}`);
  }

  const json = await upload.json();
  const uri = json.file?.uri as string | undefined;
  if (!uri) {
    throw new Error("Gemini upload succeeded but no file URI was returned.");
  }
  return uri;
}

async function geminiWaitForFile(apiKey: string, fileUri: string, maxAttempts = 30) {
  const statusUrl = `${fileUri}${fileUri.includes("?") ? "&" : "?"}key=${apiKey}`;
  for (let i = 0; i < maxAttempts; i++) {
    const response = await fetch(statusUrl);
    if (!response.ok) {
      throw new Error(`Gemini file status check failed (${response.status}).`);
    }
    const json = await response.json();
    if (json.state === "ACTIVE") return;
    if (json.state === "FAILED") {
      throw new Error("Gemini file processing failed.");
    }
    await sleep(2000);
  }
  throw new Error("Gemini file processing timed out.");
}

async function geminiDeleteFile(apiKey: string, fileUri: string) {
  const deleteUrl = `${fileUri}${fileUri.includes("?") ? "&" : "?"}key=${apiKey}`;
  await fetch(deleteUrl, { method: "DELETE" });
}

/** OpenAI Whisper — audio track only. Needs OPENAI_API_KEY. */
async function transcribeWithOpenAI(
  video: ArrayBuffer,
  mimeType: string,
  fileName: string,
): Promise<TranscriptionResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set.");
  }

  const model = process.env.TRANSCRIPTION_MODEL?.trim() || "whisper-1";
  const form = new FormData();
  form.append("file", new Blob([video], { type: mimeType }), fileName);
  form.append("model", model);
  form.append("response_format", "text");
  if (process.env.TRANSCRIPTION_LANGUAGE) {
    form.append("language", process.env.TRANSCRIPTION_LANGUAGE);
  }

  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Whisper transcription failed (${response.status}): ${detail}`);
  }

  const transcript = (await response.text()).trim();
  if (!transcript) {
    throw new Error("Whisper returned an empty transcript.");
  }

  return { transcript, source: `openai/${model}` };
}

/** Generic HTTP endpoint — needs TRANSCRIPTION_API_URL + TRANSCRIPTION_API_KEY. */
async function transcribeWithCustomEndpoint(
  video: ArrayBuffer,
  mimeType: string,
): Promise<TranscriptionResult> {
  const endpoint = process.env.TRANSCRIPTION_API_URL!;
  const apiKey = process.env.TRANSCRIPTION_API_KEY!;

  const form = new FormData();
  form.append("file", new Blob([video], { type: mimeType }), "video");
  form.append("task", "transcribe");

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Transcription request failed (${response.status}): ${detail}`);
  }

  const json = await response.json();
  return {
    transcript: json.transcript ?? json.text ?? "",
    source: process.env.TRANSCRIPTION_MODEL ?? "custom",
  };
}

export async function transcribeVideo(file: File): Promise<TranscriptionResult> {
  const started = Date.now();
  const bytes = await file.arrayBuffer();
  const result = await callMultimodalModel(
    bytes,
    file.type || "video/mp4",
    file.name || "video.mp4",
  );
  return { ...result, durationMs: Date.now() - started };
}

/** Which provider would run given current env (for UI hints). */
export function getTranscriptionProvider(): Provider {
  return resolveProvider();
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type GeminiResponse = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
};

const STUB_TRANSCRIPT = `Also Mikro läuft? Ja okay, ich lass das jetzt einfach mitlaufen während ich durchs Lager geh, dann hab ich nachher alles für den Tagesreport.

Morgen Tobi, hast du den Schlüsselbund für die Wohnung in Wedding gesehen? Der mit dem grünen Anhänger. Nee, der lag gestern noch hier auf dem Tresen, ich schwör's dir. Ach Mensch. Frag mal Kevin, der war als Letzter da oben.

Berliner Hausmeisterservice, Lehmann, guten Morgen. Okay, also Wasser tropft durch die Decke vom Bad, im Erdgeschoss bei den Nachbarn. Heute Nacht, okay. Ich schick Ihnen jemanden. Pankow, Florastraße 47, dritter Stock rechts. Wir versuchen bis Mittag jemanden hinzubekommen.

Tobi, hörst du, Notfall Pankow, Wasserschaden, müssen heut noch hin. Marek hat die Heizungswartung in Friedrichshain, das zieht sich. Ich schick erst mal Jonas vorbei, der soll den Haupthahn finden und absperren, dann kommt Marek gegen zwei und macht die eigentliche Reparatur. Nimm die kleine Werkzeugkiste und den Nasssauger mit.`;
