import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { getStockCandles, getSparklineData } from "../server/services/stockService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env variables
dotenv.config({ path: path.join(__dirname, "../server/.env") });

const test = async () => {
  console.log("Starting fallback simulation tests...");
  console.log("API Key loaded:", !!process.env.FINNHUB_API_KEY);

  try {
    console.log("\n--- Testing getStockCandles for AAPL (Daily resolution) ---");
    const now = Math.floor(Date.now() / 1000);
    const from = now - 30 * 24 * 60 * 60; // 30 days
    const result = await getStockCandles("AAPL", "D", from, now);
    
    console.log("Status:", result.status);
    console.log("Simulated:", result.simulated);
    console.log("Number of candles:", result.candles.length);
    if (result.candles.length > 0) {
      console.log("First candle:", result.candles[0]);
      console.log("Last candle:", result.candles[result.candles.length - 1]);
    }

    console.log("\n--- Testing getSparklineData for AAPL ---");
    const sparklineResult = await getSparklineData("AAPL");
    console.log("Sparkline simulated:", sparklineResult.simulated);
    console.log("Prices length:", sparklineResult.prices.length);
    console.log("Sample prices (first 5):", sparklineResult.prices.slice(0, 5));

    console.log("\n✅ All service fallback tests completed successfully.");
  } catch (error) {
    console.error("Test failure:", error);
  }
};

test();
