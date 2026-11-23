/* WORLD OF EMPIRES — static game data (approximate 2025 figures, simplified for gameplay) */
(() => {
"use strict";
const C = (en, fa, pop, gdp, g, tech, stab, dev, bloc, gov, cap) => ({ en, fa, pop, gdp, g, tech, stab, dev, bloc, gov, cap });
/* pop in millions, gdp in $B, g = growth %/yr, tech/stab/dev = 0-100 indices, cap = [lon,lat] of capital */
const countries = {
USA: C("United States", "ایالات متحده", 340, 30300, 2.0, 92, 68, 90, "west", "fedrep", [-77.0, 38.9]),
CAN: C("Canada", "کانادا", 41.5, 2300, 1.8, 85, 85, 90, "west", "fedparl", [-75.7, 45.4]),
MEX: C("Mexico", "مکزیک", 129, 1850, 1.5, 55, 55, 65, "neutral", "fedrep", [-99.1, 19.4]),
BRA: C("Brazil", "برزیل", 213, 2300, 2.0, 58, 60, 68, "neutral", "fedrep", [-47.9, -15.8]),
ARG: C("Argentina", "آرژانتین", 46, 640, 2.0, 52, 50, 74, "neutral", "fedrep", [-58.4, -34.6]),
CHL: C("Chile", "شیلی", 19.6, 340, 2.2, 62, 75, 80, "neutral", "republic", [-70.7, -33.4]),
PER: C("Peru", "پرو", 34, 280, 2.8, 45, 52, 62, "neutral", "republic", [-77.0, -12.0]),
COL: C("Colombia", "کلمبیا", 52, 420, 2.5, 48, 55, 65, "neutral", "republic", [-74.1, 4.7]),
VEN: C("Venezuela", "ونزوئلا", 28, 100, 3.0, 40, 40, 58, "neutral", "fedrep", [-66.9, 10.5]),
BOL: C("Bolivia", "بولیوی", 12.4, 55, 2.0, 38, 52, 58, "neutral", "republic", [-68.1, -16.5]),
GBR: C("United Kingdom", "بریتانیا", 69, 3700, 1.2, 86, 78, 88, "west", "constmon", [-0.1, 51.5]),
FRA: C("France", "فرانسه", 68.5, 3200, 1.0, 82, 74, 88, "west", "republic", [2.35, 48.85]),
DEU: C("Germany", "آلمان", 84, 4700, 0.5, 88, 80, 90, "west", "fedparl", [13.4, 52.5]),
ITA: C("Italy", "ایتالیا", 59, 2400, 0.7, 75, 72, 84, "west", "parlrep", [12.5, 41.9]),
ESP: C("Spain", "اسپانیا", 48.5, 1700, 2.0, 74, 76, 84, "west", "constmon", [-3.7, 40.4]),
POL: C("Poland", "لهستان", 36.6, 900, 3.0, 68, 74, 80, "west", "republic", [21.0, 52.2]),
UKR: C("Ukraine", "اوکراین", 33, 190, 2.0, 55, 45, 70, "west", "republic", [30.5, 50.45]),
SWE: C("Sweden", "سوئد", 10.6, 600, 1.8, 87, 88, 90, "west", "constmon", [18.1, 59.3]),
NOR: C("Norway", "نروژ", 5.6, 500, 1.5, 85, 90, 92, "west", "constmon", [10.75, 59.9]),
FIN: C("Finland", "فنلاند", 5.6, 300, 1.2, 85, 90, 90, "west", "republic", [24.9, 60.2]),
TUR: C("Turkey", "ترکیه", 87, 1350, 3.0, 62, 52, 72, "neutral", "republic", [32.85, 39.9]),
RUS: C("Russia", "روسیه", 144, 2200, 1.3, 68, 60, 76, "east", "fedrep", [37.6, 55.75]),
KAZ: C("Kazakhstan", "قزاقستان", 20, 300, 4.5, 45, 62, 68, "neutral", "republic", [71.4, 51.2]),
IRN: C("Iran", "ایران", 90, 480, 1.5, 52, 45, 68, "east", "theocracy", [51.4, 35.7]),
IRQ: C("Iraq", "عراق", 46, 270, 3.0, 35, 42, 56, "neutral", "fedparl", [44.4, 33.3]),
SAU: C("Saudi Arabia", "عربستان سعودی", 35, 1150, 3.5, 58, 70, 75, "neutral", "absmon", [46.7, 24.7]),
EGY: C("Egypt", "مصر", 112, 380, 4.0, 40, 55, 58, "neutral", "republic", [31.2, 30.0]),
LBY: C("Libya", "لیبی", 7.4, 55, 5.0, 28, 28, 52, "neutral", "transitional", [13.2, 32.9]),
DZA: C("Algeria", "الجزایر", 46, 270, 3.5, 36, 58, 60, "neutral", "republic", [3.06, 36.75]),
MAR: C("Morocco", "مراکش", 38, 160, 3.5, 40, 66, 58, "neutral", "constmon", [-6.85, 34.0]),
NGA: C("Nigeria", "نیجریه", 228, 250, 3.2, 28, 40, 38, "neutral", "fedrep", [7.5, 9.07]),
ETH: C("Ethiopia", "اتیوپی", 130, 160, 6.0, 22, 38, 32, "neutral", "fedparl", [38.75, 9.0]),
COD: C("DR Congo", "جمهوری دموکراتیک کنگو", 109, 70, 5.0, 15, 30, 28, "neutral", "republic", [15.3, -4.3]),
ZAF: C("South Africa", "آفریقای جنوبی", 64, 400, 1.5, 45, 56, 56, "neutral", "parlrep", [28.2, -25.7]),
IND: C("India", "هند", 1450, 4100, 6.5, 62, 62, 52, "neutral", "fedparl", [77.2, 28.6]),
PAK: C("Pakistan", "پاکستان", 247, 370, 3.0, 32, 38, 40, "neutral", "fedparl", [73.05, 33.7]),
CHN: C("China", "چین", 1410, 19200, 4.5, 80, 74, 70, "east", "oneparty", [116.4, 39.9]),
MNG: C("Mongolia", "مغولستان", 3.5, 22, 5.0, 38, 62, 62, "neutral", "republic", [106.9, 47.9]),
JPN: C("Japan", "ژاپن", 123, 4300, 0.6, 90, 85, 92, "west", "constmon", [139.7, 35.7]),
KOR: C("South Korea", "کره جنوبی", 51.7, 1900, 2.0, 88, 76, 90, "west", "republic", [127.0, 37.55]),
TWN: C("Taiwan", "تایوان", 23.4, 800, 3.0, 88, 70, 88, "west", "republic", [121.5, 25.05]),
IDN: C("Indonesia", "اندونزی", 281, 1400, 5.0, 48, 62, 60, "neutral", "republic", [106.8, -6.2]),
VNM: C("Vietnam", "ویتنام", 100, 470, 6.0, 52, 72, 62, "neutral", "oneparty", [105.85, 21.0]),
THA: C("Thailand", "تایلند", 71, 530, 2.5, 55, 55, 66, "neutral", "constmon", [100.5, 13.75]),
AUS: C("Australia", "استرالیا", 27, 1800, 2.0, 82, 84, 90, "west", "fedparl", [149.1, -35.3]),
NZL: C("New Zealand", "نیوزیلند", 5.3, 260, 2.0, 80, 88, 90, "west", "constmon", [174.8, -41.3])
};
/* Rest of world: simulated as a single aggregated trading partner (not on the map) */
const ROW = { id: "ROW", en: "Rest of the world", fa: "سایر جهان", pop: 8200, gdp: 112000, g: 3.4, tech: 50, stab: 55, dev: 50, bloc: "neutral" };

/* Market ------------------------------------------------------------------ */
/* base: price, vol: world volume per month (millions of units), vm: value multiplier ($M = vol*price*vm), gauge: which national gauge it feeds */
const commodities = {
oil:    { base: 75,    vol: 3000,  vm: 1,    gauge: "energy",       cons: "mix",    el: 0.9, icon: "◐", color: "#e0a458" },
gas:    { base: 8,     vol: 12000, vm: 1,    gauge: "energy",       cons: "mix",    el: 0.8, icon: "◌", color: "#7ec8e3" },
coal:   { base: 130,   vol: 725,   vm: 1,    gauge: "energy",       cons: "heavy",  el: 0.7, icon: "▲", color: "#8a8f98" },
grain:  { base: 250,   vol: 233,   vm: 1,    gauge: "food",         cons: "pop",    el: 0.5, icon: "✿", color: "#d9c16a" },
steel:  { base: 700,   vol: 158,   vm: 1,    gauge: "rawMaterials", cons: "heavy",  el: 0.8, icon: "▥", color: "#9fb4c7" },
copper: { base: 9500,  vol: 1.8,   vm: 1,    gauge: "rawMaterials", cons: "heavy",  el: 0.8, icon: "◉", color: "#d98b5f" },
lithium:{ base: 14000, vol: 17,    vm: 1e-3, gauge: "rawMaterials", cons: "tech",   el: 1.0, icon: "◆", color: "#b7a6ff" },
rare:   { base: 60000, vol: 29,    vm: 1e-3, gauge: "rawMaterials", cons: "tech",   el: 1.0, icon: "✦", color: "#e07fb0" },
chips:  { base: 100,   vol: 500,   vm: 1,    gauge: "technology",   cons: "tech",   el: 0.9, icon: "▦", color: "#6fd3a5" }
};
const parse = s => Object.fromEntries(s.split(",").map(x => x.trim().split(":")).map(([k, v]) => [k, Number(v)]));
/* production shares (% of world output) */
const prod = {
oil: parse("USA:21,RUS:12,SAU:12,CAN:6,IRQ:4.5,CHN:4.3,IRN:4.3,BRA:3.7,KAZ:2,NOR:2.1,MEX:1.6,NGA:1.5,DZA:1.3,LBY:1,VEN:1,COL:.9,ARG:.8,IND:.8,GBR:.5,IDN:.6,EGY:.6"),
gas: parse("USA:25,RUS:14,IRN:6.5,CHN:5.5,CAN:4.5,NOR:3.5,SAU:3,AUS:3.3,DZA:2,IDN:1.5,EGY:1.5,ARG:.9,MEX:.8,KAZ:.8,NGA:.8,IND:.8,GBR:.5,TUR:.1"),
coal: parse("CHN:52,IND:11,IDN:8.5,USA:6,AUS:6,RUS:5,ZAF:3,KAZ:1.3,POL:1.2,COL:1,DEU:1,TUR:.8,MNG:.8,CAN:.4"),
grain: parse("CHN:19,USA:14,IND:11,BRA:6,RUS:4,IDN:3.5,ARG:2.5,UKR:2.5,FRA:2,CAN:1.8,PAK:1.8,MEX:1.8,VNM:1.8,NGA:1.5,THA:1.3,AUS:1.2,TUR:1.2,DEU:1,POL:1,ETH:1,EGY:.9,ESP:.7,KAZ:.6,ITA:.6,JPN:.6,ZAF:.6,GBR:.5"),
steel: parse("CHN:54,IND:7.5,JPN:4.2,USA:4,RUS:3.6,KOR:3.5,TUR:2.2,DEU:2,IRN:1.8,BRA:1.6,VNM:1.5,IDN:1.2,MEX:1.1,ITA:1,ESP:.8,CAN:.8,FRA:.7,UKR:.6,POL:.5,EGY:.5,SAU:.5,GBR:.4,ZAF:.3,ARG:.3,TWN:1.2"),
copper: parse("CHL:23,COD:13,PER:11,CHN:8,USA:5,RUS:4,AUS:4,KAZ:3.5,MEX:3,IDN:3,CAN:2.5,POL:1.5,BRA:1.3,ARG:.5,IRN:.8,BOL:.2"),
lithium: parse("AUS:37,CHL:22,CHN:19,ARG:6.5,BRA:2.5,CAN:1.5,USA:1,BOL:.5"),
rare: parse("CHN:69,USA:12,AUS:4,IND:1,RUS:1,VNM:1,BRA:.5"),
chips: parse("TWN:22,KOR:18,CHN:14,USA:12,JPN:9,DEU:3,IND:1,GBR:1,FRA:1,ISR:0")
};
delete prod.chips.ISR;

/* cities: [country, en, fa, lon, lat, rank(1 = capital/megacity, 2 = major, 3 = minor)] */
const city = (c, en, fa, x, y, r) => ({ c, en, fa, x, y, r });
const cities = [
city("USA","Washington, D.C.","واشنگتن",-77.0,38.9,1),city("USA","New York","نیویورک",-74.0,40.7,1),city("USA","Los Angeles","لس‌آنجلس",-118.2,34.05,2),city("USA","Houston","هیوستون",-95.4,29.8,2),city("USA","Chicago","شیکاگو",-87.6,41.9,3),
city("CAN","Ottawa","اتاوا",-75.7,45.4,1),city("CAN","Vancouver","ونکوور",-123.1,49.3,3),city("CAN","Calgary","کلگری",-114.1,51.0,3),
city("MEX","Mexico City","مکزیکوسیتی",-99.1,19.4,1),city("BRA","Brasília","برازیلیا",-47.9,-15.8,1),city("BRA","São Paulo","سائوپائولو",-46.6,-23.5,2),city("BRA","Rio de Janeiro","ریو دو ژانیرو",-43.2,-22.9,3),
city("ARG","Buenos Aires","بوینس‌آیرس",-58.4,-34.6,1),city("CHL","Santiago","سانتیاگو",-70.7,-33.4,1),city("PER","Lima","لیما",-77.0,-12.0,1),city("COL","Bogotá","بوگوتا",-74.1,4.7,1),city("VEN","Caracas","کاراکاس",-66.9,10.5,1),city("BOL","La Paz","لاپاز",-68.1,-16.5,1),
city("GBR","London","لندن",-0.1,51.5,1),city("FRA","Paris","پاریس",2.35,48.85,1),city("DEU","Berlin","برلین",13.4,52.5,1),city("DEU","Hamburg","هامبورگ",10.0,53.55,3),city("ITA","Rome","رم",12.5,41.9,1),city("ESP","Madrid","مادرید",-3.7,40.4,1),city("POL","Warsaw","ورشو",21.0,52.2,1),city("UKR","Kyiv","کیف",30.5,50.45,1),
city("SWE","Stockholm","استکهلم",18.1,59.3,1),city("NOR","Oslo","اسلو",10.75,59.9,1),city("FIN","Helsinki","هلسینکی",24.9,60.2,1),city("TUR","Ankara","آنکارا",32.85,39.9,1),city("TUR","Istanbul","استانبول",29.0,41.0,2),
city("RUS","Moscow","مسکو",37.6,55.75,1),city("RUS","Saint Petersburg","سن‌پترزبورگ",30.3,59.9,3),city("RUS","Novosibirsk","نووسیبیرسک",82.9,55.0,3),city("RUS","Vladivostok","ولادی‌وستوک",131.9,43.1,3),
city("KAZ","Astana","آستانه",71.4,51.2,1),city("IRN","Tehran","تهران",51.4,35.7,1),city("IRQ","Baghdad","بغداد",44.4,33.3,1),city("SAU","Riyadh","ریاض",46.7,24.7,1),
city("EGY","Cairo","قاهره",31.2,30.0,1),city("LBY","Tripoli","طرابلس",13.2,32.9,1),city("DZA","Algiers","الجزایر",3.06,36.75,1),city("MAR","Rabat","رباط",-6.85,34.0,1),
city("NGA","Abuja","ابوجا",7.5,9.07,1),city("NGA","Lagos","لاگوس",3.4,6.5,2),city("ETH","Addis Ababa","آدیس‌آبابا",38.75,9.0,1),city("COD","Kinshasa","کینشاسا",15.3,-4.3,1),city("ZAF","Pretoria","پرتوریا",28.2,-25.7,1),city("ZAF","Cape Town","کیپ‌تاون",18.4,-33.9,3),
city("IND","New Delhi","دهلی نو",77.2,28.6,1),city("IND","Mumbai","بمبئی",72.9,19.1,2),city("PAK","Islamabad","اسلام‌آباد",73.05,33.7,1),city("CHN","Beijing","پکن",116.4,39.9,1),city("CHN","Shanghai","شانگهای",121.5,31.2,2),city("CHN","Shenzhen","شنژن",114.1,22.55,3),
city("MNG","Ulaanbaatar","اولان‌باتور",106.9,47.9,1),city("JPN","Tokyo","توکیو",139.7,35.7,1),city("KOR","Seoul","سئول",127.0,37.55,1),city("TWN","Taipei","تایپه",121.5,25.05,1),
city("IDN","Jakarta","جاکارتا",106.8,-6.2,1),city("VNM","Hanoi","هانوی",105.85,21.0,1),city("THA","Bangkok","بانکوک",100.5,13.75,1),city("AUS","Canberra","کانبرا",149.1,-35.3,1),city("AUS","Sydney","سیدنی",151.2,-33.9,2),city("NZL","Wellington","ولینگتون",174.8,-41.3,1)
];
/* trade hubs/chokepoints that matter for the market */
const chokepoints = [
 { id: "hormuz", en: "Strait of Hormuz", fa: "تنگهٔ هرمز", x: 56.5, y: 26.4 }, { id: "suez", en: "Suez Canal", fa: "کانال سوئز", x: 32.5, y: 30.4 },
 { id: "panama", en: "Panama Canal", fa: "کانال پاناما", x: -79.7, y: 9.1 }, { id: "malacca", en: "Strait of Malacca", fa: "تنگهٔ مالاکا", x: 101.2, y: 2.6 },
 { id: "bosporus", en: "Bosporus", fa: "تنگهٔ بسفر", x: 29.05, y: 41.1 }, { id: "babelmandeb", en: "Bab-el-Mandeb", fa: "باب‌المندب", x: 43.4, y: 12.6 },
 { id: "gibraltar", en: "Strait of Gibraltar", fa: "تنگهٔ جبل‌الطارق", x: -5.6, y: 36.0 }
];
const seas = [
 { en: "Pacific Ocean", fa: "اقیانوس آرام", x: -150, y: 5, s: 3 }, { en: "Pacific Ocean", fa: "اقیانوس آرام", x: 165, y: -10, s: 3 },
 { en: "Atlantic Ocean", fa: "اقیانوس اطلس", x: -38, y: 28, s: 3 }, { en: "Atlantic Ocean", fa: "اقیانوس اطلس", x: -15, y: -25, s: 3 },
 { en: "Indian Ocean", fa: "اقیانوس هند", x: 78, y: -20, s: 3 }, { en: "Arctic Ocean", fa: "اقیانوس منجمد شمالی", x: -40, y: 85, s: 2 },
 { en: "Southern Ocean", fa: "اقیانوس منجمد جنوبی", x: 40, y: -60, s: 3 },
 { en: "Mediterranean Sea", fa: "دریای مدیترانه", x: 17, y: 34.5, s: 2 }, { en: "Caribbean Sea", fa: "دریای کارائیب", x: -75, y: 15, s: 2 },
 { en: "Gulf of Mexico", fa: "خلیج مکزیک", x: -90, y: 25, s: 2 }, { en: "Red Sea", fa: "دریای سرخ", x: 38, y: 20, s: 2 },
 { en: "Persian Gulf", fa: "خلیج فارس", x: 51.5, y: 27.4, s: 2 }, { en: "Black Sea", fa: "دریای سیاه", x: 34.5, y: 43.3, s: 2 },
 { en: "Caspian Sea", fa: "دریای خزر", x: 51, y: 41, s: 2 }, { en: "North Sea", fa: "دریای شمال", x: 3, y: 56, s: 2 },
 { en: "Baltic Sea", fa: "دریای بالتیک", x: 19, y: 57.5, s: 2 }, { en: "South China Sea", fa: "دریای چین جنوبی", x: 114, y: 13, s: 2 },
 { en: "Sea of Japan", fa: "دریای ژاپن", x: 134, y: 40, s: 2 }, { en: "Bay of Bengal", fa: "خلیج بنگال", x: 88, y: 14, s: 2 },
 { en: "Arabian Sea", fa: "دریای عرب", x: 66, y: 15, s: 2 }, { en: "Hudson Bay", fa: "خلیج هادسون", x: -85, y: 60, s: 2 }
];

/* Government names */
const gov = {
 fedrep: { en: "Federal Republic", fa: "جمهوری فدرال" }, republic: { en: "Republic", fa: "جمهوری" }, constmon: { en: "Constitutional Monarchy", fa: "پادشاهی مشروطه" },
 parlrep: { en: "Parliamentary Republic", fa: "جمهوری پارلمانی" }, fedparl: { en: "Federal Parliamentary State", fa: "دولت فدرال پارلمانی" },
 absmon: { en: "Absolute Monarchy", fa: "پادشاهی مطلقه" }, theocracy: { en: "Islamic Republic", fa: "جمهوری اسلامی" }, oneparty: { en: "One-party State", fa: "دولت تک‌حزبی" },
 transitional: { en: "Transitional Government", fa: "دولت انتقالی" }, technocratic: { en: "Technocratic Republic", fa: "جمهوری فن‌سالار" }
};
const blocs = {
 west: { en: "Western bloc", fa: "بلوک غرب", color: "#4f8cff" }, east: { en: "Eastern bloc", fa: "بلوک شرق", color: "#e2584d" }, neutral: { en: "Non-aligned", fa: "غیرمتعهد", color: "#53c28b" }
};

/* Buildings ----------------------------------------------------------------- */
/* cost in $B at the scale of a ~$72B economy (scaled up for bigger nations); effect keys are read by the engine */
const buildings = {
 power:    { cost: 1.2,  materials: 5, months: 3, effect: "energy",         icon: "ϟ", color: "#f2c14e" },
 school:   { cost: .6,   materials: 2, months: 2, effect: "education",      icon: "⌂", color: "#7ec8e3" },
 hospital: { cost: .8,   materials: 3, months: 2, effect: "health",         icon: "✚", color: "#f07178" },
 factory:  { cost: 1,    materials: 4, months: 3, effect: "industry",       icon: "▥", color: "#9fb4c7" },
 road:     { cost: .9,   materials: 4, months: 3, effect: "infrastructure", icon: "⌁", color: "#c3a6ff" },
 water:    { cost: .7,   materials: 3, months: 2, effect: "water",          icon: "◉", color: "#4fc3f7" },
 internet: { cost: .85,  materials: 3, months: 2, effect: "internet",       icon: "⌘", color: "#6fd3a5" },
 oilfield: { cost: 1.4,  materials: 5, months: 4, effect: "extraction",     icon: "◐", color: "#e0a458" },
 mine:     { cost: 1.3,  materials: 5, months: 4, effect: "mining",         icon: "◆", color: "#d98b5f" },
 agri:     { cost: .8,   materials: 3, months: 3, effect: "agri",           icon: "✿", color: "#d9c16a" },
 port:     { cost: 1.1,  materials: 4, months: 3, effect: "port",           icon: "⚓", color: "#5fb0e8" }
};
const techs = {
 renewables: { cost: 8,  months: 8,  bonus: "energy" }, ai: { cost: 12, months: 10, bonus: "technology" }, medicine: { cost: 7, months: 7, bonus: "health" },
 automation: { cost: 10, months: 9,  bonus: "industry" }, water: { cost: 6, months: 6, bonus: "water" }, materials: { cost: 9, months: 8, bonus: "materials" }
};

/* Scenarios ----------------------------------------------------------------- */
/* objectives: type = gdp (reach $B), inflation (keep below % for N months), stability (stay above), surplus (trade balance > $B/month), research (count), buildings (count), approval */
const scenarios = {
modern: { year: 2026, month: 1, tariff: 5, name: { en: "Modern World 2026", fa: "جهان امروز ۲۰۲۶" },
  desc: { en: "The world as it is: balanced markets, moderate tensions. The standard sandbox.", fa: "جهان آن‌گونه که هست: بازارهای متعادل و تنش‌های متوسط. حالت استاندارد بازی." },
  priceMult: {}, shocks: [], objectives: [{ id: "g1", type: "gdp", mult: 1.25, years: 5 }, { id: "i1", type: "inflation", value: 6, months: 24 }, { id: "b1", type: "buildings", value: 10 }] },
energy: { year: 2026, month: 1, tariff: 6, name: { en: "Energy Crisis", fa: "بحران انرژی" },
  desc: { en: "Supply cuts have pushed oil and gas prices sky-high. Importers suffer, exporters boom.", fa: "کاهش عرضه قیمت نفت و گاز را بالا برده است. واردکننده‌ها آسیب می‌بینند و صادرکننده‌ها رونق می‌گیرند." },
  priceMult: { oil: 1.7, gas: 2.4, coal: 1.5 }, shocks: [{ c: "oil", kind: "supply", mult: .9, months: 10, src: "SAU" }, { c: "gas", kind: "supply", mult: .85, months: 12, src: "RUS" }],
  objectives: [{ id: "i1", type: "inflation", value: 8, months: 18 }, { id: "s1", type: "stability", value: 55, months: 24 }, { id: "b1", type: "buildings", value: 8 }] },
tradewar: { year: 2026, month: 1, tariff: 22, name: { en: "Global Trade War", fa: "جنگ تجاری جهانی" },
  desc: { en: "Tariffs are everywhere and supply chains are fraying. Find partners or build self-reliance.", fa: "تعرفه‌ها همه‌جا هست و زنجیره‌های تأمین فرو می‌پاشد. شریک پیدا کنید یا خودکفا شوید." },
  priceMult: { steel: 1.2, chips: 1.25 }, shocks: [], relationShift: -15,
  objectives: [{ id: "g1", type: "gdp", mult: 1.15, years: 5 }, { id: "p1", type: "pacts", value: 3 }, { id: "i1", type: "inflation", value: 7, months: 24 }] },
recession: { year: 2026, month: 1, tariff: 8, name: { en: "Debt Crisis", fa: "بحران بدهی" },
  desc: { en: "A global downturn cuts demand and confidence. Survive the storm without losing control.", fa: "رکود جهانی تقاضا و اعتماد را کاهش داده است. بدون از دست دادن کنترل از طوفان عبور کنید." },
  priceMult: { oil: .75, copper: .8, steel: .8, grain: .95 }, shocks: [{ c: "all", kind: "demand", mult: .93, months: 14, src: "GLOBAL" }], growthShift: -2.2, debtStart: 1.9,
  objectives: [{ id: "s1", type: "stability", value: 50, months: 30 }, { id: "g1", type: "gdp", mult: 1.05, years: 4 }, { id: "a1", type: "approval", value: 55, months: 12 }] },
green: { year: 2030, month: 1, tariff: 4, name: { en: "Green Transition 2030", fa: "گذار سبز ۲۰۳۰" },
  desc: { en: "Demand for lithium, copper and rare earths is exploding while oil demand fades.", fa: "تقاضا برای لیتیوم، مس و خاکی‌های کمیاب منفجر شده و تقاضای نفت رو به کاهش است." },
  priceMult: { lithium: 1.8, copper: 1.5, rare: 1.5, oil: .8, coal: .7 }, shocks: [{ c: "lithium", kind: "demand", mult: 1.2, months: 24, src: "GLOBAL" }, { c: "oil", kind: "demand", mult: .93, months: 36, src: "GLOBAL" }],
  objectives: [{ id: "r1", type: "research", value: 3 }, { id: "e1", type: "environment", value: 75, months: 12 }, { id: "g1", type: "gdp", mult: 1.2, years: 5 }] },
food: { year: 2027, month: 1, tariff: 7, name: { en: "Food Crisis", fa: "بحران غذا" },
  desc: { en: "Droughts and export bans have caused a global grain shortage. Keep your people fed.", fa: "خشکسالی و ممنوعیت‌های صادراتی کمبود جهانی غلات ایجاد کرده است. مردم‌تان را سیر نگه دارید." },
  priceMult: { grain: 1.9 }, shocks: [{ c: "grain", kind: "supply", mult: .86, months: 14, src: "GLOBAL" }],
  objectives: [{ id: "f1", type: "foodsec", value: 70, months: 18 }, { id: "s1", type: "stability", value: 55, months: 24 }, { id: "a1", type: "approval", value: 55, months: 12 }] },
techrace: { year: 2026, month: 1, tariff: 9, name: { en: "Chip & Mineral Race", fa: "رقابت تراشه و مواد معدنی" },
  desc: { en: "Chips are scarce and rare earth exports are restricted. Technology decides the winners.", fa: "تراشه کمیاب است و صادرات خاکی‌های کمیاب محدود شده. فناوری برندگان را تعیین می‌کند." },
  priceMult: { chips: 1.7, rare: 1.9 }, shocks: [{ c: "chips", kind: "supply", mult: .85, months: 12, src: "TWN" }, { c: "rare", kind: "supply", mult: .65, months: 18, src: "CHN" }],
  objectives: [{ id: "r1", type: "research", value: 4 }, { id: "g1", type: "gdp", mult: 1.25, years: 5 }, { id: "t1", type: "tech", value: 75 }] }
};

/* Built-in mods (same format as user mods in <userData>/mods/*.json) */
const builtinMods = [
{ id: "green_future", builtin: true, version: "1.0", author: "WOE", name: { en: "Green Future", fa: "آینده سبز" },
  description: { en: "Power plants and water projects cost 30% less; fossil demand slowly declines; cleaner industry.", fa: "نیروگاه و پروژه‌های آب ۳۰٪ ارزان‌تر می‌شود؛ تقاضای سوخت فسیلی آرام‌آرام کم می‌شود؛ صنعت پاک‌تر." },
  buildings: { power: { costMult: .7 }, water: { costMult: .7 } }, commodities: { oil: { demandTrend: -.0012 }, coal: { demandTrend: -.002 }, lithium: { demandTrend: .0015 } }, rules: { envDrift: .05 } },
{ id: "resource_scarcity", builtin: true, version: "1.0", author: "WOE", name: { en: "Resource Scarcity", fa: "کمبود منابع" },
  description: { en: "Every producer's output is 8% lower: prices run hot and trade matters more.", fa: "تولید همهٔ تولیدکنندگان ۸٪ کمتر است: قیمت‌ها بالا می‌ماند و تجارت اهمیت بیشتری دارد." },
  production: { "*": { "*": .92 } }, rules: { priceNoise: 1.4 } },
{ id: "hard_economy", builtin: true, version: "1.0", author: "WOE", name: { en: "Hard Economy", fa: "اقتصاد سخت" },
  description: { en: "Projects cost 25% more, inflation drifts upward and research is pricier.", fa: "پروژه‌ها ۲۵٪ گران‌تر، تورم رو به افزایش و تحقیقات پرهزینه‌تر است." },
  buildings: { "*": { costMult: 1.25 } }, rules: { inflationDrift: .05, researchCostMult: 1.3 } },
{ id: "free_trade", builtin: true, version: "1.0", author: "WOE", name: { en: "Free Trade Era", fa: "عصر تجارت آزاد" },
  description: { en: "Default tariffs drop to zero worldwide and global growth gets a boost.", fa: "تعرفه‌های پیش‌فرض در سراسر جهان صفر می‌شود و رشد جهانی تقویت می‌شود." },
  rules: { tariffBase: 0, globalGrowthAdd: .4, relationDrift: .15 } },
{ id: "tech_boom", builtin: true, version: "1.0", author: "WOE", name: { en: "Tech Boom", fa: "رونق فناوری" },
  description: { en: "Research is 30% cheaper and chip demand is higher.", fa: "تحقیقات ۳۰٪ ارزان‌تر و تقاضای تراشه بیشتر است." },
  commodities: { chips: { demandTrend: .004 } }, rules: { researchCostMult: .7 } },
{ id: "pacific_century", builtin: true, version: "1.0", author: "WOE", name: { en: "Pacific Century", fa: "قرن اقیانوس آرام" },
  description: { en: "Asian economies grow faster; Europe and North America slower.", fa: "اقتصادهای آسیایی سریع‌تر رشد می‌کنند؛ اروپا و آمریکای شمالی کندتر." },
  countries: { CHN: { growth: 1.2 }, IND: { growth: 1.5 }, IDN: { growth: 1.2 }, VNM: { growth: 1.2 }, KOR: { growth: .8 }, USA: { growth: -.6 }, DEU: { growth: -.5 }, FRA: { growth: -.4 }, GBR: { growth: -.4 } } }
];

/* World events. title/description are bilingual objects; effects use engine keys ($ amounts in $B at small-country scale) */
const E = (en, fa) => ({ en, fa });
const worldEvents = [
 { id: "hormuz", market: { c: "oil", kind: "supply", mult: .88, months: 5, src: "IRN" }, title: E("Tension in the Gulf", "تنش در خلیج فارس"), text: E("Shipping through the Strait of Hormuz is disrupted, tightening oil supply.", "کشتیرانی در تنگهٔ هرمز مختل شده و عرضهٔ نفت تنگ‌تر می‌شود."),
   choices: [{ label: E("Release strategic stocks", "آزادسازی ذخایر راهبردی"), effects: { stockRelease: "oil", treasury: -.1 } }, { label: E("Back diplomacy in the region", "حمایت از دیپلماسی منطقه‌ای"), effects: { stability: .3, treasury: -.15 } }, { label: E("Wait and monitor", "صبر و رصد"), effects: {} }] },
 { id: "drought", market: { c: "grain", kind: "supply", mult: .91, months: 7, src: "GLOBAL" }, title: E("Drought in the grain belts", "خشکسالی در کمربندهای غله"), text: E("Poor harvests across several producers lift global grain prices.", "برداشت ضعیف در چند تولیدکنندهٔ بزرگ قیمت جهانی غلات را بالا می‌برد."),
   choices: [{ label: E("Build grain reserves", "ایجاد ذخیرهٔ غلات"), effects: { stockBuy: "grain", treasury: -.1 } }, { label: E("Subsidise farmers", "یارانه به کشاورزان"), effects: { food: 3, treasury: -.3 } }, { label: E("Do nothing", "بدون اقدام"), effects: { satisfaction: -.5 } }] },
 { id: "chipfab", market: { c: "chips", kind: "supply", mult: .85, months: 5, src: "TWN" }, title: E("Chip fab disruption", "اختلال در کارخانه‌های تراشه"), text: E("An outage at major fabs squeezes global semiconductor supply.", "قطعی در کارخانه‌های بزرگ عرضهٔ جهانی نیم‌رسانا را تحت فشار می‌گذارد."),
   choices: [{ label: E("Fund domestic design talent", "تأمین مالی استعدادهای طراحی داخلی"), effects: { technology: 1, treasury: -.3 } }, { label: E("Pay a premium for chips", "پرداخت مبلغ اضافه برای تراشه"), effects: { treasury: -.2, satisfaction: .5 } }, { label: E("Wait", "انتظار"), effects: {} }] },
 { id: "opec", market: { c: "oil", kind: "supply", mult: .93, months: 6, src: "SAU" }, title: E("Oil producers cut output", "کاهش تولید نفت توسط تولیدکنندگان"), text: E("A producers' alliance agrees to trim output to support prices.", "ائتلاف تولیدکنندگان برای حفظ قیمت‌ها کاهش تولید را می‌پذیرد."),
   choices: [{ label: E("Negotiate supply deals", "مذاکره برای قراردادهای تأمین"), effects: { relationAll: 1, treasury: -.1 } }, { label: E("Accelerate renewables", "تسریع انرژی‌های تجدیدپذیر"), effects: { energy: 2, treasury: -.35, environment: 1 } }, { label: E("Absorb the cost", "تحمل هزینه"), effects: { inflation: .3 } }] },
 { id: "strike", market: { c: "copper", kind: "supply", mult: .88, months: 4, src: "CHL" }, title: E("Copper mine strikes", "اعتصاب در معادن مس"), text: E("Labour action at major copper mines cuts supply.", "اعتصاب کارگری در معادن بزرگ مس عرضه را کاهش می‌دهد."),
   choices: [{ label: E("Stockpile copper", "ذخیره‌سازی مس"), effects: { stockBuy: "copper", treasury: -.1 } }, { label: E("Promote recycling", "ترویج بازیافت"), effects: { environment: 1, treasury: -.15 } }, { label: E("Wait", "انتظار"), effects: {} }] },
 { id: "ev", market: { c: "lithium", kind: "demand", mult: 1.2, months: 8, src: "GLOBAL" }, title: E("Battery demand surge", "جهش تقاضای باتری"), text: E("Electric-vehicle sales spike and battery makers scramble for lithium.", "فروش خودروهای برقی جهش کرده و سازندگان باتری برای لیتیوم رقابت می‌کنند."),
   choices: [{ label: E("Invest in processing", "سرمایه‌گذاری در فرآوری"), effects: { technology: 1, treasury: -.3 } }, { label: E("Sign supply contracts", "امضای قراردادهای تأمین"), effects: { stockBuy: "lithium", treasury: -.15 } }, { label: E("Hold course", "ادامهٔ مسیر"), effects: {} }] },
 { id: "rarecontrol", market: { c: "rare", kind: "supply", mult: .7, months: 8, src: "CHN" }, title: E("Rare-earth export controls", "کنترل صادرات خاکی‌های کمیاب"), text: E("The leading producer restricts exports of rare earths.", "تولیدکنندهٔ پیشرو صادرات خاکی‌های کمیاب را محدود می‌کند."),
   choices: [{ label: E("Open talks with the producer", "آغاز مذاکره با تولیدکننده"), effects: { relationAll: .5, treasury: -.1 } }, { label: E("Fund alternative sources", "تأمین مالی منابع جایگزین"), effects: { technology: 1, treasury: -.35 } }, { label: E("Wait", "انتظار"), effects: {} }] },
 { id: "scare", market: { c: "all", kind: "demand", mult: .95, months: 6, src: "GLOBAL" }, title: E("Global recession scare", "نگرانی از رکود جهانی"), text: E("Markets wobble and demand for commodities softens worldwide.", "بازارها متزلزل شده و تقاضا برای کالاها در جهان کاهش می‌یابد."),
   choices: [{ label: E("Stimulus package", "بستهٔ محرک اقتصادی"), effects: { gdp: .6, treasury: -.4, satisfaction: 1 } }, { label: E("Hold the budget", "حفظ بودجه"), effects: { stability: .2 } }, { label: E("Austerity", "ریاضت اقتصادی"), effects: { satisfaction: -1, inflation: -.3 } }] },
 { id: "heat", market: { c: "gas", kind: "demand", mult: 1.12, months: 3, src: "GLOBAL" }, title: E("Record heatwave", "موج گرمای بی‌سابقه"), text: E("Power demand spikes across the northern hemisphere.", "تقاضای برق در نیمکرهٔ شمالی اوج می‌گیرد."),
   choices: [{ label: E("Emergency power imports", "واردات اضطراری برق"), effects: { energy: 3, treasury: -.2 } }, { label: E("Ask for savings", "درخواست صرفه‌جویی"), effects: { energy: 1, satisfaction: -.3 } }, { label: E("Do nothing", "بدون اقدام"), effects: { satisfaction: -.6 } }] },
 { id: "pandemic", market: { c: "all", kind: "demand", mult: .9, months: 4, src: "GLOBAL" }, title: E("Regional outbreak", "شیوع بیماری منطقه‌ای"), text: E("A fast-spreading illness slows activity and travel.", "یک بیماری سریع‌الانتشار فعالیت و سفر را کند می‌کند."),
   choices: [{ label: E("Fund health response", "تأمین مالی پاسخ بهداشتی"), effects: { health: 2, treasury: -.4 } }, { label: E("Targeted measures", "اقدامات هدفمند"), effects: { health: 1, treasury: -.15, satisfaction: -.3 } }, { label: E("Minimal response", "پاسخ حداقلی"), effects: { health: -1, satisfaction: -1 } }] },
 { id: "sanction", market: { c: "oil", kind: "supply", mult: .94, months: 8, src: "RUS" }, title: E("New sanctions round", "دور تازهٔ تحریم‌ها"), text: E("Major economies announce sanctions that redirect energy flows.", "اقتصادهای بزرگ تحریم‌هایی اعلام می‌کنند که جریان انرژی را تغییر می‌دهد."),
   choices: [{ label: E("Join the sanctions", "پیوستن به تحریم‌ها"), effects: { relationBloc: "west", relation: 4, treasury: -.1 } }, { label: E("Stay neutral", "بی‌طرفی"), effects: { stability: .3 } }, { label: E("Seek discounted supply", "جست‌وجوی تأمین ارزان"), effects: { energy: 2, relationBloc: "west", relation: -3 } }] },
 { id: "suezblock", market: { c: "all", kind: "supply", mult: .97, months: 3, src: "GLOBAL" }, title: E("Canal blockage", "انسداد کانال"), text: E("A stranded vessel blocks a key canal and delays global cargo.", "یک کشتی گرفتار در یک کانال کلیدی بار جهانی را به تأخیر می‌اندازد."),
   choices: [{ label: E("Reroute cargo", "تغییر مسیر محموله‌ها"), effects: { treasury: -.15 } }, { label: E("Wait it out", "صبر برای رفع انسداد"), effects: { satisfaction: -.3 } }, { label: E("Invest in port capacity", "سرمایه‌گذاری در ظرفیت بندری"), effects: { infrastructure: 1, treasury: -.3 } }] }
];

window.WOE_DATA = { countries, ROW, commodities, prod, cities, chokepoints, seas, gov, blocs, buildings, techs, scenarios, builtinMods, worldEvents };
})();
