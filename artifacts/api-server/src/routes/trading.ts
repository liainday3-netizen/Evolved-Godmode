import { Router, type IRouter } from "express";
import OpenAI from "openai";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export interface BotTemplate {
  id: string;
  name: string;
  icon: string;
  tagline: string;
  description: string;
  risk: "low" | "medium" | "high";
  riskColor: string;
  exchanges: string[];
  category: string;
  params: {
    key: string;
    label: string;
    type: "text" | "number" | "select";
    default: string;
    options?: string[];
    description: string;
  }[];
}

const TEMPLATES: BotTemplate[] = [
  {
    id: "dca",
    name: "DCA Bot",
    icon: "📈",
    tagline: "Set it and forget it accumulation",
    description:
      "Dollar Cost Averaging automatically buys a fixed amount of crypto at regular intervals regardless of price. Removes emotional trading and builds position over time through market cycles.",
    risk: "low",
    riskColor: "#00FF88",
    exchanges: ["Binance", "Coinbase", "Kraken", "Bybit"],
    category: "Accumulation",
    params: [
      { key: "pair", label: "Trading Pair", type: "text", default: "BTC/USDT", description: "e.g. BTC/USDT, ETH/USDT" },
      { key: "amount", label: "Buy Amount (USDT)", type: "number", default: "50", description: "Amount to spend per buy cycle" },
      { key: "interval_hours", label: "Interval (hours)", type: "number", default: "24", description: "Hours between each buy" },
      { key: "exchange", label: "Exchange", type: "select", default: "Binance", options: ["Binance", "Coinbase", "Kraken", "Bybit"], description: "Target exchange" },
    ],
  },
  {
    id: "scalping",
    name: "Scalping Bot",
    icon: "⚡",
    tagline: "High-speed micro-profit extraction",
    description:
      "Executes dozens of rapid trades capturing tiny price movements across short timeframes. Uses order book depth and momentum signals to enter and exit positions within seconds to minutes.",
    risk: "high",
    riskColor: "#FF4466",
    exchanges: ["Binance", "Bybit"],
    category: "High Frequency",
    params: [
      { key: "pair", label: "Trading Pair", type: "text", default: "ETH/USDT", description: "High-liquidity pair recommended" },
      { key: "profit_pct", label: "Profit Target (%)", type: "number", default: "0.3", description: "Take profit percentage" },
      { key: "stop_loss_pct", label: "Stop Loss (%)", type: "number", default: "0.2", description: "Maximum loss per trade" },
      { key: "trade_size_usdt", label: "Trade Size (USDT)", type: "number", default: "100", description: "Position size per trade" },
      { key: "timeframe", label: "Timeframe", type: "select", default: "1m", options: ["1m", "3m", "5m"], description: "Candle timeframe" },
    ],
  },
  {
    id: "grid",
    name: "Grid Trading Bot",
    icon: "◈",
    tagline: "Profit from sideways markets",
    description:
      "Places a ladder of buy and sell orders at fixed intervals above and below current price. Profits from price oscillation within a defined range — ideal for ranging, low-volatility markets.",
    risk: "medium",
    riskColor: "#C8A84B",
    exchanges: ["Binance", "Bybit", "OKX"],
    category: "Range Trading",
    params: [
      { key: "pair", label: "Trading Pair", type: "text", default: "BTC/USDT", description: "Pair to trade" },
      { key: "lower_price", label: "Lower Price (USDT)", type: "number", default: "90000", description: "Bottom of the grid range" },
      { key: "upper_price", label: "Upper Price (USDT)", type: "number", default: "110000", description: "Top of the grid range" },
      { key: "grid_levels", label: "Grid Levels", type: "number", default: "10", description: "Number of buy/sell orders" },
      { key: "total_investment", label: "Total Investment (USDT)", type: "number", default: "1000", description: "Total capital to deploy" },
    ],
  },
  {
    id: "trend",
    name: "Trend Follower",
    icon: "◉",
    tagline: "Ride momentum with RSI + MACD",
    description:
      "Combines RSI and MACD signals to identify trend direction and momentum. Enters long when momentum aligns with trend, uses trailing stops to lock profits as the move extends.",
    risk: "medium",
    riskColor: "#C8A84B",
    exchanges: ["Binance", "Kraken", "Bybit", "OKX"],
    category: "Trend Following",
    params: [
      { key: "pair", label: "Trading Pair", type: "text", default: "BTC/USDT", description: "Asset to trade" },
      { key: "timeframe", label: "Timeframe", type: "select", default: "1h", options: ["15m", "1h", "4h", "1d"], description: "Chart timeframe" },
      { key: "rsi_period", label: "RSI Period", type: "number", default: "14", description: "Lookback for RSI calculation" },
      { key: "rsi_oversold", label: "RSI Oversold Level", type: "number", default: "35", description: "RSI level to trigger buy" },
      { key: "trailing_stop_pct", label: "Trailing Stop (%)", type: "number", default: "3", description: "Trailing stop percentage" },
    ],
  },
  {
    id: "mean_reversion",
    name: "Mean Reversion Bot",
    icon: "∿",
    tagline: "Buy dips, sell peaks with Bollinger Bands",
    description:
      "Uses Bollinger Bands to identify when price has deviated too far from its mean and is likely to revert. Buys at the lower band and sells at the upper band, profiting from the natural return to average.",
    risk: "medium",
    riskColor: "#C8A84B",
    exchanges: ["Binance", "Coinbase", "Kraken"],
    category: "Statistical",
    params: [
      { key: "pair", label: "Trading Pair", type: "text", default: "ETH/USDT", description: "Asset to trade" },
      { key: "timeframe", label: "Timeframe", type: "select", default: "4h", options: ["1h", "4h", "1d"], description: "Chart timeframe" },
      { key: "bb_period", label: "BB Period", type: "number", default: "20", description: "Bollinger Bands lookback period" },
      { key: "bb_std", label: "BB Std Deviations", type: "number", default: "2", description: "Standard deviation multiplier" },
      { key: "position_size_pct", label: "Position Size (%)", type: "number", default: "10", description: "Percent of portfolio per trade" },
    ],
  },
  {
    id: "arbitrage",
    name: "Arbitrage Bot",
    icon: "⇄",
    tagline: "Exploit price gaps between exchanges",
    description:
      "Monitors price discrepancies for the same asset across multiple exchanges and executes simultaneous buy/sell orders to capture the spread. Pure market-neutral profit with zero directional risk.",
    risk: "high",
    riskColor: "#FF4466",
    exchanges: ["Binance", "Kraken", "Bybit"],
    category: "Market Neutral",
    params: [
      { key: "pair", label: "Trading Pair", type: "text", default: "BTC/USDT", description: "Asset to arbitrage" },
      { key: "exchange_a", label: "Exchange A", type: "select", default: "Binance", options: ["Binance", "Kraken", "Bybit", "OKX"], description: "First exchange" },
      { key: "exchange_b", label: "Exchange B", type: "select", default: "Kraken", options: ["Binance", "Kraken", "Bybit", "OKX"], description: "Second exchange" },
      { key: "min_spread_pct", label: "Min Spread (%)", type: "number", default: "0.5", description: "Minimum profit spread to trigger" },
      { key: "trade_size_usdt", label: "Trade Size (USDT)", type: "number", default: "500", description: "Size per arbitrage trade" },
    ],
  },
];

