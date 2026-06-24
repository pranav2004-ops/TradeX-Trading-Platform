import mongoose from "mongoose";

// ---------------------------------------------------------------------------
// statusHistory sub-document — immutable audit trail for every state change
// ---------------------------------------------------------------------------
const statusHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ["PENDING", "EXECUTED", "CANCELLED", "REJECTED"],
      required: true,
    },
    timestamp: {
      type: Date,
      default: () => new Date(),
    },
    note: {
      type: String,
      default: "",
    },
  },
  { _id: false }
);

// ---------------------------------------------------------------------------
// Trade schema
//
// Backward compatibility:
//   - orderType defaults to "MARKET"  → existing records read as MARKET
//   - status   defaults to "EXECUTED" → existing records read as EXECUTED
//   - price, totalAmount are now optional → PENDING limit orders have no
//     executed price/amount until the processor fills them
//   - All new fields are optional or have safe defaults
// ---------------------------------------------------------------------------
const tradeSchema = new mongoose.Schema(
  {
    // ── Core identity ───────────────────────────────────────────────────────
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    symbol: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },

    companyName: {
      type: String,
      required: true,
      trim: true,
    },

    action: {
      type: String,
      enum: ["BUY", "SELL"],
      required: true,
    },

    quantity: {
      type: Number,
      required: true,
      min: 1,
    },

    // ── Order classification ────────────────────────────────────────────────
    /**
     * orderType — distinguishes how the order should be executed.
     * Default "MARKET" ensures all pre-existing documents remain valid.
     */
    orderType: {
      type: String,
      enum: ["MARKET", "LIMIT"],
      default: "MARKET",
    },

    /**
     * status — lifecycle state.
     * Default "EXECUTED" ensures all pre-existing market-order documents
     * remain valid without a migration.
     */
    status: {
      type: String,
      enum: ["PENDING", "EXECUTED", "CANCELLED", "REJECTED"],
      default: "EXECUTED",
    },

    // ── Price fields ────────────────────────────────────────────────────────
    /**
     * limitPrice — the client-specified trigger price for LIMIT orders.
     * Not used for MARKET orders.
     */
    limitPrice: {
      type: Number,
      min: 0,
    },

    /**
     * price — the server-resolved authoritative execution price.
     * Required for MARKET orders (set at creation).
     * Set for LIMIT orders when they are filled by the processor.
     * Left unset (undefined) while a LIMIT order is PENDING.
     *
     * Changed from required:true to optional to support PENDING state.
     * Existing documents always have this field → no regression.
     */
    price: {
      type: Number,
      min: 0,
    },

    /**
     * executedPrice — explicit alias for the fill price of a LIMIT order.
     * For MARKET orders this equals `price`.
     * Stored separately so queries can distinguish limit price from fill price.
     */
    executedPrice: {
      type: Number,
      min: 0,
    },

    /**
     * totalAmount — quantity × executedPrice.
     * Set at execution time. Optional while PENDING.
     */
    totalAmount: {
      type: Number,
      min: 0,
    },

    /**
     * reservedAmount — cash reserved when a LIMIT BUY is placed.
     * = quantity × limitPrice
     * Released/adjusted at execution or refunded in full on cancellation.
     */
    reservedAmount: {
      type: Number,
      min: 0,
      default: 0,
    },

    // ── Timestamps ──────────────────────────────────────────────────────────
    /** When the order was filled by the processor or immediately (MARKET). */
    executedAt: {
      type: Date,
    },

    /** When a PENDING order was cancelled by the user. */
    cancelledAt: {
      type: Date,
    },

    // ── Rejection ───────────────────────────────────────────────────────────
    rejectionReason: {
      type: String,
      trim: true,
    },

    // ── Audit trail ─────────────────────────────────────────────────────────
    /**
     * statusHistory — append-only log of every status transition.
     * Each entry records the new status, timestamp, and an optional note.
     */
    statusHistory: {
      type: [statusHistorySchema],
      default: [],
    },
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

// ---------------------------------------------------------------------------
// Indexes
// ---------------------------------------------------------------------------

// Efficiently query all PENDING LIMIT orders for the processor
tradeSchema.index({ status: 1, orderType: 1, createdAt: -1 });

// Per-user order history (Orders page, trade history API)
tradeSchema.index({ user: 1, status: 1, createdAt: -1 });

const Trade = mongoose.model("Trade", tradeSchema);

export default Trade;
