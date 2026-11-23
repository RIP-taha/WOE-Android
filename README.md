# WORLD OF EMPIRES 1.2 BETA

Offline, map-centred grand strategy. You run a real nation (or a custom island) on a permanent world map, trade on a global commodity market, answer world events and finish scenario objectives. English and Persian.

## Run
```
npm install     # installs Electron + the Vazirmatn Persian font
npm start
npm run dist    # Windows installer
```
`npm test` runs the headless engine test. `node scripts/check-i18n.js` verifies every text key exists in both languages.

## What is new
* **Permanent map** – always in the centre; menus open beside it. Zoom/pan, 9 colour layers, cities, rivers, mountains, seas, trade chokepoints, animated trade routes, and **buildings shown on your own territory** (progress ring while under construction).
* **Global market** – 9 commodities (oil, gas, coal, grain, steel, copper, lithium, rare earths, chips). Supply and demand for 47 nations + rest-of-world set the prices; bilateral trade flows depend on distance, blocs, tariffs, embargoes, pacts and relations; events create market shocks. You control tariffs per commodity, export bans, reserves and spot trades.
* **Scenarios** (7) with objectives, **mods** (6 built in + your own JSON, validated and clamped).
* **Sound** – generated interface sounds and ambience, plus your own music (play / pause / stop / next / previous / loop / shuffle).
* **Language** – English / Persian in Settings and everywhere. Layout never flips; Persian digits, dates and money; Vazirmatn font.
* **Interactive tutorial** on the start screen: a guided practice that highlights the real controls and waits for you, and a 24-chapter complete guide in both languages.
* Smooth screen/panel/map transitions.

## Military & conquest (new in 1.2)
Open the **Military** panel (crossed swords). Conventional forces only – no nuclear weapons.
* **Forces** – 13 unit types (infantry, armor, artillery, fighters, bombers, combat drones, corvettes, destroyers, amphibious transports, submarines, carriers, air-defence batteries, missile shield) and 4 missile types (short-range ballistic, cruise, long-range ballistic, hypersonic). Production takes months, costs upkeep and is limited by your population.
* **Technology** – 18 military technologies with prerequisites; some also need a civilian technology (drones and the missile shield need AI, stealth and hypersonics need advanced materials).
* **Every nation** has troops, air force, navy, missile arsenal, air defence, readiness and a 0-100% condition for 7 targets (bases, airfields, air-defence network, power grid, industry, ports, command).
* **Reaching a target** – by land along real borders (max two transit countries), by sea with amphibious transports and sea control (landlocked nations cannot be invaded by sea), by missile/aircraft within range.
* **Permissions** – crossing a third country needs its airspace (air/missiles) or passage (armies) permission; acceptance depends on relations, pacts, embargoes and the target's bloc. You may ignore it at the price of incidents.
* **War** – declare (max 2 at once), missile and air strikes on chosen target categories, ground/amphibious offensives resolved monthly (force ratio, quality, air superiority, terrain, readiness, mobilisation), enemy counter-offensives and missile strikes that can destroy your buildings, war weariness, ceasefire.
* **Victory** – annex the land (it turns your colour on the map), install a friendly government, or take reparations. Hostile, stronger neighbours may attack you.

## Sandbox mode (for testing)
Tick **Sandbox mode** when creating a world. Money, resources and reserves are unlimited; every civil and military technology is unlocked; construction, research and production take 1 month; no manpower limit or upkeep; all airspace/passage permissions are granted and missile/aircraft range is ignored; no limit on simultaneous wars. A **Sandbox tools** panel adds: advance 12 months, refill everything, win all wars instantly, max out forces, restore all nations' defences, set all relations to +100/-100, change a commodity price (x0.5, x2, reset), clear shocks and trigger any world event. Sandbox saves carry a "Sandbox" tag.

## Honest limits
* The built-in map is **hand-built and simplified** (47 nations + neutral land). Borders are approximate. For accurate borders add a Natural Earth GeoJSON (see `src/data/README.txt`).
* Country statistics and production shares are rounded approximations of recent data, simplified for gameplay. This is a game, not a forecasting tool.
* Military numbers are abstract strength points, not a simulation of real orders of battle. Wars are only between you and one nation at a time; AI nations do not fight each other and cannot conquer you (losing a defensive war forces a costly ceasefire).
* The Electron-only parts (file saves, mods folder, music file dialog, GeoJSON loading) could not be run in the build environment. The whole UI and engine were tested in headless Chromium using the built-in browser fallback (localStorage); please do a first-run check on your machine.

## Mods
Put `.json` files in the mods folder (Mods panel > Open mods folder) or use *Import mod*. See `examples/example-mod.json`. Supported: country patches, production multipliers, commodity demand trends, building costs, new buildings, global rules, events with choices and market shocks.

## Bugs fixed from 1.0 alpha
Toast messages being overwritten by the save toast; treasury going negative on several actions; unresolved events being dropped or never expiring; language selector not showing the current language; election percentages not adding to 100; panel scroll resetting after every action; crashes when storage/IPC failed; trade/resource model that ignored the real world. Old alpha saves are converted into a custom island nation.
