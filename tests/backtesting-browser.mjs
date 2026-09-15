import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const consoleErrors = [];
const pageErrors = [];
const failedRequests = [];

page.on("console", (message) => {
  if (message.type() === "error") consoleErrors.push(message.text());
});
page.on("pageerror", (error) => pageErrors.push(error.stack || error.message));
page.on("requestfailed", (request) => failedRequests.push(`${request.method()} ${request.url()} :: ${request.failure()?.errorText}`));

await page.goto("http://127.0.0.1:3000", { waitUntil: "networkidle", timeout: 30_000 });
await page.getByRole("button", { name: "Backtesting" }).click();
await page.waitForTimeout(1_500);

console.log("URL:", page.url());
console.log("Backtesting visible:", await page.getByText("Créer un Backtest", { exact: true }).isVisible().catch(() => false));
console.log("Page errors:", JSON.stringify(pageErrors));
console.log("Console errors:", JSON.stringify(consoleErrors));
console.log("Failed requests:", JSON.stringify(failedRequests));

await browser.close();
if (pageErrors.length || consoleErrors.length) process.exitCode = 1;
