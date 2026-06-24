import mongoose from "mongoose";

const portfolioSnapshotSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    portfolioValue: {
      type: Number,
      required: true,
      min: 0,
    },
    cashBalance: {
      type: Number,
      required: true,
      min: 0,
    },
    investedAmount: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

portfolioSnapshotSchema.index({ user: 1, createdAt: 1 });

const PortfolioSnapshot = mongoose.model(
  "PortfolioSnapshot",
  portfolioSnapshotSchema
);

export default PortfolioSnapshot;
