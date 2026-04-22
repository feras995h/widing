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

let cachedFont: string | null = null;

async function loadArabicFont(): Promise<string> {
  if (cachedFont) return cachedFont;
  // Amiri Regular — open-source Arabic font with broad Unicode coverage
  const url =
    "https://cdn.jsdelivr.net/gh/aliftype/amiri@1.000/fonts/ttf/Amiri-Regular.ttf";
  const res = await fetch(url);
  if (!res.ok) throw new Error("تعذر تحميل خط التقرير");
  const buf = await res.arrayBuffer();
  // ArrayBuffer -> base64
  let binary = "";
  const bytes = new Uint8Array(buf);
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(
      null,
      Array.from(bytes.subarray(i, i + chunk)),
    );
  }
  cachedFont = btoa(binary);
  return cachedFont;
}

function fmt(n: number) {
  return formatLYD(n);
}

function fmtDate(s: string) {
  const d = new Date(s);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export async function exportMonthlyReportPdf(args: ExportArgs): Promise<void> {
  const fontB64 = await loadArabicFont();
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });

  doc.addFileToVFS("Amiri-Regular.ttf", fontB64);
  doc.addFont("Amiri-Regular.ttf", "Amiri", "normal");
  doc.setFont("Amiri", "normal");

  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFontSize(18);
  doc.text("تقرير المصروفات السنوي - Veloura Venue", pageWidth / 2, 50, {
    align: "center",
  });
  doc.setFontSize(12);
  doc.text(`السنة: ${args.year}`, pageWidth / 2, 72, { align: "center" });
  doc.setFontSize(9);
  doc.text(
    `تاريخ التصدير: ${new Date().toLocaleDateString("ar-LY", { numberingSystem: "latn" })}`,
    pageWidth / 2,
    88,
    { align: "center" },
  );

  // Section 1: Monthly summary
  doc.setFontSize(13);
  doc.text("الملخص الشهري", pageWidth - 40, 120, { align: "right" });

  autoTable(doc, {
    startY: 130,
    head: [["الشهر", "مصروفات عامة", "رواتب العمال", "الإجمالي"]],
    body: args.monthlyBreakdown.map((m) => [
      m.monthLabel,
      m.generalExpenses ? fmt(m.generalExpenses) : "-",
      m.workerPayments ? fmt(m.workerPayments) : "-",
      m.total ? fmt(m.total) : "-",
    ]),
    foot: [
      [
        "إجمالي السنة",
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
  doc.text("تفاصيل المصروفات العامة", pageWidth - 40, nextY, {
    align: "right",
  });

  autoTable(doc, {
    startY: nextY + 10,
    head: [["التاريخ", "الفئة", "الوصف", "المبلغ"]],
    body:
      args.expensesDetail.length > 0
        ? args.expensesDetail.map((e) => [
            fmtDate(e.date),
            e.category,
            e.description,
            fmt(e.amount),
          ])
        : [["—", "—", "لا توجد مصروفات في هذه السنة", "—"]],
    foot:
      args.expensesDetail.length > 0
        ? [
            [
              "",
              "",
              "الإجمالي",
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
  doc.text("تفاصيل مدفوعات العمال", pageWidth - 40, nextY, { align: "right" });

  autoTable(doc, {
    startY: nextY + 10,
    head: [["التاريخ", "العامل", "الفترة", "المبلغ"]],
    body:
      args.workerPaymentsDetail.length > 0
        ? args.workerPaymentsDetail.map((w) => [
            fmtDate(w.date),
            w.worker,
            w.period,
            fmt(w.amount),
          ])
        : [["—", "—", "لا توجد مدفوعات في هذه السنة", "—"]],
    foot:
      args.workerPaymentsDetail.length > 0
        ? [
            [
              "",
              "",
              "الإجمالي",
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
      `صفحة ${i} من ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 20,
      { align: "center" },
    );
  }

  doc.save(`تقرير-المصروفات-${args.year}.pdf`);
}