/* Gabion Fabrication – Wall Quote Calculator. Formulas copied 1:1 from the Google Sheet
   "Gabion Wall Quote Calculator (2026)" (Calculator / Rates / Height table tabs). All $ ex GST unless "Inc". */
var DEFAULT_RATES = {
  layerHeight: 0.5,          // Rates!B4  one cage layer per this much height (cages 0.5 m wide)
  // Galfan panels (Jamie O'Brien, Global Synthetics, 15 Jul 2026, ex GST)
  panel05x05: 4.51, panel05x1: 8.84, panel1x05: 8.50, panel1x1: 20.29, panel2x05: 16.41, panel2x1: 37.85,
  braceHook: 0.76, hooksPerLayerPerM: 2,
  // Galvanised sheets
  sheetLength: 2.4, sheetWidth: 4.5, sheetPrice: 50,
  meshFront: 0.5, meshBack: 0.5, meshBase: 0.5, meshBaffle: 0.25, meshLid: 0.5, meshWaste: 0.10,
  clipsPerLayerPerM: 8,      // ESTIMATE
  rockLoadPrice: 1100, rockLoadTonnes: 12.5, rockDensity: 1.8, rockM3PerLayerPerM: 0.25, rockBuffer: 0.075,
  geoMetresPerRoll: 50, geoRollPrice: 0,
  dayRate: 1800, limestoneM2PerDay: 18, gabionTimeMultiplier: 2, dayRounding: 0.5,
  blockSell: 90, blockCost: 30,
  blocksPerMetre: { "0.5": 3.5, "1": 5, "1.5": 7, "2": 14.5, "2.5": 19, "3": 25 },
  galvFactor: 1.05, galfanFactor: 1.15, gst: 0.10, minMargin: 0.20
};
function roundUp(x, d) { var f = Math.pow(10, d || 0); return Math.ceil(+(x * f).toFixed(9)) / f; }
function lookupBlocks(r, h) { var k = String(+h); var v = r.blocksPerMetre[k]; if (v === undefined) throw new Error("No blocks-per-metre entry for " + h + " m"); return v; }
/* type: "galfan" | "galvanised" | "limestone" */
function calcQuote(length, height, type, rates) {
  var r = Object.assign({}, DEFAULT_RATES, rates || {});
  if (rates && rates.blocksPerMetre) r.blocksPerMetre = rates.blocksPerMetre;
  var visibleHeight = +height;
  if (!(visibleHeight >= 0.4 && visibleHeight <= 3.0)) throw new Error("Height must be 0.4–3.0 m");
  // Josh's rule: price in-between heights at the next 0.5 m cage step up (extra buried), capped at 3.0 m
  var pricedHeight = Math.min(3.0, roundUp(visibleHeight / 0.5) * 0.5);
  var L = +length, H = pricedHeight, layers = H / r.layerHeight, face = L * H;
  // Galfan mesh $/m/layer = front+back+base (1.0x0.5) + baffle (0.5x0.5) + hooks
  var galfanPerLayer = r.panel1x05 * 3 + r.panel05x05 + r.hooksPerLayerPerM * r.braceHook;
  var galfanPerM = layers * galfanPerLayer + r.panel1x05;           // + top lid
  var galfanPanels1x05 = Math.ceil(L) * (3 * layers + 1), galfanBaffles = Math.ceil(L) * layers, hooks = Math.ceil(L) * layers * r.hooksPerLayerPerM;
  var meshAreaPerLayer = r.meshFront + r.meshBack + r.meshBase + r.meshBaffle;
  var galvArea = L * (layers * meshAreaPerLayer + r.meshLid) * (1 + r.meshWaste);
  var galvSheets = roundUp(galvArea / (r.sheetLength * r.sheetWidth));
  var clips = r.clipsPerLayerPerM * layers * L;
  var rockM3 = r.rockM3PerLayerPerM * layers * L * (1 + r.rockBuffer), rockT = rockM3 * r.rockDensity;
  var rockLoads = roundUp(rockT / r.rockLoadTonnes), rockCost = rockT * (r.rockLoadPrice / r.rockLoadTonnes);
  var geoRolls = roundUp(L / r.geoMetresPerRoll), geoCost = geoRolls * r.geoRollPrice;
  var gabDays = roundUp(face / (r.limestoneM2PerDay / r.gabionTimeMultiplier) / r.dayRounding) * r.dayRounding;
  var gabLabour = gabDays * r.dayRate;
  var bpm = lookupBlocks(r, H), blocks = roundUp(bpm * L);
  var limeQuote = blocks * r.blockSell, limeBlockCost = blocks * r.blockCost;
  var limeDays = roundUp(face / r.limestoneM2PerDay / r.dayRounding) * r.dayRounding, limeLabour = limeDays * r.dayRate;
  var meshCost, cost, quoteEx;
  if (type === "galfan") { meshCost = galfanPerM * L; cost = meshCost + clips + rockCost + geoCost + gabLabour; quoteEx = limeQuote * r.galvFactor * r.galfanFactor; }
  else if (type === "galvanised") { meshCost = galvSheets * r.sheetPrice; cost = meshCost + clips + rockCost + geoCost + gabLabour; quoteEx = limeQuote * r.galvFactor; }
  else { meshCost = 0; cost = limeBlockCost + limeLabour; quoteEx = limeQuote; } // limestone cost = blocks@cost + labour (not in sheet)
  var profit = quoteEx - cost, margin = quoteEx === 0 ? 0 : profit / quoteEx;
  return {
    input: { length: L, height: visibleHeight, type: type }, visibleHeight: visibleHeight, pricedHeight: pricedHeight, heightAdjusted: pricedHeight !== visibleHeight, layers: layers, faceArea: face,
    mesh: type === "galfan" ? { kind: "Galfan panels", perMetre: galfanPerM, panels1x05: galfanPanels1x05, baffles05x05: galfanBaffles, hooks: hooks, cost: meshCost }
        : type === "galvanised" ? { kind: "Galvanised sheets 2.4x4.5", areaM2: galvArea, sheets: galvSheets, cost: meshCost } : null,
    hooks: type === "galfan" ? hooks : 0,
    clips: type === "limestone" ? 0 : clips,
    rock: type === "limestone" ? null : { m3: rockM3, tonnes: rockT, loads: rockLoads, cost: rockCost },
    geotextile: type === "limestone" ? null : { rolls: geoRolls, cost: geoCost },
    labour: type === "limestone" ? { days: limeDays, cost: limeLabour } : { days: gabDays, cost: gabLabour },
    limestone: { blocksPerMetre: bpm, blocks: blocks, quote: limeQuote, blockCost: limeBlockCost, days: limeDays, labour: limeLabour },
    cost: cost, quoteEx: quoteEx, quoteInc: quoteEx * (1 + r.gst), profit: profit, margin: margin, belowMin: margin < r.minMargin
  };
}
if (typeof module !== "undefined" && module.exports) module.exports = { calcQuote: calcQuote, DEFAULT_RATES: DEFAULT_RATES };
