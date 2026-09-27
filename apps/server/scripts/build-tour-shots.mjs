import fs from "node:fs";

const hops = fs.readFileSync("tmp/bot-reports/shot-route.json", "utf8").trim();
const script = `async (page) => {
  const outDir = "C:/Users/raxac/OneDrive/Desktop/apps/time mage LSB/tmp/bot-reports/shots";
  const hops = ${hops};

  const browser = page.context().browser();
  if (!browser) throw new Error("no browser");
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const p = await ctx.newPage();
  await p.addInitScript(() => {
    const orig = WebSocket.prototype.send;
    WebSocket.prototype.send = function (data) {
      window.__bgWs = this;
      return orig.call(this, data);
    };
  });
  await p.goto("http://127.0.0.1:5173/", { waitUntil: "domcontentloaded" });
  const nameInput = p.locator("input[name=name]");
  const enter = p.getByRole("button", { name: "Enter Bellgrave" });
  await Promise.race([nameInput.waitFor({ timeout: 25000 }), enter.waitFor({ timeout: 25000 })]);
  if (await nameInput.isVisible().catch(() => false)) {
    await nameInput.fill("ScoutCam");
    const job = p.locator("select.boot-job-select");
    if (await job.count()) await job.selectOption("knight");
    await p.locator("form.boot-panel button[type=submit]").click();
  } else if (await enter.isVisible().catch(() => false)) {
    await enter.click();
  }
  await p.locator(".hud-pos").waitFor({ timeout: 25000 });
  await p.waitForTimeout(800);

  async function readPos() {
    const raw = (await p.locator(".hud-pos").innerText()).replace(/\\s+/g, " ");
    const m = raw.match(/X (-?[\\d.]+) Y (-?[\\d.]+) Z (-?[\\d.]+)/);
    if (!m) return null;
    return { x: Number(m[1]), y: Number(m[2]), z: Number(m[3]) };
  }

  async function goTo(x, z) {
    const start = await readPos();
    const dist = start ? Math.hypot(start.x - x, start.z - z) : 30;
    const budget = Math.min(45000, Math.max(6000, (dist / 4.2) * 1000 + 4000));
    const t0 = Date.now();
    let last = "";
    let stall = 0;
    while (Date.now() - t0 < budget) {
      await p.evaluate(
        ({ x, z }) => window.__bgWs && window.__bgWs.send(JSON.stringify({ type: "move", x, z })),
        { x, z },
      );
      await p.waitForTimeout(350);
      const cur = await readPos();
      if (!cur) continue;
      if (Math.hypot(cur.x - x, cur.z - z) < 2.6) return { ...cur, ok: true };
      const key = cur.x.toFixed(1) + "," + cur.z.toFixed(1);
      if (key === last) stall += 1;
      else stall = 0;
      last = key;
      if (stall >= 7) return { ...cur, ok: false };
    }
    const cur = await readPos();
    return { ...(cur || { x: 0, y: 0, z: 0 }), ok: false };
  }

  const nx = (n) => (n < 0 ? "m" + Math.abs(n).toFixed(1) : n.toFixed(1)).replace(".", "p");
  const saved = [];
  for (const hop of hops) {
    const at = await goTo(hop.x, hop.z);
    if (!hop.shot) continue;
    await p.waitForTimeout(500);
    const file = outDir + "/" + hop.shot + "-x" + nx(at.x) + "-y" + nx(at.y) + "-z" + nx(at.z) + ".png";
    await p.screenshot({ path: file });
    saved.push({ area: hop.shot, file, ok: at.ok, x: at.x, y: at.y, z: at.z });
  }
  await ctx.close();
  return saved;
}
`;
fs.writeFileSync("apps/server/scripts/tour-shots.mjs", script);
console.log("wrote tour-shots", script.length);
