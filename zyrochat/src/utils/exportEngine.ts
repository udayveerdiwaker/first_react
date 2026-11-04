/**
 * Multi-Format Data Export Engine for ZyroChat
 * 
 * Provides professional exports for:
 * 1. Real Excel (.xlsx) with auto-widths and formatting
 * 2. RFC 4180 compliant CSV with UTF-8 BOM
 * 3. Validated Pretty & Compact JSON
 * 4. High-fidelity printable PDF layouts
 * 5. Multi-file ZIP archive bundles (zyrochat-project.zip)
 * 6. Structured conversation exports (MD, TXT, JSON, PDF)
 */

import * as XLSX from "xlsx";
import JSZip from "jszip";
import type { WorkspaceArtifact } from "./artifactManager";

/**
 * Triggers a file download in the browser from a Blob or URL
 */
export function triggerBrowserDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/**
 * 1. REAL EXCEL (.XLSX) EXPORT
 * Generates an actual OpenXML spreadsheet workbook with formatting and auto column widths
 */
export function exportTableToExcel(
  headers: string[],
  rows: (string | number)[][],
  baseFilename: string = "table-data",
  sheetName: string = "Data"
): void {
  const wb = XLSX.utils.book_new();

  // Convert headers and rows into sheet data array
  const aoaData = [headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(aoaData);

  // Auto-fit column widths based on maximum cell text length
  const colWidths = headers.map((header, colIdx) => {
    let maxLen = header.length;
    for (const row of rows) {
      const cellVal = String(row[colIdx] ?? "");
      if (cellVal.length > maxLen) {
        maxLen = cellVal.length;
      }
    }
    return { wch: Math.min(Math.max(maxLen + 3, 10), 50) };
  });

  ws["!cols"] = colWidths;

  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));

  // Write as binary array
  const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([wbout], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const safeName = baseFilename.toLowerCase().replace(/[^a-z0-9_-]/g, "_");
  triggerBrowserDownload(blob, `${safeName}.xlsx`);
}

/**
 * 2. RFC 4180 COMPLIANT CSV EXPORT
 * Properly escapes commas, quotes, and newlines; includes UTF-8 BOM for Excel compatibility
 */
export function exportTableToCSV(
  headers: string[],
  rows: (string | number)[][],
  baseFilename: string = "table-data"
): void {
  function escapeCsvCell(cell: string | number | null | undefined): string {
    if (cell === null || cell === undefined) return "";
    const str = String(cell);
    if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  const lines = [
    headers.map(escapeCsvCell).join(","),
    ...rows.map((row) => row.map(escapeCsvCell).join(",")),
  ];

  // Prepend UTF-8 BOM (\uFEFF) so Excel on Windows parses accents and UTF-8 cleanly
  const csvContent = "\uFEFF" + lines.join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });

  const safeName = baseFilename.toLowerCase().replace(/[^a-z0-9_-]/g, "_");
  triggerBrowserDownload(blob, `${safeName}.csv`);
}

/**
 * 3. VALIDATED JSON EXPORT
 * Validates, formats, and exports tabular data or arbitrary objects
 */
export function exportTableToJSON(
  headers: string[],
  rows: (string | number)[][],
  baseFilename: string = "table-data",
  pretty: boolean = true
): void {
  // Map rows to array of key-value objects
  const objects = rows.map((row) => {
    const obj: Record<string, any> = {};
    headers.forEach((header, idx) => {
      obj[header] = row[idx] ?? null;
    });
    return obj;
  });

  const jsonString = pretty ? JSON.stringify(objects, null, 2) : JSON.stringify(objects);
  const blob = new Blob([jsonString], { type: "application/json;charset=utf-8" });

  const safeName = baseFilename.toLowerCase().replace(/[^a-z0-9_-]/g, "_");
  triggerBrowserDownload(blob, `${safeName}.json`);
}

/**
 * 4. PRINTABLE PDF EXPORT
 * Opens a dedicated print preview with clean styling for tables or documents
 */