router.get("/trading/templates", (_req, res): void => {
  res.json({ templates: TEMPLATES });
});

router.post("/trading/generate", async (req, res): Promise<void> => {
  try {
    const { templateId, config, language = "python" } = req.body as {
      templateId: string;
      config: Record<string, string>;
      language?: string;
    };

    const template = TEMPLATES.find((t) => t.id === templateId);
    if (!template) {
      res.status(400).json({ error: "Unknown template" });
      return;
    }

    const configStr = Object.entries(config)
      .map(([k, v]) => `  ${k}: ${v}`)
      .join("\n");

    const systemPrompt = `You are GODMODE Trading Bot Engineer — an elite quantitative developer and algorithmic trading expert. You write production-quality crypto trading bot code in ${language} that is clean, commented, and ready to deploy.

Rules:
- Output ONLY the ${language} code, no prose before or after
- Include all necessary imports (ccxt for exchange connectivity is standard)
- Add clear comments explaining strategy logic at each key step
- Include proper error handling, logging, and graceful shutdown
- Include a main entry point / run loop
- Make configuration values easy to find at the top of the file
- Write complete, runnable code`;

    const userPrompt = `Generate a complete ${template.name} trading bot in ${language}.

Strategy: ${template.description}

Configuration from user:
${configStr}

Target exchange: ${config.exchange || template.exchanges[0]}
Category: ${template.category}
Risk level: ${template.risk}

Generate the complete, production-ready ${language} bot code now.`;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    const stream = await openai.chat.completions.create({
      model: "gpt-5.2",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      stream: true,
      max_completion_tokens: 8192,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || "";
      if (content) {
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    res.write("data: [DONE]\n\n");
    res.end();
  } catch (error) {
    logger.error({ error }, "Trading bot generate error");
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to generate bot" });
    } else {
      res.write(`data: ${JSON.stringify({ error: "Stream error" })}\n\n`);
      res.end();
    }
  }
});

export default router;
