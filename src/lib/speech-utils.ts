/**
 * POLANITAS — Speech command utility (shared, client-safe)
 * No "use server" or "use client" directive — importable anywhere.
 */

export const QUESTION_INTENT_PATTERNS = [
  "apa yang ada", "ada apa", "bisa apa", "apa saja", "ada apa di sini",
  "jelaskan", "ceritakan", "beritahu", "informasi", "info",
  "ajarkan", "ajarin", "pelajari", "mulai belajar", "mulai mengajar",
  "apa isi", "isi nya", "ini halaman apa", "halaman ini berisi",
  "topik apa", "materi apa", "apa yang dipelajari",
  "apa itu", "artinya", "arti", "maksudnya", "maksud", 
  "kenapa", "bagaimana", "contohnya", "contoh", "apa bedanya", "bedanya",
  "lanjut", "terus", "lagi", "tolong", "bisa bantu"
];

/** Returns true if the normalized transcript looks like a question / explanation request */
export function isQuestion(text: string): boolean {
  return QUESTION_INTENT_PATTERNS.some((p) => text.includes(p));
}

/** TTS Speech function for Indonesian voice */
export function speak(text: string) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = "id-ID";
  utt.rate = 0.92;
  window.speechSynthesis.speak(utt);
}