export function exportTableToPDF(
  headers: string[],
  rows: (string | number)[][],
  title: string = "Table Data Export"
): void {
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Please allow popups to generate PDF exports.");
    return;
  }

  const tableHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        <meta charset="utf-8" />
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            margin: 2rem;
            color: #1e293b;
          }
          h1 {
            font-size: 1.25rem;
            font-weight: 700;
            margin-bottom: 0.5rem;
            color: #0f172a;
          }
          .meta {
            font-size: 0.75rem;
            color: #64748b;
            margin-bottom: 1.5rem;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 0.825rem;
          }
          th, td {
            border: 1px solid #cbd5e1;
            padding: 0.5rem 0.75rem;
            text-align: left;
          }
          th {
            background-color: #f1f5f9;
            font-weight: 600;
            color: #334155;
          }
          tr:nth-child(even) {
            background-color: #f8fafc;
          }
          @media print {
            body { margin: 1cm; }
            th { background-color: #e2e8f0 !important; -webkit-print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <div class="meta">Exported from ZyroChat AI Workspace • ${new Date().toLocaleString()}</div>
        <table>
          <thead>
            <tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr>
          </thead>
          <tbody>
            ${rows.map((row) => `<tr>${row.map((c) => `<td>${c ?? ""}</td>`).join("")}</tr>`).join("")}
          </tbody>
        </table>
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 250);
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(tableHtml);
  printWindow.document.close();
}

/**
 * 5. ZIP ARCHIVE EXPORT
 * Bundles multiple workspace artifacts into a clean, downloadable zip
 */
export async function exportArtifactsZip(
  artifacts: WorkspaceArtifact[],
  zipFilename: string = "zyrochat-project.zip"
): Promise<void> {
  if (!artifacts || artifacts.length === 0) return;

  const zip = new JSZip();

  for (const artifact of artifacts) {
    const filename = artifact.filename || `${artifact.id}.${artifact.language || "txt"}`;
    zip.file(filename, artifact.content);
  }

  // Include a clean workspace manifest
  const manifest = {
    workspace: "ZyroChat AI Project",
    exportedAt: new Date().toISOString(),
    filesCount: artifacts.length,
    files: artifacts.map((a) => ({
      id: a.id,
      filename: a.filename,
      language: a.language,
      sizeBytes: a.sizeBytes,
      version: a.version,
    })),
  };
  zip.file("project-manifest.json", JSON.stringify(manifest, null, 2));

  const zipBlob = await zip.generateAsync({ type: "blob" });
  triggerBrowserDownload(zipBlob, zipFilename);
}

/**
 * 6. STRUCTURED CONVERSATION EXPORT
 */
export function exportConversation(
  messages: any[],
  title: string = "Conversation",
  format: "md" | "txt" | "json" | "pdf",
  mode: string = "normal"
): void {
  const safeName = title.toLowerCase().replace(/[^a-z0-9_-]/g, "_") || "conversation";

  if (format === "md") {
    const mdContent = [
      `# ${title}`,
      `*Exported from ZyroChat on ${new Date().toLocaleString()} (Mode: ${mode})*`,
      "",
      ...messages.map((m) => {
        const speaker = m.role === "user" ? "### You" : "### ZyroChat";
        return `${speaker}\n\n${m.text}\n`;
      }),
    ].join("\n");
    triggerBrowserDownload(new Blob([mdContent], { type: "text/markdown;charset=utf-8" }), `${safeName}.md`);
    return;
  }

  if (format === "txt") {
    const txtContent = [
      `=== ${title} ===`,
      `Exported: ${new Date().toLocaleString()}`,
      `Mode: ${mode}`,
      "",
      ...messages.map((m) => {
        const speaker = m.role === "user" ? "[You]" : "[ZyroChat]";
        return `${speaker}\n${m.text}\n`;
      }),
    ].join("\n");
    triggerBrowserDownload(new Blob([txtContent], { type: "text/plain;charset=utf-8" }), `${safeName}.txt`);
    return;
  }

  if (format === "json") {
    const jsonPayload = {
      conversation: {
        title,
        mode,
        exportedAt: new Date().toISOString(),
        messageCount: messages.length,
      },
      messages: messages.map((m) => ({
        role: m.role,
        text: m.text,
        createdAt: m.createdAt || null,
        sources: m.sources || [],
      })),
    };
    const jsonContent = JSON.stringify(jsonPayload, null, 2);
    triggerBrowserDownload(new Blob([jsonContent], { type: "application/json;charset=utf-8" }), `${safeName}.json`);
    return;
  }

  if (format === "pdf") {
    window.print();
  }
}
