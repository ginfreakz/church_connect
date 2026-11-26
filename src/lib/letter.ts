// Shared by the server (rendering, validation) and the browser (editor).

export interface Letterhead {
  orgLine1: string;
  orgLine2: string;
  email: string;
  phone: string;
  secretariat: string;
  legalLine: string;
  city: string;
  signOffChurch: string;
  signerName: string;
  signerTitle: string;
  /** Code used in suggested outgoing numbers, e.g. 01/JKI-OEM/XI/2026. */
  letterCode: string;
  /** Images as data URLs ("" = none). */
  logoLeft: string;
  logoRight: string;
  signature: string;
  stamp: string;
}

// Taken from the church's own letter (renamed per SK 007/SK-PN/SJKI/X/2026). Editable in Pengaturan Kop Surat.
export const DEFAULT_LETTERHEAD: Letterhead = {
  orgLine1: "JEMAAT KRISTEN INDONESIA (JKI)",
  orgLine2: "OBED EDOM MINISTRY",
  email: "jkitamanfirdaus@gmail.com",
  phone: "0851-2111-1378",
  secretariat: "Jl. Kresna Dalam 44A/68 Rt. 08 RW. 06, Arjuna, Cicendo, Kota Bandung",
  legalLine: "Akte Notaris No 74 tanggal 1987 Depag RI SK. Dirjen Bimas Kristen Protestan No 4 tahun 1989",
  city: "Bandung",
  signOffChurch: "Gereja JKI OBED EDOM MINISTRY",
  signerName: "Pdm. Obed Edom Wagiman",
  signerTitle: "Gembala Sidang / Senior Pastor",
  letterCode: "JKI-OEM",
  logoLeft: "",
  logoRight: "",
  signature: "",
  stamp: "",
};

export type LetterBlock =
  | { type: "paragraph"; text: string }
  | { type: "fields"; title: string; rows: Array<{ label: string; value: string }> };

export interface LetterContent {
  attachmentNote: string;
  /** Lines under "Kepada Yth." after the recipient (counterparty), e.g. "Di Tempat". */
  addressLines: string;
  blocks: LetterBlock[];
  signerName: string;
  signerTitle: string;
  useSignature: boolean;
}

/** Fields of the Surat record a letter needs, in addition to its content. */
export interface LetterMeta {
  letterNumber: string;
  letterDate: string;
  subject: string;
  counterparty: string;
}

const text = (value: unknown, max = 5000) => (typeof value === "string" ? value.slice(0, max) : "");

const IMAGE_DATA_URL = /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/;
const image = (value: unknown) => (typeof value === "string" && IMAGE_DATA_URL.test(value) ? value : "");

export function sanitizeLetterhead(raw: unknown): Letterhead {
  const src = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const pick = (key: keyof Letterhead) => (typeof src[key] === "string" ? text(src[key], 500) : DEFAULT_LETTERHEAD[key]);
  return {
    orgLine1: pick("orgLine1"),
    orgLine2: pick("orgLine2"),
    email: pick("email"),
    phone: pick("phone"),
    secretariat: pick("secretariat"),
    legalLine: pick("legalLine"),
    city: pick("city"),
    signOffChurch: pick("signOffChurch"),
    signerName: pick("signerName"),
    signerTitle: pick("signerTitle"),
    letterCode: pick("letterCode") || DEFAULT_LETTERHEAD.letterCode,
    logoLeft: image(src.logoLeft),
    logoRight: image(src.logoRight),
    signature: image(src.signature),
    stamp: image(src.stamp),
  };
}

export function sanitizeLetterContent(raw: unknown): LetterContent {
  const src = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const blocks = (Array.isArray(src.blocks) ? src.blocks : []).slice(0, 100).flatMap((b): LetterBlock[] => {
    const block = (b && typeof b === "object" ? b : {}) as Record<string, unknown>;
    if (block.type === "paragraph") return [{ type: "paragraph", text: text(block.text) }];
    if (block.type === "fields") {
      const rows = (Array.isArray(block.rows) ? block.rows : []).slice(0, 50).map((r) => {
        const row = (r && typeof r === "object" ? r : {}) as Record<string, unknown>;
        return { label: text(row.label, 200), value: text(row.value, 1000) };
      });
      return [{ type: "fields", title: text(block.title, 500), rows }];
    }
    return [];
  });
  return {
    attachmentNote: text(src.attachmentNote, 200),
    addressLines: text(src.addressLines, 1000),
    blocks,
    signerName: text(src.signerName, 200),
    signerTitle: text(src.signerTitle, 200),
    useSignature: src.useSignature !== false,
  };
}
