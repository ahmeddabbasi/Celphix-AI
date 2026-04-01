/**
 * Coqui VCTK VITS — complete speaker ID → display metadata mapping.
 *
 * Rules:
 *  - One deterministic entry per real VCTK speaker ID present in
 *    tts_models/en/vctk/vits (108 speakers, p225–p376 with gaps).
 *  - p315 is documented in the VCTK corpus but absent from the trained
 *    model — it is intentionally excluded.
 *  - Display names are permanent; do NOT regenerate or shuffle them.
 *  - speakerId is the value sent to the backend (POST /generate-voice { speakerId, text }).
 *  - The UI must never render speakerId directly.
 *  - sampleUrl points to a pre-generated .wav clip in public/voice-samples/.
 *
 * NOTE: The original VCTK metadata (gender, accent, age) is known to be
 * unreliable due to a historical bug in the training pipeline. The
 * gender/accent labels below are best-effort assignments and may not
 * match the actual synthesised voice.
 */

export type VoiceGender = "Male" | "Female";
export type VoiceAccent =
  | "British"
  | "American"
  | "Scottish"
  | "Irish"
  | "Australian"
  | "Canadian"
  | "South African"
  | "Indian"
  | "Northern Irish";

export interface Voice {
  speakerId: string;
  displayName: string;
  gender: VoiceGender;
  accent: VoiceAccent;
  /** Relative URL to a pre-recorded sample clip (served from /public). */
  sampleUrl: string;
}

