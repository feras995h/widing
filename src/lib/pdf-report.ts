import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatLYD } from "@/lib/format";

interface MonthlyRow {
  monthIndex: number;
  monthLabel: string;
  generalExpenses: number;
  workerPayments: number;
  total: number;
}

interface ExportArgs {
  year: number;
  monthlyBreakdown: MonthlyRow[];
  yearTotals: { generalExpenses: number; workerPayments: number; total: number };
  expensesDetail: { date: string; category: string; description: string; amount: number }[];
  workerPaymentsDetail: { date: string; worker: string; period: string; amount: number }[];
}

interface FontLoadResult {
  base64: string | null;
  source: "local" | "cdn" | "none";
}

interface ExportResult {
  usedArabicFont: boolean;
  fontSource: "local" | "cdn" | "none";
}

let cachedFont: FontLoadResult | null = null;

async function fontToBase64(url: string): Promise<string | null> {
  const res = await fetch(url);
  if (!res.ok) return null;
  const buf = await res.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(buf);
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(
      null,
      Array.from(bytes.subarray(i, i + chunk)),
    );
  }
  return btoa(binary);
}

async function loadArabicFont(): Promise<FontLoadResult> {
  if (cachedFont) return cachedFont;

  const localBase64 = await fontToBase64("/fonts/Amiri-Regular.ttf").catch(() => null);
  if (localBase64) {
    cachedFont = { base64: localBase64, source: "local" };
    return cachedFont;
  }

  const cdnBase64 = await fontToBase64(
    "https://github.com/google/fonts/raw/main/ofl/amiri/Amiri-Regular.ttf",
  ).catch(() => null);
  if (cdnBase64) {
    cachedFont = { base64: cdnBase64, source: "cdn" };
    return cachedFont;
  }

  cachedFont = { base64: null, source: "none" };
  return cachedFont;
}

function fmt(n: number) {
  return formatLYD(n);
}

function fmtDate(s: string) {
  const d = new Date(s);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export async function exportMonthlyReportPdf(args: ExportArgs): Promise<ExportResult> {
  const rtl = (value: string) => `\u202B${value}\u202C`;
  const font = await loadArabicFont();
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });

  if (font.base64) {
    doc.addFileToVFS("Amiri-Regular.ttf", font.base64);
    doc.addFont("Amiri-Regular.ttf", "Amiri", "normal");
    doc.setFont("Amiri", "normal");
  } else {
    doc.setFont("helvetica", "normal");
  }
  (doc as { setR2L?: (value: boolean) => void }).setR2L?.(true);

  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFontSize(18);
  doc.text(rtl("تقرير المصروفات السنوي - Veloura Venue"), pageWidth / 2, 50, {
    align: "center",
  });
  doc.setFontSize(12);
  doc.text(rtl(`السنة: ${args.year}`), pageWidth / 2, 72, { align: "center" });
  doc.setFontSize(9);
  doc.text(
    rtl(`تاريخ التصدير: ${new Date().toLocaleDateString("ar-LY", { numberingSystem: "latn" })}`),
    pageWidth / 2,
    88,
    { align: "center" },
  );

  // Section 1: Monthly summary
  doc.setFontSize(13);
  doc.text(rtl("الملخص الشهري"), pageWidth - 40, 120, { align: "right" });

  autoTable(doc, {
    startY: 130,
    head: [[rtl("الشهر"), rtl("مصروفات عامة"), rtl("رواتب العمال"), rtl("الإجمالي")]],
    body: args.monthlyBreakdown.map((m) => [
      rtl(m.monthLabel),
      m.generalExpenses ? fmt(m.generalExpenses) : "-",
      m.workerPayments ? fmt(m.workerPayments) : "-",
      m.total ? fmt(m.total) : "-",
    ]),
    foot: [
      [
        rtl("إجمالي السنة"),
        fmt(args.yearTotals.generalExpenses),
        fmt(args.yearTotals.workerPayments),
        fmt(args.yearTotals.total),
      ],
    ],
    styles: {
      font: "Amiri",
      fontSize: 10,
      halign: "right",
      cellPadding: 6,
    },
    headStyles: {
      font: "Amiri",
      fillColor: [201, 169, 97],
      textColor: 255,
      halign: "right",
    },
    footStyles: {
      font: "Amiri",
      fillColor: [250, 247, 240],
      textColor: [92, 74, 42],
      fontStyle: "normal",
      halign: "right",
    },
    theme: "grid",
  });

  // Section 2: General expenses detail
  let nextY = (doc as any).lastAutoTable.finalY + 30;
  if (nextY > 700) {
    doc.addPage();
    nextY = 60;
  }
  doc.setFontSize(13);
  doc.text(rtl("تفاصيل المصروفات العامة"), pageWidth - 40, nextY, {
    align: "right",
  });

  autoTable(doc, {
    startY: nextY + 10,
    head: [[rtl("التاريخ"), rtl("الفئة"), rtl("الوصف"), rtl("المبلغ")]],
    body:
      args.expensesDetail.length > 0
        ? args.expensesDetail.map((e) => [
            fmtDate(e.date),
            rtl(e.category),
            rtl(e.description),
            fmt(e.amount),
          ])
        : [["—", "—", rtl("لا توجد مصروفات في هذه السنة"), "—"]],
    foot:
      args.expensesDetail.length > 0
        ? [
            [
              "",
              "",
              rtl("الإجمالي"),
              fmt(args.yearTotals.generalExpenses),
            ],
          ]
        : undefined,
    styles: { font: "Amiri", fontSize: 9, halign: "right", cellPadding: 5 },
    headStyles: {
      font: "Amiri",
      fillColor: [201, 169, 97],
      textColor: 255,
      halign: "right",
    },
    footStyles: {
      font: "Amiri",
      fillColor: [250, 247, 240],
      textColor: [92, 74, 42],
      halign: "right",
    },
    theme: "grid",
  });

  // Section 3: Worker payments detail
  nextY = (doc as any).lastAutoTable.finalY + 30;
  if (nextY > 700) {
    doc.addPage();
    nextY = 60;
  }
  doc.setFontSize(13);
  doc.text(rtl("تفاصيل مدفوعات العمال"), pageWidth - 40, nextY, { align: "right" });

  autoTable(doc, {
    startY: nextY + 10,
    head: [[rtl("التاريخ"), rtl("العامل"), rtl("الفترة"), rtl("المبلغ")]],
    body:
      args.workerPaymentsDetail.length > 0
        ? args.workerPaymentsDetail.map((w) => [
            fmtDate(w.date),
            rtl(w.worker),
            rtl(w.period),
            fmt(w.amount),
          ])
        : [["—", "—", rtl("لا توجد مدفوعات في هذه السنة"), "—"]],
    foot:
      args.workerPaymentsDetail.length > 0
        ? [
            [
              "",
              "",
              rtl("الإجمالي"),
              fmt(args.yearTotals.workerPayments),
            ],
          ]
        : undefined,
    styles: { font: "Amiri", fontSize: 9, halign: "right", cellPadding: 5 },
    headStyles: {
      font: "Amiri",
      fillColor: [201, 169, 97],
      textColor: 255,
      halign: "right",
    },
    footStyles: {
      font: "Amiri",
      fillColor: [250, 247, 240],
      textColor: [92, 74, 42],
      halign: "right",
    },
    theme: "grid",
  });

  // Footer page numbers
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.text(
      rtl(`صفحة ${i} من ${pageCount}`),
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 20,
      { align: "center" },
    );
  }

  doc.save(`expenses-report-${args.year}.pdf`);
  return { usedArabicFont: Boolean(font.base64), fontSource: font.source };
}