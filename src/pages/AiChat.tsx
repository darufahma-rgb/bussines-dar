import { useState, useRef, useEffect } from "react";
import { api } from "@/lib/api";
import { Sparkles, Send, Loader2, Bot, User, Trash2 } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const STARTERS = [
  "Siapa customer yang paling aktif minggu ini?",
  "Berikan saran follow-up untuk customer yang statusnya warm.",
  "Apa strategi terbaik untuk menutup deal yang sudah lama di pipeline?",
  "Rangkum kondisi pipeline bisnis saat ini.",
];

export default function AiChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const autoResize = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 160) + "px";
  };

  const send = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || loading) return;

    const userMsg: Message = { role: "user", content };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setLoading(true);

    try {
      const { reply } = await api.ai.chat(next.map((m) => ({ role: m.role, content: m.content })));
      setMessages([...next, { role: "assistant", content: reply }]);
    } catch {
      setMessages([...next, { role: "assistant", content: "Maaf, terjadi kesalahan. Coba lagi ya." }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)] max-w-3xl mx-auto">
      {/* header */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-violet-100 flex items-center justify-center">
            <Sparkles className="h-4.5 w-4.5 text-violet-600" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground text-sm leading-tight">Asisten AI</h2>
            <p className="text-xs text-muted-foreground">Tahu semua tentang bisnis kamu</p>
          </div>
        </div>
        {!isEmpty && (
          <button
            onClick={() => setMessages([])}
            className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Reset
          </button>
        )}
      </div>

      {/* messages area */}
      <div className="flex-1 overflow-y-auto rounded-2xl bg-white border border-border card-shadow">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full px-6 py-12 text-center gap-5">
            <div className="h-14 w-14 rounded-2xl bg-violet-50 flex items-center justify-center">
              <Sparkles className="h-7 w-7 text-violet-500" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Tanya apa saja tentang bisnismu</p>
              <p className="text-sm text-muted-foreground mt-1">
                Asisten tahu data customer, pipeline, dan bisa bantu strategi penjualan.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg mt-2">
              {STARTERS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-left px-4 py-3 rounded-xl border border-border bg-muted/40 text-sm text-foreground hover:bg-violet-50 hover:border-violet-200 transition-colors leading-snug"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="px-4 py-5 space-y-5">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
              >
                <div className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                  msg.role === "user"
                    ? "bg-primary text-white"
                    : "bg-violet-100 text-violet-600"
                }`}>
                  {msg.role === "user"
                    ? <User className="h-3.5 w-3.5" />
                    : <Bot className="h-3.5 w-3.5" />
                  }
                </div>
                <div
                  className={`max-w-[78%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "bg-primary text-white rounded-tr-sm"
                      : "bg-muted/60 text-foreground rounded-tl-sm"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-3">
                <div className="h-7 w-7 rounded-lg bg-violet-100 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="h-3.5 w-3.5 text-violet-600" />
                </div>
                <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-muted/60 flex items-center gap-1.5">
                  <Loader2 className="h-3.5 w-3.5 text-muted-foreground animate-spin" />
                  <span className="text-sm text-muted-foreground">Sedang berpikir...</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* input bar */}
      <div className="mt-3 shrink-0">
        <div className="flex gap-2.5 items-end bg-white border border-border rounded-2xl card-shadow px-4 py-3">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => { setInput(e.target.value); autoResize(); }}
            onKeyDown={handleKeyDown}
            placeholder="Tanya sesuatu tentang bisnis atau customer kamu... (Enter untuk kirim)"
            rows={1}
            className="flex-1 resize-none text-sm bg-transparent border-0 outline-none text-foreground placeholder:text-muted-foreground/70 leading-relaxed py-0.5"
            style={{ minHeight: "24px" }}
          />
          <button
            onClick={() => send()}
            disabled={!input.trim() || loading}
            className="h-9 w-9 rounded-xl bg-primary text-white flex items-center justify-center shrink-0 hover:opacity-90 disabled:opacity-40 transition"
          >
            {loading
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Send className="h-4 w-4" />
            }
          </button>
        </div>
        <p className="text-center text-[11px] text-muted-foreground/60 mt-2">
          Shift+Enter untuk baris baru · Enter untuk kirim
        </p>
      </div>
    </div>
  );
}
