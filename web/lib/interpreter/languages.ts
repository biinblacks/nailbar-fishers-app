/** Languages the interpreter supports. Codes double as BCP-47 hints for speech APIs. */
export interface InterpreterLanguage {
  code: string;
  name: string;
  nativeName: string;
  speech: string; // Web Speech / TTS locale
}

export const LANGUAGES: InterpreterLanguage[] = [
  { code: "vi", name: "Vietnamese", nativeName: "Tiếng Việt", speech: "vi-VN" },
  { code: "en", name: "English", nativeName: "English", speech: "en-US" },
  { code: "es", name: "Spanish", nativeName: "Español", speech: "es-US" },
  { code: "zh", name: "Chinese (Mandarin)", nativeName: "中文", speech: "zh-CN" },
  { code: "ko", name: "Korean", nativeName: "한국어", speech: "ko-KR" },
];

export const LANGUAGE_CODES = LANGUAGES.map((l) => l.code);

export function languageByCode(code: string): InterpreterLanguage {
  return LANGUAGES.find((l) => l.code === code) ?? LANGUAGES[1];
}
