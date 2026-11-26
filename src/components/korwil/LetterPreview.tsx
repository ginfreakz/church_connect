import { useEffect, useRef, useState } from "react";
import type { LetterContent, Letterhead, LetterMeta } from "@/src/lib/letter";

// Width of the preview document: A4 sheet (210mm ≈ 794px) plus the grey margin around it.
const DOC_WIDTH = 860;

/** Renders the letter exactly as the PDF will look (same server HTML), scaled to the container width. */
export function LetterPreview({ meta, content, letterhead }: { meta: LetterMeta; content: LetterContent; letterhead?: Letterhead }) {
  const [html, setHtml] = useState("");
  const [error, setError] = useState("");
  const [scale, setScale] = useState(0.7);
  const [docHeight, setDocHeight] = useState(1200);
  const wrapper = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const requestKey = JSON.stringify({ meta, content, letterhead });

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch("/api/korwil/surat/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: requestKey,
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Gagal membuat pratinjau");
        setHtml(await response.text());
        setError("");
      } catch (e) {
        if ((e as Error).name !== "AbortError") setError((e as Error).message);
      }
    }, 350);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [requestKey]);

  useEffect(() => {
    const el = wrapper.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setScale(Math.min(1, entry.contentRect.width / DOC_WIDTH)));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const measure = () => {
    const body = frame.current?.contentDocument?.body;
    if (body) setDocHeight(body.scrollHeight);
  };

  return (
    <div ref={wrapper} className="w-full">
      {error && <p className="text-sm text-error mb-2">{error}</p>}
      <div className="rounded-xl overflow-hidden border border-outline-variant/30 bg-[#e5e7eb]" style={{ height: docHeight * scale }}>
        <iframe
          ref={frame}
          title="Pratinjau surat"
          srcDoc={html}
          onLoad={measure}
          style={{ width: DOC_WIDTH, height: docHeight, transform: `scale(${scale})`, transformOrigin: "top left", border: 0 }}
        />
      </div>
    </div>
  );
}
