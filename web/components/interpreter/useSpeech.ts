"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Minimal typings for the (still prefixed) Web Speech API.
interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: { transcript: string };
}
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export type ListenMode = "browser" | "recorder" | "none";

interface UseListenOptions {
  onFinal: (text: string) => void;
  /** Server transcription for browsers without Web Speech (MediaRecorder upload). */
  transcribe?: (blob: Blob, speechLang: string) => Promise<string>;
}

/**
 * Push-to-talk listening. Prefers the browser's SpeechRecognition (free,
 * low-latency, works offline in Chrome for some languages); falls back to
 * MediaRecorder + server transcription; reports "none" if neither exists.
 */
export function useListen({ onFinal, transcribe }: UseListenOptions) {
  const [mode, setMode] = useState<ListenMode>("none");
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const langRef = useRef("en-US");
  const onFinalRef = useRef(onFinal);
  onFinalRef.current = onFinal;

  useEffect(() => {
    if (getRecognitionCtor()) setMode("browser");
    else if (typeof navigator !== "undefined" && navigator.mediaDevices && typeof MediaRecorder !== "undefined" && transcribe) setMode("recorder");
    else setMode("none");
  }, [transcribe]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    if (recorderRef.current && recorderRef.current.state !== "inactive") recorderRef.current.stop();
    setListening(false);
  }, []);

  const start = useCallback(
    async (speechLang: string) => {
      setError(null);
      setInterim("");
      langRef.current = speechLang;

      if (mode === "browser") {
        const Ctor = getRecognitionCtor();
        if (!Ctor) return;
        const rec = new Ctor();
        rec.lang = speechLang;
        rec.continuous = false;
        rec.interimResults = true;
        rec.maxAlternatives = 1;
        let finalText = "";
        rec.onresult = (e) => {
          let interimText = "";
          for (let i = e.resultIndex; i < e.results.length; i++) {
            const r = e.results[i];
            if (r.isFinal) finalText += r[0].transcript;
            else interimText += r[0].transcript;
          }
          setInterim(interimText || finalText);
        };
        rec.onerror = (e) => {
          if (e.error !== "no-speech" && e.error !== "aborted") setError(`Microphone error: ${e.error}`);
        };
        rec.onend = () => {
          setListening(false);
          setInterim("");
          const text = finalText.trim();
          if (text) onFinalRef.current(text);
          recognitionRef.current = null;
        };
        recognitionRef.current = rec;
        try {
          rec.start();
          setListening(true);
        } catch {
          setError("Could not start the microphone.");
        }
        return;
      }

      if (mode === "recorder" && transcribe) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const mime = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"].find((m) => MediaRecorder.isTypeSupported(m));
          const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
          chunksRef.current = [];
          recorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunksRef.current.push(e.data);
          };
          recorder.onstop = async () => {
            stream.getTracks().forEach((t) => t.stop());
            setListening(false);
            const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
            if (blob.size < 1000) return;
            setInterim("Transcribing…");
            try {
              const text = (await transcribe(blob, langRef.current)).trim();
              if (text) onFinalRef.current(text);
            } catch (err) {
              setError(err instanceof Error ? err.message : "Transcription failed.");
            } finally {
              setInterim("");
            }
          };
          recorderRef.current = recorder;
          recorder.start();
          setListening(true);
          // Hard stop after 30 s so a forgotten mic never records forever.
          setTimeout(() => {
            if (recorder.state === "recording") recorder.stop();
          }, 30_000);
        } catch {
          setError("Microphone access was denied.");
        }
        return;
      }

      setError("This browser cannot capture speech. Type the message instead.");
    },
    [mode, transcribe]
  );

  useEffect(() => () => stop(), [stop]);

  return { mode, listening, interim, error, start, stop };
}

/** Text-to-speech with a per-language voice preference. */
export function useSpeak() {
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    setSupported(true);
    const load = () => {
      voicesRef.current = window.speechSynthesis.getVoices();
    };
    load();
    window.speechSynthesis.addEventListener("voiceschanged", load);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", load);
  }, []);

  const speak = useCallback(
    (text: string, speechLang: string) => {
      if (!supported || !text) return;
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = speechLang;
      const base = speechLang.split("-")[0];
      const voice =
        voicesRef.current.find((v) => v.lang === speechLang && /google|natural|premium|enhanced/i.test(v.name)) ??
        voicesRef.current.find((v) => v.lang === speechLang) ??
        voicesRef.current.find((v) => v.lang.startsWith(base));
      if (voice) utter.voice = voice;
      utter.rate = 0.95;
      utter.onstart = () => setSpeaking(true);
      utter.onend = () => setSpeaking(false);
      utter.onerror = () => setSpeaking(false);
      window.speechSynthesis.speak(utter);
    },
    [supported]
  );

  const cancel = useCallback(() => {
    if (supported) window.speechSynthesis.cancel();
    setSpeaking(false);
  }, [supported]);

  return { supported, speaking, speak, cancel };
}
