import { sendSimulatedEmail } from "./utils/emailService.js";

const test = async () => {
  console.log("Starting email service fallback check...");
  
  await sendSimulatedEmail(
    "verification_test@example.com",
    "Order Filled: BUY AAPL",
    "Your BUY Market Order was executed!",
    {
      "Symbol": "AAPL",
      "Company": "Apple Inc.",
      "Action": "BUY",
      "Quantity": "50",
      "Execution Price": "₹293.08",
      "Total Cost": "₹14,654.00",
      "Status": "EXECUTED",
      "Executed At": new Date().toLocaleString("en-IN")
    }
  );
  
  console.log("Check complete. Look in server/sent_emails/ directory to verify the HTML file contents.");
};

test();
