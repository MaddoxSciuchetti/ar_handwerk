const BRAND_SPELLINGS: Record<string, string> = {
  walliant: "Vaillant",
  vaillant: "Vaillant",
  viessmann: "Viessmann",
  buderus: "Buderus",
  geberit: "Geberit",
  grohe: "Grohe",
  hansgrohe: "Hansgrohe",
  grundfos: "Grundfos",
  wilo: "Wilo",
};

const VERB_FRAGMENT =
  /^(bestellen|besorgen|kaufen|order|repair|fix|check|schedule|call|email|notify|termin)\b/i;

function fixBrandSpellings(text: string): string {
  return text.replace(/\b[\wäöüß-]+\b/gi, (word) => {
    const key = word.toLowerCase();
    return BRAND_SPELLINGS[key] ?? word;
  });
}

function capitalizeSentence(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

/** Normalize raw Pioneer entity strings (brands, spacing, casing). */
export function normalizeEntityText(value?: string): string | undefined {
  const trimmed = stripTranscriptMarkup(value)?.trim();
  if (!trimmed) return undefined;
  if (isGenericSpeakerLabel(trimmed)) return undefined;
  return capitalizeSentence(fixBrandSpellings(trimmed));
}

const TIMESTAMP_PATTERN = /\[\d{1,2}:\d{2}(?::\d{2})?\]/g;
const SPEAKER_PREFIX_PATTERN =
  /^(Handwerker|Kunde|Kollege|Hausmeister|Mieter)\s*:\s*/i;

const JUNK_TASK_PATTERN =
  /^(ja|jaa|nein|mhm|okay|ok|ach|moment|stimmt|genau|hallo|tschüss|danke)\.?$/i;

/** Remove timestamps and speaker labels that confuse entity extraction. */
export function stripTranscriptMarkup(value?: string): string | undefined {
  if (!value) return undefined;
  return value
    .replace(TIMESTAMP_PATTERN, "")
    .replace(SPEAKER_PREFIX_PATTERN, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function isGenericSpeakerLabel(value: string): boolean {
  return /^(handwerker|kunde|kollege|hausmeister|mieter)$/i.test(value.trim());
}

/** True for transcript fragments that should not become standalone tasks. */
export function isLowQualityTaskTitle(title: string): boolean {
  const stripped = stripTranscriptMarkup(title)?.replace(/\.$/, "").trim() ?? "";
  if (stripped.length < 4) return true;
  return JUNK_TASK_PATTERN.test(stripped);
}

/** Clean transcript before Pioneer extraction. */
export function prepareTranscriptForPioneer(transcript: string): string {
  return transcript
    .split("\n")
    .map((line) => stripTranscriptMarkup(line) ?? "")
    .filter(Boolean)
    .join("\n")
    .trim();
}

export function isVerbFragment(text: string): boolean {
  return VERB_FRAGMENT.test(text.trim());
}

function reorderVerbPhrase(text: string): string {
  const match = text.match(
    /^(bestellen|besorgen|kaufen|order)\s+(?:die|der|das|den|dem|eine?|ein|mir|uns)?\s*(.+)$/i,
  );
  if (!match) return text;

  const verb = match[1].toLowerCase();
  const object = capitalizeSentence(fixBrandSpellings(match[2].trim()));
  if (!object) return text;

  return `${object} ${verb}`;
}

/** Turn raw transcript fragments into a readable task title. */
export function normalizeTaskTitle(raw: string, proposedAction?: string): string {
  const taskText = stripTranscriptMarkup(raw) ?? raw.trim();
  const actionText = stripTranscriptMarkup(proposedAction);

  let title = taskText;
  if (!title && actionText) {
    title = actionText;
  } else if (
    actionText &&
    isVerbFragment(title) &&
    !isVerbFragment(actionText) &&
    actionText.length >= title.length
  ) {
    title = actionText;
  }

  title = fixBrandSpellings(title);
  title = reorderVerbPhrase(title);
  return capitalizeSentence(title);
}

export type TaskDisplayAttribute = {
  key: string;
  label: string;
  value: string;
};

function sameEntity(a?: string, b?: string): boolean {
  if (!a || !b) return false;
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/** Deduplicated attributes for UI pills — one purchase item, includes problem. */
export function getTaskDisplayAttributes(task: {
  title?: string;
  assignee?: string;
  location?: string;
  deadline?: string;
  problem?: string;
  itemToBuy?: string;
  material?: string;
  equipment?: string;
}): TaskDisplayAttribute[] {
  const attributes: TaskDisplayAttribute[] = [];
  const seen = new Set<string>();
  const titleKey = normalizeEntityText(task.title)?.toLowerCase();

  const add = (key: string, label: string, value?: string) => {
    const normalized = normalizeEntityText(value);
    if (!normalized) return;

    const dedupeKey = normalized.toLowerCase();
    if (seen.has(dedupeKey)) return;
    if (titleKey && dedupeKey === titleKey) return;

    seen.add(dedupeKey);
    attributes.push({ key, label, value: normalized });
  };

  add("assignee", "Assignee", task.assignee);
  add("location", "Location", task.location);
  add("deadline", "Deadline", task.deadline);
  add("problem", "Problem", task.problem);

  const material = normalizeEntityText(task.material);
  const equipment = normalizeEntityText(task.equipment);
  const explicitPurchase = normalizeEntityText(task.itemToBuy);

  if (sameEntity(material, equipment)) {
    add("itemToBuy", "To buy", explicitPurchase ?? material ?? equipment);
  } else {
    const purchase = explicitPurchase ?? material ?? equipment;
    add("itemToBuy", "To buy", purchase);

    if (equipment && !sameEntity(equipment, purchase)) {
      add("equipment", "Equipment", equipment);
    }
  }

  return attributes;
}

export function consolidatePurchaseFields(
  material?: string,
  equipment?: string,
): {
  itemToBuy?: string;
  material?: string;
  equipment?: string;
} {
  const mat = normalizeEntityText(material);
  const eq = normalizeEntityText(equipment);

  if (!mat && !eq) return {};

  if (mat && eq && sameEntity(mat, eq)) {
    return { itemToBuy: mat };
  }

  if (mat && eq) {
    return { itemToBuy: mat, equipment: eq };
  }

  return { itemToBuy: mat ?? eq };
}
