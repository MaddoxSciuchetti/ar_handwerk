/**
 * Pre-written transcripts for demo videos whose real audio does not mention
 * the tasks we want Pioneer to extract. Matched to bucket videos by title/key.
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
    patterns: ["legionell", "legionellen pr", "legionellenpr"],
    transcript: `[00:00] Handwerker: Kurz für den Tagesbericht — wir waren heute in der Grundschule Am Harras, Legionellenprüfung an allen Trinkwasserleitungen im Keller und in den Sanitärräumen.

[00:12] Büroassistentin: Alles dokumentiert?

[00:14] Handwerker: Ja, Proben sind genommen, Messwerte liegen im Protokoll. Hauptaufgabe jetzt: Rechnung für die Legionellenprüfung an die Schule erstellen und per E-Mail verschicken.

[00:26] Büroassistentin: Und Follow-up?

[00:28] Handwerker: Genau — wir brauchen einen Kontrolltermin in vier Wochen, nochmal Legionellen nachprüfen ob alles im grünen Bereich ist. Termin mit der Schulleitung einplanen.

[00:40] Handwerker: Beim Demontieren sind außerdem drei flexible Verbindungsschläuche an den Waschtischen kaputt gegangen. Die müssen wir bei REISSER nachbestellen — drei Stück Flexschläuche — und einen separaten Montagetermin für den Austausch der Schläuche eintragen.

[00:55] Büroassistentin: Alles klar — Rechnung raus, Kontrolltermin Legionellen in vier Wochen, Flexschläuche bestellen, Montagetermin für die Schläuche.`,
  },
  {
    id: "leitungsrohrbruch",
    patterns: ["leitungsrohrbruch", "leitungs austausch", "leitungsaustausch", "rohrbruch"],
    transcript: `[00:00] Handwerker: Update vom Einsatz Weißenburger Straße — Leitungsrohrbruch im Keller, Kupferrohr an der T-Stückung undicht, Wasserschaden begrenzt.

[00:10] Büroassistentin: Was ist der Plan?

[00:12] Handwerker: Hauptaufgabe Leitungsaustausch — das betroffene Kupferrohr komplett tauschen. Dafür brauchen wir neues Rohrmaterial: Kupferrohr, Pressfittinge, Dichtungen, alles über Bär und Ollenroth.

[00:26] Handwerker: Bitte E-Mail an Frau Schneider schicken — Terminbestätigung und Ablauf des Leitungsaustauschs. Und Kalendereinladung an sie für Donnerstag vormittag acht Uhr, Dauer circa drei Stunden.

[00:40] Büroassistentin: Material also bestellen und Termin fix?

[00:42] Handwerker: Ja — Material für den Leitungsrohrbruch bestellen, E-Mail raus, Kalendereinladung verschicken, Donnerstag Leitung austauschen.`,
  },
];

/** Legacy index fallback when title matching finds no script. */
export const DEMO_TRANSCRIPTS = DEMO_VIDEO_SCRIPTS.map((script) => script.transcript);

export function matchDemoScript(haystack: string): DemoVideoScript | null {
  const normalized = haystack.toLowerCase();
  return (
    DEMO_VIDEO_SCRIPTS.find((script) =>
      script.patterns.some((pattern) => normalized.includes(pattern.toLowerCase())),
    ) ?? null
  );
}

export function getDemoTranscript(index: number): string {
  const normalized =
    ((index % DEMO_TRANSCRIPTS.length) + DEMO_TRANSCRIPTS.length) % DEMO_TRANSCRIPTS.length;
  return DEMO_TRANSCRIPTS[normalized];
}
