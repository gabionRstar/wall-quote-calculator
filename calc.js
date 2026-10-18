var CALC_VERSION = 6;
/* Gabion Fabrication – Wall Quote Calculator. All $ ex GST unless "Inc".
   Model (Josh, Oct 2026): limestone = blocks x $90. Contractor cost = materials + labour (day rate, rounded to 0.5 day).
   Josh income = mgmt fee (fee% x wall price, ADDED ON TOP as its own customer line) + 10% of contractor margin + flat site & project fee.
   Gabion wall price is solved so (10% of wall + 10% of contractor margin)/wall equals limestone's at the same height (fixed 10% basis, independent of the fee setting).
   Gabion wall price is solved so Josh's wall % equals limestone's at the same height & length. Gabion materials from the 2026 sheet. */
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
  sheetLength: 2.4, sheetWidth: 4.5, sheetPrice: 100,
  meshFront: 0.5, meshBack: 0.5, meshBase: 0.5, meshBaffle: 0.25, meshLid: 0.5, meshWaste: 0.10,
  clipsPerLayerPerM: 8,      // ESTIMATE
  rockLoadPrice: 1100, rockLoadTonnes: 12.5, rockDensity: 1.8, rockM3PerLayerPerM: 0.25, rockBuffer: 0.075,
  geoMetresPerRoll: 50, geoRollPrice: 0,
  dayRate: 1650, limestoneM2PerDay: 18, gabionM2PerDay: 9, dayRounding: 0.5, blockMaterial: 32, contractorShare: 0.10, siteFee: 2500, siteFeeEnabled: true,
  blockSell: 90, // limestone sell price per block, all-in (materials + labour)
  blocksPerMetre: limestoneTable(),   // from original limestone calculator (was sheet: 3.5/5/7/14.5/19/25)
  earthworksFee: 3000, earthworksMaxLength: 50, extraPct: 0.10, pmEnabled: true, earthworksEnabled: true, pmOptions: [0.05, 0.10, 0.15, 0.16, 0.20], gst: 0.10
};
function roundUp(x, d) { var f = Math.pow(10, d || 0); return Math.ceil(+(x * f).toFixed(9)) / f; }
function lookupBlocks(r, h) { var k = String(+h); var v = r.blocksPerMetre[k]; if (v === undefined) throw new Error("No blocks-per-metre entry for " + h + " m"); return v; }
/* DIY kit: exact port of go.gabionfabrication.com/calculator (GHL custom code, same as calculator-test a18225c calculator.js).
   Customer prices as the original shows them (inc GST, no GST added). Kit + delivered stone only: no labour, contractor, fees or earthworks.
   The original only offers 0.5/1/1.5/2/2.5/3 m; other heights are priced at the next 0.5 m step up. */
