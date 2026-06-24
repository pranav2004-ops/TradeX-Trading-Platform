import { useState, useEffect } from "react";

const MARKET_TIME_ZONE = "Asia/Kolkata";
const PRE_MARKET_START = 9 * 60; // 09:00
const MARKET_OPEN = 9 * 60 + 15; // 09:15
const MARKET_CLOSE = 15 * 60 + 30; // 15:30
const POST_MARKET_END = 16 * 60; // 16:00

export const MARKET_STATES = {
  OPEN: "Market Open",
  CLOSED: "Market Closed",
  PRE_MARKET: "Pre-Market",
  POST_MARKET: "Post-Market",
};

const getISTDate = () => {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: MARKET_TIME_ZONE })
  );
};

const calculateMarketStatus = () => {
  const istDate = getISTDate();
  const day = istDate.getDay();
  const hours = istDate.getHours();
  const minutes = istDate.getMinutes();
  const totalMinutes = hours * 60 + minutes;

  // Weekend
  if (day === 0 || day === 6) {
    return {
      state: MARKET_STATES.CLOSED,
      nextEvent: `Opens ${day === 6 ? "on Monday" : "tomorrow"}`,
      isOpen: false,
    };
  }

  // Weekday schedule
  if (totalMinutes < PRE_MARKET_START) {
    const minsUntilOpen = MARKET_OPEN - totalMinutes;
    const h = Math.floor(minsUntilOpen / 60);
    const m = minsUntilOpen % 60;
    const timeStr = h > 0 ? `${h}h ${m}m` : `${m}m`;
    return {
      state: MARKET_STATES.CLOSED,
      nextEvent: `Opens in ${timeStr}`,
      isOpen: false,
    };
  } else if (totalMinutes >= PRE_MARKET_START && totalMinutes < MARKET_OPEN) {
    const minsUntilOpen = MARKET_OPEN - totalMinutes;
    return {
      state: MARKET_STATES.PRE_MARKET,
      nextEvent: `Opens in ${minsUntilOpen}m`,
      isOpen: false,
    };
  } else if (totalMinutes >= MARKET_OPEN && totalMinutes < MARKET_CLOSE) {
    const minsUntilClose = MARKET_CLOSE - totalMinutes;
    const h = Math.floor(minsUntilClose / 60);
    const m = minsUntilClose % 60;
    const timeStr = h > 0 ? `${h}h ${m}m` : `${m}m`;
    return {
      state: MARKET_STATES.OPEN,
      nextEvent: `Closes in ${timeStr}`,
      isOpen: true,
    };
  } else if (totalMinutes >= MARKET_CLOSE && totalMinutes < POST_MARKET_END) {
    return {
      state: MARKET_STATES.POST_MARKET,
      nextEvent: day === 5 ? "Opens on Monday" : "Opens tomorrow",
      isOpen: false,
    };
  } else {
    // After post-market
    return {
      state: MARKET_STATES.CLOSED,
      nextEvent: day === 5 ? "Opens on Monday" : "Opens tomorrow",
      isOpen: false,
    };
  }
};

const useMarketStatus = () => {
  const [status, setStatus] = useState(calculateMarketStatus());
  const [timeStr, setTimeStr] = useState("");

  useEffect(() => {
    const update = () => {
      setStatus(calculateMarketStatus());
      const istDate = getISTDate();
      setTimeStr(
        istDate.toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        })
      );
    };

    update();
    const interval = setInterval(update, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  return { ...status, timeStr };
};

export default useMarketStatus;
