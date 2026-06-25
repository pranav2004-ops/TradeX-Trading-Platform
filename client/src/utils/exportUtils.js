/**
 * client/src/utils/exportUtils.js
 *
 * Client-side utility functions to export statements to CSV and print-friendly PDF.
 */

export const exportToCSV = (data = [], headers = [], filename = "statement.csv") => {
  if (data.length === 0) {
    alert("No data available to export.");
    return;
  }

  const csvRows = [];
  
  // Headers row
  csvRows.push(headers.join(","));

  // Value rows
  for (const row of data) {
    const values = headers.map((header) => {
      const val = row[header];
      const strVal = val === undefined || val === null ? "" : String(val);
      // Escape double quotes
      const escaped = strVal.replace(/"/g, '""');
      return `"${escaped}"`;
    });
    csvRows.push(values.join(","));
  }

  const csvContent = "\uFEFF" + csvRows.join("\n"); // Include UTF-8 BOM
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  
  const link = document.createElement("a");
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

export const exportToPDF = (title, columns = [], rows = [], filename = "statement.pdf") => {
  if (rows.length === 0) {
    alert("No data available to export.");
    return;
  }

  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Please allow popups to export statement PDFs.");
    return;
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${title}</title>
        <style>
          body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            color: #1e293b;
            padding: 40px;
            background: #fff;
            margin: 0;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #f1f5f9;
            padding-bottom: 20px;
            margin-bottom: 25px;
          }
          .logo {
            font-size: 22px;
            font-weight: 700;
            color: #2f6fed;
            letter-spacing: -0.025em;
          }
          .title {
            font-size: 18px;
            font-weight: 600;
            color: #0f172a;
          }
          .meta {
            font-size: 11px;
            color: #64748b;
            margin-bottom: 25px;
            line-height: 1.6;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
          }
          th, td {
            text-align: left;
            padding: 10px 12px;
            border-bottom: 1px solid #f1f5f9;
            font-size: 12px;
          }
          th {
            background-color: #f8fafc;
            color: #475569;
            font-weight: 600;
            text-transform: uppercase;
            font-size: 10px;
            letter-spacing: 0.05em;
          }
          tr:nth-child(even) td {
            background-color: #fafbfd;
          }
          .footer {
            text-align: center;
            font-size: 10px;
            color: #94a3b8;
            margin-top: 60px;
            border-top: 1px solid #f1f5f9;
            padding-top: 20px;
            line-height: 1.5;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">TradeX Terminal</div>
          <div class="title">${title}</div>
        </div>
        <div class="meta">
          <strong>Statement Date:</strong> ${new Date().toLocaleString("en-IN")}<br />
          <strong>Account Type:</strong> Professional Paper Trading Account<br />
          <strong>Status:</strong> Authoritative Simulation Ledger
        </div>
        <table>
          <thead>
            <tr>
              ${columns.map((col) => `<th>${col}</th>`).join("")}
            </tr>
          </thead>
          <tbody>
            ${rows
              .map(
                (row) => `
              <tr>
                ${columns
                  .map(
                    (col) =>
                      `<td>${
                        row[col] !== undefined && row[col] !== null
                          ? String(row[col])
                          : ""
                      }</td>`
                  )
                  .join("")}
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
        <div class="footer">
          This is a computer-generated paper trading statement and does not represent actual monetary funds or exchange liabilities. <br />
          TradeX Simulation Engine &copy; 2026. All rights reserved.
        </div>
        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 500);
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();
};
