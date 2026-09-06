"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeftRight, Mic, Square, Volume2, VolumeX } from "lucide-react";
import { appendInterpreterTurn, endInterpreterSession, startInterpreterSession } from "@/actions/interpreter";
import { LANGUAGES, languageByCode } from "@/lib/interpreter/languages";
import { useListen, useSpeak } from "./useSpeech";

type Speaker = "a" | "b";

export interface QuickPhrase {
  id: string;
  category: string;
  text_en: string;
  text_vi: string;
  salon_id: string | null;
}

interface Turn {
  id: string;
  speaker: Speaker;
  sourceLang: string;
  targetLang: string;
  sourceText: string;
  translatedText: string;
  via: "ai" | "phrase" | "manual";
  pending?: boolean;
  error?: string;
}

interface Props {
  slug: string;
  phrases: QuickPhrase[];
  serverTranscription: boolean;
}

const SIDE_LABEL: Record<Speaker, string> = { a: "Technician", b: "Guest" };

function uid() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Math.random());
}

/**
 * Two-person conversation mode. Side A (technician, Vietnamese by default)
 * and side B (guest, English by default) each have a mic and a text box.
 * Every utterance is translated to the other side's language, spoken aloud,
 * and saved to the session transcript.
 */
export function InterpreterConsole({ slug, phrases, serverTranscription }: Props) {
  const [langA, setLangA] = useState("vi");
  const [langB, setLangB] = useState("en");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [activeSide, setActiveSide] = useState<Speaker | null>(null);
  const [drafts, setDrafts] = useState<Record<Speaker, string>>({ a: "", b: "" });
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [ended, setEnded] = useState(false);
  const [phraseCategory, setPhraseCategory] = useState<string>("all");
  const listRef = useRef<HTMLDivElement>(null);
  const sessionPromise = useRef<Promise<string | null> | null>(null);

  const { supported: ttsSupported, speaking, speak, cancel } = useSpeak();

  const langOf = useCallback((side: Speaker) => (side === "a" ? langA : langB), [langA, langB]);
  const otherSide = (side: Speaker): Speaker => (side === "a" ? "b" : "a");

  const ensureSession = useCallback(async (): Promise<string | null> => {
    if (sessionId) return sessionId;
    if (!sessionPromise.current) {
      sessionPromise.current = startInterpreterSession(slug, langA, langB).then((res) => {
        if ("error" in res) {
          setSessionError(res.error);
          return null;
        }
        setSessionId(res.id);
        return res.id;
      });
    }
    return sessionPromise.current;
  }, [langA, langB, sessionId, slug]);

  const persist = useCallback(
    async (turn: Turn) => {
      const id = await ensureSession();
      if (!id) return;
      const res = await appendInterpreterTurn(slug, {
        sessionId: id,
        speaker: turn.speaker,
        sourceLang: turn.sourceLang,
        targetLang: turn.targetLang,
        sourceText: turn.sourceText,
        translatedText: turn.translatedText,
        via: turn.via,
      });
      if ("error" in res) setSessionError(res.error);
    },
    [ensureSession, slug]
  );

  const addTurn = useCallback(
    async (side: Speaker, sourceText: string, opts?: { translated?: string; via?: Turn["via"] }) => {
      const text = sourceText.trim();
      if (!text || ended) return;
      const sourceLang = langOf(side);
      const targetLang = langOf(otherSide(side));
      const id = uid();
      const base: Turn = { id, speaker: side, sourceLang, targetLang, sourceText: text, translatedText: opts?.translated ?? "", via: opts?.via ?? "ai", pending: !opts?.translated };
      setTurns((prev) => [...prev, base]);

      let translated = opts?.translated ?? "";
      if (!translated) {
        setBusy(true);
        try {
          const res = await fetch("/api/interpreter/translate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ slug, text, from: sourceLang, to: targetLang, speaker: side }),
          });
          const body = (await res.json().catch(() => ({}))) as { translation?: string; error?: string };
          if (!res.ok || !body.translation) throw new Error(body.error ?? "Translation failed");
          translated = body.translation;
        } catch (err) {
          const message = err instanceof Error ? err.message : "Translation failed";
          setTurns((prev) => prev.map((t) => (t.id === id ? { ...t, pending: false, error: message } : t)));
          setBusy(false);
          return;
        }
        setBusy(false);
      }

      const done: Turn = { ...base, translatedText: translated, pending: false };
      setTurns((prev) => prev.map((t) => (t.id === id ? done : t)));
      if (autoSpeak) speak(translated, languageByCode(targetLang).speech);
      void persist(done);
    },
    [autoSpeak, ended, langOf, persist, slug, speak]
  );

  const transcribe = useMemo(
    () =>
      serverTranscription
        ? async (blob: Blob, speechLang: string) => {
            const fd = new FormData();
            fd.append("slug", slug);
            fd.append("lang", LANGUAGES.find((l) => l.speech === speechLang)?.code ?? "en");
            fd.append("audio", blob, "clip.webm");
            const res = await fetch("/api/interpreter/transcribe", { method: "POST", body: fd });
            const body = (await res.json().catch(() => ({}))) as { text?: string; error?: string };
            if (!res.ok) throw new Error(body.error ?? "Transcription failed");
            return body.text ?? "";
          }
        : undefined,
    [serverTranscription, slug]
  );

  const activeSideRef = useRef<Speaker | null>(null);
  activeSideRef.current = activeSide;
  const listen = useListen({
    onFinal: (text) => {
      const side = activeSideRef.current;
      setActiveSide(null);
      if (side) void addTurn(side, text);
    },
    transcribe,
  });

  function toggleMic(side: Speaker) {
    if (listen.listening) {
      listen.stop();
      return;
    }
    cancel();
    setActiveSide(side);
    void listen.start(languageByCode(langOf(side)).speech);
  }

  function submitDraft(side: Speaker) {
    const text = drafts[side];
    setDrafts((d) => ({ ...d, [side]: "" }));
    void addTurn(side, text);
  }

  function applyPhrase(p: QuickPhrase) {
    // Quick phrases are spoken by the technician (side A) to the guest (side B).
    const source = langA === "vi" ? p.text_vi : langA === "en" ? p.text_en : null;
    const target = langB === "en" ? p.text_en : langB === "vi" ? p.text_vi : null;
    if (source && target) void addTurn("a", source, { translated: target, via: "phrase" });
    else if (source) void addTurn("a", source, { via: "phrase" });
    else void addTurn("a", p.text_en, { via: "phrase" });
  }

  function swap() {
    cancel();
    setLangA(langB);
    setLangB(langA);
  }

  async function endSession() {
    cancel();
    listen.stop();
    if (sessionId) await endInterpreterSession(slug, sessionId);
    setEnded(true);
  }

  function newSession() {
    setTurns([]);
    setSessionId(null);
    sessionPromise.current = null;
    setSessionError(null);
    setEnded(false);
  }

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [turns]);

  const categories = useMemo(() => Array.from(new Set(phrases.map((p) => p.category))), [phrases]);
  const visiblePhrases = phraseCategory === "all" ? phrases : phrases.filter((p) => p.category === phraseCategory);

  const micHint =
    listen.mode === "browser" ? "Tap the mic, speak, then pause." : listen.mode === "recorder" ? "Tap to record, tap again to stop (max 30 s)." : "Voice capture is not available in this browser; type instead.";

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-blush-100 bg-white p-3 text-sm">
        <label className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-blush-800/60">Technician</span>
          <select value={langA} onChange={(e) => setLangA(e.target.value)} className="input-field !w-auto !py-1.5" disabled={turns.length > 0}>
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.nativeName}
              </option>
            ))}
          </select>
        </label>
        <button type="button" onClick={swap} className="btn-secondary !px-3 !py-1.5" aria-label="Swap languages" disabled={turns.length > 0}>
          <ArrowLeftRight className="h-4 w-4" aria-hidden />
        </button>
        <label className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-blush-800/60">Guest</span>
          <select value={langB} onChange={(e) => setLangB(e.target.value)} className="input-field !w-auto !py-1.5" disabled={turns.length > 0}>
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.nativeName}
              </option>
            ))}
          </select>
        </label>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (autoSpeak) cancel();
              setAutoSpeak((v) => !v);
            }}
            className="btn-secondary !px-3 !py-1.5"
            aria-pressed={autoSpeak}
            title={ttsSupported ? "Read translations aloud" : "Text-to-speech not supported here"}
            disabled={!ttsSupported}
          >
            {autoSpeak ? <Volume2 className="h-4 w-4" aria-hidden /> : <VolumeX className="h-4 w-4" aria-hidden />}
            <span className="hidden sm:inline">{autoSpeak ? "Speaking on" : "Muted"}</span>
          </button>
          {ended ? (
            <button type="button" onClick={newSession} className="btn-primary !px-4 !py-1.5">
              New conversation
            </button>
          ) : (
            <button type="button" onClick={() => void endSession()} className="btn-secondary !px-4 !py-1.5" disabled={turns.length === 0}>
              End &amp; save
            </button>
          )}
        </div>
      </div>

      {(sessionError || listen.error) && (
        <p role="alert" className="rounded-2xl border border-red-100 bg-red-50 px-4 py-2 text-sm text-red-600">
          {sessionError ?? listen.error}
        </p>
      )}
      {ended && (
        <p className="rounded-2xl border border-green-100 bg-green-50 px-4 py-2 text-sm text-green-700">
          Conversation saved.{" "}
          {sessionId && (
            <Link href={`/app/${slug}/interpreter/history/${sessionId}`} className="underline">
              Open transcript
            </Link>
          )}
        </p>
      )}

      {/* Transcript */}
      <div ref={listRef} className="h-[min(48vh,520px)] space-y-3 overflow-y-auto rounded-3xl border border-blush-100 bg-blush-50/40 p-4">
        {turns.length === 0 && (
          <p className="py-16 text-center text-sm text-blush-800/60">
            {micHint} Each message is translated for the other person and read aloud.
          </p>
        )}
        {turns.map((t) => (
          <div key={t.id} className={`flex ${t.speaker === "a" ? "justify-start" : "justify-end"}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${t.speaker === "a" ? "rounded-bl-sm border border-blush-100 bg-white" : "rounded-br-sm bg-blush-500 text-white"}`}>
              <p className={`text-[10px] font-semibold uppercase tracking-wide ${t.speaker === "a" ? "text-blush-800/50" : "text-white/70"}`}>
                {SIDE_LABEL[t.speaker]} · {languageByCode(t.sourceLang).nativeName}
                {t.via === "phrase" && " · quick phrase"}
              </p>
              <p className="mt-1 text-sm">{t.sourceText}</p>
              <div className={`mt-2 border-t pt-2 text-sm ${t.speaker === "a" ? "border-blush-50 text-blush-700" : "border-white/20 text-white"}`}>
                {t.pending ? (
                  <span className="italic opacity-70">Translating…</span>
                ) : t.error ? (
                  <span className="text-red-500">{t.error}</span>
                ) : (
                  <span className="flex items-start gap-2">
                    <span className="flex-1 font-medium">{t.translatedText}</span>
                    {ttsSupported && (
                      <button type="button" onClick={() => speak(t.translatedText, languageByCode(t.targetLang).speech)} aria-label="Play translation" className="opacity-70 hover:opacity-100">
                        <Volume2 className="h-4 w-4" aria-hidden />
                      </button>
                    )}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Two speaker panels */}
      <div className="grid gap-3 md:grid-cols-2">
        {(["a", "b"] as Speaker[]).map((side) => {
          const lang = languageByCode(langOf(side));
          const isListening = listen.listening && activeSide === side;
          return (
            <div key={side} className={`rounded-3xl border p-4 ${side === "a" ? "border-blush-100 bg-white" : "border-blush-200 bg-blush-50/60"}`}>
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-blush-900">
                  {SIDE_LABEL[side]} <span className="text-xs font-normal text-blush-800/60">· {lang.nativeName}</span>
                </p>
                {isListening && <span className="text-xs text-blush-500">{listen.interim || "Listening…"}</span>}
              </div>
              <div className="mt-3 flex items-end gap-2">
                <button
                  type="button"
                  onClick={() => toggleMic(side)}
                  disabled={ended || listen.mode === "none" || (listen.listening && activeSide !== side)}
                  aria-pressed={isListening}
                  aria-label={isListening ? "Stop listening" : `Speak as ${SIDE_LABEL[side]}`}
                  className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-white shadow-soft transition active:scale-95 disabled:opacity-40 ${isListening ? "animate-pulse bg-red-500" : "bg-gradient-to-br from-blush-500 to-blush-600"}`}
                >
                  {isListening ? <Square className="h-5 w-5" aria-hidden /> : <Mic className="h-6 w-6" aria-hidden />}
                </button>
                <form
                  className="flex flex-1 gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    submitDraft(side);
                  }}
                >
                  <input
                    value={drafts[side]}
                    onChange={(e) => setDrafts((d) => ({ ...d, [side]: e.target.value }))}
                    placeholder={`Type in ${lang.name}…`}
                    aria-label={`${SIDE_LABEL[side]} message`}
                    className="input-field"
                    disabled={ended}
                    maxLength={1500}
                  />
                  <button type="submit" className="btn-secondary !px-4" disabled={ended || busy || !drafts[side].trim()}>
                    Send
                  </button>
                </form>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick phrases */}
      {phrases.length > 0 && (
        <div className="rounded-3xl border border-blush-100 bg-white p-4">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-blush-900">Quick phrases</p>
            <div className="flex flex-wrap gap-1">
              <button type="button" onClick={() => setPhraseCategory("all")} className={`rounded-full px-3 py-1 text-xs ${phraseCategory === "all" ? "bg-blush-500 text-white" : "bg-blush-50 text-blush-700"}`}>
                All
              </button>
              {categories.map((c) => (
                <button key={c} type="button" onClick={() => setPhraseCategory(c)} className={`rounded-full px-3 py-1 text-xs ${phraseCategory === c ? "bg-blush-500 text-white" : "bg-blush-50 text-blush-700"}`}>
                  {c}
                </button>
              ))}
            </div>
            <Link href={`/app/${slug}/interpreter/phrases`} className="ml-auto text-xs text-blush-500 hover:underline">
              Manage phrases
            </Link>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {visiblePhrases.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => applyPhrase(p)}
                disabled={ended}
                title={p.text_en}
                className="rounded-2xl border border-blush-100 px-3 py-2 text-left text-xs text-blush-900 transition hover:border-blush-300 hover:bg-blush-50 disabled:opacity-50"
              >
                <span className="block font-medium">{langA === "vi" ? p.text_vi : p.text_en}</span>
                <span className="block text-blush-800/60">{langA === "vi" ? p.text_en : p.text_vi}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-blush-800/60">
        {speaking ? "Speaking… " : ""}
        Speech recognition runs in your browser when available{serverTranscription ? ", with a server fallback" : ""}. Voices use your device&apos;s text-to-speech.
      </p>
    </div>
  );
}
