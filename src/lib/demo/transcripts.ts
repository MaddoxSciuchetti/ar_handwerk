/**
 * Pre-written transcripts for demo videos whose real audio does not mention
 * the tasks we want Pioneer to extract. Matched to bucket videos by title/key.
 *
 * Each script describes exactly ONE Hauptaufgabe (topic). Follow-up steps are
 * framed as proposed actions under that topic, not separate tasks.
 */

export type DemoVideoScript = {
  id: string;
  /** Substrings matched against video title or R2 key (case-insensitive). */
  patterns: string[];
  transcript: string;
};

export const DEMO_VIDEO_SCRIPTS: DemoVideoScript[] = [
  {
    id: "legionellen-pruefung",
    patterns: [
      "legionellenpr",
      "legionellen pr",
      "legionellen-pr",
      "legionellen prüfung",
      "legionellenprufung",
      "legionellenpruefung",
      "legionellenpru",
    ],
    transcript: `[00:00] Handwerker: Tagesbericht Grundschule Weißenburger Straße — wir waren heute vor Ort und haben die Legionellenprüfung an allen Trinkwasserleitungen im Keller und in den Sanitärräumen durchgeführt.

[00:14] Büroassistentin: Gibt es nur diese eine Hauptaufgabe für heute?

[00:16] Handwerker: Ja, genau eine Aufgabe: Legionellenprüfung in der Grundschule Weißenburger Straße. Proben sind genommen, Messwerte liegen im Protokoll.

[00:26] Handwerker: Alles Folgende gehört zu dieser einen Legionellenprüfung — Rechnung an die Schule per E-Mail erstellen, Kontrolltermin in vier Wochen zur Nachprüfung mit der Schulleitung einplanen, und drei kaputte Flexschläuche an den Waschtischen bei REISSER nachbestellen plus Montagetermin für den Tausch.

[00:42] Büroassistentin: Verstanden — ein Thema Legionellenprüfung, die nächsten Schritte sind Unterpunkte davon.`,
  },
  {
    id: "leitungsrohrbruch",
    patterns: [
      "leitungsrohrbruch",
      "leitungsrohr",
      "leitungs austausch",
      "leitungsaustausch",
      "leitung austauschen",
      "leitungaustauschen",
      "leitungaustausch",
      "rohrbruch",
      "leitungssystem",
      "neuverlegung",
      "kellerleitung",
      "heizungsrohr",
      "heizungsleitung",
      "heizung",
      "heating",
      "pipe",
      "pipes",
      "kupferrohr",
    ],
    transcript: `[00:00] Handwerker: Einsatz Grundschule Weißenburger Straße — Leitungsrohrbruch im Keller, die Hauptleitung ist gebrochen, Wasser ist ausgetreten.

[00:10] Büroassistentin: Wie groß ist der Schaden?

[00:12] Handwerker: Separate Hauptaufgabe: komplett neues Leitungssystem in der Schule verlegen, weil die Leitung gebrochen ist. Nicht nur flicken — Neuverlegung der Kellerleitung.

[00:24] Handwerker: Unter dieser einen Leitungs-Aufgabe: Material bei Bär und Ollenroth bestellen — Kupferrohr, Pressfittinge, Dichtungen — E-Mail an Schulleitung Frau Schneider mit Ablauf schicken, und Kalendereinladung für Donnerstag vormittag acht Uhr, Dauer drei Stunden.

[00:38] Büroassistentin: Alles klar — ein Thema neues Leitungssystem, Rest sind Folgeschritte.`,
  },
];

export const DEMO_SCRIPT_IDS = DEMO_VIDEO_SCRIPTS.map((script) => script.id);

function normalizeHaystack(value: string): string {
  return value.toLowerCase().replace(/[_-]+/g, " ");
}

function scriptById(id: string): DemoVideoScript | undefined {
  return DEMO_VIDEO_SCRIPTS.find((script) => script.id === id);
}

function matchesAnyPattern(haystack: string, patterns: string[]): boolean {
  const normalized = normalizeHaystack(haystack);
  return patterns.some((pattern) => normalized.includes(normalizeHaystack(pattern)));
}

/**
 * Match demo script by video title / R2 key only — never by selection index.
 * Pipe/rohr signals win over legionellen when both could match.
 */
export function matchDemoScript(haystack: string): DemoVideoScript | null {
  const legionellen = scriptById("legionellen-pruefung");
  const leitungsrohrbruch = scriptById("leitungsrohrbruch");
  if (!legionellen || !leitungsrohrbruch) return null;

  const matchesLeitung = matchesAnyPattern(haystack, leitungsrohrbruch.patterns);
  const matchesLegionellen = matchesAnyPattern(haystack, legionellen.patterns);

  if (matchesLeitung && !matchesLegionellen) return leitungsrohrbruch;
  if (matchesLegionellen && !matchesLeitung) return legionellen;
  if (matchesLeitung) return leitungsrohrbruch;

  return matchesLegionellen ? legionellen : null;
}

export function isDemoScriptId(value: string): value is (typeof DEMO_VIDEO_SCRIPTS)[number]["id"] {
  return DEMO_SCRIPT_IDS.includes(value);
}

/** Legacy index fallback when title matching finds no script. */
export const DEMO_TRANSCRIPTS = DEMO_VIDEO_SCRIPTS.map((script) => script.transcript);

export function getDemoScriptByIndex(index: number): DemoVideoScript {
  const normalized =
    ((index % DEMO_VIDEO_SCRIPTS.length) + DEMO_VIDEO_SCRIPTS.length) % DEMO_VIDEO_SCRIPTS.length;
  return DEMO_VIDEO_SCRIPTS[normalized];
}

export function getDemoTranscript(index: number): string {
  return getDemoScriptByIndex(index).transcript;
}
