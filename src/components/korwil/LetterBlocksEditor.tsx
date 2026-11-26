import { ArrowDown, ArrowUp, ListPlus, Pilcrow, Plus, Trash2, X } from "lucide-react";
import type { LetterBlock } from "@/src/lib/letter";
import { TextArea, TextInput } from "./ui";

const iconButton = "p-1.5 rounded hover:bg-slate-100 text-outline hover:text-on-surface disabled:opacity-30";

/** Edits the letter body as a list of paragraphs and "Label : Value" groups. */
export function LetterBlocksEditor({ blocks, onChange }: { blocks: LetterBlock[]; onChange: (blocks: LetterBlock[]) => void }) {
  const update = (index: number, block: LetterBlock) => onChange(blocks.map((b, i) => (i === index ? block : b)));
  const remove = (index: number) => onChange(blocks.filter((_, i) => i !== index));
  const move = (index: number, delta: number) => {
    const next = [...blocks];
    const [item] = next.splice(index, 1);
    next.splice(index + delta, 0, item);
    onChange(next);
  };
  const insertAt = (index: number, block: LetterBlock) => onChange([...blocks.slice(0, index), block, ...blocks.slice(index)]);

  const newParagraph = (): LetterBlock => ({ type: "paragraph", text: "" });
  const newFields = (): LetterBlock => ({ type: "fields", title: "", rows: [{ label: "Nama", value: "" }] });

  const AddButtons = ({ at }: { at: number }) => (
    <div className="flex items-center gap-2">
      <button type="button" onClick={() => insertAt(at, newParagraph())} className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
        <Plus className="w-3.5 h-3.5" /> Paragraf
      </button>
      <span className="text-outline-variant">·</span>
      <button type="button" onClick={() => insertAt(at, newFields())} className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
        <Plus className="w-3.5 h-3.5" /> Data (Nama : ...)
      </button>
    </div>
  );

  return (
    <div className="space-y-3">
      {blocks.map((block, index) => (
        <div key={index} className="rounded-lg border border-outline-variant/40 bg-white">
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-outline-variant/20 bg-slate-50/60 rounded-t-lg">
            <span className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant flex items-center gap-1.5">
              {block.type === "paragraph" ? <Pilcrow className="w-3.5 h-3.5" /> : <ListPlus className="w-3.5 h-3.5" />}
              {block.type === "paragraph" ? "Paragraf" : "Data"}
            </span>
            <span className="flex items-center">
              <button type="button" className={iconButton} disabled={index === 0} onClick={() => move(index, -1)} title="Naikkan">
                <ArrowUp className="w-4 h-4" />
              </button>
              <button type="button" className={iconButton} disabled={index === blocks.length - 1} onClick={() => move(index, 1)} title="Turunkan">
                <ArrowDown className="w-4 h-4" />
              </button>
              <button type="button" className={`${iconButton} hover:!text-error`} onClick={() => remove(index)} title="Hapus bagian ini">
                <Trash2 className="w-4 h-4" />
              </button>
            </span>
          </div>

          <div className="p-3">
            {block.type === "paragraph" ? (
              <TextArea
                rows={Math.min(10, Math.max(2, Math.ceil(block.text.length / 70) + block.text.split("\n").length - 1))}
                value={block.text}
                onChange={(e) => update(index, { ...block, text: e.target.value })}
                placeholder="Tulis paragraf..."
              />
            ) : (
              <div className="space-y-2">
                <TextInput
                  value={block.title}
                  onChange={(e) => update(index, { ...block, title: e.target.value })}
                  placeholder="Kalimat pembuka (opsional), mis. Dengan ini menerangkan bahwa:"
                />
                {block.rows.map((row, rowIndex) => (
                  <div key={rowIndex} className="flex items-center gap-2">
                    <TextInput
                      className="!w-44 shrink-0"
                      value={row.label}
                      onChange={(e) => update(index, { ...block, rows: block.rows.map((r, i) => (i === rowIndex ? { ...r, label: e.target.value } : r)) })}
                      placeholder="Label"
                    />
                    <span className="font-bold text-on-surface-variant">:</span>
                    <TextInput
                      value={row.value}
                      onChange={(e) => update(index, { ...block, rows: block.rows.map((r, i) => (i === rowIndex ? { ...r, value: e.target.value } : r)) })}
                      placeholder="Isi"
                    />
                    <button
                      type="button"
                      className={iconButton}
                      onClick={() => update(index, { ...block, rows: block.rows.filter((_, i) => i !== rowIndex) })}
                      title="Hapus baris"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => update(index, { ...block, rows: [...block.rows, { label: "", value: "" }] })}
                  className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Tambah baris
                </button>
              </div>
            )}
          </div>
        </div>
      ))}

      <div className="rounded-lg border border-dashed border-outline-variant/60 px-3 py-2.5 flex items-center justify-between gap-3">
        <span className="text-xs text-on-surface-variant">Tambah bagian di akhir:</span>
        <AddButtons at={blocks.length} />
      </div>
      <p className="text-xs text-on-surface-variant">
        Tips: apit teks dengan <code className="px-1 rounded bg-slate-100">**dua bintang**</code> untuk huruf tebal. Teks dalam{" "}
        <mark className="bg-amber-200 rounded px-0.5">[kurung siku]</mark> adalah isian yang harus diganti.
      </p>
    </div>
  );
}
