import Alert from "../models/Alert.js";

export const getAlerts = async (req, res, next) => {
  try {
    const alerts = await Alert.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json({ success: true, data: alerts });
  } catch (err) {
    next(err);
  }
};

export const createAlert = async (req, res, next) => {
  try {
    const { symbol, targetPrice, condition } = req.body;

    if (!symbol || targetPrice == null || !condition) {
      return res.status(400).json({
        success: false,
        message: "symbol, targetPrice, and condition are required",
        errors: [],
      });
    }

    if (!["above", "below"].includes(condition)) {
      return res.status(400).json({
        success: false,
        message: "condition must be 'above' or 'below'",
        errors: [],
      });
    }

    const price = Number(targetPrice);
    if (!Number.isFinite(price) || price <= 0) {
      return res.status(400).json({
        success: false,
        message: "targetPrice must be a positive number",
        errors: [],
      });
    }

    const alert = await Alert.create({
      user: req.user.id,
      symbol: String(symbol).trim().toUpperCase(),
      targetPrice: price,
      condition,
    });

    res.status(201).json({ success: true, data: alert });
  } catch (err) {
    next(err);
  }
};

export const markAlertTriggered = async (req, res, next) => {
  try {
    const alert = await Alert.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: "Alert not found",
        errors: [],
      });
    }

    alert.triggered = true;
    alert.triggeredAt = new Date();
    await alert.save();

    res.json({ success: true, data: alert });
  } catch (err) {
    next(err);
  }
};

export const deleteAlert = async (req, res, next) => {
  try {
    const alert = await Alert.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: "Alert not found",
        errors: [],
      });
    }

    res.json({ success: true, data: { id: req.params.id } });
  } catch (err) {
    next(err);
  }
};
