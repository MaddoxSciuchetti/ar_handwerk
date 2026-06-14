/**
 * Pre-written transcripts for demo videos whose real audio does not mention
 * the tasks we want Pioneer to extract. Each script mirrors a realistic
 * Büro / Baustelle conversation with explicit decisions and deadlines.
 */

export const DEMO_TRANSCRIPTS = [
  `[00:00] Büroassistentin: Guten Morgen — kurz zum Vaillant-Tagesplan. Morgen früh soll die Wärmepumpe bei Frau Becker in Giesing eingebaut werden, richtig?

[00:09] Handwerker: Genau. Vaillant aroTHERM plus, alles schon auf dem Transporter geladen. Termin war für morgen sieben Uhr dreißig.

[00:18] Büroassistentin: Stop — Frau Becker hat gerade angerufen. Vaillant meldet Lieferprobleme, die Wärmepumpe kommt erst nächste Woche Mittwoch. Heute und morgen geht gar nichts.

[00:31] Handwerker: Dann muss der Termin morgen abgesagt werden. Ich fahre nicht mit leeren Händen an.

[00:38] Büroassistentin: Richtig. Bitte den Einbautermin morgen bei Frau Becker stornieren und direkt einen neuen Termin für nächste Woche Mittwoch vormittag einplanen — Vaillant aroTHERM plus, komplette Installation.

[00:52] Handwerker: Alles klar. Ich storniere morgen und trage den Einbau nächste Woche Mittwoch ein.`,

  `[00:00] Kollege: Marek, Update aus Schwabing — Viessmann Vitodens 200-W, Fehler F.28, die Zündung fällt ständig aus.

[00:09] Handwerker: Was siehst du vor Ort?

[00:11] Kollege: Ionisationselektrode ist durch, Flammenwächter sieht verkohlt aus. Kein Ersatzteil auf dem Transporter. REISSER hat die Elektrode laut System erst übermorgen auf Lager.

[00:25] Handwerker: Mieterin ohne Heizung?

[00:27] Kollege: Ja, draußen zwei Grad. Ich würde den Elektroheizstrahler aus dem Lager mitbringen und Mittwoch früh um acht Uhr zum Tausch zurückkommen.

[00:38] Handwerker: Okay — Entscheidung: Elektroheizstrang als Übergang bis Mittwoch, Ionisationselektrode bei REISSER bestellen, Wiederholungstermin Mittwoch acht Uhr, Viessmann Vitodens Wartung abschließen.

[00:52] Kollege: Verstanden. Ich bestelle die Elektrode und trage Mittwoch früh ein.`,
] as const;

export function getDemoTranscript(index: number): string {
  const normalized =
    ((index % DEMO_TRANSCRIPTS.length) + DEMO_TRANSCRIPTS.length) % DEMO_TRANSCRIPTS.length;
  return DEMO_TRANSCRIPTS[normalized];
}
