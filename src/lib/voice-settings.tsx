import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type VoiceSettings = {
  voiceURI: string | null;
  autoSpeak: boolean;
  voices: SpeechSynthesisVoice[];
  setVoiceURI: (uri: string | null) => void;
  setAutoSpeak: (v: boolean) => void;
  speak: (text: string) => void;
  stop: () => void;
};

const Ctx = createContext<VoiceSettings | null>(null);

export function VoiceProvider({ children }: { children: ReactNode }) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceURI, setVoiceURIState] = useState<string | null>(null);
  const [autoSpeak, setAutoSpeakState] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const load = () => setVoices(window.speechSynthesis.getVoices());
    load();
    window.speechSynthesis.onvoiceschanged = load;
    const v = localStorage.getItem("rafiki.voiceURI");
    const a = localStorage.getItem("rafiki.autoSpeak");
    if (v) setVoiceURIState(v);
    if (a) setAutoSpeakState(a === "1");
  }, []);

  const setVoiceURI = (uri: string | null) => {
    setVoiceURIState(uri);
    if (typeof window !== "undefined") {
      if (uri) localStorage.setItem("rafiki.voiceURI", uri);
      else localStorage.removeItem("rafiki.voiceURI");
    }
  };
  const setAutoSpeak = (v: boolean) => {
    setAutoSpeakState(v);
    if (typeof window !== "undefined") localStorage.setItem("rafiki.autoSpeak", v ? "1" : "0");
  };

  const speak = (text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const v = voices.find((x) => x.voiceURI === voiceURI);
    if (v) u.voice = v;
    u.rate = 1;
    u.pitch = 1;
    window.speechSynthesis.speak(u);
  };
  const stop = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
  };

  return (
    <Ctx.Provider value={{ voiceURI, autoSpeak, voices, setVoiceURI, setAutoSpeak, speak, stop }}>
      {children}
    </Ctx.Provider>
  );
}

export function useVoiceSettings() {
  const v = useContext(Ctx);
  if (!v) throw new Error("VoiceProvider missing");
  return v;
}