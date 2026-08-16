/*!
 * Generated from 3DSRNGTool revision 359bdd7a9ff7c145fec12302cf43da932923fa62.
 * 3DSRNGTool is licensed under MIT; bundled species and personal data retain
 * their upstream attribution. Do not hand-edit; rerun
 * scripts/generate_gen7_event_data.mjs.
 */

export type Gen7EventGameVersion = "sun" | "moon" | "ultra-sun" | "ultra-moon";

export interface Gen7EventPersonalForm {
  readonly genderRatio: number;
  readonly defaultPerfectIvCount: number;
}

export interface Gen7EventPersonalEntry {
  readonly species: number;
  readonly forms: readonly Gen7EventPersonalForm[];
  readonly smNoDexEligible: boolean;
  readonly usumNoDexEligible: boolean;
}

export const GEN7_EVENT_SPECIES = {
  en: [
    "Egg",
    "Bulbasaur",
    "Ivysaur",
    "Venusaur",
    "Charmander",
    "Charmeleon",
    "Charizard",
    "Squirtle",
    "Wartortle",
    "Blastoise",
    "Caterpie",
    "Metapod",
    "Butterfree",
    "Weedle",
    "Kakuna",
    "Beedrill",
    "Pidgey",
    "Pidgeotto",
    "Pidgeot",
    "Rattata",
    "Raticate",
    "Spearow",
    "Fearow",
    "Ekans",
    "Arbok",
    "Pikachu",
    "Raichu",
    "Sandshrew",
    "Sandslash",
    "Nidoran♀",
    "Nidorina",
    "Nidoqueen",
    "Nidoran♂",
    "Nidorino",
    "Nidoking",
    "Clefairy",
    "Clefable",
    "Vulpix",
    "Ninetales",
    "Jigglypuff",
    "Wigglytuff",
    "Zubat",
    "Golbat",
    "Oddish",
    "Gloom",
    "Vileplume",
    "Paras",
    "Parasect",
    "Venonat",
    "Venomoth",
    "Diglett",
    "Dugtrio",
    "Meowth",
    "Persian",
    "Psyduck",
    "Golduck",
    "Mankey",
    "Primeape",
    "Growlithe",
    "Arcanine",
    "Poliwag",
    "Poliwhirl",
    "Poliwrath",
    "Abra",
    "Kadabra",
    "Alakazam",
    "Machop",
    "Machoke",
    "Machamp",
    "Bellsprout",
    "Weepinbell",
    "Victreebel",
    "Tentacool",
    "Tentacruel",
    "Geodude",
    "Graveler",
    "Golem",
    "Ponyta",
    "Rapidash",
    "Slowpoke",
    "Slowbro",
    "Magnemite",
    "Magneton",
    "Farfetch’d",
    "Doduo",
    "Dodrio",
    "Seel",
    "Dewgong",
    "Grimer",
    "Muk",
    "Shellder",
    "Cloyster",
    "Gastly",
    "Haunter",
    "Gengar",
    "Onix",
    "Drowzee",
    "Hypno",
    "Krabby",
    "Kingler",
    "Voltorb",
    "Electrode",
    "Exeggcute",
    "Exeggutor",
    "Cubone",
    "Marowak",
    "Hitmonlee",
    "Hitmonchan",
    "Lickitung",
    "Koffing",
    "Weezing",
    "Rhyhorn",
    "Rhydon",
    "Chansey",
    "Tangela",
    "Kangaskhan",
    "Horsea",
    "Seadra",
    "Goldeen",
    "Seaking",
    "Staryu",
    "Starmie",
    "Mr. Mime",
    "Scyther",
    "Jynx",
    "Electabuzz",
    "Magmar",
    "Pinsir",
    "Tauros",
    "Magikarp",
    "Gyarados",
    "Lapras",
    "Ditto",
    "Eevee",
    "Vaporeon",
    "Jolteon",
    "Flareon",
    "Porygon",
    "Omanyte",
    "Omastar",
    "Kabuto",
    "Kabutops",
    "Aerodactyl",
    "Snorlax",
    "Articuno",
    "Zapdos",
    "Moltres",
    "Dratini",
    "Dragonair",
    "Dragonite",
    "Mewtwo",
    "Mew",
    "Chikorita",
    "Bayleef",
    "Meganium",
    "Cyndaquil",
    "Quilava",
    "Typhlosion",
    "Totodile",
    "Croconaw",
    "Feraligatr",
    "Sentret",
    "Furret",
    "Hoothoot",
    "Noctowl",
    "Ledyba",
    "Ledian",
    "Spinarak",
    "Ariados",
    "Crobat",
    "Chinchou",
    "Lanturn",
    "Pichu",
    "Cleffa",
    "Igglybuff",
    "Togepi",
    "Togetic",
    "Natu",
    "Xatu",
    "Mareep",
    "Flaaffy",
    "Ampharos",
    "Bellossom",
    "Marill",
    "Azumarill",
    "Sudowoodo",
    "Politoed",
    "Hoppip",
    "Skiploom",
    "Jumpluff",
    "Aipom",
    "Sunkern",
    "Sunflora",
    "Yanma",
    "Wooper",
    "Quagsire",
    "Espeon",
    "Umbreon",
    "Murkrow",
    "Slowking",
    "Misdreavus",
    "Unown",
    "Wobbuffet",
    "Girafarig",
    "Pineco",
    "Forretress",
    "Dunsparce",
    "Gligar",
    "Steelix",
    "Snubbull",
    "Granbull",
    "Qwilfish",
    "Scizor",
    "Shuckle",
    "Heracross",
    "Sneasel",
    "Teddiursa",
    "Ursaring",
    "Slugma",
    "Magcargo",
    "Swinub",
    "Piloswine",
    "Corsola",
    "Remoraid",
    "Octillery",
    "Delibird",
    "Mantine",
    "Skarmory",
    "Houndour",
    "Houndoom",
    "Kingdra",
    "Phanpy",
    "Donphan",
    "Porygon2",
    "Stantler",
    "Smeargle",
    "Tyrogue",
    "Hitmontop",
    "Smoochum",
    "Elekid",
    "Magby",
    "Miltank",
    "Blissey",
    "Raikou",
    "Entei",
    "Suicune",
    "Larvitar",
    "Pupitar",
    "Tyranitar",
    "Lugia",
    "Ho-Oh",
    "Celebi",
    "Treecko",
    "Grovyle",
    "Sceptile",
    "Torchic",
    "Combusken",
    "Blaziken",
    "Mudkip",
    "Marshtomp",
    "Swampert",
    "Poochyena",
    "Mightyena",
    "Zigzagoon",
    "Linoone",
    "Wurmple",
    "Silcoon",
    "Beautifly",
    "Cascoon",
    "Dustox",
    "Lotad",
    "Lombre",
    "Ludicolo",
    "Seedot",
    "Nuzleaf",
    "Shiftry",
    "Taillow",
    "Swellow",
    "Wingull",
    "Pelipper",
    "Ralts",
    "Kirlia",
    "Gardevoir",
    "Surskit",
    "Masquerain",
    "Shroomish",
    "Breloom",
    "Slakoth",
    "Vigoroth",
    "Slaking",
    "Nincada",
    "Ninjask",
    "Shedinja",
    "Whismur",
    "Loudred",
    "Exploud",
    "Makuhita",
    "Hariyama",
    "Azurill",
    "Nosepass",
    "Skitty",
    "Delcatty",
    "Sableye",
    "Mawile",
    "Aron",
    "Lairon",
    "Aggron",
    "Meditite",
    "Medicham",
    "Electrike",
    "Manectric",
    "Plusle",
    "Minun",
    "Volbeat",
    "Illumise",
    "Roselia",
    "Gulpin",
    "Swalot",
    "Carvanha",
    "Sharpedo",
    "Wailmer",
    "Wailord",
    "Numel",
    "Camerupt",
    "Torkoal",
    "Spoink",
    "Grumpig",
    "Spinda",
    "Trapinch",
    "Vibrava",
    "Flygon",
    "Cacnea",
    "Cacturne",
    "Swablu",
    "Altaria",
    "Zangoose",
    "Seviper",
    "Lunatone",
    "Solrock",
    "Barboach",
    "Whiscash",
    "Corphish",
    "Crawdaunt",
    "Baltoy",
    "Claydol",
    "Lileep",
    "Cradily",
    "Anorith",
    "Armaldo",
    "Feebas",
    "Milotic",
    "Castform",
    "Kecleon",
    "Shuppet",
    "Banette",
    "Duskull",
    "Dusclops",
    "Tropius",
    "Chimecho",
    "Absol",
    "Wynaut",
    "Snorunt",
    "Glalie",
    "Spheal",
    "Sealeo",
    "Walrein",
    "Clamperl",
    "Huntail",
    "Gorebyss",
    "Relicanth",
    "Luvdisc",
    "Bagon",
    "Shelgon",
    "Salamence",
    "Beldum",
    "Metang",
    "Metagross",
    "Regirock",
    "Regice",
    "Registeel",
    "Latias",
    "Latios",
    "Kyogre",
    "Groudon",
    "Rayquaza",
    "Jirachi",
    "Deoxys",
    "Turtwig",
    "Grotle",
    "Torterra",
    "Chimchar",
    "Monferno",
    "Infernape",
    "Piplup",
    "Prinplup",
    "Empoleon",
    "Starly",
    "Staravia",
    "Staraptor",
    "Bidoof",
    "Bibarel",
    "Kricketot",
    "Kricketune",
    "Shinx",
    "Luxio",
    "Luxray",
    "Budew",
    "Roserade",
    "Cranidos",
    "Rampardos",
    "Shieldon",
    "Bastiodon",
    "Burmy",
    "Wormadam",
    "Mothim",
    "Combee",
    "Vespiquen",
    "Pachirisu",
    "Buizel",
    "Floatzel",
    "Cherubi",
    "Cherrim",
    "Shellos",
    "Gastrodon",
    "Ambipom",
    "Drifloon",
    "Drifblim",
    "Buneary",
    "Lopunny",
    "Mismagius",
    "Honchkrow",
    "Glameow",
    "Purugly",
    "Chingling",
    "Stunky",
    "Skuntank",
    "Bronzor",
    "Bronzong",
    "Bonsly",
    "Mime Jr.",
    "Happiny",
    "Chatot",
    "Spiritomb",
    "Gible",
    "Gabite",
    "Garchomp",
    "Munchlax",
    "Riolu",
    "Lucario",
    "Hippopotas",
    "Hippowdon",
    "Skorupi",
    "Drapion",
    "Croagunk",
    "Toxicroak",
    "Carnivine",
    "Finneon",
    "Lumineon",
    "Mantyke",
    "Snover",
    "Abomasnow",
    "Weavile",
    "Magnezone",
    "Lickilicky",
    "Rhyperior",
    "Tangrowth",
    "Electivire",
    "Magmortar",
    "Togekiss",
    "Yanmega",
    "Leafeon",
    "Glaceon",
    "Gliscor",
    "Mamoswine",
    "Porygon-Z",
    "Gallade",
    "Probopass",
    "Dusknoir",
    "Froslass",
    "Rotom",
    "Uxie",
    "Mesprit",
    "Azelf",
    "Dialga",
    "Palkia",
    "Heatran",
    "Regigigas",
    "Giratina",
    "Cresselia",
    "Phione",
    "Manaphy",
    "Darkrai",
    "Shaymin",
    "Arceus",
    "Victini",
    "Snivy",
    "Servine",
    "Serperior",
    "Tepig",
    "Pignite",
    "Emboar",
    "Oshawott",
    "Dewott",
    "Samurott",
    "Patrat",
    "Watchog",
    "Lillipup",
    "Herdier",
    "Stoutland",
    "Purrloin",
    "Liepard",
    "Pansage",
    "Simisage",
    "Pansear",
    "Simisear",
    "Panpour",
    "Simipour",
    "Munna",
    "Musharna",
    "Pidove",
    "Tranquill",
    "Unfezant",
    "Blitzle",
    "Zebstrika",
    "Roggenrola",
    "Boldore",
    "Gigalith",
    "Woobat",
    "Swoobat",
    "Drilbur",
    "Excadrill",
    "Audino",
    "Timburr",
    "Gurdurr",
    "Conkeldurr",
    "Tympole",
    "Palpitoad",
    "Seismitoad",
    "Throh",
    "Sawk",
    "Sewaddle",
    "Swadloon",
    "Leavanny",
    "Venipede",
    "Whirlipede",
    "Scolipede",
    "Cottonee",
    "Whimsicott",
    "Petilil",
    "Lilligant",
    "Basculin",
    "Sandile",
    "Krokorok",
    "Krookodile",
    "Darumaka",
    "Darmanitan",
    "Maractus",
    "Dwebble",
    "Crustle",
    "Scraggy",
    "Scrafty",
    "Sigilyph",
    "Yamask",
    "Cofagrigus",
    "Tirtouga",
    "Carracosta",
    "Archen",
    "Archeops",
    "Trubbish",
    "Garbodor",
    "Zorua",
    "Zoroark",
    "Minccino",
    "Cinccino",
    "Gothita",
    "Gothorita",
    "Gothitelle",
    "Solosis",
    "Duosion",
    "Reuniclus",
    "Ducklett",
    "Swanna",
    "Vanillite",
    "Vanillish",
    "Vanilluxe",
    "Deerling",
    "Sawsbuck",
    "Emolga",
    "Karrablast",
    "Escavalier",
    "Foongus",
    "Amoonguss",
    "Frillish",
    "Jellicent",
    "Alomomola",
    "Joltik",
    "Galvantula",
    "Ferroseed",
    "Ferrothorn",
    "Klink",
    "Klang",
    "Klinklang",
    "Tynamo",
    "Eelektrik",
    "Eelektross",
    "Elgyem",
    "Beheeyem",
    "Litwick",
    "Lampent",
    "Chandelure",
    "Axew",
    "Fraxure",
    "Haxorus",
    "Cubchoo",
    "Beartic",
    "Cryogonal",
    "Shelmet",
    "Accelgor",
    "Stunfisk",
    "Mienfoo",
    "Mienshao",
    "Druddigon",
    "Golett",
    "Golurk",
    "Pawniard",
    "Bisharp",
    "Bouffalant",
    "Rufflet",
    "Braviary",
    "Vullaby",
    "Mandibuzz",
    "Heatmor",
    "Durant",
    "Deino",
    "Zweilous",
    "Hydreigon",
    "Larvesta",
    "Volcarona",
    "Cobalion",
    "Terrakion",
    "Virizion",
    "Tornadus",
    "Thundurus",
    "Reshiram",
    "Zekrom",
    "Landorus",
    "Kyurem",
    "Keldeo",
    "Meloetta",
    "Genesect",
    "Chespin",
    "Quilladin",
    "Chesnaught",
    "Fennekin",
    "Braixen",
    "Delphox",
    "Froakie",
    "Frogadier",
    "Greninja",
    "Bunnelby",
    "Diggersby",
    "Fletchling",
    "Fletchinder",
    "Talonflame",
    "Scatterbug",
    "Spewpa",
    "Vivillon",
    "Litleo",
    "Pyroar",
    "Flabébé",
    "Floette",
    "Florges",
    "Skiddo",
    "Gogoat",
    "Pancham",
    "Pangoro",
    "Furfrou",
    "Espurr",
    "Meowstic",
    "Honedge",
    "Doublade",
    "Aegislash",
    "Spritzee",
    "Aromatisse",
    "Swirlix",
    "Slurpuff",
    "Inkay",
    "Malamar",
    "Binacle",
    "Barbaracle",
    "Skrelp",
    "Dragalge",
    "Clauncher",
    "Clawitzer",
    "Helioptile",
    "Heliolisk",
    "Tyrunt",
    "Tyrantrum",
    "Amaura",
    "Aurorus",
    "Sylveon",
    "Hawlucha",
    "Dedenne",
    "Carbink",
    "Goomy",
    "Sliggoo",
    "Goodra",
    "Klefki",
    "Phantump",
    "Trevenant",
    "Pumpkaboo",
    "Gourgeist",
    "Bergmite",
    "Avalugg",
    "Noibat",
    "Noivern",
    "Xerneas",
    "Yveltal",
    "Zygarde",
    "Diancie",
    "Hoopa",
    "Volcanion",
    "Rowlet",
    "Dartrix",
    "Decidueye",
    "Litten",
    "Torracat",
    "Incineroar",
    "Popplio",
    "Brionne",
    "Primarina",
    "Pikipek",
    "Trumbeak",
    "Toucannon",
    "Yungoos",
    "Gumshoos",
    "Grubbin",
    "Charjabug",
    "Vikavolt",
    "Crabrawler",
    "Crabominable",
    "Oricorio",
    "Cutiefly",
    "Ribombee",
    "Rockruff",
    "Lycanroc",
    "Wishiwashi",
    "Mareanie",
    "Toxapex",
    "Mudbray",
    "Mudsdale",
    "Dewpider",
    "Araquanid",
    "Fomantis",
    "Lurantis",
    "Morelull",
    "Shiinotic",
    "Salandit",
    "Salazzle",
    "Stufful",
    "Bewear",
    "Bounsweet",
    "Steenee",
    "Tsareena",
    "Comfey",
    "Oranguru",
    "Passimian",
    "Wimpod",
    "Golisopod",
    "Sandygast",
    "Palossand",
    "Pyukumuku",
    "Type: Null",
    "Silvally",
    "Minior",
    "Komala",
    "Turtonator",
    "Togedemaru",
    "Mimikyu",
    "Bruxish",
    "Drampa",
    "Dhelmise",
    "Jangmo-o",
    "Hakamo-o",
    "Kommo-o",
    "Tapu Koko",
    "Tapu Lele",
    "Tapu Bulu",
    "Tapu Fini",
    "Cosmog",
    "Cosmoem",
    "Solgaleo",
    "Lunala",
    "Nihilego",
    "Buzzwole",
    "Pheromosa",
    "Xurkitree",
    "Celesteela",
    "Kartana",
    "Guzzlord",
    "Necrozma",
    "Magearna",
    "Marshadow",
    "Poipole",
    "Naganadel",
    "Stakataka",
    "Blacephalon",
    "Zeraora",
  ],
  ja: [
    "タマゴ",
    "フシギダネ",
    "フシギソウ",
    "フシギバナ",
    "ヒトカゲ",
    "リザード",
    "リザードン",
    "ゼニガメ",
    "カメール",
    "カメックス",
    "キャタピー",
    "トランセル",
    "バタフリー",
    "ビードル",
    "コクーン",
    "スピアー",
    "ポッポ",
    "ピジョン",
    "ピジョット",
    "コラッタ",
    "ラッタ",
    "オニスズメ",
    "オニドリル",
    "アーボ",
    "アーボック",
    "ピカチュウ",
    "ライチュウ",
    "サンド",
    "サンドパン",
    "ニドラン♀",
    "ニドリーナ",
    "ニドクイン",
    "ニドラン♂",
    "ニドリーノ",
    "ニドキング",
    "ピッピ",
    "ピクシー",
    "ロコン",
    "キュウコン",
    "プリン",
    "プクリン",
    "ズバット",
    "ゴルバット",
    "ナゾノクサ",
    "クサイハナ",
    "ラフレシア",
    "パラス",
    "パラセクト",
    "コンパン",
    "モルフォン",
    "ディグダ",
    "ダグトリオ",
    "ニャース",
    "ペルシアン",
    "コダック",
    "ゴルダック",
    "マンキー",
    "オコリザル",
    "ガーディ",
    "ウインディ",
    "ニョロモ",
    "ニョロゾ",
    "ニョロボン",
    "ケーシィ",
    "ユンゲラー",
    "フーディン",
    "ワンリキー",
    "ゴーリキー",
    "カイリキー",
    "マダツボミ",
    "ウツドン",
    "ウツボット",
    "メノクラゲ",
    "ドククラゲ",
    "イシツブテ",
    "ゴローン",
    "ゴローニャ",
    "ポニータ",
    "ギャロップ",
    "ヤドン",
    "ヤドラン",
    "コイル",
    "レアコイル",
    "カモネギ",
    "ドードー",
    "ドードリオ",
    "パウワウ",
    "ジュゴン",
    "ベトベター",
    "ベトベトン",
    "シェルダー",
    "パルシェン",
    "ゴース",
    "ゴースト",
    "ゲンガー",
    "イワーク",
    "スリープ",
    "スリーパー",
    "クラブ",
    "キングラー",
    "ビリリダマ",
    "マルマイン",
    "タマタマ",
    "ナッシー",
    "カラカラ",
    "ガラガラ",
    "サワムラー",
    "エビワラー",
    "ベロリンガ",
    "ドガース",
    "マタドガス",
    "サイホーン",
    "サイドン",
    "ラッキー",
    "モンジャラ",
    "ガルーラ",
    "タッツー",
    "シードラ",
    "トサキント",
    "アズマオウ",
    "ヒトデマン",
    "スターミー",
    "バリヤード",
    "ストライク",
    "ルージュラ",
    "エレブー",
    "ブーバー",
    "カイロス",
    "ケンタロス",
    "コイキング",
    "ギャラドス",
    "ラプラス",
    "メタモン",
    "イーブイ",
    "シャワーズ",
    "サンダース",
    "ブースター",
    "ポリゴン",
    "オムナイト",
    "オムスター",
    "カブト",
    "カブトプス",
    "プテラ",
    "カビゴン",
    "フリーザー",
    "サンダー",
    "ファイヤー",
    "ミニリュウ",
    "ハクリュー",
    "カイリュー",
    "ミュウツー",
    "ミュウ",
    "チコリータ",
    "ベイリーフ",
    "メガニウム",
    "ヒノアラシ",
    "マグマラシ",
    "バクフーン",
    "ワニノコ",
    "アリゲイツ",
    "オーダイル",
    "オタチ",
    "オオタチ",
    "ホーホー",
    "ヨルノズク",
    "レディバ",
    "レディアン",
    "イトマル",
    "アリアドス",
    "クロバット",
    "チョンチー",
    "ランターン",
    "ピチュー",
    "ピィ",
    "ププリン",
    "トゲピー",
    "トゲチック",
    "ネイティ",
    "ネイティオ",
    "メリープ",
    "モココ",
    "デンリュウ",
    "キレイハナ",
    "マリル",
    "マリルリ",
    "ウソッキー",
    "ニョロトノ",
    "ハネッコ",
    "ポポッコ",
    "ワタッコ",
    "エイパム",
    "ヒマナッツ",
    "キマワリ",
    "ヤンヤンマ",
    "ウパー",
    "ヌオー",
    "エーフィ",
    "ブラッキー",
    "ヤミカラス",
    "ヤドキング",
    "ムウマ",
    "アンノーン",
    "ソーナンス",
    "キリンリキ",
    "クヌギダマ",
    "フォレトス",
    "ノコッチ",
    "グライガー",
    "ハガネール",
    "ブルー",
    "グランブル",
    "ハリーセン",
    "ハッサム",
    "ツボツボ",
    "ヘラクロス",
    "ニューラ",
    "ヒメグマ",
    "リングマ",
    "マグマッグ",
    "マグカルゴ",
    "ウリムー",
    "イノムー",
    "サニーゴ",
    "テッポウオ",
    "オクタン",
    "デリバード",
    "マンタイン",
    "エアームド",
    "デルビル",
    "ヘルガー",
    "キングドラ",
    "ゴマゾウ",
    "ドンファン",
    "ポリゴン２",
    "オドシシ",
    "ドーブル",
    "バルキー",
    "カポエラー",
    "ムチュール",
    "エレキッド",
    "ブビィ",
    "ミルタンク",
    "ハピナス",
    "ライコウ",
    "エンテイ",
    "スイクン",
    "ヨーギラス",
    "サナギラス",
    "バンギラス",
    "ルギア",
    "ホウオウ",
    "セレビィ",
    "キモリ",
    "ジュプトル",
    "ジュカイン",
    "アチャモ",
    "ワカシャモ",
    "バシャーモ",
    "ミズゴロウ",
    "ヌマクロー",
    "ラグラージ",
    "ポチエナ",
    "グラエナ",
    "ジグザグマ",
    "マッスグマ",
    "ケムッソ",
    "カラサリス",
    "アゲハント",
    "マユルド",
    "ドクケイル",
    "ハスボー",
    "ハスブレロ",
    "ルンパッパ",
    "タネボー",
    "コノハナ",
    "ダーテング",
    "スバメ",
    "オオスバメ",
    "キャモメ",
    "ペリッパー",
    "ラルトス",
    "キルリア",
    "サーナイト",
    "アメタマ",
    "アメモース",
    "キノココ",
    "キノガッサ",
    "ナマケロ",
    "ヤルキモノ",
    "ケッキング",
    "ツチニン",
    "テッカニン",
    "ヌケニン",
    "ゴニョニョ",
    "ドゴーム",
    "バクオング",
    "マクノシタ",
    "ハリテヤマ",
    "ルリリ",
    "ノズパス",
    "エネコ",
    "エネコロロ",
    "ヤミラミ",
    "クチート",
    "ココドラ",
    "コドラ",
    "ボスゴドラ",
    "アサナン",
    "チャーレム",
    "ラクライ",
    "ライボルト",
    "プラスル",
    "マイナン",
    "バルビート",
    "イルミーゼ",
    "ロゼリア",
    "ゴクリン",
    "マルノーム",
    "キバニア",
    "サメハダー",
    "ホエルコ",
    "ホエルオー",
    "ドンメル",
    "バクーダ",
    "コータス",
    "バネブー",
    "ブーピッグ",
    "パッチール",
    "ナックラー",
    "ビブラーバ",
    "フライゴン",
    "サボネア",
    "ノクタス",
    "チルット",
    "チルタリス",
    "ザングース",
    "ハブネーク",
    "ルナトーン",
    "ソルロック",
    "ドジョッチ",
    "ナマズン",
    "ヘイガニ",
    "シザリガー",
    "ヤジロン",
    "ネンドール",
    "リリーラ",
    "ユレイドル",
    "アノプス",
    "アーマルド",
    "ヒンバス",
    "ミロカロス",
    "ポワルン",
    "カクレオン",
    "カゲボウズ",
    "ジュペッタ",
    "ヨマワル",
    "サマヨール",
    "トロピウス",
    "チリーン",
    "アブソル",
    "ソーナノ",
    "ユキワラシ",
    "オニゴーリ",
    "タマザラシ",
    "トドグラー",
    "トドゼルガ",
    "パールル",
    "ハンテール",
    "サクラビス",
    "ジーランス",
    "ラブカス",
    "タツベイ",
    "コモルー",
    "ボーマンダ",
    "ダンバル",
    "メタング",
    "メタグロス",
    "レジロック",
    "レジアイス",
    "レジスチル",
    "ラティアス",
    "ラティオス",
    "カイオーガ",
    "グラードン",
    "レックウザ",
    "ジラーチ",
    "デオキシス",
    "ナエトル",
    "ハヤシガメ",
    "ドダイトス",
    "ヒコザル",
    "モウカザル",
    "ゴウカザル",
    "ポッチャマ",
    "ポッタイシ",
    "エンペルト",
    "ムックル",
    "ムクバード",
    "ムクホーク",
    "ビッパ",
    "ビーダル",
    "コロボーシ",
    "コロトック",
    "コリンク",
    "ルクシオ",
    "レントラー",
    "スボミー",
    "ロズレイド",
    "ズガイドス",
    "ラムパルド",
    "タテトプス",
    "トリデプス",
    "ミノムッチ",
    "ミノマダム",
    "ガーメイル",
    "ミツハニー",
    "ビークイン",
    "パチリス",
    "ブイゼル",
    "フローゼル",
    "チェリンボ",
    "チェリム",
    "カラナクシ",
    "トリトドン",
    "エテボース",
    "フワンテ",
    "フワライド",
    "ミミロル",
    "ミミロップ",
    "ムウマージ",
    "ドンカラス",
    "ニャルマー",
    "ブニャット",
    "リーシャン",
    "スカンプー",
    "スカタンク",
    "ドーミラー",
    "ドータクン",
    "ウソハチ",
    "マネネ",
    "ピンプク",
    "ペラップ",
    "ミカルゲ",
    "フカマル",
    "ガバイト",
    "ガブリアス",
    "ゴンベ",
    "リオル",
    "ルカリオ",
    "ヒポポタス",
    "カバルドン",
    "スコルピ",
    "ドラピオン",
    "グレッグル",
    "ドクロッグ",
    "マスキッパ",
    "ケイコウオ",
    "ネオラント",
    "タマンタ",
    "ユキカブリ",
    "ユキノオー",
    "マニューラ",
    "ジバコイル",
    "ベロベルト",
    "ドサイドン",
    "モジャンボ",
    "エレキブル",
    "ブーバーン",
    "トゲキッス",
    "メガヤンマ",
    "リーフィア",
    "グレイシア",
    "グライオン",
    "マンムー",
    "ポリゴンＺ",
    "エルレイド",
    "ダイノーズ",
    "ヨノワール",
    "ユキメノコ",
    "ロトム",
    "ユクシー",
    "エムリット",
    "アグノム",
    "ディアルガ",
    "パルキア",
    "ヒードラン",
    "レジギガス",
    "ギラティナ",
    "クレセリア",
    "フィオネ",
    "マナフィ",
    "ダークライ",
    "シェイミ",
    "アルセウス",
    "ビクティニ",
    "ツタージャ",
    "ジャノビー",
    "ジャローダ",
    "ポカブ",
    "チャオブー",
    "エンブオー",
    "ミジュマル",
    "フタチマル",
    "ダイケンキ",
    "ミネズミ",
    "ミルホッグ",
    "ヨーテリー",
    "ハーデリア",
    "ムーランド",
    "チョロネコ",
    "レパルダス",
    "ヤナップ",
    "ヤナッキー",
    "バオップ",
    "バオッキー",
    "ヒヤップ",
    "ヒヤッキー",
    "ムンナ",
    "ムシャーナ",
    "マメパト",
    "ハトーボー",
    "ケンホロウ",
    "シママ",
    "ゼブライカ",
    "ダンゴロ",
    "ガントル",
    "ギガイアス",
    "コロモリ",
    "ココロモリ",
    "モグリュー",
    "ドリュウズ",
    "タブンネ",
    "ドッコラー",
    "ドテッコツ",
    "ローブシン",
    "オタマロ",
    "ガマガル",
    "ガマゲロゲ",
    "ナゲキ",
    "ダゲキ",
    "クルミル",
    "クルマユ",
    "ハハコモリ",
    "フシデ",
    "ホイーガ",
    "ペンドラー",
    "モンメン",
    "エルフーン",
    "チュリネ",
    "ドレディア",
    "バスラオ",
    "メグロコ",
    "ワルビル",
    "ワルビアル",
    "ダルマッカ",
    "ヒヒダルマ",
    "マラカッチ",
    "イシズマイ",
    "イワパレス",
    "ズルッグ",
    "ズルズキン",
    "シンボラー",
    "デスマス",
    "デスカーン",
    "プロトーガ",
    "アバゴーラ",
    "アーケン",
    "アーケオス",
    "ヤブクロン",
    "ダストダス",
    "ゾロア",
    "ゾロアーク",
    "チラーミィ",
    "チラチーノ",
    "ゴチム",
    "ゴチミル",
    "ゴチルゼル",
    "ユニラン",
    "ダブラン",
    "ランクルス",
    "コアルヒー",
    "スワンナ",
    "バニプッチ",
    "バニリッチ",
    "バイバニラ",
    "シキジカ",
    "メブキジカ",
    "エモンガ",
    "カブルモ",
    "シュバルゴ",
    "タマゲタケ",
    "モロバレル",
    "プルリル",
    "ブルンゲル",
    "ママンボウ",
    "バチュル",
    "デンチュラ",
    "テッシード",
    "ナットレイ",
    "ギアル",
    "ギギアル",
    "ギギギアル",
    "シビシラス",
    "シビビール",
    "シビルドン",
    "リグレー",
    "オーベム",
    "ヒトモシ",
    "ランプラー",
    "シャンデラ",
    "キバゴ",
    "オノンド",
    "オノノクス",
    "クマシュン",
    "ツンベアー",
    "フリージオ",
    "チョボマキ",
    "アギルダー",
    "マッギョ",
    "コジョフー",
    "コジョンド",
    "クリムガン",
    "ゴビット",
    "ゴルーグ",
    "コマタナ",
    "キリキザン",
    "バッフロン",
    "ワシボン",
    "ウォーグル",
    "バルチャイ",
    "バルジーナ",
    "クイタラン",
    "アイアント",
    "モノズ",
    "ジヘッド",
    "サザンドラ",
    "メラルバ",
    "ウルガモス",
    "コバルオン",
    "テラキオン",
    "ビリジオン",
    "トルネロス",
    "ボルトロス",
    "レシラム",
    "ゼクロム",
    "ランドロス",
    "キュレム",
    "ケルディオ",
    "メロエッタ",
    "ゲノセクト",
    "ハリマロン",
    "ハリボーグ",
    "ブリガロン",
    "フォッコ",
    "テールナー",
    "マフォクシー",
    "ケロマツ",
    "ゲコガシラ",
    "ゲッコウガ",
    "ホルビー",
    "ホルード",
    "ヤヤコマ",
    "ヒノヤコマ",
    "ファイアロー",
    "コフキムシ",
    "コフーライ",
    "ビビヨン",
    "シシコ",
    "カエンジシ",
    "フラベベ",
    "フラエッテ",
    "フラージェス",
    "メェークル",
    "ゴーゴート",
    "ヤンチャム",
    "ゴロンダ",
    "トリミアン",
    "ニャスパー",
    "ニャオニクス",
    "ヒトツキ",
    "ニダンギル",
    "ギルガルド",
    "シュシュプ",
    "フレフワン",
    "ペロッパフ",
    "ペロリーム",
    "マーイーカ",
    "カラマネロ",
    "カメテテ",
    "ガメノデス",
    "クズモー",
    "ドラミドロ",
    "ウデッポウ",
    "ブロスター",
    "エリキテル",
    "エレザード",
    "チゴラス",
    "ガチゴラス",
    "アマルス",
    "アマルルガ",
    "ニンフィア",
    "ルチャブル",
    "デデンネ",
    "メレシー",
    "ヌメラ",
    "ヌメイル",
    "ヌメルゴン",
    "クレッフィ",
    "ボクレー",
    "オーロット",
    "バケッチャ",
    "パンプジン",
    "カチコール",
    "クレベース",
    "オンバット",
    "オンバーン",
    "ゼルネアス",
    "イベルタル",
    "ジガルデ",
    "ディアンシー",
    "フーパ",
    "ボルケニオン",
    "モクロー",
    "フクスロー",
    "ジュナイパー",
    "ニャビー",
    "ニャヒート",
    "ガオガエン",
    "アシマリ",
    "オシャマリ",
    "アシレーヌ",
    "ツツケラ",
    "ケララッパ",
    "ドデカバシ",
    "ヤングース",
    "デカグース",
    "アゴジムシ",
    "デンヂムシ",
    "クワガノン",
    "マケンカニ",
    "ケケンカニ",
    "オドリドリ",
    "アブリー",
    "アブリボン",
    "イワンコ",
    "ルガルガン",
    "ヨワシ",
    "ヒドイデ",
    "ドヒドイデ",
    "ドロバンコ",
    "バンバドロ",
    "シズクモ",
    "オニシズクモ",
    "カリキリ",
    "ラランテス",
    "ネマシュ",
    "マシェード",
    "ヤトウモリ",
    "エンニュート",
    "ヌイコグマ",
    "キテルグマ",
    "アマカジ",
    "アママイコ",
    "アマージョ",
    "キュワワー",
    "ヤレユータン",
    "ナゲツケサル",
    "コソクムシ",
    "グソクムシャ",
    "スナバァ",
    "シロデスナ",
    "ナマコブシ",
    "タイプ：ヌル",
    "シルヴァディ",
    "メテノ",
    "ネッコアラ",
    "バクガメス",
    "トゲデマル",
    "ミミッキュ",
    "ハギギシリ",
    "ジジーロン",
    "ダダリン",
    "ジャラコ",
    "ジャランゴ",
    "ジャラランガ",
    "カプ・コケコ",
    "カプ・テテフ",
    "カプ・ブルル",
    "カプ・レヒレ",
    "コスモッグ",
    "コスモウム",
    "ソルガレオ",
    "ルナアーラ",
    "ウツロイド",
    "マッシブーン",
    "フェローチェ",
    "デンジュモク",
    "テッカグヤ",
    "カミツルギ",
    "アクジキング",
    "ネクロズマ",
    "マギアナ",
    "マーシャドー",
    "ベベノム",
    "アーゴヨン",
    "ツンデツンデ",
    "ズガドーン",
    "ゼラオラ",
  ],
  zh: [
    "﻿蛋",
    "妙蛙种子",
    "妙蛙草",
    "妙蛙花",
    "小火龙",
    "火恐龙",
    "喷火龙",
    "杰尼龟",
    "卡咪龟",
    "水箭龟",
    "绿毛虫",
    "铁甲蛹",
    "巴大蝶",
    "独角虫",
    "铁壳蛹",
    "大针蜂",
    "波波",
    "比比鸟",
    "大比鸟",
    "小拉达",
    "拉达",
    "烈雀",
    "大嘴雀",
    "阿柏蛇",
    "阿柏怪",
    "皮卡丘",
    "雷丘",
    "穿山鼠",
    "穿山王",
    "尼多兰",
    "尼多娜",
    "尼多后",
    "尼多朗",
    "尼多力诺",
    "尼多王",
    "皮皮",
    "皮可西",
    "六尾",
    "九尾",
    "胖丁",
    "胖可丁",
    "超音蝠",
    "大嘴蝠",
    "走路草",
    "臭臭花",
    "霸王花",
    "派拉斯",
    "派拉斯特",
    "毛球",
    "摩鲁蛾",
    "地鼠",
    "三地鼠",
    "喵喵",
    "猫老大",
    "可达鸭",
    "哥达鸭",
    "猴怪",
    "火暴猴",
    "卡蒂狗",
    "风速狗",
    "蚊香蝌蚪",
    "蚊香君",
    "蚊香泳士",
    "凯西",
    "勇基拉",
    "胡地",
    "腕力",
    "豪力",
    "怪力",
    "喇叭芽",
    "口呆花",
    "大食花",
    "玛瑙水母",
    "毒刺水母",
    "小拳石",
    "隆隆石",
    "隆隆岩",
    "小火马",
    "烈焰马",
    "呆呆兽",
    "呆壳兽",
    "小磁怪",
    "三合一磁怪",
    "大葱鸭",
    "嘟嘟",
    "嘟嘟利",
    "小海狮",
    "白海狮",
    "臭泥",
    "臭臭泥",
    "大舌贝",
    "刺甲贝",
    "鬼斯",
    "鬼斯通",
    "耿鬼",
    "大岩蛇",
    "催眠貘",
    "引梦貘人",
    "大钳蟹",
    "巨钳蟹",
    "霹雳电球",
    "顽皮雷弹",
    "蛋蛋",
    "椰蛋树",
    "卡拉卡拉",
    "嘎啦嘎啦",
    "飞腿郎",
    "快拳郎",
    "大舌头",
    "瓦斯弹",
    "双弹瓦斯",
    "独角犀牛",
    "钻角犀兽",
    "吉利蛋",
    "蔓藤怪",
    "袋兽",
    "墨海马",
    "海刺龙",
    "角金鱼",
    "金鱼王",
    "海星星",
    "宝石海星",
    "魔墙人偶",
    "飞天螳螂",
    "迷唇姐",
    "电击兽",
    "鸭嘴火兽",
    "凯罗斯",
    "肯泰罗",
    "鲤鱼王",
    "暴鲤龙",
    "拉普拉斯",
    "百变怪",
    "伊布",
    "水伊布",
    "雷伊布",
    "火伊布",
    "多边兽",
    "菊石兽",
    "多刺菊石兽",
    "化石盔",
    "镰刀盔",
    "化石翼龙",
    "卡比兽",
    "急冻鸟",
    "闪电鸟",
    "火焰鸟",
    "迷你龙",
    "哈克龙",
    "快龙",
    "超梦",
    "梦幻",
    "菊草叶",
    "月桂叶",
    "大竺葵",
    "火球鼠",
    "火岩鼠",
    "火暴兽",
    "小锯鳄",
    "蓝鳄",
    "大力鳄",
    "尾立",
    "大尾立",
    "咕咕",
    "猫头夜鹰",
    "芭瓢虫",
    "安瓢虫",
    "圆丝蛛",
    "阿利多斯",
    "叉字蝠",
    "灯笼鱼",
    "电灯怪",
    "皮丘",
    "皮宝宝",
    "宝宝丁",
    "波克比",
    "波克基古",
    "天然雀",
    "天然鸟",
    "咩利羊",
    "茸茸羊",
    "电龙",
    "美丽花",
    "玛力露",
    "玛力露丽",
    "树才怪",
    "蚊香蛙皇",
    "毽子草",
    "毽子花",
    "毽子棉",
    "长尾怪手",
    "向日种子",
    "向日花怪",
    "蜻蜻蜓",
    "乌波",
    "沼王",
    "太阳伊布",
    "月亮伊布",
    "黑暗鸦",
    "呆呆王",
    "梦妖",
    "未知图腾",
    "果然翁",
    "麒麟奇",
    "榛果球",
    "佛烈托斯",
    "土龙弟弟",
    "天蝎",
    "大钢蛇",
    "布鲁",
    "布鲁皇",
    "千针鱼",
    "巨钳螳螂",
    "壶壶",
    "赫拉克罗斯",
    "狃拉",
    "熊宝宝",
    "圈圈熊",
    "熔岩虫",
    "熔岩蜗牛",
    "小山猪",
    "长毛猪",
    "太阳珊瑚",
    "铁炮鱼",
    "章鱼桶",
    "信使鸟",
    "巨翅飞鱼",
    "盔甲鸟",
    "戴鲁比",
    "黑鲁加",
    "刺龙王",
    "小小象",
    "顿甲",
    "多边兽Ⅱ",
    "惊角鹿",
    "图图犬",
    "无畏小子",
    "战舞郎",
    "迷唇娃",
    "电击怪",
    "鸭嘴宝宝",
    "大奶罐",
    "幸福蛋",
    "雷公",
    "炎帝",
    "水君",
    "幼基拉斯",
    "沙基拉斯",
    "班基拉斯",
    "洛奇亚",
    "凤王",
    "时拉比",
    "木守宫",
    "森林蜥蜴",
    "蜥蜴王",
    "火稚鸡",
    "力壮鸡",
    "火焰鸡",
    "水跃鱼",
    "沼跃鱼",
    "巨沼怪",
    "土狼犬",
    "大狼犬",
    "蛇纹熊",
    "直冲熊",
    "刺尾虫",
    "甲壳茧",
    "狩猎凤蝶",
    "盾甲茧",
    "毒粉蛾",
    "莲叶童子",
    "莲帽小童",
    "乐天河童",
    "橡实果",
    "长鼻叶",
    "狡猾天狗",
    "傲骨燕",
    "大王燕",
    "长翅鸥",
    "大嘴鸥",
    "拉鲁拉丝",
    "奇鲁莉安",
    "沙奈朵",
    "溜溜糖球",
    "雨翅蛾",
    "蘑蘑菇",
    "斗笠菇",
    "懒人獭",
    "过动猿",
    "请假王",
    "土居忍士",
    "铁面忍者",
    "脱壳忍者",
    "咕妞妞",
    "吼爆弹",
    "爆音怪",
    "幕下力士",
    "铁掌力士",
    "露力丽",
    "朝北鼻",
    "向尾喵",
    "优雅猫",
    "勾魂眼",
    "大嘴娃",
    "可可多拉",
    "可多拉",
    "波士可多拉",
    "玛沙那",
    "恰雷姆",
    "落雷兽",
    "雷电兽",
    "正电拍拍",
    "负电拍拍",
    "电萤虫",
    "甜甜萤",
    "毒蔷薇",
    "溶食兽",
    "吞食兽",
    "利牙鱼",
    "巨牙鲨",
    "吼吼鲸",
    "吼鲸王",
    "呆火驼",
    "喷火驼",
    "煤炭龟",
    "跳跳猪",
    "噗噗猪",
    "晃晃斑",
    "大颚蚁",
    "超音波幼虫",
    "沙漠蜻蜓",
    "刺球仙人掌",
    "梦歌仙人掌",
    "青绵鸟",
    "七夕青鸟",
    "猫鼬斩",
    "饭匙蛇",
    "月石",
    "太阳岩",
    "泥泥鳅",
    "鲶鱼王",
    "龙虾小兵",
    "铁螯龙虾",
    "天秤偶",
    "念力土偶",
    "触手百合",
    "摇篮百合",
    "太古羽虫",
    "太古盔甲",
    "丑丑鱼",
    "美纳斯",
    "飘浮泡泡",
    "变隐龙",
    "怨影娃娃",
    "诅咒娃娃",
    "夜巡灵",
    "彷徨夜灵",
    "热带龙",
    "风铃铃",
    "阿勃梭鲁",
    "小果然",
    "雪童子",
    "冰鬼护",
    "海豹球",
    "海魔狮",
    "帝牙海狮",
    "珍珠贝",
    "猎斑鱼",
    "樱花鱼",
    "古空棘鱼",
    "爱心鱼",
    "宝贝龙",
    "甲壳龙",
    "暴飞龙",
    "铁哑铃",
    "金属怪",
    "巨金怪",
    "雷吉洛克",
    "雷吉艾斯",
    "雷吉斯奇鲁",
    "拉帝亚斯",
    "拉帝欧斯",
    "盖欧卡",
    "固拉多",
    "烈空坐",
    "基拉祈",
    "代欧奇希斯",
    "草苗龟",
    "树林龟",
    "土台龟",
    "小火焰猴",
    "猛火猴",
    "烈焰猴",
    "波加曼",
    "波皇子",
    "帝王拿波",
    "姆克儿",
    "姆克鸟",
    "姆克鹰",
    "大牙狸",
    "大尾狸",
    "圆法师",
    "音箱蟀",
    "小猫怪",
    "勒克猫",
    "伦琴猫",
    "含羞苞",
    "罗丝雷朵",
    "头盖龙",
    "战槌龙",
    "盾甲龙",
    "护城龙",
    "结草儿",
    "结草贵妇",
    "绅士蛾",
    "三蜜蜂",
    "蜂女王",
    "帕奇利兹",
    "泳圈鼬",
    "浮潜鼬",
    "樱花宝",
    "樱花儿",
    "无壳海兔",
    "海兔兽",
    "双尾怪手",
    "飘飘球",
    "随风球",
    "卷卷耳",
    "长耳兔",
    "梦妖魔",
    "乌鸦头头",
    "魅力喵",
    "东施喵",
    "铃铛响",
    "臭鼬噗",
    "坦克臭鼬",
    "铜镜怪",
    "青铜钟",
    "盆才怪",
    "魔尼尼",
    "小福蛋",
    "聒噪鸟",
    "花岩怪",
    "圆陆鲨",
    "尖牙陆鲨",
    "烈咬陆鲨",
    "小卡比兽",
    "利欧路",
    "路卡利欧",
    "沙河马",
    "河马兽",
    "钳尾蝎",
    "龙王蝎",
    "不良蛙",
    "毒骷蛙",
    "尖牙笼",
    "荧光鱼",
    "霓虹鱼",
    "小球飞鱼",
    "雪笠怪",
    "暴雪王",
    "玛狃拉",
    "自爆磁怪",
    "大舌舔",
    "超甲狂犀",
    "巨蔓藤",
    "电击魔兽",
    "鸭嘴炎兽",
    "波克基斯",
    "远古巨蜓",
    "叶伊布",
    "冰伊布",
    "天蝎王",
    "象牙猪",
    "多边兽Ｚ",
    "艾路雷朵",
    "大朝北鼻",
    "黑夜魔灵",
    "雪妖女",
    "洛托姆",
    "由克希",
    "艾姆利多",
    "亚克诺姆",
    "帝牙卢卡",
    "帕路奇亚",
    "席多蓝恩",
    "雷吉奇卡斯",
    "骑拉帝纳",
    "克雷色利亚",
    "霏欧纳",
    "玛纳霏",
    "达克莱伊",
    "谢米",
    "阿尔宙斯",
    "比克提尼",
    "藤藤蛇",
    "青藤蛇",
    "君主蛇",
    "暖暖猪",
    "炒炒猪",
    "炎武王",
    "水水獭",
    "双刃丸",
    "大剑鬼",
    "探探鼠",
    "步哨鼠",
    "小约克",
    "哈约克",
    "长毛狗",
    "扒手猫",
    "酷豹",
    "花椰猴",
    "花椰猿",
    "爆香猴",
    "爆香猿",
    "冷水猴",
    "冷水猿",
    "食梦梦",
    "梦梦蚀",
    "豆豆鸽",
    "咕咕鸽",
    "高傲雉鸡",
    "斑斑马",
    "雷电斑马",
    "石丸子",
    "地幔岩",
    "庞岩怪",
    "滚滚蝙蝠",
    "心蝙蝠",
    "螺钉地鼠",
    "龙头地鼠",
    "差不多娃娃",
    "搬运小匠",
    "铁骨土人",
    "修建老匠",
    "圆蝌蚪",
    "蓝蟾蜍",
    "蟾蜍王",
    "投摔鬼",
    "打击鬼",
    "虫宝包",
    "宝包茧",
    "保姆虫",
    "百足蜈蚣",
    "车轮球",
    "蜈蚣王",
    "木棉球",
    "风妖精",
    "百合根娃娃",
    "裙儿小姐",
    "野蛮鲈鱼",
    "黑眼鳄",
    "混混鳄",
    "流氓鳄",
    "火红不倒翁",
    "达摩狒狒",
    "沙铃仙人掌",
    "石居蟹",
    "岩殿居蟹",
    "滑滑小子",
    "头巾混混",
    "象征鸟",
    "哭哭面具",
    "死神棺",
    "原盖海龟",
    "肋骨海龟",
    "始祖小鸟",
    "始祖大鸟",
    "破破袋",
    "灰尘山",
    "索罗亚",
    "索罗亚克",
    "泡沫栗鼠",
    "奇诺栗鼠",
    "哥德宝宝",
    "哥德小童",
    "哥德小姐",
    "单卵细胞球",
    "双卵细胞球",
    "人造细胞卵",
    "鸭宝宝",
    "舞天鹅",
    "迷你冰",
    "多多冰",
    "双倍多多冰",
    "四季鹿",
    "萌芽鹿",
    "电飞鼠",
    "盖盖虫",
    "骑士蜗牛",
    "哎呀球菇",
    "败露球菇",
    "轻飘飘",
    "胖嘟嘟",
    "保姆曼波",
    "电电虫",
    "电蜘蛛",
    "种子铁球",
    "坚果哑铃",
    "齿轮儿",
    "齿轮组",
    "齿轮怪",
    "麻麻小鱼",
    "麻麻鳗",
    "麻麻鳗鱼王",
    "小灰怪",
    "大宇怪",
    "烛光灵",
    "灯火幽灵",
    "水晶灯火灵",
    "牙牙",
    "斧牙龙",
    "双斧战龙",
    "喷嚏熊",
    "冻原熊",
    "几何雪花",
    "小嘴蜗",
    "敏捷虫",
    "泥巴鱼",
    "功夫鼬",
    "师父鼬",
    "赤面龙",
    "泥偶小人",
    "泥偶巨人",
    "驹刀小兵",
    "劈斩司令",
    "爆炸头水牛",
    "毛头小鹰",
    "勇士雄鹰",
    "秃鹰丫头",
    "秃鹰娜",
    "熔蚁兽",
    "铁蚁",
    "单首龙",
    "双首暴龙",
    "三首恶龙",
    "燃烧虫",
    "火神蛾",
    "勾帕路翁",
    "代拉基翁",
    "毕力吉翁",
    "龙卷云",
    "雷电云",
    "莱希拉姆",
    "捷克罗姆",
    "土地云",
    "酋雷姆",
    "凯路迪欧",
    "美洛耶塔",
    "盖诺赛克特",
    "哈力栗",
    "胖胖哈力",
    "布里卡隆",
    "火狐狸",
    "长尾火狐",
    "妖火红狐",
    "呱呱泡蛙",
    "呱头蛙",
    "甲贺忍蛙",
    "掘掘兔",
    "掘地兔",
    "小箭雀",
    "火箭雀",
    "烈箭鹰",
    "粉蝶虫",
    "粉蝶蛹",
    "彩粉蝶",
    "小狮狮",
    "火炎狮",
    "花蓓蓓",
    "花叶蒂",
    "花洁夫人",
    "坐骑小羊",
    "坐骑山羊",
    "顽皮熊猫",
    "流氓熊猫",
    "多丽米亚",
    "妙喵",
    "超能妙喵",
    "独剑鞘",
    "双剑鞘",
    "坚盾剑怪",
    "粉香香",
    "芳香精",
    "绵绵泡芙",
    "胖甜妮",
    "好啦鱿",
    "乌贼王",
    "龟脚脚",
    "龟足巨铠",
    "垃垃藻",
    "毒藻龙",
    "铁臂枪虾",
    "钢炮臂虾",
    "伞电蜥",
    "光电伞蜥",
    "宝宝暴龙",
    "怪颚龙",
    "冰雪龙",
    "冰雪巨龙",
    "仙子伊布",
    "摔角鹰人",
    "咚咚鼠",
    "小碎钻",
    "黏黏宝",
    "黏美儿",
    "黏美龙",
    "钥圈儿",
    "小木灵",
    "朽木妖",
    "南瓜精",
    "南瓜怪人",
    "冰宝",
    "冰岩怪",
    "嗡蝠",
    "音波龙",
    "哲尔尼亚斯",
    "伊裴尔塔尔",
    "基格尔德",
    "蒂安希",
    "胡帕",
    "波尔凯尼恩",
    "木木枭",
    "投羽枭",
    "狙射树枭",
    "火斑喵",
    "炎热喵",
    "炽焰咆哮虎",
    "球球海狮",
    "花漾海狮",
    "西狮海壬",
    "小笃儿",
    "喇叭啄鸟",
    "铳嘴大鸟",
    "猫鼬少",
    "猫鼬探长",
    "强颚鸡母虫",
    "虫电宝",
    "锹农炮虫",
    "好胜蟹",
    "好胜毛蟹",
    "花舞鸟",
    "萌虻",
    "蝶结萌虻",
    "岩狗狗",
    "鬃岩狼人",
    "弱丁鱼",
    "好坏星",
    "超坏星",
    "泥驴仔",
    "重泥挽马",
    "滴蛛",
    "滴蛛霸",
    "伪螳草",
    "兰螳花",
    "睡睡菇",
    "灯罩夜菇",
    "夜盗火蜥",
    "焰后蜥",
    "童偶熊",
    "穿着熊",
    "甜竹竹",
    "甜舞妮",
    "甜冷美后",
    "花疗环环",
    "智挥猩",
    "投掷猴",
    "胆小虫",
    "具甲武者",
    "沙丘娃",
    "噬沙堡爷",
    "拳海参",
    "属性：空",
    "银伴战兽",
    "小陨星",
    "树枕尾熊",
    "爆焰龟兽",
    "托戈德玛尔",
    "谜拟Ｑ",
    "磨牙彩皮鱼",
    "老翁龙",
    "破破舵轮",
    "心鳞宝",
    "鳞甲龙",
    "杖尾鳞甲龙",
    "卡璞・鸣鸣",
    "卡璞・蝶蝶",
    "卡璞・哞哞",
    "卡璞・鳍鳍",
    "科斯莫古",
    "科斯莫姆",
    "索尔迦雷欧",
    "露奈雅拉",
    "虚吾伊德",
    "爆肌蚊",
    "费洛美螂",
    "电束木",
    "铁火辉夜",
    "纸御剑",
    "恶食大王",
    "奈克洛兹玛",
    "玛机雅娜",
    "玛夏多",
    "毒贝比",
    "四颚针龙",
    "垒磊石",
    "砰头小丑",
    "捷拉奥拉",
  ],
} as const;

