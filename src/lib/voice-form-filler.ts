/**
 * POLANITAS — Voice Form Filler (shared types & dispatcher)
 *
 * SpeechToAction dispatches these events when it detects form-filling intent.
 * Form components listen via useSpeechFormFill() hook.
 *
 * Event name: "polanitas:form-fill"
 * Payload: VoiceFormAction
 */

export type VoiceFormAction =
  | { type: "set-topic"; value: string }
  | { type: "set-audience"; value: string }
  | { type: "set-region"; code: string }
  | { type: "toggle-platform"; platform: string }
  | { type: "set-platforms"; platforms: string[] }
  | { type: "set-focus"; focusId: string }
  | { type: "set-lesson"; index: number }
  | { type: "next-lesson" }
  | { type: "prev-lesson" }
  | { type: "read-lesson-details" }
  | { type: "submit-form" };

/** Dispatch a form action to any listening page component */
export function dispatchVoiceFormAction(action: VoiceFormAction) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("polanitas:form-fill", { detail: action })
  );
}