export const voices: Voice[] = [
  // ── p225-p234 ────────────────────────────────────────────────────────
  { speakerId: "p225", displayName: "Ethan",        gender: "Male",     accent: "British",           sampleUrl: "/voice-samples/p225.wav" },
  { speakerId: "p226", displayName: "Claire",       gender: "Female",   accent: "British",           sampleUrl: "/voice-samples/p226.wav" },
  { speakerId: "p227", displayName: "Marcus",       gender: "Male",     accent: "British",           sampleUrl: "/voice-samples/p227.wav" },
  { speakerId: "p228", displayName: "Serena",       gender: "Female",   accent: "British",           sampleUrl: "/voice-samples/p228.wav" },
  { speakerId: "p229", displayName: "Oliver",       gender: "Male",     accent: "British",           sampleUrl: "/voice-samples/p229.wav" },
  { speakerId: "p230", displayName: "Natalie",      gender: "Female",   accent: "British",           sampleUrl: "/voice-samples/p230.wav" },
  { speakerId: "p231", displayName: "Thomas",       gender: "Male",     accent: "British",           sampleUrl: "/voice-samples/p231.wav" },
  { speakerId: "p232", displayName: "Harriet",      gender: "Female",   accent: "British",           sampleUrl: "/voice-samples/p232.wav" },
  { speakerId: "p233", displayName: "James",        gender: "Male",     accent: "British",           sampleUrl: "/voice-samples/p233.wav" },
  { speakerId: "p234", displayName: "Felicity",     gender: "Female",   accent: "British",           sampleUrl: "/voice-samples/p234.wav" },

  // ── p236-p245 ────────────────────────────────────────────────────────
  { speakerId: "p236", displayName: "Duncan",       gender: "Male",     accent: "Scottish",          sampleUrl: "/voice-samples/p236.wav" },
  { speakerId: "p237", displayName: "Fiona",        gender: "Female",   accent: "Scottish",          sampleUrl: "/voice-samples/p237.wav" },
  { speakerId: "p238", displayName: "Callum",       gender: "Male",     accent: "Scottish",          sampleUrl: "/voice-samples/p238.wav" },
  { speakerId: "p239", displayName: "Elspeth",      gender: "Female",   accent: "Scottish",          sampleUrl: "/voice-samples/p239.wav" },
  { speakerId: "p240", displayName: "Hamish",       gender: "Male",     accent: "Scottish",          sampleUrl: "/voice-samples/p240.wav" },
  { speakerId: "p241", displayName: "Morag",        gender: "Female",   accent: "Scottish",          sampleUrl: "/voice-samples/p241.wav" },
  { speakerId: "p243", displayName: "Alistair",     gender: "Male",     accent: "Scottish",          sampleUrl: "/voice-samples/p243.wav" },
  { speakerId: "p244", displayName: "Isla",         gender: "Female",   accent: "Scottish",          sampleUrl: "/voice-samples/p244.wav" },
  { speakerId: "p245", displayName: "Fergus",       gender: "Male",     accent: "Scottish",          sampleUrl: "/voice-samples/p245.wav" },

  // ── p246-p255 ────────────────────────────────────────────────────────
  { speakerId: "p246", displayName: "Siobhan",      gender: "Female",   accent: "Irish",             sampleUrl: "/voice-samples/p246.wav" },
  { speakerId: "p247", displayName: "Cormac",       gender: "Male",     accent: "Irish",             sampleUrl: "/voice-samples/p247.wav" },
  { speakerId: "p248", displayName: "Aoife",        gender: "Female",   accent: "Irish",             sampleUrl: "/voice-samples/p248.wav" },
  { speakerId: "p249", displayName: "Declan",       gender: "Male",     accent: "Irish",             sampleUrl: "/voice-samples/p249.wav" },
  { speakerId: "p250", displayName: "Niamh",        gender: "Female",   accent: "Irish",             sampleUrl: "/voice-samples/p250.wav" },
  { speakerId: "p251", displayName: "Patrick",      gender: "Male",     accent: "Irish",             sampleUrl: "/voice-samples/p251.wav" },
  { speakerId: "p252", displayName: "Brigid",       gender: "Female",   accent: "Irish",             sampleUrl: "/voice-samples/p252.wav" },
  { speakerId: "p253", displayName: "Seamus",       gender: "Male",     accent: "Irish",             sampleUrl: "/voice-samples/p253.wav" },
  { speakerId: "p254", displayName: "Roisin",       gender: "Female",   accent: "Irish",             sampleUrl: "/voice-samples/p254.wav" },
  { speakerId: "p255", displayName: "Finn",         gender: "Male",     accent: "Irish",             sampleUrl: "/voice-samples/p255.wav" },

  // ── p256-p265 ────────────────────────────────────────────────────────
  { speakerId: "p256", displayName: "Charlotte",    gender: "Female",   accent: "British",           sampleUrl: "/voice-samples/p256.wav" },
  { speakerId: "p257", displayName: "George",       gender: "Male",     accent: "British",           sampleUrl: "/voice-samples/p257.wav" },
  { speakerId: "p258", displayName: "Pippa",        gender: "Female",   accent: "British",           sampleUrl: "/voice-samples/p258.wav" },
  { speakerId: "p259", displayName: "William",      gender: "Male",     accent: "British",           sampleUrl: "/voice-samples/p259.wav" },
  { speakerId: "p260", displayName: "Beatrice",     gender: "Female",   accent: "British",           sampleUrl: "/voice-samples/p260.wav" },
  { speakerId: "p261", displayName: "Edmund",       gender: "Male",     accent: "British",           sampleUrl: "/voice-samples/p261.wav" },
  { speakerId: "p262", displayName: "Cordelia",     gender: "Female",   accent: "British",           sampleUrl: "/voice-samples/p262.wav" },
  { speakerId: "p263", displayName: "Sebastian",    gender: "Male",     accent: "British",           sampleUrl: "/voice-samples/p263.wav" },
  { speakerId: "p264", displayName: "Rosalind",     gender: "Female",   accent: "British",           sampleUrl: "/voice-samples/p264.wav" },
  { speakerId: "p265", displayName: "Jasper",       gender: "Male",     accent: "British",           sampleUrl: "/voice-samples/p265.wav" },

  // ── p266-p275 ────────────────────────────────────────────────────────
  { speakerId: "p266", displayName: "Madison",      gender: "Female",   accent: "American",          sampleUrl: "/voice-samples/p266.wav" },
  { speakerId: "p267", displayName: "Carter",       gender: "Male",     accent: "American",          sampleUrl: "/voice-samples/p267.wav" },
  { speakerId: "p268", displayName: "Savannah",     gender: "Female",   accent: "American",          sampleUrl: "/voice-samples/p268.wav" },
  { speakerId: "p269", displayName: "Blake",        gender: "Male",     accent: "American",          sampleUrl: "/voice-samples/p269.wav" },
  { speakerId: "p270", displayName: "Addison",      gender: "Female",   accent: "American",          sampleUrl: "/voice-samples/p270.wav" },
  { speakerId: "p271", displayName: "Wyatt",        gender: "Male",     accent: "American",          sampleUrl: "/voice-samples/p271.wav" },
  { speakerId: "p272", displayName: "Peyton",       gender: "Female",   accent: "American",          sampleUrl: "/voice-samples/p272.wav" },
  { speakerId: "p273", displayName: "Grayson",      gender: "Male",     accent: "American",          sampleUrl: "/voice-samples/p273.wav" },
  { speakerId: "p274", displayName: "Brooke",       gender: "Female",   accent: "American",          sampleUrl: "/voice-samples/p274.wav" },
  { speakerId: "p275", displayName: "Landon",       gender: "Male",     accent: "American",          sampleUrl: "/voice-samples/p275.wav" },

  // ── p276-p285 ────────────────────────────────────────────────────────
  { speakerId: "p276", displayName: "Audrey",       gender: "Female",   accent: "American",          sampleUrl: "/voice-samples/p276.wav" },
  { speakerId: "p277", displayName: "Lincoln",      gender: "Male",     accent: "American",          sampleUrl: "/voice-samples/p277.wav" },
  { speakerId: "p278", displayName: "Stella",       gender: "Female",   accent: "American",          sampleUrl: "/voice-samples/p278.wav" },
  { speakerId: "p279", displayName: "Colton",       gender: "Male",     accent: "American",          sampleUrl: "/voice-samples/p279.wav" },
  { speakerId: "p280", displayName: "Vivienne",     gender: "Female",   accent: "American",          sampleUrl: "/voice-samples/p280.wav" },
  { speakerId: "p281", displayName: "Hunter",       gender: "Male",     accent: "American",          sampleUrl: "/voice-samples/p281.wav" },
  { speakerId: "p282", displayName: "Aurora",       gender: "Female",   accent: "American",          sampleUrl: "/voice-samples/p282.wav" },
  { speakerId: "p283", displayName: "Nolan",        gender: "Male",     accent: "American",          sampleUrl: "/voice-samples/p283.wav" },
  { speakerId: "p284", displayName: "Hazel",        gender: "Female",   accent: "American",          sampleUrl: "/voice-samples/p284.wav" },
  { speakerId: "p285", displayName: "Ryder",        gender: "Male",     accent: "American",          sampleUrl: "/voice-samples/p285.wav" },

  // ── p286-p295 ────────────────────────────────────────────────────────
  { speakerId: "p286", displayName: "Isla",         gender: "Female",   accent: "Northern Irish",    sampleUrl: "/voice-samples/p286.wav" },
  { speakerId: "p287", displayName: "Connor",       gender: "Male",     accent: "Northern Irish",    sampleUrl: "/voice-samples/p287.wav" },
  { speakerId: "p288", displayName: "Sinead",       gender: "Female",   accent: "Northern Irish",    sampleUrl: "/voice-samples/p288.wav" },
  { speakerId: "p292", displayName: "Niall",        gender: "Male",     accent: "Northern Irish",    sampleUrl: "/voice-samples/p292.wav" },
  { speakerId: "p293", displayName: "Orla",         gender: "Female",   accent: "Northern Irish",    sampleUrl: "/voice-samples/p293.wav" },
  { speakerId: "p294", displayName: "Eoin",         gender: "Male",     accent: "Northern Irish",    sampleUrl: "/voice-samples/p294.wav" },
  { speakerId: "p295", displayName: "Cara",         gender: "Female",   accent: "Northern Irish",    sampleUrl: "/voice-samples/p295.wav" },

  // ── p297-p306 ────────────────────────────────────────────────────────
  { speakerId: "p297", displayName: "Lachlan",      gender: "Male",     accent: "Australian",        sampleUrl: "/voice-samples/p297.wav" },
  { speakerId: "p298", displayName: "Sienna",       gender: "Female",   accent: "Australian",        sampleUrl: "/voice-samples/p298.wav" },
  { speakerId: "p299", displayName: "Archer",       gender: "Male",     accent: "Australian",        sampleUrl: "/voice-samples/p299.wav" },
  { speakerId: "p300", displayName: "Harper",       gender: "Female",   accent: "Australian",        sampleUrl: "/voice-samples/p300.wav" },
  { speakerId: "p301", displayName: "Flynn",        gender: "Male",     accent: "Australian",        sampleUrl: "/voice-samples/p301.wav" },
  { speakerId: "p302", displayName: "Matilda",      gender: "Female",   accent: "Australian",        sampleUrl: "/voice-samples/p302.wav" },
  { speakerId: "p303", displayName: "Cooper",       gender: "Male",     accent: "Australian",        sampleUrl: "/voice-samples/p303.wav" },
  { speakerId: "p304", displayName: "Scarlett",     gender: "Female",   accent: "Australian",        sampleUrl: "/voice-samples/p304.wav" },
  { speakerId: "p305", displayName: "Angus",        gender: "Male",     accent: "Australian",        sampleUrl: "/voice-samples/p305.wav" },
  { speakerId: "p306", displayName: "Piper",        gender: "Female",   accent: "Australian",        sampleUrl: "/voice-samples/p306.wav" },

  // ── p307-p316 ────────────────────────────────────────────────────────
  { speakerId: "p307", displayName: "Aiden",        gender: "Male",     accent: "Canadian",          sampleUrl: "/voice-samples/p307.wav" },
  { speakerId: "p308", displayName: "Alexis",       gender: "Female",   accent: "Canadian",          sampleUrl: "/voice-samples/p308.wav" },
  { speakerId: "p310", displayName: "Evan",         gender: "Male",     accent: "Canadian",          sampleUrl: "/voice-samples/p310.wav" },
  { speakerId: "p311", displayName: "Paige",        gender: "Female",   accent: "Canadian",          sampleUrl: "/voice-samples/p311.wav" },
  { speakerId: "p312", displayName: "Tristan",      gender: "Male",     accent: "Canadian",          sampleUrl: "/voice-samples/p312.wav" },
  { speakerId: "p313", displayName: "Mackenzie",    gender: "Female",   accent: "Canadian",          sampleUrl: "/voice-samples/p313.wav" },
  { speakerId: "p314", displayName: "Jordan",       gender: "Male",     accent: "Canadian",          sampleUrl: "/voice-samples/p314.wav" },
  { speakerId: "p316", displayName: "Caden",        gender: "Male",     accent: "Canadian",          sampleUrl: "/voice-samples/p316.wav" },

  // ── p317-p326 ────────────────────────────────────────────────────────
  { speakerId: "p317", displayName: "Priya",        gender: "Female",   accent: "Indian",            sampleUrl: "/voice-samples/p317.wav" },
  { speakerId: "p318", displayName: "Arjun",        gender: "Male",     accent: "Indian",            sampleUrl: "/voice-samples/p318.wav" },
  { speakerId: "p323", displayName: "Kavita",       gender: "Female",   accent: "Indian",            sampleUrl: "/voice-samples/p323.wav" },
  { speakerId: "p326", displayName: "Rohan",        gender: "Male",     accent: "Indian",            sampleUrl: "/voice-samples/p326.wav" },

  // ── p329-p340 ────────────────────────────────────────────────────────
  { speakerId: "p329", displayName: "Amahle",       gender: "Female",   accent: "South African",     sampleUrl: "/voice-samples/p329.wav" },
  { speakerId: "p330", displayName: "Themba",       gender: "Male",     accent: "South African",     sampleUrl: "/voice-samples/p330.wav" },
  { speakerId: "p333", displayName: "Zola",         gender: "Female",   accent: "South African",     sampleUrl: "/voice-samples/p333.wav" },
  { speakerId: "p334", displayName: "Lebo",         gender: "Male",     accent: "South African",     sampleUrl: "/voice-samples/p334.wav" },
  { speakerId: "p335", displayName: "Nandi",        gender: "Female",   accent: "South African",     sampleUrl: "/voice-samples/p335.wav" },
  { speakerId: "p336", displayName: "Sipho",        gender: "Male",     accent: "South African",     sampleUrl: "/voice-samples/p336.wav" },
  { speakerId: "p339", displayName: "Naledi",       gender: "Female",   accent: "South African",     sampleUrl: "/voice-samples/p339.wav" },
  { speakerId: "p340", displayName: "Bongani",      gender: "Male",     accent: "South African",     sampleUrl: "/voice-samples/p340.wav" },

  // ── p341-p376 (remaining British/Mixed) ──────────────────────────────
  { speakerId: "p341", displayName: "Cecily",       gender: "Female",   accent: "British",           sampleUrl: "/voice-samples/p341.wav" },
  { speakerId: "p343", displayName: "Hugo",         gender: "Male",     accent: "British",           sampleUrl: "/voice-samples/p343.wav" },
  { speakerId: "p345", displayName: "Imogen",       gender: "Female",   accent: "British",           sampleUrl: "/voice-samples/p345.wav" },
  { speakerId: "p347", displayName: "Rupert",       gender: "Male",     accent: "British",           sampleUrl: "/voice-samples/p347.wav" },
  { speakerId: "p351", displayName: "Lavinia",      gender: "Female",   accent: "British",           sampleUrl: "/voice-samples/p351.wav" },
  { speakerId: "p360", displayName: "Percival",     gender: "Male",     accent: "British",           sampleUrl: "/voice-samples/p360.wav" },
  { speakerId: "p361", displayName: "Arabella",     gender: "Female",   accent: "British",           sampleUrl: "/voice-samples/p361.wav" },
  { speakerId: "p362", displayName: "Barnaby",      gender: "Male",     accent: "British",           sampleUrl: "/voice-samples/p362.wav" },
  { speakerId: "p363", displayName: "Genevieve",    gender: "Female",   accent: "British",           sampleUrl: "/voice-samples/p363.wav" },
  { speakerId: "p364", displayName: "Archibald",    gender: "Male",     accent: "British",           sampleUrl: "/voice-samples/p364.wav" },
  { speakerId: "p374", displayName: "Verity",       gender: "Female",   accent: "British",           sampleUrl: "/voice-samples/p374.wav" },
  { speakerId: "p376", displayName: "Montgomery",   gender: "Male",     accent: "British",           sampleUrl: "/voice-samples/p376.wav" },
];

// ── Derived helpers (no computation in components) ─────────────────────────

export const ACCENT_OPTIONS: VoiceAccent[] = [
  "British",
  "American",
  "Scottish",
  "Irish",
  "Australian",
  "Canadian",
  "South African",
  "Indian",
  "Northern Irish",
];

export const GENDER_OPTIONS: VoiceGender[] = ["Male", "Female"];

/** Look up a voice by its backend speaker ID. Returns undefined if not found. */
export function getVoiceById(speakerId: string): Voice | undefined {
  return voices.find((v) => v.speakerId === speakerId);
}