export const GEN7_EVENT_NATURES = {
  en: [
    "Hardy",
    "Lonely",
    "Brave",
    "Adamant",
    "Naughty",
    "Bold",
    "Docile",
    "Relaxed",
    "Impish",
    "Lax",
    "Timid",
    "Hasty",
    "Serious",
    "Jolly",
    "Naive",
    "Modest",
    "Mild",
    "Quiet",
    "Bashful",
    "Rash",
    "Calm",
    "Gentle",
    "Sassy",
    "Careful",
    "Quirky",
  ],
  ja: [
    "がんばりや",
    "さみしがり",
    "ゆうかん",
    "いじっぱり",
    "やんちゃ",
    "ずぶとい",
    "すなお",
    "のんき",
    "わんぱく",
    "のうてんき",
    "おくびょう",
    "せっかち",
    "まじめ",
    "ようき",
    "むじゃき",
    "ひかえめ",
    "おっとり",
    "れいせい",
    "てれや",
    "うっかりや",
    "おだやか",
    "おとなしい",
    "なまいき",
    "しんちょう",
    "きまぐれ",
  ],
  zh: [
    "﻿勤奋",
    "怕寂寞",
    "勇敢",
    "固执",
    "顽皮",
    "大胆",
    "坦率",
    "悠闲",
    "淘气",
    "乐天",
    "胆小",
    "急躁",
    "认真",
    "爽朗",
    "天真",
    "内敛",
    "慢吞吞",
    "冷静",
    "害羞",
    "马虎",
    "温和",
    "温顺",
    "自大",
    "慎重",
    "浮躁",
  ],
} as const;

