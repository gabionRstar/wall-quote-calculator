/* Gabion Fabrication – Wall Quote Calculator. Formulas copied 1:1 from the Google Sheet
   "Gabion Wall Quote Calculator (2026)" (Calculator / Rates / Height table tabs). All $ ex GST unless "Inc". */
/* Limestone blocks/m: exact port of calc() from gabionRstar/limestone-calculator (limestone.js, Structerre H23R taper + SMALL table). */
var LIME_C = { BLOCK_L: 1000, BLOCK_W: 350, BLOCK_H: 350, MORTAR: 20, MIN_BASE: 650, EMBED_LOW: 200, EMBED_HIGH: 300, EMBED_SWITCH: 1000 };
var LIME_SMALL = { 400: [1, 1], 500: [1, 1], 600: [2, 2, 1], 700: [2, 2, 1], 800: [2, 2, 1] };
function limestoneBpm(heightM) {
  var C = LIME_C, H = Math.round(heightM * 1000), sm = LIME_SMALL[Math.round(H / 100) * 100];
  if (H < 900 && sm) return sm.reduce(function (a, b) { return a + b; }, 0);
  var embed = H <= C.EMBED_SWITCH ? C.EMBED_LOW : C.EMBED_HIGH;
  var base = H / 2 + 200; if (H <= C.EMBED_SWITCH) base = Math.max(base, C.MIN_BASE);
  var total = H + embed, ch = C.BLOCK_H + C.MORTAR, pw = C.BLOCK_W + C.MORTAR, courses = Math.ceil(total / ch), sum = 0;
  for (var i = 0; i < courses; i++) { var f = courses > 1 ? i / (courses - 1) : 0; sum += Math.max(1, Math.ceil((base - (base - C.BLOCK_W) * f + C.MORTAR) / pw)); }
  return Math.ceil(sum / ((C.BLOCK_L + C.MORTAR) / 1000) - 1e-9);
}
function limestoneTable() { var t = {}; [0.5, 1, 1.5, 2, 2.5, 3].forEach(function (h) { t[String(h)] = limestoneBpm(h); }); return t; }
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
  blocksPerMetre: limestoneTable(),   // from original limestone calculator (was sheet: 3.5/5/7/14.5/19/25)
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
if (typeof module !== "undefined" && module.exports) module.exports = { calcQuote: calcQuote, limestoneBpm: limestoneBpm, DEFAULT_RATES: DEFAULT_RATES };
