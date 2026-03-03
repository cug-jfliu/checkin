// Compiler-only PDF export — no renderer WASM needed.
// TypstCompiler.compile({ format: pdf }) generates PDF directly without the renderer.
// WASM loaded via fetch() (not dynamic import) to bypass Vite's module interception.

import { createTypstCompiler } from '@myriaddreamin/typst.ts/compiler';
import { loadFonts } from '@myriaddreamin/typst.ts/options.init';
import wasmUrl from '@myriaddreamin/typst-ts-web-compiler/pkg/typst_ts_web_compiler_bg.wasm?url';
import { getDayDetail } from 'chinese-days';

// NotoSerifCJKsc — the CJK font from typst-dev-assets, required for Chinese text
const CJK_FONT_URL =
    'https://cdn.jsdelivr.net/gh/typst/typst-dev-assets@v0.13.1/files/fonts/NotoSerifCJKsc-Regular.otf';

// Persist the compiled instance across Vite HMR reloads
const WIN_KEY = '__typstDirectCompiler';

async function getCompiler(): Promise<any> {
    const win = window as any;
    if (win[WIN_KEY]) return win[WIN_KEY];

    const compiler = createTypstCompiler();
    // getModule: use fetch() — avoids dynamic import('./wasm') which Vite intercepts
    await compiler.init({
        getModule: () => WebAssembly.compileStreaming(fetch(wasmUrl)),
        beforeBuild: [loadFonts([CJK_FONT_URL])],
    });

    win[WIN_KEY] = compiler;
    return compiler;
}

export interface WeeklySummary {
    id: number;
    username: string;
    name: string | null;
    checkins: Record<string, string | null>;
}

/** Escape special Typst markup characters */
function escapeTypst(str: string): string {
    return str.replace(/[\\#*_~$`@<>]/g, '\\$&').replace(/\[/g, '\\[').replace(/\]/g, '\\]');
}

/** Build Typst source for the weekly report */
function buildTypstSource(summaries: WeeklySummary[], weekDays: string[], exportTime: Date): string {
    const weekdayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

    const dayHeaders = weekDays.map(day => {
        const d = new Date(day + 'T12:00:00');
        const weekday = weekdayNames[d.getDay()];
        const month = d.getMonth() + 1;
        const date = d.getDate();

        // Get holiday/workday detail from chinese-days
        const detail = getDayDetail(day);
        // Two states: workday (white) vs rest day (sky-blue, relaxed)
        // detail.work already accounts for 调休(休), 补班(上班), 法定假日(休)
        const weekdayColor = detail.work ? 'white' : 'rgb("#7dd3fc")';

        return `[#align(center)[
    #text(weight: "bold", fill: ${weekdayColor})[${weekday}] \\
    #text(size: 9pt, fill: gray)[${month}月${date}日]
  ]]`;
    }).join(',\n  ');

    const dateRange = (() => {
        const start = new Date(weekDays[0] + 'T12:00:00');
        const end = new Date(weekDays[6] + 'T12:00:00');
        return `${start.getFullYear()}年${start.getMonth() + 1}月${start.getDate()}日 — ${end.getMonth() + 1}月${end.getDate()}日`;
    })();

    const exportTimeStr = exportTime.toLocaleString('zh-CN', {
        year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false,
    });

    const rows = summaries.map(s => {
        const name = escapeTypst(s.name || s.username);
        const nameCell = `[${name}]`;
        const timeCells = weekDays.map(day => {
            const time = s.checkins[day];
            return time
                ? `[#text(fill: rgb("#4ade80"))[${time}]]`
                : `[#text(fill: rgb("#6b7280"))[--]]`;
        }).join(',\n    ');
        return `  ${nameCell},\n    ${timeCells}`;
    }).join(',\n');

    const colDef = `(auto, ${weekDays.map(() => '1fr').join(', ')})`;

    return `
#set page(
  paper: "a4",
  margin: (x: 1.5cm, y: 2cm),
  fill: rgb("#0f172a"),
)
#set text(
  font: ("Noto Serif CJK SC", "Linux Libertine"),
  size: 10pt,
  lang: "zh",
  fill: rgb("#e2e8f0"),
)

#let gray = rgb("#64748b")
#let header-bg = rgb("#1e293b")
#let row-odd = rgb("#1a2535")
#let row-even = rgb("#162030")

#align(center)[
  #text(size: 18pt, weight: "bold", fill: white)[周签到汇总报告]
  #v(0.3em)
  #text(size: 10pt, fill: gray)[${dateRange}]
]
#v(1em)

#table(
  columns: ${colDef},
  align: center + horizon,
  stroke: 0.5pt + rgb("#334155"),
  inset: (x: 7pt, y: 6pt),
  fill: (col, row) => {
    if row == 0 { header-bg }
    else if calc.odd(row) { row-odd }
    else { row-even }
  },

  [#text(weight: "bold", fill: white)[学生]],
  ${dayHeaders},

${rows}
)

#v(1fr)
#line(length: 100%, stroke: 0.5pt + rgb("#334155"))
#v(0.3em)
#text(size: 8pt, fill: gray)[
  #text(fill: white)[■] 工作日 #h(1em) #text(fill: rgb("#7dd3fc"))[■] 休息日  #h(1fr) 导出时间：${exportTimeStr} #h(1em)
]
`.trim();
}

/**
 * Export the weekly report as a PDF.
 * Uses the Typst compiler WASM directly (no renderer). First call downloads
 * compiler WASM (~7.6 MB from local) and CJK fonts (~16 MB from CDN).
 */
export async function exportWeeklyReportAsPng(
    summaries: WeeklySummary[],
    weekDays: string[],
    weekStart: string,
): Promise<void> {
    const exportTime = new Date();
    const compiler = await getCompiler();
    const mainContent = buildTypstSource(summaries, weekDays, exportTime);

    // Write source and compile to PDF (format=1 = CompileFormatEnum.pdf)
    compiler.addSource('/main.typ', mainContent);
    const result = await compiler.compile({
        mainFilePath: '/main.typ',
        format: 1, // CompileFormatEnum.pdf
    });

    if (!result?.result) {
        const diags = result?.diagnostics?.map((d: any) => d.message).join('; ') ?? 'unknown error';
        throw new Error(`Typst compilation failed: ${diags}`);
    }

    const pdf = result.result as Uint8Array;
    const blob = new Blob([pdf.buffer as ArrayBuffer], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;

    // Filename: weekly_report_2026-W10_exported_2026-03-03_15-20.pdf
    const pad = (n: number) => String(n).padStart(2, '0');
    const ts = `${exportTime.getFullYear()}-${pad(exportTime.getMonth() + 1)}-${pad(exportTime.getDate())}_${pad(exportTime.getHours())}-${pad(exportTime.getMinutes())}`;
    link.download = `weekly_report_${weekStart}_exported_${ts}.pdf`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
}