export const GEN7_EVENT_PERSONAL = [
  {
    species: 0,
    forms: [
      {
        genderRatio: 255,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 1,
    forms: [
      {
        genderRatio: 31,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 2,
    forms: [
      {
        genderRatio: 31,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 3,
    forms: [
      {
        genderRatio: 31,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 4,
    forms: [
      {
        genderRatio: 31,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 5,
    forms: [
      {
        genderRatio: 31,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 6,
    forms: [
      {
        genderRatio: 31,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 7,
    forms: [
      {
        genderRatio: 31,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 8,
    forms: [
      {
        genderRatio: 31,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 9,
    forms: [
      {
        genderRatio: 31,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 10,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 11,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 12,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 13,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 14,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 15,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 16,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 17,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 18,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 19,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 20,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 21,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 22,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 23,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: true,
  },
  {
    species: 24,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: true,
  },
  {
    species: 25,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 0,
        defaultPerfectIvCount: 3,
      },
      {
        genderRatio: 0,
        defaultPerfectIvCount: 3,
      },
      {
        genderRatio: 0,
        defaultPerfectIvCount: 3,
      },
      {
        genderRatio: 0,
        defaultPerfectIvCount: 3,
      },
      {
        genderRatio: 0,
        defaultPerfectIvCount: 3,
      },
      {
        genderRatio: 0,
        defaultPerfectIvCount: 3,
      },
      {
        genderRatio: 0,
        defaultPerfectIvCount: 3,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 26,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 27,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 28,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 29,
    forms: [
      {
        genderRatio: 254,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 30,
    forms: [
      {
        genderRatio: 254,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 31,
    forms: [
      {
        genderRatio: 254,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 32,
    forms: [
      {
        genderRatio: 0,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 33,
    forms: [
      {
        genderRatio: 0,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 34,
    forms: [
      {
        genderRatio: 0,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 35,
    forms: [
      {
        genderRatio: 191,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 36,
    forms: [
      {
        genderRatio: 191,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 37,
    forms: [
      {
        genderRatio: 191,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 191,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 38,
    forms: [
      {
        genderRatio: 191,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 191,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 39,
    forms: [
      {
        genderRatio: 191,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 40,
    forms: [
      {
        genderRatio: 191,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 41,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 42,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 43,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 44,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 45,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 46,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 47,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 48,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 49,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 50,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 51,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 52,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 53,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 54,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 55,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 56,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 57,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 58,
    forms: [
      {
        genderRatio: 63,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 59,
    forms: [
      {
        genderRatio: 63,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 60,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 61,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 62,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 63,
    forms: [
      {
        genderRatio: 63,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 64,
    forms: [
      {
        genderRatio: 63,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 65,
    forms: [
      {
        genderRatio: 63,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 66,
    forms: [
      {
        genderRatio: 63,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 67,
    forms: [
      {
        genderRatio: 63,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 68,
    forms: [
      {
        genderRatio: 63,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 69,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 70,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 71,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 72,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 73,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 74,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 75,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 76,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 77,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 78,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 79,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 80,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 81,
    forms: [
      {
        genderRatio: 255,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 82,
    forms: [
      {
        genderRatio: 255,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 83,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 84,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 85,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 86,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: true,
  },
  {
    species: 87,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: true,
  },
  {
    species: 88,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 89,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 90,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 91,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 92,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 93,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 94,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 95,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 96,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 97,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 98,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 99,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 100,
    forms: [
      {
        genderRatio: 255,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 101,
    forms: [
      {
        genderRatio: 255,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 102,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 103,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 104,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 105,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 106,
    forms: [
      {
        genderRatio: 0,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 107,
    forms: [
      {
        genderRatio: 0,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 108,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: true,
  },
  {
    species: 109,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 110,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 111,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 112,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 113,
    forms: [
      {
        genderRatio: 254,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 114,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 115,
    forms: [
      {
        genderRatio: 254,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 116,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 117,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 118,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 119,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 120,
    forms: [
      {
        genderRatio: 255,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 121,
    forms: [
      {
        genderRatio: 255,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 122,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: true,
  },
  {
    species: 123,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 124,
    forms: [
      {
        genderRatio: 254,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: true,
  },
  {
    species: 125,
    forms: [
      {
        genderRatio: 63,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 126,
    forms: [
      {
        genderRatio: 63,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 127,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 128,
    forms: [
      {
        genderRatio: 0,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 129,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 130,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 131,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 132,
    forms: [
      {
        genderRatio: 255,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 133,
    forms: [
      {
        genderRatio: 31,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 134,
    forms: [
      {
        genderRatio: 31,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 135,
    forms: [
      {
        genderRatio: 31,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 136,
    forms: [
      {
        genderRatio: 31,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 137,
    forms: [
      {
        genderRatio: 255,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 138,
    forms: [
      {
        genderRatio: 31,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: true,
  },
  {
    species: 139,
    forms: [
      {
        genderRatio: 31,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: true,
  },
  {
    species: 140,
    forms: [
      {
        genderRatio: 31,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: true,
  },
  {
    species: 141,
    forms: [
      {
        genderRatio: 31,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: true,
  },
  {
    species: 142,
    forms: [
      {
        genderRatio: 31,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 143,
    forms: [
      {
        genderRatio: 31,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 144,
    forms: [
      {
        genderRatio: 255,
        defaultPerfectIvCount: 3,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 145,
    forms: [
      {
        genderRatio: 255,
        defaultPerfectIvCount: 3,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 146,
    forms: [
      {
        genderRatio: 255,
        defaultPerfectIvCount: 3,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 147,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 148,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 149,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 150,
    forms: [
      {
        genderRatio: 255,
        defaultPerfectIvCount: 3,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 151,
    forms: [
      {
        genderRatio: 255,
        defaultPerfectIvCount: 3,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 152,
    forms: [
      {
        genderRatio: 31,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 153,
    forms: [
      {
        genderRatio: 31,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 154,
    forms: [
      {
        genderRatio: 31,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 155,
    forms: [
      {
        genderRatio: 31,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 156,
    forms: [
      {
        genderRatio: 31,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 157,
    forms: [
      {
        genderRatio: 31,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 158,
    forms: [
      {
        genderRatio: 31,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 159,
    forms: [
      {
        genderRatio: 31,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 160,
    forms: [
      {
        genderRatio: 31,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 161,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 162,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 163,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: true,
  },
  {
    species: 164,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: true,
  },
  {
    species: 165,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 166,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 167,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 168,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 169,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 170,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 171,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 172,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 173,
    forms: [
      {
        genderRatio: 191,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 174,
    forms: [
      {
        genderRatio: 191,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 175,
    forms: [
      {
        genderRatio: 31,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 176,
    forms: [
      {
        genderRatio: 31,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 177,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: true,
  },
  {
    species: 178,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: true,
  },
  {
    species: 179,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: true,
  },
  {
    species: 180,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: true,
  },
  {
    species: 181,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: true,
  },
  {
    species: 182,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 183,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 184,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 185,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 186,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 187,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 188,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 189,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 190,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: true,
  },
  {
    species: 191,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 192,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 193,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 194,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 195,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 196,
    forms: [
      {
        genderRatio: 31,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 197,
    forms: [
      {
        genderRatio: 31,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 198,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 199,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 200,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 201,
    forms: [
      {
        genderRatio: 255,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 255,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 255,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 255,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 255,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 255,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 255,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 255,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 255,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 255,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 255,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 255,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 255,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 255,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 255,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 255,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 255,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 255,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 255,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 255,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 255,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 255,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 255,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 255,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 255,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 255,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 255,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 255,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 202,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 203,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 204,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: true,
  },
  {
    species: 205,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: true,
  },
  {
    species: 206,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: true,
  },
  {
    species: 207,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: true,
  },
  {
    species: 208,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 209,
    forms: [
      {
        genderRatio: 191,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 210,
    forms: [
      {
        genderRatio: 191,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 211,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 212,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 213,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 214,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: true,
  },
  {
    species: 215,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 216,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 217,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 218,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 219,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 220,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 221,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 222,
    forms: [
      {
        genderRatio: 191,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 223,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: true,
  },
  {
    species: 224,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: true,
  },
  {
    species: 225,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 226,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: true,
  },
  {
    species: 227,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 228,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: true,
  },
  {
    species: 229,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: true,
  },
  {
    species: 230,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 231,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 232,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 233,
    forms: [
      {
        genderRatio: 255,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 234,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 235,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 236,
    forms: [
      {
        genderRatio: 0,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 237,
    forms: [
      {
        genderRatio: 0,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 238,
    forms: [
      {
        genderRatio: 254,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: true,
  },
  {
    species: 239,
    forms: [
      {
        genderRatio: 63,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 240,
    forms: [
      {
        genderRatio: 63,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 241,
    forms: [
      {
        genderRatio: 254,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 242,
    forms: [
      {
        genderRatio: 254,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 243,
    forms: [
      {
        genderRatio: 255,
        defaultPerfectIvCount: 3,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 244,
    forms: [
      {
        genderRatio: 255,
        defaultPerfectIvCount: 3,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 245,
    forms: [
      {
        genderRatio: 255,
        defaultPerfectIvCount: 3,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 246,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: true,
  },
  {
    species: 247,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: true,
  },
  {
    species: 248,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: true,
  },
  {
    species: 249,
    forms: [
      {
        genderRatio: 255,
        defaultPerfectIvCount: 3,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 250,
    forms: [
      {
        genderRatio: 255,
        defaultPerfectIvCount: 3,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 251,
    forms: [
      {
        genderRatio: 255,
        defaultPerfectIvCount: 3,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 252,
    forms: [
      {
        genderRatio: 31,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 253,
    forms: [
      {
        genderRatio: 31,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 254,
    forms: [
      {
        genderRatio: 31,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 255,
    forms: [
      {
        genderRatio: 31,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 256,
    forms: [
      {
        genderRatio: 31,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 257,
    forms: [
      {
        genderRatio: 31,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 258,
    forms: [
      {
        genderRatio: 31,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 259,
    forms: [
      {
        genderRatio: 31,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 260,
    forms: [
      {
        genderRatio: 31,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 261,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 262,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 263,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 264,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 265,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 266,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 267,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 268,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 269,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 270,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 271,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 272,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 273,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 274,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 275,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 276,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 277,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 278,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 279,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 280,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 281,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 282,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 283,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 284,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 285,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 286,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 287,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 288,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 289,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 290,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 291,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 292,
    forms: [
      {
        genderRatio: 255,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 293,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 294,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 295,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 296,
    forms: [
      {
        genderRatio: 63,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 297,
    forms: [
      {
        genderRatio: 63,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 298,
    forms: [
      {
        genderRatio: 191,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 299,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 300,
    forms: [
      {
        genderRatio: 191,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 301,
    forms: [
      {
        genderRatio: 191,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 302,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 303,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 304,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 305,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 306,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 307,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 308,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 309,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: true,
  },
  {
    species: 310,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: true,
  },
  {
    species: 311,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 312,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 313,
    forms: [
      {
        genderRatio: 0,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 314,
    forms: [
      {
        genderRatio: 254,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 315,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 316,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 317,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 318,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 319,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 320,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 321,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 322,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 323,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 324,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 325,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 326,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 327,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 328,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 329,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 330,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 331,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 332,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 333,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 334,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 335,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 336,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 337,
    forms: [
      {
        genderRatio: 255,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 338,
    forms: [
      {
        genderRatio: 255,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 339,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 340,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 341,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: true,
  },
  {
    species: 342,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: true,
  },
  {
    species: 343,
    forms: [
      {
        genderRatio: 255,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: true,
  },
  {
    species: 344,
    forms: [
      {
        genderRatio: 255,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: true,
  },
  {
    species: 345,
    forms: [
      {
        genderRatio: 31,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: true,
  },
  {
    species: 346,
    forms: [
      {
        genderRatio: 31,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: true,
  },
  {
    species: 347,
    forms: [
      {
        genderRatio: 31,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: true,
  },
  {
    species: 348,
    forms: [
      {
        genderRatio: 31,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: true,
  },
  {
    species: 349,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 350,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 351,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 352,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: true,
  },
  {
    species: 353,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: true,
  },
  {
    species: 354,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: true,
  },
  {
    species: 355,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 356,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 357,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: true,
  },
  {
    species: 358,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 359,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 360,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 361,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 362,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 363,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 364,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 365,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 366,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: true,
  },
  {
    species: 367,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: true,
  },
  {
    species: 368,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: true,
  },
  {
    species: 369,
    forms: [
      {
        genderRatio: 31,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 370,
    forms: [
      {
        genderRatio: 191,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 371,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 372,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 373,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 374,
    forms: [
      {
        genderRatio: 255,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 375,
    forms: [
      {
        genderRatio: 255,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 376,
    forms: [
      {
        genderRatio: 255,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 377,
    forms: [
      {
        genderRatio: 255,
        defaultPerfectIvCount: 3,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 378,
    forms: [
      {
        genderRatio: 255,
        defaultPerfectIvCount: 3,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 379,
    forms: [
      {
        genderRatio: 255,
        defaultPerfectIvCount: 3,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 380,
    forms: [
      {
        genderRatio: 254,
        defaultPerfectIvCount: 3,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 381,
    forms: [
      {
        genderRatio: 0,
        defaultPerfectIvCount: 3,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 382,
    forms: [
      {
        genderRatio: 255,
        defaultPerfectIvCount: 3,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 383,
    forms: [
      {
        genderRatio: 255,
        defaultPerfectIvCount: 3,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 384,
    forms: [
      {
        genderRatio: 255,
        defaultPerfectIvCount: 3,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 385,
    forms: [
      {
        genderRatio: 255,
        defaultPerfectIvCount: 3,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 386,
    forms: [
      {
        genderRatio: 255,
        defaultPerfectIvCount: 3,
      },
      {
        genderRatio: 255,
        defaultPerfectIvCount: 3,
      },
      {
        genderRatio: 255,
        defaultPerfectIvCount: 3,
      },
      {
        genderRatio: 255,
        defaultPerfectIvCount: 3,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 387,
    forms: [
      {
        genderRatio: 31,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 388,
    forms: [
      {
        genderRatio: 31,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 389,
    forms: [
      {
        genderRatio: 31,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 390,
    forms: [
      {
        genderRatio: 31,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 391,
    forms: [
      {
        genderRatio: 31,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 392,
    forms: [
      {
        genderRatio: 31,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 393,
    forms: [
      {
        genderRatio: 31,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 394,
    forms: [
      {
        genderRatio: 31,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 395,
    forms: [
      {
        genderRatio: 31,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 396,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 397,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 398,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 399,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 400,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 401,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 402,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 403,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 404,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 405,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 406,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 407,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 408,
    forms: [
      {
        genderRatio: 31,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 409,
    forms: [
      {
        genderRatio: 31,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 410,
    forms: [
      {
        genderRatio: 31,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 411,
    forms: [
      {
        genderRatio: 31,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 412,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 413,
    forms: [
      {
        genderRatio: 254,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 254,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 254,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 414,
    forms: [
      {
        genderRatio: 0,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 0,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 0,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 415,
    forms: [
      {
        genderRatio: 31,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 416,
    forms: [
      {
        genderRatio: 254,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 417,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 418,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 419,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 420,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 421,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 422,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 423,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 424,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: true,
  },
  {
    species: 425,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 426,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 427,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: true,
  },
  {
    species: 428,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: true,
  },
  {
    species: 429,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 430,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 431,
    forms: [
      {
        genderRatio: 191,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 432,
    forms: [
      {
        genderRatio: 191,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 433,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 434,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 435,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 436,
    forms: [
      {
        genderRatio: 255,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 437,
    forms: [
      {
        genderRatio: 255,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 438,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 439,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: true,
  },
  {
    species: 440,
    forms: [
      {
        genderRatio: 254,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 441,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 442,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 443,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 444,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 445,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 446,
    forms: [
      {
        genderRatio: 31,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 447,
    forms: [
      {
        genderRatio: 31,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 448,
    forms: [
      {
        genderRatio: 31,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 449,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 450,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 451,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 452,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 453,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 454,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 455,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 456,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 457,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 458,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: true,
  },
  {
    species: 459,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 460,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 461,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 462,
    forms: [
      {
        genderRatio: 255,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 463,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: true,
  },
  {
    species: 464,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 465,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 466,
    forms: [
      {
        genderRatio: 63,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 467,
    forms: [
      {
        genderRatio: 63,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 468,
    forms: [
      {
        genderRatio: 31,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 469,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 470,
    forms: [
      {
        genderRatio: 31,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 471,
    forms: [
      {
        genderRatio: 31,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 472,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 473,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 474,
    forms: [
      {
        genderRatio: 255,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 475,
    forms: [
      {
        genderRatio: 0,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 476,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 477,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 478,
    forms: [
      {
        genderRatio: 254,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 479,
    forms: [
      {
        genderRatio: 255,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 255,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 255,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 255,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 255,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 255,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 480,
    forms: [
      {
        genderRatio: 255,
        defaultPerfectIvCount: 3,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 481,
    forms: [
      {
        genderRatio: 255,
        defaultPerfectIvCount: 3,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 482,
    forms: [
      {
        genderRatio: 255,
        defaultPerfectIvCount: 3,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 483,
    forms: [
      {
        genderRatio: 255,
        defaultPerfectIvCount: 3,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 484,
    forms: [
      {
        genderRatio: 255,
        defaultPerfectIvCount: 3,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 485,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 3,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 486,
    forms: [
      {
        genderRatio: 255,
        defaultPerfectIvCount: 3,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 487,
    forms: [
      {
        genderRatio: 255,
        defaultPerfectIvCount: 3,
      },
      {
        genderRatio: 255,
        defaultPerfectIvCount: 3,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 488,
    forms: [
      {
        genderRatio: 254,
        defaultPerfectIvCount: 3,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 489,
    forms: [
      {
        genderRatio: 255,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 490,
    forms: [
      {
        genderRatio: 255,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 491,
    forms: [
      {
        genderRatio: 255,
        defaultPerfectIvCount: 3,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 492,
    forms: [
      {
        genderRatio: 255,
        defaultPerfectIvCount: 3,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 493,
    forms: [
      {
        genderRatio: 255,
        defaultPerfectIvCount: 3,
      },
      {
        genderRatio: 255,
        defaultPerfectIvCount: 3,
      },
      {
        genderRatio: 255,
        defaultPerfectIvCount: 3,
      },
      {
        genderRatio: 255,
        defaultPerfectIvCount: 3,
      },
      {
        genderRatio: 255,
        defaultPerfectIvCount: 3,
      },
      {
        genderRatio: 255,
        defaultPerfectIvCount: 3,
      },
      {
        genderRatio: 255,
        defaultPerfectIvCount: 3,
      },
      {
        genderRatio: 255,
        defaultPerfectIvCount: 3,
      },
      {
        genderRatio: 255,
        defaultPerfectIvCount: 3,
      },
      {
        genderRatio: 255,
        defaultPerfectIvCount: 3,
      },
      {
        genderRatio: 255,
        defaultPerfectIvCount: 3,
      },
      {
        genderRatio: 255,
        defaultPerfectIvCount: 3,
      },
      {
        genderRatio: 255,
        defaultPerfectIvCount: 3,
      },
      {
        genderRatio: 255,
        defaultPerfectIvCount: 3,
      },
      {
        genderRatio: 255,
        defaultPerfectIvCount: 3,
      },
      {
        genderRatio: 255,
        defaultPerfectIvCount: 3,
      },
      {
        genderRatio: 255,
        defaultPerfectIvCount: 3,
      },
      {
        genderRatio: 255,
        defaultPerfectIvCount: 3,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 494,
    forms: [
      {
        genderRatio: 255,
        defaultPerfectIvCount: 3,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 495,
    forms: [
      {
        genderRatio: 31,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 496,
    forms: [
      {
        genderRatio: 31,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 497,
    forms: [
      {
        genderRatio: 31,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 498,
    forms: [
      {
        genderRatio: 31,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 499,
    forms: [
      {
        genderRatio: 31,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 500,
    forms: [
      {
        genderRatio: 31,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 501,
    forms: [
      {
        genderRatio: 31,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 502,
    forms: [
      {
        genderRatio: 31,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 503,
    forms: [
      {
        genderRatio: 31,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 504,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 505,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 506,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 507,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 508,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 509,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 510,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 511,
    forms: [
      {
        genderRatio: 31,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 512,
    forms: [
      {
        genderRatio: 31,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 513,
    forms: [
      {
        genderRatio: 31,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 514,
    forms: [
      {
        genderRatio: 31,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 515,
    forms: [
      {
        genderRatio: 31,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 516,
    forms: [
      {
        genderRatio: 31,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 517,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 518,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 519,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 520,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 521,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 522,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 523,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 524,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 525,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 526,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 527,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 528,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 529,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 530,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 531,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 532,
    forms: [
      {
        genderRatio: 63,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 533,
    forms: [
      {
        genderRatio: 63,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 534,
    forms: [
      {
        genderRatio: 63,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 535,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 536,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 537,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 538,
    forms: [
      {
        genderRatio: 0,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 539,
    forms: [
      {
        genderRatio: 0,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 540,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 541,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 542,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 543,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 544,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 545,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 546,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 547,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 548,
    forms: [
      {
        genderRatio: 254,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 549,
    forms: [
      {
        genderRatio: 254,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 550,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: true,
  },
  {
    species: 551,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 552,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 553,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 554,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 555,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 556,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 557,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 558,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 559,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: true,
  },
  {
    species: 560,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: true,
  },
  {
    species: 561,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 562,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 563,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 564,
    forms: [
      {
        genderRatio: 31,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 565,
    forms: [
      {
        genderRatio: 31,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 566,
    forms: [
      {
        genderRatio: 31,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 567,
    forms: [
      {
        genderRatio: 31,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 568,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 569,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 570,
    forms: [
      {
        genderRatio: 31,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: true,
  },
  {
    species: 571,
    forms: [
      {
        genderRatio: 31,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: true,
  },
  {
    species: 572,
    forms: [
      {
        genderRatio: 191,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: true,
  },
  {
    species: 573,
    forms: [
      {
        genderRatio: 191,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: true,
  },
  {
    species: 574,
    forms: [
      {
        genderRatio: 191,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 575,
    forms: [
      {
        genderRatio: 191,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 576,
    forms: [
      {
        genderRatio: 191,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 577,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 578,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 579,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 580,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 581,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 582,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 583,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 584,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 585,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 586,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 587,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 588,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 589,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 590,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 591,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 592,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: true,
  },
  {
    species: 593,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: true,
  },
  {
    species: 594,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 595,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 596,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 597,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 598,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 599,
    forms: [
      {
        genderRatio: 255,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 600,
    forms: [
      {
        genderRatio: 255,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 601,
    forms: [
      {
        genderRatio: 255,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 602,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 603,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 604,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 605,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: true,
  },
  {
    species: 606,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: true,
  },
  {
    species: 607,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 608,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 609,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 610,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 611,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 612,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 613,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 614,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 615,
    forms: [
      {
        genderRatio: 255,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 616,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 617,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 618,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 619,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: true,
  },
  {
    species: 620,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: true,
  },
  {
    species: 621,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: true,
  },
  {
    species: 622,
    forms: [
      {
        genderRatio: 255,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: true,
  },
  {
    species: 623,
    forms: [
      {
        genderRatio: 255,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: true,
  },
  {
    species: 624,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: true,
  },
  {
    species: 625,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: true,
  },
  {
    species: 626,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 627,
    forms: [
      {
        genderRatio: 0,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 628,
    forms: [
      {
        genderRatio: 0,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 629,
    forms: [
      {
        genderRatio: 254,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 630,
    forms: [
      {
        genderRatio: 254,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 631,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 632,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 633,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 634,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 635,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 636,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: true,
  },
  {
    species: 637,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: true,
  },
  {
    species: 638,
    forms: [
      {
        genderRatio: 255,
        defaultPerfectIvCount: 3,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 639,
    forms: [
      {
        genderRatio: 255,
        defaultPerfectIvCount: 3,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 640,
    forms: [
      {
        genderRatio: 255,
        defaultPerfectIvCount: 3,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 641,
    forms: [
      {
        genderRatio: 0,
        defaultPerfectIvCount: 3,
      },
      {
        genderRatio: 0,
        defaultPerfectIvCount: 3,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 642,
    forms: [
      {
        genderRatio: 0,
        defaultPerfectIvCount: 3,
      },
      {
        genderRatio: 0,
        defaultPerfectIvCount: 3,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 643,
    forms: [
      {
        genderRatio: 255,
        defaultPerfectIvCount: 3,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 644,
    forms: [
      {
        genderRatio: 255,
        defaultPerfectIvCount: 3,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 645,
    forms: [
      {
        genderRatio: 0,
        defaultPerfectIvCount: 3,
      },
      {
        genderRatio: 0,
        defaultPerfectIvCount: 3,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 646,
    forms: [
      {
        genderRatio: 255,
        defaultPerfectIvCount: 3,
      },
      {
        genderRatio: 255,
        defaultPerfectIvCount: 3,
      },
      {
        genderRatio: 255,
        defaultPerfectIvCount: 3,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 647,
    forms: [
      {
        genderRatio: 255,
        defaultPerfectIvCount: 3,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 648,
    forms: [
      {
        genderRatio: 255,
        defaultPerfectIvCount: 3,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 649,
    forms: [
      {
        genderRatio: 255,
        defaultPerfectIvCount: 3,
      },
      {
        genderRatio: 255,
        defaultPerfectIvCount: 3,
      },
      {
        genderRatio: 255,
        defaultPerfectIvCount: 3,
      },
      {
        genderRatio: 255,
        defaultPerfectIvCount: 3,
      },
      {
        genderRatio: 255,
        defaultPerfectIvCount: 3,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 650,
    forms: [
      {
        genderRatio: 31,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 651,
    forms: [
      {
        genderRatio: 31,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 652,
    forms: [
      {
        genderRatio: 31,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 653,
    forms: [
      {
        genderRatio: 31,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 654,
    forms: [
      {
        genderRatio: 31,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 655,
    forms: [
      {
        genderRatio: 31,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 656,
    forms: [
      {
        genderRatio: 31,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 657,
    forms: [
      {
        genderRatio: 31,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 658,
    forms: [
      {
        genderRatio: 31,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 0,
        defaultPerfectIvCount: 3,
      },
      {
        genderRatio: 0,
        defaultPerfectIvCount: 3,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 659,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 660,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 661,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 662,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 663,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 664,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 665,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 666,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 667,
    forms: [
      {
        genderRatio: 225,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: true,
  },
  {
    species: 668,
    forms: [
      {
        genderRatio: 225,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: true,
  },
  {
    species: 669,
    forms: [
      {
        genderRatio: 254,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 254,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 254,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 254,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 254,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: true,
  },
  {
    species: 670,
    forms: [
      {
        genderRatio: 254,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 254,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 254,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 254,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 254,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 254,
        defaultPerfectIvCount: 3,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: true,
  },
  {
    species: 671,
    forms: [
      {
        genderRatio: 254,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 254,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 254,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 254,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 254,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: true,
  },
  {
    species: 672,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 673,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 674,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 675,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 676,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: true,
  },
  {
    species: 677,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 678,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 679,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 680,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 681,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 682,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 683,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 684,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 685,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 686,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: true,
  },
  {
    species: 687,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: true,
  },
  {
    species: 688,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 689,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 690,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: true,
  },
  {
    species: 691,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: true,
  },
  {
    species: 692,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: true,
  },
  {
    species: 693,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: true,
  },
  {
    species: 694,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 695,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 696,
    forms: [
      {
        genderRatio: 31,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: true,
  },
  {
    species: 697,
    forms: [
      {
        genderRatio: 31,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: true,
  },
  {
    species: 698,
    forms: [
      {
        genderRatio: 31,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: true,
  },
  {
    species: 699,
    forms: [
      {
        genderRatio: 31,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: true,
  },
  {
    species: 700,
    forms: [
      {
        genderRatio: 31,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 701,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: true,
  },
  {
    species: 702,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: true,
  },
  {
    species: 703,
    forms: [
      {
        genderRatio: 255,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 704,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 705,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 706,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 707,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 708,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 709,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 710,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 711,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 712,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 713,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 714,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: true,
  },
  {
    species: 715,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: true,
  },
  {
    species: 716,
    forms: [
      {
        genderRatio: 255,
        defaultPerfectIvCount: 3,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 717,
    forms: [
      {
        genderRatio: 255,
        defaultPerfectIvCount: 3,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 718,
    forms: [
      {
        genderRatio: 255,
        defaultPerfectIvCount: 3,
      },
      {
        genderRatio: 255,
        defaultPerfectIvCount: 3,
      },
      {
        genderRatio: 255,
        defaultPerfectIvCount: 3,
      },
      {
        genderRatio: 255,
        defaultPerfectIvCount: 3,
      },
      {
        genderRatio: 255,
        defaultPerfectIvCount: 3,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 719,
    forms: [
      {
        genderRatio: 255,
        defaultPerfectIvCount: 3,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 720,
    forms: [
      {
        genderRatio: 255,
        defaultPerfectIvCount: 3,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 721,
    forms: [
      {
        genderRatio: 255,
        defaultPerfectIvCount: 3,
      },
    ],
    smNoDexEligible: false,
    usumNoDexEligible: false,
  },
  {
    species: 722,
    forms: [
      {
        genderRatio: 31,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 723,
    forms: [
      {
        genderRatio: 31,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 724,
    forms: [
      {
        genderRatio: 31,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 725,
    forms: [
      {
        genderRatio: 31,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 726,
    forms: [
      {
        genderRatio: 31,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 727,
    forms: [
      {
        genderRatio: 31,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 728,
    forms: [
      {
        genderRatio: 31,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 729,
    forms: [
      {
        genderRatio: 31,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 730,
    forms: [
      {
        genderRatio: 31,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 731,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 732,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 733,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 734,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 735,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 736,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 737,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 738,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 739,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 740,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 741,
    forms: [
      {
        genderRatio: 191,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 191,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 191,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 191,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 742,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 743,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 744,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 745,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 746,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 747,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 748,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 749,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 750,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 751,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 752,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 753,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 754,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 755,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 756,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 757,
    forms: [
      {
        genderRatio: 31,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 758,
    forms: [
      {
        genderRatio: 254,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 254,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 759,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 760,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 761,
    forms: [
      {
        genderRatio: 254,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 762,
    forms: [
      {
        genderRatio: 254,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 763,
    forms: [
      {
        genderRatio: 254,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 764,
    forms: [
      {
        genderRatio: 191,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 765,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 766,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 767,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 768,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 769,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 770,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 771,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 772,
    forms: [
      {
        genderRatio: 255,
        defaultPerfectIvCount: 3,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 773,
    forms: [
      {
        genderRatio: 255,
        defaultPerfectIvCount: 3,
      },
      {
        genderRatio: 255,
        defaultPerfectIvCount: 3,
      },
      {
        genderRatio: 255,
        defaultPerfectIvCount: 3,
      },
      {
        genderRatio: 255,
        defaultPerfectIvCount: 3,
      },
      {
        genderRatio: 255,
        defaultPerfectIvCount: 3,
      },
      {
        genderRatio: 255,
        defaultPerfectIvCount: 3,
      },
      {
        genderRatio: 255,
        defaultPerfectIvCount: 3,
      },
      {
        genderRatio: 255,
        defaultPerfectIvCount: 3,
      },
      {
        genderRatio: 255,
        defaultPerfectIvCount: 3,
      },
      {
        genderRatio: 255,
        defaultPerfectIvCount: 3,
      },
      {
        genderRatio: 255,
        defaultPerfectIvCount: 3,
      },
      {
        genderRatio: 255,
        defaultPerfectIvCount: 3,
      },
      {
        genderRatio: 255,
        defaultPerfectIvCount: 3,
      },
      {
        genderRatio: 255,
        defaultPerfectIvCount: 3,
      },
      {
        genderRatio: 255,
        defaultPerfectIvCount: 3,
      },
      {
        genderRatio: 255,
        defaultPerfectIvCount: 3,
      },
      {
        genderRatio: 255,
        defaultPerfectIvCount: 3,
      },
      {
        genderRatio: 255,
        defaultPerfectIvCount: 3,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 774,
    forms: [
      {
        genderRatio: 255,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 255,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 255,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 255,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 255,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 255,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 255,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 255,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 255,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 255,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 255,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 255,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 255,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 255,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 775,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 776,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 777,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 778,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 779,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 780,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 781,
    forms: [
      {
        genderRatio: 255,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 782,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 783,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 784,
    forms: [
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
      {
        genderRatio: 127,
        defaultPerfectIvCount: 0,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 785,
    forms: [
      {
        genderRatio: 255,
        defaultPerfectIvCount: 3,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 786,
    forms: [
      {
        genderRatio: 255,
        defaultPerfectIvCount: 3,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 787,
    forms: [
      {
        genderRatio: 255,
        defaultPerfectIvCount: 3,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 788,
    forms: [
      {
        genderRatio: 255,
        defaultPerfectIvCount: 3,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 789,
    forms: [
      {
        genderRatio: 255,
        defaultPerfectIvCount: 3,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 790,
    forms: [
      {
        genderRatio: 255,
        defaultPerfectIvCount: 3,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 791,
    forms: [
      {
        genderRatio: 255,
        defaultPerfectIvCount: 3,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 792,
    forms: [
      {
        genderRatio: 255,
        defaultPerfectIvCount: 3,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 793,
    forms: [
      {
        genderRatio: 255,
        defaultPerfectIvCount: 3,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 794,
    forms: [
      {
        genderRatio: 255,
        defaultPerfectIvCount: 3,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 795,
    forms: [
      {
        genderRatio: 255,
        defaultPerfectIvCount: 3,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 796,
    forms: [
      {
        genderRatio: 255,
        defaultPerfectIvCount: 3,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 797,
    forms: [
      {
        genderRatio: 255,
        defaultPerfectIvCount: 3,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 798,
    forms: [
      {
        genderRatio: 255,
        defaultPerfectIvCount: 3,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 799,
    forms: [
      {
        genderRatio: 255,
        defaultPerfectIvCount: 3,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 800,
    forms: [
      {
        genderRatio: 255,
        defaultPerfectIvCount: 3,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 801,
    forms: [
      {
        genderRatio: 255,
        defaultPerfectIvCount: 3,
      },
      {
        genderRatio: 255,
        defaultPerfectIvCount: 3,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 802,
    forms: [
      {
        genderRatio: 255,
        defaultPerfectIvCount: 3,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 803,
    forms: [
      {
        genderRatio: 255,
        defaultPerfectIvCount: 3,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 804,
    forms: [
      {
        genderRatio: 255,
        defaultPerfectIvCount: 3,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 805,
    forms: [
      {
        genderRatio: 255,
        defaultPerfectIvCount: 3,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 806,
    forms: [
      {
        genderRatio: 255,
        defaultPerfectIvCount: 3,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
  {
    species: 807,
    forms: [
      {
        genderRatio: 255,
        defaultPerfectIvCount: 3,
      },
    ],
    smNoDexEligible: true,
    usumNoDexEligible: true,
  },
] as const satisfies readonly Gen7EventPersonalEntry[];
