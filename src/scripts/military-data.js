/* WORLD OF EMPIRES — military data (abstract, conventional forces only). Costs are $B at the scale of a ~$72B economy; they scale with your GDP. */
(() => {
"use strict";
const D = window.WOE_DATA;
/* men = thousands of personnel; up = monthly upkeep as a share of cost; one missile "unit" is a salvo of 10 missiles */
const units = {
  infantry:  { cat: "land", cost: .18, months: 2, tech: null,          att: 1.0, def: 1.1, men: 10,  up: .010 },
  armor:     { cat: "land", cost: .45, months: 3, tech: "armor",       att: 2.4, def: 1.7, men: 4,   up: .012 },
  artillery: { cat: "land", cost: .35, months: 3, tech: "artillery",   att: 1.9, def: .9,  men: 2,   up: .012 },
  fighter:   { cat: "air",  cost: .70, months: 4, tech: "aviation",    air: 1.0,           men: 1.2, up: .014 },
  bomber:    { cat: "air",  cost: 1.0, months: 5, tech: "jets",        strike: 1.4, air: .2, men: 1.2, up: .014 },
  drone:     { cat: "air",  cost: .25, months: 2, tech: "drones",      strike: .5, air: .15, men: .2,  up: .010 },
  corvette:  { cat: "sea",  cost: .25, months: 3, tech: "shipbuilding",naval: 1.0,          men: .3,  up: .012 },
  destroyer: { cat: "sea",  cost: .60, months: 5, tech: "bluewater",   naval: 2.4,          men: .35, up: .012 },
  transport: { cat: "sea",  cost: .50, months: 4, tech: "amphibious",  naval: .4, carry: 2, men: .3,  up: .010 },
  submarine: { cat: "sea",  cost: .80, months: 6, tech: "submarines",  naval: 3.0,          men: .15, up: .013 },
  carrier:   { cat: "sea",  cost: 2.5, months: 10,tech: "carriers",    naval: 4.0, reach: 1500, men: .5, up: .015 },
  sam:       { cat: "def",  cost: .30, months: 3, tech: "airdefense",  ad: 4,              men: .15, up: .010 },
  shield:    { cat: "def",  cost: .80, months: 6, tech: "missileshield", ad: 6,            men: .2,  up: .012 }
};
const missiles = {
  srbm:   { tech: "rocketry",   cost: .03, months: 2, range: 700,  dmg: 1.0, acc: .70, ic: .60 },
  cruise: { tech: "cruise",     cost: .05, months: 3, range: 1500, dmg: .8,  acc: .85, ic: .85 },
  mrbm:   { tech: "longrange",  cost: .09, months: 4, range: 4000, dmg: 1.6, acc: .75, ic: .50 },
  hyper:  { tech: "hypersonic", cost: .16, months: 5, range: 8000, dmg: 1.4, acc: .90, ic: .15 }
};
/* req = military prerequisites, civil = a civilian technology (Research panel) that must also be completed */
const techs = {
  armor:        { cost: 6,  months: 6,  req: [], grp: "land" },
  artillery:    { cost: 6,  months: 6,  req: [], grp: "land" },
  fortify:      { cost: 6,  months: 6,  req: [], grp: "defense" },
  aviation:     { cost: 8,  months: 8,  req: [], grp: "air" },
  jets:         { cost: 10, months: 9,  req: ["aviation"], grp: "air" },
  drones:       { cost: 9,  months: 8,  req: ["aviation"], civil: "ai", grp: "air" },
  stealth:      { cost: 14, months: 12, req: ["jets"], civil: "materials", grp: "air" },
  shipbuilding: { cost: 6,  months: 6,  req: [], grp: "sea" },
  bluewater:    { cost: 9,  months: 9,  req: ["shipbuilding"], grp: "sea" },
  amphibious:   { cost: 8,  months: 8,  req: ["shipbuilding"], grp: "sea" },
  submarines:   { cost: 11, months: 10, req: ["bluewater"], grp: "sea" },
  carriers:     { cost: 16, months: 14, req: ["bluewater", "jets"], grp: "sea" },
  rocketry:     { cost: 7,  months: 7,  req: [], grp: "missile" },
  cruise:       { cost: 9,  months: 8,  req: ["rocketry"], grp: "missile" },
  longrange:    { cost: 12, months: 10, req: ["cruise"], grp: "missile" },
  hypersonic:   { cost: 18, months: 14, req: ["longrange"], civil: "materials", grp: "missile" },
  airdefense:   { cost: 8,  months: 8,  req: ["rocketry"], grp: "defense" },
  missileshield:{ cost: 14, months: 12, req: ["airdefense"], civil: "ai", grp: "defense" }
};
/* strike targets and how hard they are (higher = harder to damage) */
const targets = { bases: 1.2, airfields: 1.0, sam: 1.1, power: .9, industry: 1.0, ports: .9, command: 1.5 };
/* defence spending as a share of GDP (approximate); default 1.6% */
const defShare = { USA: .034, RUS: .055, CHN: .017, IND: .024, SAU: .07, IRN: .03, PAK: .04, KOR: .027, TUR: .025, UKR: .12, POL: .04, GBR: .023, FRA: .021, DEU: .015, ITA: .016, ESP: .013, JPN: .012, AUS: .019, CAN: .013, BRA: .011, MEX: .006, ARG: .007, EGY: .02, DZA: .06, MAR: .045, IRQ: .03, TWN: .025, NOR: .02, SWE: .022, FIN: .023, VNM: .02, THA: .012, IDN: .008, ETH: .007, NGA: .008, ZAF: .01, COL: .034, VEN: .01, CHL: .019, PER: .012, BOL: .015, KAZ: .012, MNG: .01, LBY: .03, COD: .01, NZL: .014 };
/* defender terrain bonus */
const terrain = { IRN: 1.25, TUR: 1.15, ITA: 1.1, ESP: 1.1, ETH: 1.2, PAK: 1.15, IND: 1.1, VNM: 1.2, KOR: 1.2, JPN: 1.25, NOR: 1.2, SWE: 1.1, FIN: 1.2, CHL: 1.2, PER: 1.2, BOL: 1.2, MNG: 1.05, CHN: 1.1, COL: 1.15, VEN: 1.1, UKR: 1.0 };
/* true land borders between the playable nations (used for ground invasions and transit) */
const borders = "USA-CAN USA-MEX BRA-ARG BRA-VEN BRA-COL BRA-PER BRA-BOL ARG-CHL ARG-BOL CHL-PER CHL-BOL PER-COL PER-BOL COL-VEN FRA-DEU FRA-ESP FRA-ITA DEU-POL POL-UKR POL-RUS UKR-RUS RUS-KAZ RUS-CHN RUS-MNG RUS-FIN RUS-NOR SWE-NOR SWE-FIN NOR-FIN TUR-IRN TUR-IRQ IRN-IRQ IRN-PAK IRQ-SAU EGY-LBY LBY-DZA DZA-MAR KAZ-CHN CHN-MNG CHN-IND CHN-PAK CHN-VNM IND-PAK".split(" ").map(s => s.split("-"));
const landlocked = ["KAZ", "MNG", "BOL", "ETH"];
/* military techs a nation already has at start, by technology level */
const startTechs = [[0, ["armor", "artillery", "shipbuilding"]], [45, ["aviation", "rocketry"]], [58, ["jets", "bluewater", "amphibious", "cruise", "airdefense", "fortify"]], [72, ["drones", "submarines", "longrange"]], [84, ["stealth", "carriers", "hypersonic", "missileshield"]]];
D.MIL = { units, missiles, techs, targets, defShare, terrain, borders, landlocked, startTechs };
})();