var DIY_PRICE = { kit05PerMetre: 94, kit10PerMetre: 170, stonePerM3: 116, stonePer500LiftPerMetre: 0.25, limestonePerBlock: 120, geotextileRollLength: 50 };
var DIY_HEIGHTS = {
  "0.5": { displayedLifts: 1, stoneLifts: 1, calculatorRate: DIY_PRICE.kit05PerMetre },
  "1": { displayedLifts: 1, stoneLifts: 2, calculatorRate: DIY_PRICE.kit10PerMetre },
  "1.5": { displayedLifts: 3, stoneLifts: 3, calculatorRate: DIY_PRICE.kit05PerMetre * 3 },
  "2": { displayedLifts: 4, stoneLifts: 4, calculatorRate: DIY_PRICE.kit05PerMetre * 4 },
  "2.5": { displayedLifts: 5, stoneLifts: 5, calculatorRate: DIY_PRICE.kit05PerMetre * 5 },
  "3": { displayedLifts: 6, stoneLifts: 6, calculatorRate: DIY_PRICE.kit05PerMetre * 6 }
};
var DIY_LIMESTONE = { "0.5": { min: 3, max: 4 }, "1": { min: 5, max: 5 }, "1.5": { min: 10, max: 11 }, "2": { min: 14, max: 15 }, "2.5": { min: 18, max: 20 }, "3": { min: 24, max: 26 } };
var DIY_PRODUCTS = { halfMetre: "https://gabionfabrication.com.au/products/galfan%C2%AE-welded-mesh-gabion-kit-0-5m-high-x-0-5m-wide-x-0-5m-long", oneMetre: "https://gabionfabrication.com.au/products/galfan%C2%AE-welded-mesh-gabion-kit-0-5m-wide-x-1m-high-x-2m-long" };
function diyMoney(v) { return "$" + Math.round(v).toLocaleString("en-AU"); }
function diyMoneyRange(a, b) { return Math.round(a) === Math.round(b) ? diyMoney(a) : diyMoney(a) + " – " + diyMoney(b); }
function calcDiy(length, height) {
  var visibleHeight = +height;
  if (!(visibleHeight >= 0.4 && visibleHeight <= 3.0)) throw new Error("Height must be 0.4–3.0 m");
  var hp = Math.min(3.0, roundUp(visibleHeight / 0.5) * 0.5), wallHeight = String(hp);
  var wallLength = Number(length) || 1;   // original: Number(input) || 1
  var gabion = DIY_HEIGHTS[wallHeight], limestone = DIY_LIMESTONE[wallHeight];
  var kitCost = wallLength * gabion.calculatorRate;
  var stoneVolume = wallLength * gabion.stoneLifts * DIY_PRICE.stonePer500LiftPerMetre;
  var stoneCost = stoneVolume * DIY_PRICE.stonePerM3;
  var gabionTotal = kitCost + stoneCost, gabionPerMetre = gabionTotal / wallLength;
  var geotextileRolls = Math.ceil(wallLength / DIY_PRICE.geotextileRollLength);
  var minimumBlocks = wallLength * limestone.min, maximumBlocks = wallLength * limestone.max;
  var minimumLimestoneCost = minimumBlocks * DIY_PRICE.limestonePerBlock, maximumLimestoneCost = maximumBlocks * DIY_PRICE.limestonePerBlock;
  var minimumSaving = Math.max(0, minimumLimestoneCost - gabionTotal), maximumSaving = Math.max(0, maximumLimestoneCost - gabionTotal);
  var minimumPercent = minimumLimestoneCost > 0 ? Math.round((minimumSaving / minimumLimestoneCost) * 100) : 0;
  var maximumPercent = maximumLimestoneCost > 0 ? Math.round((maximumSaving / maximumLimestoneCost) * 100) : 0;
  var buildType = wallHeight === "0.5" ? "1 × 0.5m high kit" : wallHeight === "1" ? "1 × 1.0m high kit" : gabion.displayedLifts + " × 500mm lifts";
  var cartKit = wallHeight === "0.5" ? "0.5m high × " + wallLength + "m" : wallHeight === "1" ? "1.0m high × " + wallLength + "m" : gabion.displayedLifts + " × 500mm lifts × " + wallLength + "m";
  return {
    diy: true, input: { length: wallLength, height: visibleHeight, type: "diy" }, visibleHeight: visibleHeight, pricedHeight: hp, heightAdjusted: hp !== visibleHeight, faceArea: wallLength * visibleHeight,
    lengthDisplay: wallLength + (wallLength === 1 ? " metre" : " metres"), buildType: buildType, lifts: gabion.displayedLifts, stoneLifts: gabion.stoneLifts, kitRatePerMetre: gabion.calculatorRate,
    kitCost: kitCost, stoneM3: stoneVolume, stoneLabel: "Stone (~" + stoneVolume.toFixed(2) + " m³)", stoneCost: stoneCost, perMetre: gabionPerMetre, totalInc: gabionTotal,
    geotextileRolls: geotextileRolls, geotextileLabel: geotextileRolls + (geotextileRolls === 1 ? " roll" : " rolls"), cartKit: cartKit, cartGeotextile: geotextileRolls + (geotextileRolls === 1 ? " × 50m roll" : " × 50m rolls"),
    productUrl: wallHeight === "1" ? DIY_PRODUCTS.oneMetre : DIY_PRODUCTS.halfMetre,
    limestone: { blocksMin: minimumBlocks, blocksMax: maximumBlocks, blocksLabel: minimumBlocks === maximumBlocks ? minimumBlocks + " blocks" : minimumBlocks + " – " + maximumBlocks + " blocks", costMin: minimumLimestoneCost, costMax: maximumLimestoneCost, totalLabel: diyMoneyRange(minimumLimestoneCost, maximumLimestoneCost) },
    saving: { min: minimumSaving, max: maximumSaving, label: diyMoneyRange(minimumSaving, maximumSaving), pctMin: minimumPercent, pctMax: maximumPercent, pctLabel: minimumPercent === maximumPercent ? minimumPercent + "%" : minimumPercent + "% – " + maximumPercent + "%" }
  };
}
/* type: "galfan" | "galvanised" | "limestone" | "diy" */
function calcQuote(length, height, type, rates) {
  if (type === "diy") return calcDiy(length, height);
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
  var days = function (area, perDay) { return roundUp(area / perDay / r.dayRounding) * r.dayRounding; };
  var gabDays = days(face, r.gabionM2PerDay), gabLabour = gabDays * r.dayRate;
  var isLime = type !== "galfan" && type !== "galvanised";
  var f = r.pmEnabled ? r.extraPct : 0, k = r.contractorShare;
  // Limestone at the exact entered height (original calc() blocks x $90). Always computed: it sets gabion's target %.
  var bpm = limestoneBpm(visibleHeight), blocks = roundUp(bpm * L), limeQuote = blocks * r.blockSell;
  var limeFace = L * visibleHeight, limeDays = days(limeFace, r.limestoneM2PerDay), limeLabour = limeDays * r.dayRate, limeMat = blocks * r.blockMaterial;
  var mb = 0.10, limeCost = limeMat + limeLabour, limeIncome = mb * limeQuote + k * (limeQuote - limeCost), targetPct = limeQuote ? limeIncome / limeQuote : 0;
  var meshCost, matCost, cost, quoteEx;
  if (isLime) { meshCost = 0; matCost = limeMat; cost = limeCost; quoteEx = limeQuote; }
  else {
    meshCost = type === "galfan" ? galfanPerM * L : galvSheets * r.sheetPrice;
    matCost = meshCost + clips + rockCost + geoCost; cost = matCost + gabLabour;
    // (mb*P + k*(P - C)) / P = target  =>  P = k*C / (mb + k - target)
    quoteEx = cost * (1 + (r.gabionMargin != null ? r.gabionMargin : 0.10)); // cost + 10% contractor margin
  }
  var earthTBC = L > r.earthworksMaxLength, earthEx = r.earthworksEnabled !== false && L > 0 && !earthTBC ? r.earthworksFee : 0;
  var siteEx = r.siteFeeEnabled !== false && L > 0 ? r.siteFee : 0;
  var pmEx = f * quoteEx, totalEx = quoteEx + pmEx + siteEx + earthEx, g1 = 1 + r.gst;
  var contractorMargin = quoteEx - cost, joshFee = pmEx, joshShare = k * contractorMargin, joshTotal = joshFee + joshShare + siteEx;
  return {
    input: { length: L, height: visibleHeight, type: type }, visibleHeight: visibleHeight, pricedHeight: isLime ? visibleHeight : pricedHeight, heightAdjusted: !isLime && pricedHeight !== visibleHeight, layers: layers, faceArea: face,
    mesh: type === "galfan" ? { kind: "Galfan panels", perMetre: galfanPerM, panels1x05: galfanPanels1x05, baffles05x05: galfanBaffles, hooks: hooks, cost: meshCost }
        : type === "galvanised" ? { kind: "Galvanised sheets 2.4x4.5", areaM2: galvArea, sheets: galvSheets, cost: meshCost } : null,
    hooks: type === "galfan" ? hooks : 0,
    clips: type === "limestone" ? 0 : clips,
    rock: type === "limestone" ? null : { m3: rockM3, tonnes: rockT, loads: rockLoads, cost: rockCost },
    geotextile: type === "limestone" ? null : { rolls: geoRolls, cost: geoCost },
    labour: { days: isLime ? limeDays : gabDays, cost: isLime ? limeLabour : gabLabour, m2PerDay: isLime ? r.limestoneM2PerDay : r.gabionM2PerDay },
    limestone: { blocksPerMetre: bpm, blocks: blocks, quote: limeQuote, cost: limeCost, joshPct: targetPct },
    materialsCost: matCost, contractorCost: cost, contractorMargin: contractorMargin, quoteEx: quoteEx, quoteInc: quoteEx * g1,
    siteFeeEnabled: r.siteFeeEnabled !== false, siteFeeEx: siteEx, siteFeeInc: siteEx * g1,
    earthworksEnabled: r.earthworksEnabled !== false, earthworksTBC: earthTBC, earthworksEx: earthEx, earthworksInc: earthEx * g1,
    pm: { enabled: !!r.pmEnabled, pct: f, ex: pmEx, inc: pmEx * g1 }, totalEx: totalEx, totalInc: totalEx * g1, gstAmount: totalEx * r.gst,
    josh: { fee: joshFee, share: joshShare, siteFee: siteEx, total: joshTotal, pct: totalEx ? joshTotal / totalEx : 0, wallOnly: joshFee + joshShare, wallOnlyPct: quoteEx ? (joshFee + joshShare) / quoteEx : 0, targetPct: targetPct, matchPct: quoteEx ? (mb * quoteEx + joshShare) / quoteEx : 0 }
  };
}
if (typeof module !== "undefined" && module.exports) module.exports = { calcQuote: calcQuote, calcDiy: calcDiy, DIY_PRICE: DIY_PRICE, limestoneBpm: limestoneBpm, DEFAULT_RATES: DEFAULT_RATES };
