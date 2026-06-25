import dotenv from "dotenv";
import mongoose from "mongoose";
import User from "./models/user.js";
import { calculateAdvancedAnalytics } from "./services/analyticsService.js";

dotenv.config();

const test = async () => {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected successfully.");

    // Find any user in the system
    const user = await User.findOne();
    if (!user) {
      console.log("No user found in the database. Please register a user first.");
      await mongoose.disconnect();
      return;
    }

    console.log(`Running calculateAdvancedAnalytics for user ID: ${user._id} (${user.email || 'no-email'})`);
    const data = await calculateAdvancedAnalytics(user._id);

    console.log("\n--- RESULT DATA ---");
    console.log("Volatility:", data.volatility);
    console.log("Sharpe Ratio:", data.sharpeRatio);
    console.log("Max Drawdown:", data.maxDrawdown);
    console.log("Risk Score:", data.riskScore);
    console.log("Risk Class:", data.riskClass);
    console.log("Risk Rationale:", data.riskRationale);
    console.log("Sector Concentrations:", data.sectorConcentration.length);
    console.log("Benchmark Comparison Points:", data.benchmarkComparison.length);
    console.log("Heatmap Assets:", data.heatmap.length);

    if (data.heatmap.length > 0) {
      console.log("Sample Heatmap Asset:", data.heatmap[0]);
    }
    if (data.benchmarkComparison.length > 0) {
      console.log("Sample Benchmark Point:", data.benchmarkComparison[0]);
    }

    console.log("\n✅ Advanced analytics integration test ran successfully.");
  } catch (error) {
    console.error("Test error:", error);
  } finally {
    await mongoose.disconnect();
  }
};

test();
