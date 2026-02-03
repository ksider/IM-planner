import express from "express";
import path from "path";
import { openDb } from "./db.js";
import { ensureSeedParams } from "./services/seed.js";
import { createHomeRouter } from "./routes/home.js";
import { createRecipesRouter } from "./routes/recipes.js";
import { createExperimentsRouter } from "./routes/experiments.js";
import { createRunsRouter } from "./routes/runs.js";
import { createQualificationRouter } from "./routes/qualification.js";
import { createMachinesRouter } from "./routes/machines.js";
import { createReportRouter } from "./routes/report.js";

const app = express();
const db = openDb();
ensureSeedParams(db);

app.locals.formatNumber = (value: unknown, maxDecimals = 3) => {
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) return "-";
  const abs = Math.abs(num);
  if (abs >= 1e6) {
    const exp = Math.floor(Math.log10(abs));
    const mant = num / Math.pow(10, exp);
    const mantText = mant.toFixed(2).replace(/\.?0+$/, "");
    return `${mantText}×10^${exp}`;
  }
  if (abs >= 10000) {
    const k = num / 1000;
    const kText = k.toFixed(2).replace(/\.?0+$/, "");
    return `${kText}k`;
  }
  const factor = Math.pow(10, maxDecimals);
  const rounded = Math.round(num * factor) / factor;
  const fixed = rounded.toFixed(maxDecimals);
  return fixed.replace(/\.?0+$/, "");
};

const htmlEscapes: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;"
};

function escapeHtml(value: unknown) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => htmlEscapes[char] ?? char);
}

app.locals.formatInline = (value: unknown) => {
  const escaped = escapeHtml(value);
  const withTags = escaped.replace(/&lt;(\/?)(sup|sub)&gt;/gi, "<$1$2>");
  return withTags
    .replace(/\s+(?=<(sup|sub)>)/gi, "")
    .replace(/<(sup|sub)>\s+/gi, "<$1>")
    .replace(/\s+<\/(sup|sub)>/gi, "</$1>");
};

const viewsPath = path.resolve(process.cwd(), "src", "views");
const publicPath = path.resolve(process.cwd(), "src", "public");

app.set("view engine", "ejs");
app.set("views", viewsPath);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(publicPath));
app.use("/vendor", express.static(path.resolve(process.cwd(), "node_modules")));

app.use(createHomeRouter(db));
app.use(createRecipesRouter(db));
app.use(createExperimentsRouter(db));
app.use(createRunsRouter(db));
app.use(createQualificationRouter(db));
app.use(createMachinesRouter(db));
app.use(createReportRouter(db));

app.use((_req, res) => {
  res.status(404).send("Not found");
});

const PORT = Number(process.env.PORT || 3000);
app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`IM-DOE Planner running on http://localhost:${PORT}`);
});
