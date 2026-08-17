/*!
 * Generated from EncounterTableGenerator Gen8/encounters.json and
 * PokeFinder 4.3.2 personal_bdsp.bin.
 * GPL-3.0-or-later. Do not hand-edit; rerun scripts/generate_gen8_static_data.mjs.
 */

export type Gen8StaticVersion = "brilliantdiamond" | "shiningpearl";

export interface Gen8StaticTemplate {
  index: number;
  description: string;
  versions: readonly Gen8StaticVersion[];
  species: number;
  form: number;
  shiny: 0 | 1;
  ability: number;
  gender: number;
  ivCount: number;
  level: number;
  fateful: boolean;
  roamer: boolean;
  genderRatio: number;
  abilityIds: readonly [number, number, number];
}

export interface Gen8StaticCategory {
  id: string;
  sourceLabel: string;
  templates: readonly Gen8StaticTemplate[];
}

export const GEN8_STATIC_CATEGORIES = [
  {
    "id": "starters",
    "sourceLabel": "Starters",
    "templates": [
      {
        "index": 0,
        "description": "Turtwig",
        "versions": [
          "brilliantdiamond",
          "shiningpearl"
        ],
        "species": 387,
        "form": 0,
        "shiny": 0,
        "ability": 255,
        "gender": 255,
        "ivCount": 0,
        "level": 5,
        "fateful": false,
        "roamer": false,
        "genderRatio": 31,
        "abilityIds": [
          65,
          65,
          75
        ]
      },
      {
        "index": 1,
        "description": "Chimchar",
        "versions": [
          "brilliantdiamond",
          "shiningpearl"
        ],
        "species": 390,
        "form": 0,
        "shiny": 0,
        "ability": 255,
        "gender": 255,
        "ivCount": 0,
        "level": 5,
        "fateful": false,
        "roamer": false,
        "genderRatio": 31,
        "abilityIds": [
          66,
          66,
          89
        ]
      },
      {
        "index": 2,
        "description": "Piplup",
        "versions": [
          "brilliantdiamond",
          "shiningpearl"
        ],
        "species": 393,
        "form": 0,
        "shiny": 0,
        "ability": 255,
        "gender": 255,
        "ivCount": 0,
        "level": 5,
        "fateful": false,
        "roamer": false,
        "genderRatio": 31,
        "abilityIds": [
          67,
          67,
          128
        ]
      }
    ]
  },
  {
    "id": "gifts",
    "sourceLabel": "Gifts",
    "templates": [
      {
        "index": 0,
        "description": "Eevee",
        "versions": [
          "brilliantdiamond",
          "shiningpearl"
        ],
        "species": 133,
        "form": 0,
        "shiny": 0,
        "ability": 255,
        "gender": 255,
        "ivCount": 0,
        "level": 5,
        "fateful": false,
        "roamer": false,
        "genderRatio": 31,
        "abilityIds": [
          50,
          91,
          107
        ]
      },
      {
        "index": 1,
        "description": "Happiny egg",
        "versions": [
          "brilliantdiamond",
          "shiningpearl"
        ],
        "species": 440,
        "form": 0,
        "shiny": 0,
        "ability": 255,
        "gender": 255,
        "ivCount": 0,
        "level": 1,
        "fateful": false,
        "roamer": false,
        "genderRatio": 254,
        "abilityIds": [
          30,
          32,
          132
        ]
      },
      {
        "index": 2,
        "description": "Riolu egg",
        "versions": [
          "brilliantdiamond",
          "shiningpearl"
        ],
        "species": 447,
        "form": 0,
        "shiny": 0,
        "ability": 255,
        "gender": 255,
        "ivCount": 0,
        "level": 1,
        "fateful": false,
        "roamer": false,
        "genderRatio": 31,
        "abilityIds": [
          80,
          39,
          158
        ]
      }
    ]
  },
  {
    "id": "fossils",
    "sourceLabel": "Fossils",
    "templates": [
      {
        "index": 0,
        "description": "Omanyte",
        "versions": [
          "brilliantdiamond",
          "shiningpearl"
        ],
        "species": 138,
        "form": 0,
        "shiny": 0,
        "ability": 255,
        "gender": 255,
        "ivCount": 3,
        "level": 1,
        "fateful": false,
        "roamer": false,
        "genderRatio": 31,
        "abilityIds": [
          33,
          75,
          133
        ]
      },
      {
        "index": 1,
        "description": "Kabuto",
        "versions": [
          "brilliantdiamond",
          "shiningpearl"
        ],
        "species": 140,
        "form": 0,
        "shiny": 0,
        "ability": 255,
        "gender": 255,
        "ivCount": 3,
        "level": 1,
        "fateful": false,
        "roamer": false,
        "genderRatio": 31,
        "abilityIds": [
          33,
          4,
          133
        ]
      },
      {
        "index": 2,
        "description": "Aerodactyl",
        "versions": [
          "brilliantdiamond",
          "shiningpearl"
        ],
        "species": 142,
        "form": 0,
        "shiny": 0,
        "ability": 255,
        "gender": 255,
        "ivCount": 3,
        "level": 1,
        "fateful": false,
        "roamer": false,
        "genderRatio": 31,
        "abilityIds": [
          69,
          46,
          127
        ]
      },
      {
        "index": 3,
        "description": "Lileep",
        "versions": [
          "brilliantdiamond",
          "shiningpearl"
        ],
        "species": 345,
        "form": 0,
        "shiny": 0,
        "ability": 255,
        "gender": 255,
        "ivCount": 3,
        "level": 1,
        "fateful": false,
        "roamer": false,
        "genderRatio": 31,
        "abilityIds": [
          21,
          21,
          114
        ]
      },
      {
        "index": 4,
        "description": "Anorith",
        "versions": [
          "brilliantdiamond",
          "shiningpearl"
        ],
        "species": 347,
        "form": 0,
        "shiny": 0,
        "ability": 255,
        "gender": 255,
        "ivCount": 3,
        "level": 1,
        "fateful": false,
        "roamer": false,
        "genderRatio": 31,
        "abilityIds": [
          4,
          4,
          33
        ]
      },
      {
        "index": 5,
        "description": "Cranidos",
        "versions": [
          "brilliantdiamond",
          "shiningpearl"
        ],
        "species": 408,
        "form": 0,
        "shiny": 0,
        "ability": 255,
        "gender": 255,
        "ivCount": 3,
        "level": 1,
        "fateful": false,
        "roamer": false,
        "genderRatio": 31,
        "abilityIds": [
          104,
          104,
          125
        ]
      },
      {
        "index": 6,
        "description": "Shieldon",
        "versions": [
          "brilliantdiamond",
          "shiningpearl"
        ],
        "species": 410,
        "form": 0,
        "shiny": 0,
        "ability": 255,
        "gender": 255,
        "ivCount": 3,
        "level": 1,
        "fateful": false,
        "roamer": false,
        "genderRatio": 31,
        "abilityIds": [
          5,
          5,
          43
        ]
      }
    ]
  },
  {
    "id": "stationary",
    "sourceLabel": "Stationary",
    "templates": [
      {
        "index": 0,
        "description": "Drifloon",
        "versions": [
          "brilliantdiamond",
          "shiningpearl"
        ],
        "species": 425,
        "form": 0,
        "shiny": 0,
        "ability": 255,
        "gender": 255,
        "ivCount": 3,
        "level": 22,
        "fateful": false,
        "roamer": false,
        "genderRatio": 127,
        "abilityIds": [
          106,
          84,
          138
        ]
      },
      {
        "index": 1,
        "description": "Spiritomb",
        "versions": [
          "brilliantdiamond",
          "shiningpearl"
        ],
        "species": 442,
        "form": 0,
        "shiny": 0,
        "ability": 255,
        "gender": 255,
        "ivCount": 0,
        "level": 25,
        "fateful": false,
        "roamer": false,
        "genderRatio": 127,
        "abilityIds": [
          46,
          46,
          151
        ]
      },
      {
        "index": 2,
        "description": "Rotom",
        "versions": [
          "brilliantdiamond",
          "shiningpearl"
        ],
        "species": 479,
        "form": 0,
        "shiny": 0,
        "ability": 255,
        "gender": 255,
        "ivCount": 0,
        "level": 15,
        "fateful": false,
        "roamer": false,
        "genderRatio": 255,
        "abilityIds": [
          26,
          26,
          26
        ]
      }
    ]
  },
  {
    "id": "roamers",
    "sourceLabel": "Roamers",
    "templates": [
      {
        "index": 0,
        "description": "Mespirit",
        "versions": [
          "brilliantdiamond",
          "shiningpearl"
        ],
        "species": 481,
        "form": 0,
        "shiny": 0,
        "ability": 255,
        "gender": 255,
        "ivCount": 3,
        "level": 50,
        "fateful": false,
        "roamer": true,
        "genderRatio": 255,
        "abilityIds": [
          26,
          26,
          26
        ]
      },
      {
        "index": 1,
        "description": "Cresselia",
        "versions": [
          "brilliantdiamond",
          "shiningpearl"
        ],
        "species": 488,
        "form": 0,
        "shiny": 0,
        "ability": 255,
        "gender": 255,
        "ivCount": 3,
        "level": 50,
        "fateful": false,
        "roamer": true,
        "genderRatio": 254,
        "abilityIds": [
          26,
          26,
          26
        ]
      }
    ]
  },
  {
    "id": "legends",
    "sourceLabel": "Legends",
    "templates": [
      {
        "index": 0,
        "description": "Uxie",
        "versions": [
          "brilliantdiamond",
          "shiningpearl"
        ],
        "species": 480,
        "form": 0,
        "shiny": 0,
        "ability": 255,
        "gender": 255,
        "ivCount": 3,
        "level": 50,
        "fateful": false,
        "roamer": false,
        "genderRatio": 255,
        "abilityIds": [
          26,
          26,
          26
        ]
      },
      {
        "index": 1,
        "description": "Azelf",
        "versions": [
          "brilliantdiamond",
          "shiningpearl"
        ],
        "species": 482,
        "form": 0,
        "shiny": 0,
        "ability": 255,
        "gender": 255,
        "ivCount": 3,
        "level": 50,
        "fateful": false,
        "roamer": false,
        "genderRatio": 255,
        "abilityIds": [
          26,
          26,
          26
        ]
      },
      {
        "index": 2,
        "description": "Dialga",
        "versions": [
          "brilliantdiamond"
        ],
        "species": 483,
        "form": 0,
        "shiny": 0,
        "ability": 255,
        "gender": 255,
        "ivCount": 3,
        "level": 47,
        "fateful": false,
        "roamer": false,
        "genderRatio": 255,
        "abilityIds": [
          46,
          46,
          140
        ]
      },
      {
        "index": 3,
        "description": "Palkia",
        "versions": [
          "shiningpearl"
        ],
        "species": 484,
        "form": 0,
        "shiny": 0,
        "ability": 255,
        "gender": 255,
        "ivCount": 3,
        "level": 47,
        "fateful": false,
        "roamer": false,
        "genderRatio": 255,
        "abilityIds": [
          46,
          46,
          140
        ]
      },
      {
        "index": 4,
        "description": "Heatran",
        "versions": [
          "brilliantdiamond",
          "shiningpearl"
        ],
        "species": 485,
        "form": 0,
        "shiny": 0,
        "ability": 255,
        "gender": 255,
        "ivCount": 3,
        "level": 70,
        "fateful": false,
        "roamer": false,
        "genderRatio": 127,
        "abilityIds": [
          18,
          18,
          49
        ]
      },
      {
        "index": 5,
        "description": "Regigigas",
        "versions": [
          "brilliantdiamond",
          "shiningpearl"
        ],
        "species": 486,
        "form": 0,
        "shiny": 0,
        "ability": 255,
        "gender": 255,
        "ivCount": 3,
        "level": 70,
        "fateful": false,
        "roamer": false,
        "genderRatio": 255,
        "abilityIds": [
          112,
          112,
          112
        ]
      },
      {
        "index": 6,
        "description": "Giratina",
        "versions": [
          "brilliantdiamond",
          "shiningpearl"
        ],
        "species": 487,
        "form": 0,
        "shiny": 0,
        "ability": 255,
        "gender": 255,
        "ivCount": 3,
        "level": 70,
        "fateful": false,
        "roamer": false,
        "genderRatio": 255,
        "abilityIds": [
          46,
          46,
          140
        ]
      }
    ]
  },
  {
    "id": "ramanasParkPureSpace",
    "sourceLabel": "Ramanas Park (Pure Space)",
    "templates": [
      {
        "index": 0,
        "description": "Articuno",
        "versions": [
          "shiningpearl"
        ],
        "species": 144,
        "form": 0,
        "shiny": 0,
        "ability": 2,
        "gender": 255,
        "ivCount": 3,
        "level": 70,
        "fateful": false,
        "roamer": false,
        "genderRatio": 255,
        "abilityIds": [
          46,
          46,
          81
        ]
      },
      {
        "index": 1,
        "description": "Zapdos",
        "versions": [
          "shiningpearl"
        ],
        "species": 145,
        "form": 0,
        "shiny": 0,
        "ability": 2,
        "gender": 255,
        "ivCount": 3,
        "level": 70,
        "fateful": false,
        "roamer": false,
        "genderRatio": 255,
        "abilityIds": [
          46,
          46,
          9
        ]
      },
      {
        "index": 2,
        "description": "Moltres",
        "versions": [
          "shiningpearl"
        ],
        "species": 146,
        "form": 0,
        "shiny": 0,
        "ability": 2,
        "gender": 255,
        "ivCount": 3,
        "level": 70,
        "fateful": false,
        "roamer": false,
        "genderRatio": 255,
        "abilityIds": [
          46,
          46,
          49
        ]
      },
      {
        "index": 3,
        "description": "Raikou",
        "versions": [
          "brilliantdiamond"
        ],
        "species": 243,
        "form": 0,
        "shiny": 0,
        "ability": 2,
        "gender": 255,
        "ivCount": 3,
        "level": 70,
        "fateful": false,
        "roamer": false,
        "genderRatio": 255,
        "abilityIds": [
          46,
          46,
          39
        ]
      },
      {
        "index": 4,
        "description": "Entei",
        "versions": [
          "brilliantdiamond"
        ],
        "species": 244,
        "form": 0,
        "shiny": 0,
        "ability": 2,
        "gender": 255,
        "ivCount": 3,
        "level": 70,
        "fateful": false,
        "roamer": false,
        "genderRatio": 255,
        "abilityIds": [
          46,
          46,
          39
        ]
      },
      {
        "index": 5,
        "description": "Suicune",
        "versions": [
          "brilliantdiamond"
        ],
        "species": 245,
        "form": 0,
        "shiny": 0,
        "ability": 2,
        "gender": 255,
        "ivCount": 3,
        "level": 70,
        "fateful": false,
        "roamer": false,
        "genderRatio": 255,
        "abilityIds": [
          46,
          46,
          39
        ]
      },
      {
        "index": 6,
        "description": "Regirock",
        "versions": [
          "brilliantdiamond",
          "shiningpearl"
        ],
        "species": 377,
        "form": 0,
        "shiny": 0,
        "ability": 2,
        "gender": 255,
        "ivCount": 3,
        "level": 70,
        "fateful": false,
        "roamer": false,
        "genderRatio": 255,
        "abilityIds": [
          29,
          29,
          5
        ]
      },
      {
        "index": 7,
        "description": "Regice",
        "versions": [
          "brilliantdiamond",
          "shiningpearl"
        ],
        "species": 378,
        "form": 0,
        "shiny": 0,
        "ability": 2,
        "gender": 255,
        "ivCount": 3,
        "level": 70,
        "fateful": false,
        "roamer": false,
        "genderRatio": 255,
        "abilityIds": [
          29,
          29,
          115
        ]
      },
      {
        "index": 8,
        "description": "Registeel",
        "versions": [
          "brilliantdiamond",
          "shiningpearl"
        ],
        "species": 379,
        "form": 0,
        "shiny": 0,
        "ability": 2,
        "gender": 255,
        "ivCount": 3,
        "level": 70,
        "fateful": false,
        "roamer": false,
        "genderRatio": 255,
        "abilityIds": [
          29,
          29,
          135
        ]
      },
      {
        "index": 9,
        "description": "Latias",
        "versions": [
          "brilliantdiamond",
          "shiningpearl"
        ],
        "species": 380,
        "form": 0,
        "shiny": 0,
        "ability": 255,
        "gender": 255,
        "ivCount": 3,
        "level": 70,
        "fateful": false,
        "roamer": false,
        "genderRatio": 254,
        "abilityIds": [
          26,
          26,
          26
        ]
      },
      {
        "index": 10,
        "description": "Latios",
        "versions": [
          "brilliantdiamond",
          "shiningpearl"
        ],
        "species": 381,
        "form": 0,
        "shiny": 0,
        "ability": 255,
        "gender": 255,
        "ivCount": 3,
        "level": 70,
        "fateful": false,
        "roamer": false,
        "genderRatio": 0,
        "abilityIds": [
          26,
          26,
          26
        ]
      }
    ]
  },
  {
    "id": "ramanasParkStrangeSpace",
    "sourceLabel": "Ramanas Park (Strange Space)",
    "templates": [
      {
        "index": 0,
        "description": "Mewtwo",
        "versions": [
          "brilliantdiamond",
          "shiningpearl"
        ],
        "species": 150,
        "form": 0,
        "shiny": 0,
        "ability": 2,
        "gender": 255,
        "ivCount": 3,
        "level": 70,
        "fateful": false,
        "roamer": false,
        "genderRatio": 255,
        "abilityIds": [
          46,
          46,
          127
        ]
      },
      {
        "index": 1,
        "description": "Lugia",
        "versions": [
          "shiningpearl"
        ],
        "species": 249,
        "form": 0,
        "shiny": 0,
        "ability": 2,
        "gender": 255,
        "ivCount": 3,
        "level": 70,
        "fateful": false,
        "roamer": false,
        "genderRatio": 255,
        "abilityIds": [
          46,
          46,
          136
        ]
      },
      {
        "index": 2,
        "description": "Ho-Oh",
        "versions": [
          "brilliantdiamond"
        ],
        "species": 250,
        "form": 0,
        "shiny": 0,
        "ability": 2,
        "gender": 255,
        "ivCount": 3,
        "level": 70,
        "fateful": false,
        "roamer": false,
        "genderRatio": 255,
        "abilityIds": [
          46,
          46,
          144
        ]
      },
      {
        "index": 3,
        "description": "Kyogre",
        "versions": [
          "brilliantdiamond",
          "shiningpearl"
        ],
        "species": 382,
        "form": 0,
        "shiny": 0,
        "ability": 255,
        "gender": 255,
        "ivCount": 3,
        "level": 70,
        "fateful": false,
        "roamer": false,
        "genderRatio": 255,
        "abilityIds": [
          2,
          2,
          2
        ]
      },
      {
        "index": 4,
        "description": "Groudon",
        "versions": [
          "brilliantdiamond",
          "shiningpearl"
        ],
        "species": 383,
        "form": 0,
        "shiny": 0,
        "ability": 255,
        "gender": 255,
        "ivCount": 3,
        "level": 70,
        "fateful": false,
        "roamer": false,
        "genderRatio": 255,
        "abilityIds": [
          70,
          70,
          70
        ]
      },
      {
        "index": 5,
        "description": "Rayquaza",
        "versions": [
          "brilliantdiamond",
          "shiningpearl"
        ],
        "species": 384,
        "form": 0,
        "shiny": 0,
        "ability": 255,
        "gender": 255,
        "ivCount": 3,
        "level": 70,
        "fateful": false,
        "roamer": false,
        "genderRatio": 255,
        "abilityIds": [
          76,
          76,
          76
        ]
      }
    ]
  },
  {
    "id": "mythics",
    "sourceLabel": "Mythics",
    "templates": [
      {
        "index": 0,
        "description": "Mew",
        "versions": [
          "brilliantdiamond",
          "shiningpearl"
        ],
        "species": 151,
        "form": 0,
        "shiny": 1,
        "ability": 1,
        "gender": 255,
        "ivCount": 3,
        "level": 1,
        "fateful": true,
        "roamer": false,
        "genderRatio": 255,
        "abilityIds": [
          28,
          28,
          28
        ]
      },
      {
        "index": 1,
        "description": "Jirachi",
        "versions": [
          "brilliantdiamond",
          "shiningpearl"
        ],
        "species": 385,
        "form": 0,
        "shiny": 1,
        "ability": 1,
        "gender": 255,
        "ivCount": 3,
        "level": 5,
        "fateful": true,
        "roamer": false,
        "genderRatio": 255,
        "abilityIds": [
          32,
          32,
          32
        ]
      },
      {
        "index": 2,
        "description": "Darkrai",
        "versions": [
          "brilliantdiamond",
          "shiningpearl"
        ],
        "species": 491,
        "form": 0,
        "shiny": 0,
        "ability": 255,
        "gender": 255,
        "ivCount": 3,
        "level": 50,
        "fateful": true,
        "roamer": false,
        "genderRatio": 255,
        "abilityIds": [
          123,
          123,
          123
        ]
      },
      {
        "index": 3,
        "description": "Shaymin",
        "versions": [
          "brilliantdiamond",
          "shiningpearl"
        ],
        "species": 492,
        "form": 0,
        "shiny": 0,
        "ability": 255,
        "gender": 255,
        "ivCount": 3,
        "level": 30,
        "fateful": true,
        "roamer": false,
        "genderRatio": 255,
        "abilityIds": [
          30,
          30,
          30
        ]
      },
      {
        "index": 4,
        "description": "Arceus",
        "versions": [
          "brilliantdiamond",
          "shiningpearl"
        ],
        "species": 493,
        "form": 0,
        "shiny": 0,
        "ability": 255,
        "gender": 255,
        "ivCount": 3,
        "level": 80,
        "fateful": true,
        "roamer": false,
        "genderRatio": 255,
        "abilityIds": [
          121,
          121,
          121
        ]
      }
    ]
  }
] as const satisfies readonly Gen8StaticCategory[];

export const GEN8_STATIC_TEMPLATE_COUNT = 47;
