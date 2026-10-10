// SPDX-License-Identifier: GPL-3.0-or-later
// Preserve exact PKHeX grid order; localize place names from Core and descriptive qualifiers here.
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, URL } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
if (!process.argv[2])
  throw Error("Provide the read-only PKHeX source directory.");
const source = path.resolve(process.argv[2]);
const file = "PKHeX.WinForms/Subforms/Save Editors/Gen7/SAV_ZygardeCell.cs";
const body = await readFile(path.join(source, file), "utf8");
const resource = "PKHeX.Core/Resources/text/locations/gen7/text_sm_00000_";
const [en, zh, ja] = await Promise.all(
  ["en", "zh-Hans", "ja"].map(async (l) =>
    (await readFile(path.join(source, `${resource}${l}.txt`), "utf8")).split(
      /\r?\n/,
    ),
  ),
);
const normalize = (s) => s.replaceAll("’", "'");
const bases = new Map(en.map((s, i) => [normalize(s), [zh[i], ja[i]]]));
for (const [alias, canonical] of [
  ["Verdant Cave", "Verdant Cavern"],
  ["Hano Resort", "Hano Grand Resort"],
  ["Aether Foundation", "Aether Paradise"],
])
  bases.set(alias, bases.get(canonical));
bases.set("Aether House", ["以太之家", "エーテルハウス"]);
bases.set("Secluded Shore", [zh[110], "ウラウラうらかいがん"]);
const qualifiers = {
  "Outside Behind Well": ["室外井后", "屋外・井戸の裏"],
  "Northwest of Police Station": ["警察局西北", "交番の北西"],
  "Front of Abandoned Megamart": [
    "超值超市旧址前",
    "スーパー・メガやす跡地の前",
  ],
  "Fossil Restoration Center": ["化石复原所", "化石復元所"],
  "Southeast Whiscash": ["东南鲶鱼王船", "南東・ナマズン船"],
  "Southwest Huntail": ["西南猎斑鱼船", "南西・ハンテール船"],
  "West Wailord": ["西侧吼鲸王船", "西・ホエルオー船"],
  "East Steelix": ["东侧大钢蛇船", "東・ハガネール船"],
  "Olivia's Jewelry Shop": ["丽姿的宝石店", "ライチの宝石店"],
  "Ilima's House Pool": ["伊利马家游泳池", "イリマの家・プール"],
  "Ilima's House": ["伊利马家", "イリマの家"],
  "Kiawe's House": ["卡奇家", "カキの家"],
  "Hapu's House": ["哈普乌家", "ハプウの家"],
  "Mina's Ship": ["茉莉的船", "マツリカの船"],
  "Game Freak Building": ["GAME FREAK 大楼", "ゲームフリークのビル"],
  "Game Freak": ["GAME FREAK", "ゲームフリーク"],
  "South of Pokemon Center": ["宝可梦中心南侧", "ポケモンセンターの南"],
  "South of Po Town": ["魄镇南侧", "ポータウンの南"],
  "Island w/ Trainer": ["有训练家的小岛", "トレーナーのいる島"],
  "Rocks Behind Sign": ["路牌后岩石", "看板の裏の岩"],
  "Below Sandygast": ["沙丘娃下方", "スナバァの下"],
  "Blue Food Boat": ["蓝色餐饮船", "青い飲食船"],
  "Unbuilt House": ["未建成的房屋", "未完成の家"],
  "High Mountainside": ["高处山腰", "山腹の高所"],
  "Mountain Corner": ["山脚角落", "山の角"],
  "Near a Bush": ["灌木旁", "茂みの近く"],
  "Near Well": ["井旁", "井戸の近く"],
  "Under Rock": ["岩石下", "岩の下"],
  "On Bridge": ["桥上", "橋の上"],
  "Right Hallway": ["右侧走廊", "右の通路"],
  "Right Side": ["右侧", "右側"],
  "Shopping District": ["商业区", "ショッピングエリア"],
  "Community Center": ["社区中心", "地域センター"],
  CommunityCenter: ["社区中心", "地域センター"],
  "Trainer School": ["训练家学校", "トレーナーズスクール"],
  "Pokemon Center": ["宝可梦中心", "ポケモンセンター"],
  "Police Station": ["警察局", "交番"],
  "Ferry Terminal": ["渡轮码头", "フェリーターミナル"],
  "Malasada Shop": ["马拉萨达店", "マラサダショップ"],
  "Recycling Plant": ["回收工厂", "リサイクルプラント"],
  "Research Lab": ["研究所", "研究所"],
  "Apparel Shop": ["服装店", "ブティック"],
  "Aether Base": ["以太基地", "エーテルベース"],
  "Berry Fields House": ["树果园房屋", "きのみ畑の家"],
  "Shady House": ["可疑宅邸", "いかがわしき屋敷"],
  "Power Plant": ["发电厂", "発電所"],
  "Main Building": ["主楼", "本館"],
  "Trial Site": ["考验地点", "試練の場"],
  "Outer Cape": ["外侧海岬", "はずれの岬"],
  "Southwest Water": ["西南水域", "南西の水辺"],
  "Southeast House": ["东南房屋", "南東の家"],
  "Islet Surfboard": ["小岛冲浪板", "小島のサーフボード"],
  "Through Diglett's Tunnel": ["经地鼠隧道", "ディグダトンネル経由"],
  Mountainside: ["山腰", "山腹"],
  Boardwalk: ["木板步道", "木道"],
  Brickwall: ["砖墙", "レンガの壁"],
  Building: ["建筑", "建物"],
  "City Hall": ["市政厅", "市役所"],
  "Dead End": ["尽头", "行き止まり"],
  Entrance: ["入口", "入口"],
  Outskirts: ["郊外", "はずれ"],
  Reception: ["接待处", "受付"],
  Courtyard: ["庭院", "庭"],
  Bedroom: ["卧室", "寝室"],
  Kitchen: ["厨房", "台所"],
  Lighthouse: ["灯塔", "灯台"],
  Marina: ["港口区", "ポートエリア"],
  Shopping: ["商业区", "ショッピングエリア"],
  Lobby: ["大厅", "ロビー"],
  Hotel: ["酒店", "ホテル"],
  Restaurant: ["餐厅", "レストラン"],
  Motel: ["汽车旅馆", "モーテル"],
  Library: ["图书馆", "図書館"],
  Salon: ["美发店", "ヘアサロン"],
  Surfboard: ["冲浪板", "サーフボード"],
  Northwest: ["西北", "北西"],
  Northeast: ["东北", "北東"],
  Southwest: ["西南", "南西"],
  Southeast: ["东南", "南東"],
  North: ["北侧", "北"],
  South: ["南侧", "南"],
  East: ["东侧", "東"],
  West: ["西侧", "西"],
  Outside: ["室外", "屋外"],
  Inside: ["内部", "内部"],
  Day: ["白天", "昼"],
  Night: ["夜晚", "夜"],
  Grass: ["草地", "草むら"],
  Cave: ["洞穴", "洞窟"],
  Top: ["顶部", "頂上"],
  Ledge: ["高台", "段差"],
  Pier: ["栈桥", "桟橋"],
  Room: ["房间", "部屋"],
  Rocks: ["岩石", "岩"],
};
const keys = Object.keys(qualifiers).sort((a, b) => b.length - a.length);
const pattern = new RegExp(
  keys.map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"),
  "g",
);
function translate(value) {
  const normalized = normalize(value);
  const base = [...bases.keys()]
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)
    .find((s) => normalized === s || normalized.startsWith(`${s} `));
  if (!base) throw Error(`Missing base location: ${value}`);
  const suffix = normalized.slice(base.length);
  const rest = suffix.replace(pattern, "").replace(/B?\dF|\d|[\s()\-/]/g, "");
  if (rest) throw Error(`Missing qualifier: ${value}: ${rest}`);
  return [0, 1].map(
    (l) =>
      bases.get(base)[l] + suffix.replace(pattern, (s) => qualifiers[s][l]),
  );
}
const arrays = [];
for (const [key, count] of [
  ["locationsSM", 95],
  ["locationsUSUM", 100],
]) {
  const match = body.match(
    new RegExp(`string\\[\\] ${key} =\\s*\\[([\\s\\S]*?)\\];`),
  );
  if (!match) throw Error(`Missing ${key}`);
  const rows = [...match[1].matchAll(/"([^"]*)"/g)].map((m) => m[1]);
  if (rows.length !== count) throw Error(`Invalid ${key} count`);
  arrays.push(
    `private static readonly LocalizedText[] ${key} = [\n${rows
      .map((en) => {
        const [zh, ja] = translate(en);
        return `new(${JSON.stringify(zh)},${JSON.stringify(en)},${JSON.stringify(ja)}),`;
      })
      .join("\n")}\n];`,
  );
}
const hash = createHash("sha256").update(body).digest("hex");
await writeFile(
  path.join(root, "wasm/pkhex/Zygarde7Locations.cs"),
  `// SPDX-License-Identifier: GPL-3.0-or-later\n// Generated from PKHeX 26.08.26 ${file}; SHA-256 ${hash}.\nnamespace PokeRNGKit.SaveEditor;\ninternal static class Zygarde7Locations {\ninternal static LocalizedText[] Read(bool stickers)=>stickers?locationsUSUM:locationsSM;\n${arrays.join("\n")}\n}\n`,
);
