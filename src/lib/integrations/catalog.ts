export type IntegrationId =
  | "gmail"
  | "google-calendar"
  | "telegram"
  | "whatsapp"
  | "imessage"
  | "slack"
  | "discord"
  | "microsoft-teams"
  | "signal"
  | "baer-ollenroth"
  | "vaillant"
  | "bucher-kg"
  | "reisser"
  | "peter-jensen";

export type IntegrationCategory = "productivity" | "messaging" | "suppliers";

export type IntegrationDefinition = {
  id: IntegrationId;
  name: string;
  description: string;
  category: IntegrationCategory;
  signUpUrl: string;
  brandColor: string;
  brandLabel: string;
  /** Web shop domain used for part price search. */
  domain?: string;
};

export const INTEGRATIONS: IntegrationDefinition[] = [
  {
    id: "gmail",
    name: "Gmail",
    description: "Read, compose, and send emails from your inbox.",
    category: "productivity",
    signUpUrl: "https://accounts.google.com/signup",
    brandColor: "#ea4335",
    brandLabel: "M",
  },
  {
    id: "google-calendar",
    name: "Google Calendar",
    description: "Create calendar events and sync deadlines from tasks.",
    category: "productivity",
    signUpUrl: "https://accounts.google.com/signup",
    brandColor: "#4285f4",
    brandLabel: "C",
  },
  {
    id: "telegram",
    name: "Telegram",
    description: "Receive task reminders and updates in Telegram chats.",
    category: "messaging",
    signUpUrl: "https://telegram.org/",
    brandColor: "#229ed9",
    brandLabel: "T",
  },
  {
    id: "whatsapp",
    name: "WhatsApp",
    description: "Get notifications and quick replies via WhatsApp.",
    category: "messaging",
    signUpUrl: "https://www.whatsapp.com/",
    brandColor: "#25d366",
    brandLabel: "W",
  },
  {
    id: "imessage",
    name: "iMessage",
    description: "Send task summaries and alerts through iMessage.",
    category: "messaging",
    signUpUrl: "https://www.apple.com/imessage/",
    brandColor: "#34c759",
    brandLabel: "i",
  },
  {
    id: "slack",
    name: "Slack",
    description: "Post task updates to channels and direct messages.",
    category: "messaging",
    signUpUrl: "https://slack.com/get-started",
    brandColor: "#4a154b",
    brandLabel: "S",
  },
  {
    id: "discord",
    name: "Discord",
    description: "Push task notifications to servers and DMs.",
    category: "messaging",
    signUpUrl: "https://discord.com/register",
    brandColor: "#5865f2",
    brandLabel: "D",
  },
  {
    id: "microsoft-teams",
    name: "Microsoft Teams",
    description: "Share task updates with your team in Teams channels.",
    category: "messaging",
    signUpUrl: "https://www.microsoft.com/microsoft-teams/sign-up-for-free",
    brandColor: "#6264a7",
    brandLabel: "T",
  },
  {
    id: "signal",
    name: "Signal",
    description: "Receive private, encrypted task alerts on Signal.",
    category: "messaging",
    signUpUrl: "https://signal.org/download/",
    brandColor: "#3a76f0",
    brandLabel: "Si",
  },
  {
    id: "baer-ollenroth",
    name: "Bär und Ollenroth",
    description: "Großhandel für Sanitär, Heizung und Klima — Katalog und Bestellungen.",
    category: "suppliers",
    signUpUrl: "https://www.baer-ollenroth.de/",
    brandColor: "#c41230",
    brandLabel: "B+O",
    domain: "baer-ollenroth.de",
  },
  {
    id: "vaillant",
    name: "Vaillant",
    description: "Hersteller für Heiztechnik, Wärmepumpen und Serviceunterlagen.",
    category: "suppliers",
    signUpUrl: "https://www.vaillant.de/",
    brandColor: "#00965e",
    brandLabel: "V",
    domain: "vaillant.de",
  },
  {
    id: "bucher-kg",
    name: "Bucher KG",
    description: "Sanitär- und Heizungsgroßhandel — Ersatzteile und Materialbeschaffung.",
    category: "suppliers",
    signUpUrl: "https://www.bucher.de/",
    brandColor: "#003b7a",
    brandLabel: "BK",
    domain: "bucher.de",
  },
  {
    id: "reisser",
    name: "REISSER Gruppe",
    description: "Schrauben, Befestigungstechnik und Werkzeuge für den SHK-Betrieb.",
    category: "suppliers",
    signUpUrl: "https://www.reisser.de/",
    brandColor: "#e30613",
    brandLabel: "R",
    domain: "reisser.de",
  },
  {
    id: "peter-jensen",
    name: "Peter Jensen GmbH",
    description: "SHK-Großhandel — Beschaffung von Rohrleitungen, Armaturen und Zubehör.",
    category: "suppliers",
    signUpUrl: "https://www.peter-jensen.de/",
    brandColor: "#1d4ed8",
    brandLabel: "PJ",
    domain: "peter-jensen.de",
  },
];

export const INTEGRATION_STORAGE_KEY = "field:integration-preferences";

export type IntegrationPreferences = Record<IntegrationId, boolean>;

export const DEFAULT_INTEGRATION_PREFERENCES: IntegrationPreferences = {
  gmail: false,
  "google-calendar": false,
  telegram: false,
  whatsapp: false,
  imessage: false,
  slack: false,
  discord: false,
  "microsoft-teams": false,
  signal: false,
  "baer-ollenroth": false,
  vaillant: false,
  "bucher-kg": false,
  reisser: false,
  "peter-jensen": false,
};

/** Domains of enabled trade-partner integrations for purchase search. */
export function tradePartnerSearchDomains(): string[] {
  return INTEGRATIONS.filter((item) => item.category === "suppliers" && item.domain).map(
    (item) => item.domain!,
  );
}

export const CONNECTED_STORAGE_KEY = "field:integration-connections";

export type IntegrationConnections = Partial<Record<IntegrationId, boolean>>;
