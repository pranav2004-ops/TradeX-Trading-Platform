/**
 * server/utils/emailService.js
 *
 * Mock Email Service that logs email dispatches to the console
 * and saves beautiful HTML email templates to the local file system.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const sendSimulatedEmail = async (toEmail, subject, contentTitle, contentDetails) => {
  const dirPath = path.join(__dirname, "../sent_emails");
  
  // Ensure directory exists
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  const emailId = `${Date.now()}_${Math.floor(100 + Math.random() * 900)}`;
  const filePath = path.join(dirPath, `email_${emailId}.html`);

  const htmlTemplate = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${subject}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background-color: #f6f9fc;
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 600px;
            margin: 40px auto;
            background-color: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
            border: 1px solid #e2e8f0;
          }
          .header {
            background-color: #2f6fed;
            padding: 30px 40px;
            color: #ffffff;
          }
          .logo {
            font-size: 20px;
            font-weight: 700;
            letter-spacing: -0.02em;
            margin-bottom: 5px;
          }
          .subject {
            font-size: 16px;
            opacity: 0.9;
          }
          .body {
            padding: 40px;
            color: #334155;
            line-height: 1.6;
          }
          .title {
            font-size: 18px;
            font-weight: 600;
            color: #0f172a;
            margin-bottom: 20px;
          }
          .details-card {
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 20px;
            margin: 25px 0;
          }
          .details-row {
            display: flex;
            justify-content: space-between;
            border-bottom: 1px dashed #e2e8f0;
            padding: 10px 0;
            font-size: 13px;
          }
          .details-row:last-child {
            border-bottom: none;
          }
          .details-label {
            color: #64748b;
            font-weight: 500;
          }
          .details-value {
            color: #0f172a;
            font-weight: 600;
          }
          .footer {
            background-color: #f8fafc;
            padding: 20px 40px;
            text-align: center;
            font-size: 11px;
            color: #94a3b8;
            border-top: 1px solid #e2e8f0;
          }
          .footer a {
            color: #2f6fed;
            text-decoration: none;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">TradeX Terminal</div>
            <div class="subject">${subject}</div>
          </div>
          
          <div class="body">
            <div class="title">${contentTitle}</div>
            <p>Dear Trader,</p>
            <p>We are writing to notify you that your paper trading ledger has processed a transactions cycle with the following details:</p>
            
            <div class="details-card">
              ${Object.entries(contentDetails)
                .map(
                  ([label, val]) => `
                <div class="details-row">
                  <span class="details-label">${label}</span>
                  <span class="details-value">${val}</span>
                </div>
              `
                )
                .join("")}
            </div>
            
            <p>You can review this trade and download your financial statements directly in your TradeX web dashboard under the Orders & Positions tabs.</p>
            <p>Happy Trading!</p>
            <p>Best regards,<br><strong>TradeX Execution Desk</strong></p>
          </div>
          
          <div class="footer">
            This is a mock simulated transaction notification sent from your local TradeX workspace. <br />
            &copy; 2026 TradeX Team.
          </div>
        </div>
      </body>
    </html>
  `;

  try {
    fs.writeFileSync(filePath, htmlTemplate, "utf8");
    console.log(`\x1b[32m[EMAIL DISPATCH]\x1b[0m Notification simulated for user: \x1b[36m${toEmail}\x1b[0m. Subject: "${subject}". Receipt saved to: \x1b[4m${filePath}\x1b[0m`);
  } catch (err) {
    console.error("Failed to write simulated email receipt file:", err.message);
  }
};
