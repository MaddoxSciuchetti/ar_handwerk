/**
 * Pioneer client.
 *
 * Takes a plain-text transcript (produced by the multimodal transcription
 * step) and sends it to your fine-tuned Pioneer model, which extracts a
 * structured representation of the handyman's day: service tasks, entities,
 * and relations.
 *
 * For fine-tuned encoder models, Pioneer expects your **training job ID**
 * (a UUID) as the `model` field on the OpenAI-compatible endpoint —
 * not a base-model name like `fastino/gliner2-multi-v1`.
 *
 * @see https://docs.pioneer.ai/api-reference/inference/openai-compatible
 */

import { prepareTranscriptForPioneer } from "@/lib/task-normalize";

const PIONEER_API_URL =
  process.env.PIONEER_API_URL ?? "https://api.pioneer.ai/v1/chat/completions";

/** Fine-tuned model — training job ID from Pioneer. */
const PIONEER_MODEL_ID =
  process.env.PIONEER_MODEL_ID ??
  process.env.PIONEER_MODEL ??
  "c71c07b1-3dd6-42fa-b093-76e5c35fc347";

/**
 * Extraction schema sent with every request. Mirrors the fine-tuned model's
 * expected structure (see payload.json). Tweak here to change what Pioneer
 * pulls out of the transcript.
 */
const PIONEER_SCHEMA = {
  entities: [
    "task",
    "problem",
    "proposed_action",
    "equipment",
    "material",
    "location",
    "decision",
    "deadline",
    "people",
    "cost",
    "difficulty",
  ],
  structures: {
    service_task: {
      fields: [
        { name: "task", type: "string" },
        { name: "problem", type: "string" },
        { name: "proposed_action", type: "string" },
        { name: "equipment", type: "string" },
        { name: "material", type: "string" },
        { name: "location", type: "string" },
        { name: "decision", type: "string" },
        { name: "deadline", type: "string" },
        { name: "people", type: "string" },
        { name: "cost", type: "string" },
        { name: "difficulty", type: "string" },
      ],
    },
  },
  relations: [
    "assigned_to",
    "located_at",
    "requires_material",
    "requires_equipment",
    "has_deadline",
    "has_cost",
    "solves_problem",
  ],
} as const;

export type PioneerResult = {
  /** Raw parsed JSON returned by the model. */
  data: unknown;
  /** The Pioneer inference id, useful for tracing. */
  inferenceId?: string;
  model: string;
};

/**
 * Send a transcript to Pioneer and return the structured extraction.
 */
export async function extractServiceTasks(
  transcript: string,
): Promise<PioneerResult> {
  const apiKey = process.env.PIONEER_API_KEY;
  if (!apiKey) {
    throw new Error(
      "PIONEER_API_KEY is not set. Add it to .env.local before calling Pioneer.",
    );
  }

  const cleanedTranscript = prepareTranscriptForPioneer(transcript);

  const response = await fetch(PIONEER_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: PIONEER_MODEL_ID,
      messages: [{ role: "user", content: cleanedTranscript }],
      schema: PIONEER_SCHEMA,
      threshold: 0.55,
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Pioneer request failed (${response.status} ${response.statusText}): ${detail}`,
    );
  }

  const json = await response.json();

  // Pioneer returns an OpenAI-style chat completion whose message content is
  // itself a JSON string describing the extracted structure.
  const rawContent: string | undefined = json?.choices?.[0]?.message?.content;
  let data: unknown = rawContent;
  if (typeof rawContent === "string") {
    try {
      data = JSON.parse(rawContent);
    } catch {
      // Leave as the raw string if it isn't valid JSON.
      data = rawContent;
    }
  }

  return {
    data,
    inferenceId: json?.x_pioneer?.inference_id,
    model: json?.model ?? PIONEER_MODEL_ID,
  };
}
