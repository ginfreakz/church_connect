import type { LetterBlock, LetterContent, Letterhead } from "./letter";

// Text in [brackets] is a placeholder: highlighted in the preview and flagged before saving.
export const PLACEHOLDER = /\[[^\]\n]{1,80}\]/;

export interface LetterDraft {
  subject: string;
  category: string;
  counterparty: string;
  content: LetterContent;
}

export interface LetterTemplate {
  key: string;
  name: string;
  description: string;
  build: (lh: Letterhead) => LetterDraft;
}

const GREETING = "Salam sejahtera dalam kasih Tuhan Yesus Kristus,";
const CLOSING_KETERANGAN = "Demikian surat keterangan ini dibuat dengan sebenarnya untuk dapat digunakan sesuai keperluan.";

// "Gereja JKI OBED EDOM MINISTRY" -> "JKI OBED EDOM MINISTRY"
const churchName = (lh: Letterhead) => lh.signOffChurch.replace(/^gereja\s+/i, "") || lh.orgLine2;

const signerBlock = (lh: Letterhead): LetterBlock => ({
  type: "fields",
  title: "Yang bertanda tangan di bawah ini:",
  rows: [
    { label: "Nama", value: lh.signerName },
    { label: "Jabatan", value: lh.signerTitle },
    { label: "Nama Gereja", value: churchName(lh) },
  ],
});

const baseContent = (lh: Letterhead, blocks: LetterBlock[], extra: Partial<LetterContent> = {}): LetterContent => ({
  attachmentNote: "-",
  addressLines: "Di Tempat",
  blocks,
  signerName: lh.signerName,
  signerTitle: lh.signerTitle,
  useSignature: true,
  ...extra,
});

export const letterTemplates: LetterTemplate[] = [
  {
    key: "keterangan-pelayanan",
    name: "Surat Keterangan Pelayanan",
    description: "Menerangkan seseorang melayani di gereja (seperti contoh surat Tim Pastoral).",
    build: (lh) => ({
      subject: "Tim Pastoral Gereja",
      category: "Surat Keterangan",
      counterparty: "Pimpinan Sinode JKI",
      content: baseContent(lh, [
        { type: "paragraph", text: `${GREETING}\nPuji syukur kami panjatkan kepada Tuhan atas penyertaan-Nya dalam pelayanan di ${churchName(lh)}.` },
        signerBlock(lh),
        {
          type: "fields",
          title: "Dengan ini menerangkan bahwa:",
          rows: [
            { label: "Nama", value: "[Nama]" },
            { label: "Tempat, Tanggal Lahir", value: "[Tempat, Tanggal Lahir]" },
            { label: "No. Identitas", value: "[No. KTP]" },
          ],
        },
        {
          type: "paragraph",
          text: `Adalah benar yang bersangkutan merupakan anggota Tim Pastoral di Gereja ${churchName(lh)} dan secara aktif melayani dalam berbagai bidang pelayanan gereja sesuai dengan penugasan yang diberikan oleh pimpinan gereja sebagai **[JABATAN PELAYANAN]**`,
        },
        {
          type: "paragraph",
          text: `Surat keterangan ini dibuat untuk menerangkan status pelayanan yang bersangkutan sebagai bagian dari Tim Pastoral Gereja yang tersebut diatas.\n${CLOSING_KETERANGAN}`,
        },
      ], { attachmentNote: "1 berkas" }),
    }),
  },
  {
    key: "keterangan-cuti",
    name: "Surat Keterangan Cuti",
    description: "Cuti tahunan atau cuti pelayanan untuk pengurus/pelayan.",
    build: (lh) => ({
      subject: "Surat Keterangan Cuti Tahunan",
      category: "Surat Keterangan",
      counterparty: "[Nama Penerima]",
      content: baseContent(lh, [
        { type: "paragraph", text: GREETING },
        signerBlock(lh),
        {
          type: "fields",
          title: "Dengan ini menerangkan bahwa:",
          rows: [
            { label: "Nama", value: "[Nama]" },
            { label: "Jabatan", value: "[Jabatan Pelayanan]" },
          ],
        },
        {
          type: "paragraph",
          text: "Diberikan cuti tahunan terhitung mulai tanggal **[tanggal mulai]** sampai dengan **[tanggal selesai]**. Selama masa cuti, tugas pelayanan yang bersangkutan dilimpahkan kepada [nama pengganti].",
        },
        { type: "paragraph", text: CLOSING_KETERANGAN },
      ]),
    }),
  },
  {
    key: "permohonan",
    name: "Surat Permohonan",
    description: "Mengajukan permohonan kepada sinode, korwil, atau instansi.",
    build: (lh) => ({
      subject: "Permohonan [hal yang dimohon]",
      category: "Permohonan",
      counterparty: "Pimpinan Sinode JKI",
      content: baseContent(lh, [
        { type: "paragraph", text: `${GREETING}\nPuji syukur kami panjatkan kepada Tuhan atas penyertaan-Nya dalam pelayanan di ${churchName(lh)}.` },
        { type: "paragraph", text: "Melalui surat ini kami mengajukan permohonan [isi permohonan]." },
        { type: "paragraph", text: "Demikian surat permohonan ini kami sampaikan. Atas perhatian dan kerja samanya kami ucapkan terima kasih. Tuhan Yesus memberkati." },
      ]),
    }),
  },
  {
    key: "kosong",
    name: "Surat Kosong",
    description: "Hanya kop, salam, dan penutup. Isi sendiri.",
    build: (lh) => ({
      subject: "",
      category: "",
      counterparty: "",
      content: baseContent(lh, [
        { type: "paragraph", text: GREETING },
        { type: "paragraph", text: "" },
        { type: "paragraph", text: "Demikian surat ini kami sampaikan. Atas perhatiannya kami ucapkan terima kasih." },
      ]),
    }),
  },
];

/** Every place in the draft that still has a [placeholder]. */
export function findPlaceholders(draft: { subject: string; counterparty: string; content: LetterContent }): string[] {
  const texts = [
    draft.subject,
    draft.counterparty,
    draft.content.addressLines,
    draft.content.attachmentNote,
    ...draft.content.blocks.flatMap((b) => (b.type === "paragraph" ? [b.text] : [b.title, ...b.rows.flatMap((r) => [r.label, r.value])])),
  ];
  return texts.flatMap((t) => t.match(new RegExp(PLACEHOLDER, "g")) ?? []);
}
