import { Router, type IRouter } from "express";
import OpenAI from "openai";
import { z } from "zod";
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

const generateSchema = z.object({
  templateId: z.enum(["dca", "scalping", "grid", "trend", "mean_reversion", "arbitrage"]),
  language: z.enum(["python", "javascript"]).default("python"),
  config: z.record(z.string(), z.string().max(100)).default({}),
}).strict();

router.post("/trading/generate", async (req, res): Promise<void> => {
  const parsed = generateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid trading bot configuration." });
    return;
  }

  const { templateId, language, config } = parsed.data;
  const template = TEMPLATES.find((item) => item.id === templateId);
  if (!template) {
    res.status(400).json({ error: "Unknown template." });
    return;
  }

  const allowedKeys = new Set(template.params.map((param) => param.key));
  if (Object.keys(config).some((key) => !allowedKeys.has(key))) {
    res.status(400).json({ error: "Configuration contains unsupported fields." });
    return;
  }

  for (const param of template.params) {
    const value = config[param.key];
    if (value === undefined) continue;
    if (param.type === "number") {
      const numeric = Number(value);
      if (!Number.isFinite(numeric) || numeric <= 0 || numeric > 1_000_000_000) {
        res.status(400).json({ error: `Invalid value for ${param.label}.` });
        return;
      }
    } else if (param.type === "select" && !param.options?.includes(value)) {
      res.status(400).json({ error: `Invalid option for ${param.label}.` });
      return;
    } else if (param.type === "text" && param.key === "pair" &&
      !/^[A-Za-z0-9]{2,15}\/[A-Za-z0-9]{2,15}$/.test(value)) {
      res.status(400).json({ error: "Trading pair must use a format such as BTC/USDT." });
      return;
    }
  }

  if (templateId === "arbitrage" && config.exchange_a && config.exchange_b &&
      config.exchange_a === config.exchange_b) {
    res.status(400).json({ error: "Choose two different exchanges for arbitrage." });
    return;
  }
  if (templateId === "grid" && config.lower_price && config.upper_price &&
      Number(config.lower_price) >= Number(config.upper_price)) {
    res.status(400).json({ error: "Grid lower price must be below upper price." });
    return;
  }

  const configStr = Object.entries(config)
    .map(([key, value]) => `  ${key}: ${value}`)
    .join("\\n");

  const systemPrompt = `You are GODMODE Trading Bot Engineer — an expert quantitative developer. Generate carefully documented ${language} educational trading-bot code.

Mandatory safety rules:
- PAPER TRADING ONLY. The generated program must default to simulated orders and must not submit live orders.
- Do not request, embed, print, or hard-code API keys, secrets, passwords, or wallet credentials.
- Never describe any strategy as guaranteed, risk-free, or production-ready.
- Explain fees, slippage, liquidity, exchange outages, and loss risk in code comments.
- Include conservative risk limits, position sizing checks, logging, error handling, and graceful shutdown.
- Keep all configuration values easy to find at the top of the file.
- Output only the complete ${language} code in one fenced code block.`;

  const userPrompt = `Create a PAPER-TRADING educational implementation of the ${template.name}.

Strategy: ${template.description}

Configuration:
${configStr}

Preferred exchange for illustrative market data: ${config.exchange || template.exchanges[0]}
Category: ${template.category}
Risk classification: ${template.risk}

Include a clear notice that simulated results do not predict live results. Do not enable live trading.`;

  const abortController = new AbortController();
  let finished = false;
  res.on("close", () => {
    if (!finished) abortController.abort();
  });

  try {
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
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
    }, { signal: abortController.signal });

    for await (const chunk of stream) {
      if (res.destroyed || abortController.signal.aborted) break;
      const output = chunk.choices[0]?.delta?.content || "";
      if (output) res.write(`data: ${JSON.stringify({ content: output })}\\n\\n`);
    }

    if (!res.destroyed && !abortController.signal.aborted) {
      res.write("data: [DONE]\\n\\n");
      res.end();
    }
    finished = true;
  } catch (error) {
    if (abortController.signal.aborted || res.destroyed) {
      finished = true;
      return;
    }
    logger.error({ error }, "Trading bot generate error");
    if (!res.headersSent) {
      res.status(502).json({ error: "Failed to generate trading code." });
    } else if (!res.destroyed) {
      res.write(`data: ${JSON.stringify({ error: "The code generation stream was interrupted." })}\\n\\n`);
      res.end();
    }
    finished = true;
  }
});
export default router;
