async (page) => {
  const outDir = "C:/Users/raxac/OneDrive/Desktop/apps/time mage LSB/tmp/bot-reports/shots";
  const hops = [
  {
    "x": 0,
    "z": 4,
    "shot": "encampment"
  },
  {
    "x": -26,
    "z": -6,
    "shot": "silo"
  },
  {
    "x": -4,
    "z": 8
  },
  {
    "x": -11.183697139158634,
    "z": 10.15510914174759
  },
  {
    "x": -18.74341649025257,
    "z": 12.58113883008419
  },
  {
    "x": -22.124094421967268,
    "z": 11.319183136512276
  },
  {
    "x": -25.3,
    "z": 22,
    "shot": "hub-west-farm"
  },
  {
    "x": -28.45489251656365,
    "z": 32.68081686348773
  },
  {
    "x": -34,
    "z": 38
  },
  {
    "x": -40.70820393249936,
    "z": 41.35410196624969
  },
  {
    "x": -46,
    "z": 44
  },
  {
    "x": -50,
    "z": 28,
    "shot": "mountain-shoulder"
  },
  {
    "x": -57.110774053454705,
    "z": 16,
    "shot": "chalk-run-south"
  },
  {
    "x": -22.124094421967268,
    "z": 11.319183136512276
  },
  {
    "x": -18.74341649025257,
    "z": 12.58113883008419
  },
  {
    "x": -11.183697139158634,
    "z": 10.15510914174759
  },
  {
    "x": -4,
    "z": 8
  },
  {
    "x": 2.8284271247461903,
    "z": 10.82842712474619
  },
  {
    "x": 10,
    "z": 6
  },
  {
    "x": 13.64232198383974,
    "z": 12.556179570911535
  },
  {
    "x": 17.28464396767948,
    "z": 19.112359141823067
  },
  {
    "x": 20.490290337845458,
    "z": 26.451451689227298
  },
  {
    "x": 21.961161351381833,
    "z": 33.80580675690919
  },
  {
    "x": 22.941742027072756,
    "z": 38.70871013536379
  },
  {
    "x": 32.505143851353694,
    "z": 39,
    "shot": "east-trib-z39"
  },
  {
    "x": 22.941742027072756,
    "z": 38.70871013536379
  },
  {
    "x": 21.961161351381833,
    "z": 33.80580675690919
  },
  {
    "x": 20.490290337845458,
    "z": 26.451451689227298
  },
  {
    "x": 17.28464396767948,
    "z": 19.112359141823067
  },
  {
    "x": 13.64232198383974,
    "z": 12.556179570911535
  },
  {
    "x": 10,
    "z": 6
  },
  {
    "x": 0,
    "z": 8
  },
  {
    "x": 2.6334258119129372,
    "z": 15.022468831767831
  },
  {
    "x": 6.312493375019875,
    "z": 21.2999894000318
  },
  {
    "x": 12.287901617510315,
    "z": 26.57175032196993
  },
  {
    "x": 12.287901617510315,
    "z": 26.57175032196993
  },
  {
    "x": 3.3,
    "z": 33.4,
    "shot": "hub-north"
  },
  {
    "x": -1.2929802659118903,
    "z": 35.012408618017986
  },
  {
    "x": -7.8953763867191435,
    "z": 39.41032636242694
  },
  {
    "x": -16.29398327048628,
    "z": 42.950452355413724
  },
  {
    "x": -23.13207727177212,
    "z": 45.40379137686024
  },
  {
    "x": -30.324302898077143,
    "z": 48.222937819336465
  },
  {
    "x": -37.94171727323116,
    "z": 51.347791043026945
  },
  {
    "x": -44.57563815342575,
    "z": 55.381112201711005
  },
  {
    "x": -47.059450499765546,
    "z": 62.94156520873831
  },
  {
    "x": -42.37659201787873,
    "z": 70.14526941727931
  },
  {
    "x": -35.11647000359018,
    "z": 74.11390164972748
  },
  {
    "x": -27.565063729701883,
    "z": 76.79826536836187
  },
  {
    "x": -20.478036364431517,
    "z": 80.13534414832561
  },
  {
    "x": -14.314349150602744,
    "z": 84.40839457279803
  },
  {
    "x": -8.150661936773972,
    "z": 88.68144499727045
  },
  {
    "x": -3.9571643937279317,
    "z": 91.58863769454649
  },
  {
    "x": 0.1,
    "z": 81.2,
    "shot": "ashbeam"
  },
  {
    "x": 4.252138928046306,
    "z": 70.87618397773386
  },
  {
    "x": 8.91492375405974,
    "z": 78.0266947868414
  },
  {
    "x": 15.473396391720023,
    "z": 81.72611674586217
  },
  {
    "x": 20.128839873232934,
    "z": 87.94029504689199
  },
  {
    "x": 19.502530253360604,
    "z": 95.19963004272323
  },
  {
    "x": 17.523090510065725,
    "z": 102.43370346664314
  },
  {
    "x": 16.14106641297914,
    "z": 110.49136439561221
  },
  {
    "x": 16.530577192792656,
    "z": 117.9536698968368
  },
  {
    "x": 17.31091323107369,
    "z": 125.41296447925947
  },
  {
    "x": 17.76211662553238,
    "z": 133.22715585813373
  },
  {
    "x": 16.33481637872665,
    "z": 140.5900910069361
  },
  {
    "x": 14.90751613192091,
    "z": 147.95302615573846
  },
  {
    "x": 14.43174938298566,
    "z": 150.4073378720059
  },
  {
    "x": -2.8,
    "z": 150,
    "shot": "chalkworks"
  },
  {
    "x": 33.674011568674885,
    "z": 155,
    "shot": "east-trib-z155"
  },
  {
    "x": -2.8,
    "z": 150
  },
  {
    "x": -19.94071722027664,
    "z": 148.7426723252294
  },
  {
    "x": -21.487659954402826,
    "z": 156.0814030177493
  },
  {
    "x": -29.92853328053264,
    "z": 159.7514780022315
  },
  {
    "x": -36.74427055906212,
    "z": 162.17373867687394
  },
  {
    "x": -43.88967643234782,
    "z": 165.29781695679452
  },
  {
    "x": -49.97970273315825,
    "z": 170.0095438158554
  },
  {
    "x": -51.39735239326563,
    "z": 177.2998787519852
  },
  {
    "x": -46.44826120488245,
    "z": 184.10407329713348
  },
  {
    "x": -38.81720203424418,
    "z": 188.27383173227227
  },
  {
    "x": -32.59581278199301,
    "z": 192.46242526375428
  },
  {
    "x": -26.37442352974184,
    "z": 196.6510187952363
  },
  {
    "x": -20.15303427749067,
    "z": 200.83961232671837
  },
  {
    "x": -13.931645025239499,
    "z": 205.02820585820047
  },
  {
    "x": -7.710255772988333,
    "z": 209.21679938968256
  },
  {
    "x": -4.749946911879965,
    "z": 211.2098478944584
  },
  {
    "x": 0.4,
    "z": 196.3,
    "shot": "marches"
  },
  {
    "x": 5.552641060758811,
    "z": 181.38939885246643
  },
  {
    "x": 13.357359456436868,
    "z": 193.5163851638279
  },
  {
    "x": 24.607232601384048,
    "z": 203.4852394252742
  },
  {
    "x": 18.062705366766316,
    "z": 216.2260465752923
  },
  {
    "x": 11.235728966907118,
    "z": 229.5824081021364
  },
  {
    "x": 6.565985901282758,
    "z": 244.01904934551038
  },
  {
    "x": -3.6068967071850837,
    "z": 221.53073372946037,
    "shot": "chalk-run-north"
  }
];

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
  await p.goto("http://localhost:5174/", { waitUntil: "domcontentloaded" });
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
    const raw = (await p.locator(".hud-pos").innerText()).replace(/\s+/g, " ");
    const m = raw.match(/X (-?[\d.]+) Y (-?[\d.]+) Z (-?[\d.]+)/);
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
