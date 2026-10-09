import { describe, expect, it } from "vitest";
import {
  exportSaveName,
  saveGameChoices,
  reconcileSaveGame,
  trainerDraft,
  rebaseTrainerDraft,
  changeTrainerCountry,
  validateTrainer,
  validateSaveRecord,
  parsePokemonHex,
  type SaveReport,
} from "./domain";

export const emeraldReport: SaveReport = {
  pokedex: { kind: "simple", canEdit: true },
  apiVersion: 101,
  trainer: {
    appearance6: null,
    gameVersion: { value: 3, choices: [] },
    spatialPosition: [],
    dates: [],
    position: null,
    gameOptions: { textSpeed: 1, battleStyle: 0, sound: 1, battleEffects: 1 },
    canRecords: false,
    currencies: [],
    badges: { count: 8, value: 0 },
    geography: null,
    languages: [],
    canGender: true,
    canPlayTime: true,
    hours: 1,
    minutes: 2,
    seconds: 3,
  },
  attributeChoices: { natures: [], items: [], species: [] },
  boxSlotCount: 30,
  boxes: [],
  boxOptions: {
    canName: false,
    nameLength: 8,
    wallpapers: [],
    unlocked: null,
    flags: [],
    flagMaximum: 255,
    canSwap: false,
    batchActions: [],
  },
  moveChoices: [],
  format: "SAV3E",
  generation: 3,
  version: "E",
  ot: "TEST",
  tid: 12345,
  sid: 54321,
  displayTid: 12345,
  displaySid: 54321,
  language: 2,
  gender: 0,
  money: 10,
  maxMoney: 999999,
  maxNameLength: 7,
  boxCount: 14,
  partyCount: 1,
  playTime: "1:00:00",
  checksumsValid: true,
  canEdit: true,
  extension: ".sav",
  nationalDex: null,
  pokemon: [],
};

describe("save editor boundaries", () => {
  it("validates trainer game markers and preserves pending changes during undo", () => {
    const report: SaveReport = {
      ...emeraldReport,
      format: "SAV7SM",
      version: "SN",
      trainer: {
        ...emeraldReport.trainer,
        gameVersion: {
          value: 30,
          choices: [30, 31, 32, 33].map((id) => ({
            id,
            name: { zh: String(id), en: String(id), ja: String(id) },
          })),
        },
      },
    };
    const draft = trainerDraft(report);
    expect(validateTrainer(draft, report).gameVersion).toBeUndefined();
    for (const value of [30, 31, 32, 33])
      expect(
        validateTrainer({ ...draft, gameVersion: String(value) }, report)
          .gameVersion,
      ).toBe(value === 30 ? undefined : value);
    for (const value of ["", "-1", "34", "255", "31.0", "3e1"])
      expect(() =>
        validateTrainer({ ...draft, gameVersion: value }, report),
      ).toThrow("Trainer game version");
    expect(() =>
      validateTrainer(
        { ...trainerDraft(emeraldReport), gameVersion: "30" },
        emeraldReport,
      ),
    ).toThrow("Trainer game version");
    const after = {
      ...report,
      version: "MN",
      trainer: {
        ...report.trainer,
        gameVersion: { ...report.trainer.gameVersion, value: 31 },
      },
    };
    expect(rebaseTrainerDraft(draft, report, after).gameVersion).toBe("31");
    expect(
      rebaseTrainerDraft({ ...draft, gameVersion: "33" }, report, after)
        .gameVersion,
    ).toBe("33");
    const unusual = {
      ...report,
      trainer: {
        ...report.trainer,
        gameVersion: { ...report.trainer.gameVersion, value: 255 },
      },
    };
    expect(
      validateTrainer(trainerDraft(unusual), unusual).gameVersion,
    ).toBeUndefined();
    expect(
      validateTrainer({ ...trainerDraft(unusual), gameVersion: "31" }, unusual)
        .gameVersion,
    ).toBe(31);
  });

  it("reconciles profile games after apply, undo and restore without treating markers as format conversions", () => {
    const sun = { ...emeraldReport, format: "SAV7SM", version: "SN" };
    const moon = { ...sun, version: "MN" };
    expect(reconcileSaveGame("sun", moon)).toBe("moon");
    expect(reconcileSaveGame("moon", sun)).toBe("sun");
    expect(reconcileSaveGame("sun", sun)).toBe("sun");
    for (const version of ["US", "UM"]) {
      expect(saveGameChoices({ ...sun, version })).toEqual([]);
      expect(reconcileSaveGame("sun", { ...sun, version })).toBe("");
    }
    for (const version of ["SN", "MN"])
      expect(saveGameChoices({ ...sun, format: "SAV7USUM", version })).toEqual(
        [],
      );
    expect(
      saveGameChoices({ ...sun, format: "SAV7USUM", version: "US" }),
    ).toEqual(["ultra-sun"]);
    const grouped = { ...emeraldReport, format: "SAV3RS", version: "RS" };
    expect(reconcileSaveGame("ruby", grouped)).toBe("ruby");
    expect(reconcileSaveGame("emerald", grouped)).toBe("");
    expect(
      reconcileSaveGame("sword", { ...sun, format: "SAV8SWSH", version: "SH" }),
    ).toBe("shield");
  });

  it("routes spatial formats separately from DS and rebases the full position group", () => {
    const report: SaveReport = {
      ...emeraldReport,
      trainer: {
        ...emeraldReport.trainer,
        position: null,
        spatialPosition: [
          {
            key: "map",
            value: "9007199254740993",
            min: "0",
            max: "18446744073709551615",
            places: 0,
            truncate: false,
          },
          {
            key: "x",
            value: "1.123456",
            min: "-99999999",
            max: "99999999",
            places: 6,
            truncate: false,
          },
          {
            key: "rotation",
            value: "3",
            min: "-99999999",
            max: "99999999",
            places: 6,
            truncate: false,
          },
        ],
      },
    };
    const draft = trainerDraft(report);
    expect(draft).toMatchObject({
      map: "9007199254740993",
      x: "1.123456",
      rotation: "3",
      scaleX: "",
    });
    const validated = validateTrainer(
      { ...draft, map: "18446744073709551615", x: "-1.234567" },
      report,
    );
    expect(validated.position).toBeUndefined();
    expect(validated.spatialPosition).toEqual({
      map: "18446744073709551615",
      x: "-1.234567",
    });
    const next: SaveReport = {
      ...report,
      trainer: {
        ...report.trainer,
        spatialPosition: report.trainer.spatialPosition.map((f) => ({
          ...f,
          value: "2",
        })),
      },
    };
    expect(
      rebaseTrainerDraft({ ...draft, rotation: "45" }, report, next),
    ).toMatchObject({ map: draft.map, x: draft.x, rotation: "45" });
    expect(rebaseTrainerDraft(draft, report, next)).toMatchObject({
      map: "2",
      x: "2",
      rotation: "2",
    });
    expect(() =>
      validateTrainer(
        { ...trainerDraft(emeraldReport), rotation: "0" },
        emeraldReport,
      ),
    ).toThrow(/spatial position/);
  });
  it("supports date-only and minute fields, explicit empty-date repair and independent undo", () => {
    const report: SaveReport = {
      ...emeraldReport,
      trainer: {
        ...emeraldReport.trainer,
        dates: [
          {
            key: "started",
            value: "2024-02-29",
            kind: "date",
            min: "2000-01-01",
            max: "2060-12-31",
          },
          {
            key: "saved",
            value: "",
            kind: "minute",
            min: "1900-01-01T00:00:00",
            max: "4095-12-31T23:59:00",
          },
        ],
      },
    };
    const draft = trainerDraft(report);
    expect(draft).toMatchObject({ started: "2024-02-29", fame: "", saved: "" });
    expect(validateTrainer(draft, report).dates).toBeUndefined();
    expect(
      validateTrainer(
        { ...draft, started: "2060-12-31", saved: "4095-12-31T23:59" },
        report,
      ).dates,
    ).toEqual({ started: "2060-12-31", saved: "4095-12-31T23:59:00" });
    for (const value of [
      "",
      "2023-02-29",
      "2061-01-01",
      "2024-02-29T00:00:00",
      "2024-2-29",
    ])
      expect(() =>
        validateTrainer({ ...draft, started: value }, report),
      ).toThrow(/Trainer dates/);
    for (const value of [
      "1899-12-31T23:59:00",
      "4096-01-01T00:00:00",
      "2024-01-01T12:34:01",
      "2023-02-29T00:00:00",
    ])
      expect(() => validateTrainer({ ...draft, saved: value }, report)).toThrow(
        /Trainer dates/,
      );
    expect(() =>
      validateTrainer({ ...draft, fame: "2024-01-01T00:00:00" }, report),
    ).toThrow(/Trainer dates/);
    const next: SaveReport = {
      ...report,
      trainer: {
        ...report.trainer,
        dates: report.trainer.dates.map((f) => ({
          ...f,
          value: f.key === "saved" ? "2025-01-01T00:00:00" : "2025-01-01",
        })),
      },
    };
    expect(
      rebaseTrainerDraft(
        { ...draft, saved: "2026-01-01T00:00:00" },
        report,
        next,
      ),
    ).toMatchObject({ started: "2025-01-01", saved: "2026-01-01T00:00:00" });
    expect(() =>
      validateTrainer({ ...trainerDraft(next), saved: "" }, next),
    ).toThrow(/Trainer dates/);
  });
  it("validates game-clock dates without timezone conversion and preserves independent drafts", () => {
    const report: SaveReport = {
      ...emeraldReport,
      trainer: {
        ...emeraldReport.trainer,
        dates: [
          {
            key: "started",
            value: "2024-01-01T00:00:00",
            kind: "second",
            min: "2000-01-01T00:00:00",
            max: "2099-12-31T23:59:59",
          },
          {
            key: "fame",
            value: "2024-02-01T12:34:56",
            kind: "second",
            min: "2000-01-01T00:00:00",
            max: "2099-12-31T23:59:59",
          },
        ],
      },
    };
    const draft = trainerDraft(report);
    expect(validateTrainer(draft, report).dates).toBeUndefined();
    expect(
      validateTrainer({ ...draft, started: "2024-01-01T00:00" }, report).dates,
    ).toBeUndefined();
    for (const value of [
      "2000-01-01T00:00:00",
      "2000-02-29T23:59:59",
      "2096-02-29T12:34:56",
      "2099-12-31T23:59:59",
    ])
      expect(
        validateTrainer({ ...draft, started: value }, report).dates,
      ).toEqual({ started: value });
    expect(
      validateTrainer({ ...draft, fame: "2024-03-01T12:00" }, report).dates,
    ).toEqual({ fame: "2024-03-01T12:00:00" });
    for (const value of [
      "",
      "1999-12-31T23:59:59",
      "2100-01-01T00:00:00",
      "2023-02-29T12:00:00",
      "2024-04-31T12:00:00",
      "2024-01-01T24:00:00",
      "2024-01-01T12:60:00",
      "2024-01-01T12:00:60",
      "2024-01-01",
      "2024-01-01T12:00:00Z",
      "2024-01-01T12:00:00+08:00",
      "2024-01-01T12:00:00.1",
      " 2024-01-01T12:00:00",
    ])
      expect(() =>
        validateTrainer({ ...draft, started: value }, report),
      ).toThrow(/Trainer dates/);
    expect(() =>
      validateTrainer(
        { ...trainerDraft(emeraldReport), started: draft.started },
        emeraldReport,
      ),
    ).toThrow(/Trainer dates/);
    const next: SaveReport = {
      ...report,
      trainer: {
        ...report.trainer,
        dates: report.trainer.dates.map((f) => ({
          ...f,
          value:
            f.key === "started" ? "2025-01-01T00:00:00" : "2025-02-01T00:00:00",
        })),
      },
    };
    expect(
      rebaseTrainerDraft(
        { ...draft, fame: "2026-01-01T00:00:00" },
        report,
        next,
      ),
    ).toMatchObject({
      started: "2025-01-01T00:00:00",
      fame: "2026-01-01T00:00:00",
    });
    const unusual: SaveReport = {
      ...report,
      trainer: {
        ...report.trainer,
        dates: report.trainer.dates.map((f) => ({
          ...f,
          value: f.key === "started" ? "2136-02-07T06:28:15" : f.value,
          max: "2050-12-31T23:59:59",
        })),
      },
    };
    expect(
      validateTrainer(trainerDraft(unusual), unusual).dates,
    ).toBeUndefined();
    expect(() =>
      validateTrainer(
        { ...trainerDraft(unusual), fame: "2051-01-01T00:00:00" },
        unusual,
      ),
    ).toThrow(/Trainer dates/);
    expect(
      validateTrainer(
        { ...trainerDraft(unusual), started: "2050-12-31T23:59:59" },
        unusual,
      ).dates,
    ).toEqual({ started: "2050-12-31T23:59:59" });
  });
  it("parses unsigned 32-bit hexadecimal values without truncation", () => {
    expect(parsePokemonHex("00000000")).toBe(0);
    expect(parsePokemonHex("ffffffff")).toBe(4294967295);
    expect(parsePokemonHex("ABCDEF01")).toBe(0xabcdef01);
    for (const value of ["", "100000000", "-1", "0x12", " 12", "12.3", "GG"])
      expect(() => parsePokemonHex(value)).toThrow();
  });
  it("rejects blanks, exponent notation, overflow and negative IDs", () => {
    for (const value of ["", "65536", "-1", "1e3", "12.5", " 1"]) {
      expect(() =>
        validateTrainer(
          { ...trainerDraft(emeraldReport), tid: value },
          emeraldReport,
        ),
      ).toThrow();
    }
    expect(
      validateTrainer(
        { ...trainerDraft(emeraldReport), tid: "65535", sid: "0" },
        emeraldReport,
      ),
    ).toMatchObject({ tid: 65535, sid: 0 });
  });
  it("uses per-save money and name limits", () => {
    expect(() =>
      validateTrainer(
        { ...trainerDraft(emeraldReport), money: "1000000" },
        emeraldReport,
      ),
    ).toThrow();
    expect(() =>
      validateTrainer(
        { ...trainerDraft(emeraldReport), ot: "ABCDEFGH" },
        emeraldReport,
      ),
    ).toThrow();
    expect(() =>
      validateTrainer(
        { ...trainerDraft(emeraldReport), ot: "A\nB" },
        emeraldReport,
      ),
    ).toThrow();
    expect(() =>
      validateTrainer(trainerDraft(emeraldReport), {
        ...emeraldReport,
        canEdit: false,
      }),
    ).toThrow();
  });
  it("does not silently choose a game for grouped save versions", () => {
    expect(saveGameChoices({ ...emeraldReport, version: "RS" })).toEqual([
      "ruby",
      "sapphire",
    ]);
    expect(
      saveGameChoices({ ...emeraldReport, format: "SAV3XD", version: "CXD" }),
    ).toEqual(["xd"]);
    expect(saveGameChoices({ ...emeraldReport, version: "SL" })).toEqual([]);
  });
  it("validates changed time fields without rewriting unusual original values", () => {
    const unusual = {
      ...emeraldReport,
      gender: 2,
      trainer: { ...emeraldReport.trainer, minutes: 255 },
    };
    expect(validateTrainer(trainerDraft(unusual), unusual)).toMatchObject({
      gender: undefined,
      minutes: undefined,
    });
    const edit = validateTrainer(
      {
        ...trainerDraft(emeraldReport),
        gender: "1",
        hours: "65535",
        minutes: "99",
        seconds: "60",
      },
      emeraldReport,
    );
    expect(edit).toMatchObject({
      gender: 1,
      hours: 65535,
      minutes: 99,
      seconds: 60,
    });
    for (const [key, value] of [
      ["gender", "2"],
      ["hours", "65536"],
      ["minutes", "100"],
      ["seconds", "-1"],
      ["hours", ""],
    ])
      expect(() =>
        validateTrainer(
          { ...trainerDraft(emeraldReport), [key]: value },
          emeraldReport,
        ),
      ).toThrow();
  });
  it("rebases applied trainer values on undo and retains independent drafts", () => {
    const changed = {
      ...emeraldReport,
      ot: "NEW",
      gender: 1,
      trainer: { ...emeraldReport.trainer, hours: 20 },
    };
    expect(
      rebaseTrainerDraft(trainerDraft(changed), changed, emeraldReport),
    ).toEqual(trainerDraft(emeraldReport));
    const pending = { ...trainerDraft(changed), money: "999", seconds: "45" };
    expect(rebaseTrainerDraft(pending, changed, emeraldReport)).toEqual({
      ...trainerDraft(emeraldReport),
      money: "999",
      seconds: "45",
    });
  });
  it("uses the save-specific language catalog and rebases language on undo", () => {
    const report = {
      ...emeraldReport,
      trainer: {
        ...emeraldReport.trainer,
        languages: [
          { id: 2, name: { zh: "英语", en: "English", ja: "英語" } },
          { id: 9, name: { zh: "简体中文", en: "Chinese", ja: "中国語" } },
        ],
      },
    };
    expect(
      validateTrainer({ ...trainerDraft(report), language: "9" }, report)
        .language,
    ).toBe(9);
    for (const language of ["", "6", "11", "2.5"])
      expect(() =>
        validateTrainer({ ...trainerDraft(report), language }, report),
      ).toThrow();
    expect(() =>
      validateTrainer(
        { ...trainerDraft(emeraldReport), language: "9" },
        emeraldReport,
      ),
    ).toThrow();
    const unusual = { ...report, language: 0 };
    expect(
      validateTrainer(trainerDraft(unusual), unusual).language,
    ).toBeUndefined();
    const changed = { ...report, language: 9 };
    expect(
      rebaseTrainerDraft(trainerDraft(changed), changed, report).language,
    ).toBe("2");
  });
  it("validates trainer geography and preserves coupled drafts on undo", () => {
    const choice = (id: number) => ({
      id,
      name: { zh: `Z${id}`, en: `E${id}`, ja: `J${id}` },
    });
    const report: SaveReport = {
      ...emeraldReport,
      trainer: {
        ...emeraldReport.trainer,
        geography: {
          keepRegionWhenCountryZero: true,
          value: { country: 1, region: 2, consoleRegion: 0 },
          countries: [0, 1, 2].map(choice),
          regions: [
            { country: 1, choices: [0, 2].map(choice) },
            { country: 2, choices: [0, 7].map(choice) },
          ],
          consoles: [0, 1, 2, 4, 5, 6].map(choice),
        },
      },
    };
    const draft = trainerDraft(report);
    const changed = changeTrainerCountry(draft, report, "2");
    expect(changed).toMatchObject({ country: "2", region: "7" });
    expect(validateTrainer(changed, report)).toMatchObject({
      country: 2,
      region: 7,
    });
    expect(changeTrainerCountry(draft, report, "0")).toMatchObject({
      country: "0",
      region: "2",
    });
    for (const patch of [
      { country: "" },
      { country: "255" },
      { region: "7" },
      { region: "256" },
      { consoleRegion: "3" },
      { consoleRegion: "1.5" },
    ])
      expect(() => validateTrainer({ ...draft, ...patch }, report)).toThrow(
        /geography/,
      );
    const unusual: SaveReport = {
      ...report,
      trainer: {
        ...report.trainer,
        geography: {
          ...report.trainer.geography!,
          value: { country: 255, region: 255, consoleRegion: 255 },
        },
      },
    };
    expect(validateTrainer(trainerDraft(unusual), unusual)).not.toHaveProperty(
      "country",
    );
    expect(
      validateTrainer(
        { ...trainerDraft(unusual), consoleRegion: "0" },
        unusual,
      ),
    ).toMatchObject({ consoleRegion: 0 });
    expect(() =>
      validateTrainer(
        { ...trainerDraft(emeraldReport), country: "1" },
        emeraldReport,
      ),
    ).toThrow(/geography/);
    const after: SaveReport = {
      ...report,
      trainer: {
        ...report.trainer,
        geography: {
          ...report.trainer.geography!,
          value: { country: 2, region: 7, consoleRegion: 1 },
        },
      },
    };
    expect(rebaseTrainerDraft(draft, report, after)).toMatchObject({
      country: "2",
      region: "7",
      consoleRegion: "1",
    });
    expect(
      rebaseTrainerDraft({ ...draft, region: "0" }, report, after),
    ).toMatchObject({ country: "1", region: "0", consoleRegion: "1" });
  });
  it("uses the DS default region list and omits a nonexistent console region", () => {
    const choice = (id: number) => ({
      id,
      name: { zh: `Z${id}`, en: `E${id}`, ja: `J${id}` },
    });
    const report: SaveReport = {
      ...emeraldReport,
      trainer: {
        ...emeraldReport.trainer,
        geography: {
          keepRegionWhenCountryZero: false,
          value: { country: 103, region: 2, consoleRegion: null },
          countries: [0, 1, 103, 220].map(choice),
          regions: [
            { country: 0, choices: [choice(0)] },
            { country: 1, choices: [choice(0)] },
            { country: 103, choices: [0, 2].map(choice) },
            { country: 220, choices: [0, 7].map(choice) },
          ],
          consoles: [],
        },
      },
    };
    const draft = trainerDraft(report);
    expect(draft.consoleRegion).toBe("");
    const cleared = changeTrainerCountry(draft, report, "0");
    expect(cleared).toMatchObject({
      country: "0",
      region: "0",
      consoleRegion: "",
    });
    expect(validateTrainer(cleared, report)).toMatchObject({
      country: 0,
      region: 0,
    });
    expect(validateTrainer(cleared, report).consoleRegion).toBeUndefined();
    expect(changeTrainerCountry(draft, report, "1")).toMatchObject({
      country: "1",
      region: "0",
    });
    expect(changeTrainerCountry(draft, report, "220")).toMatchObject({
      country: "220",
      region: "7",
    });
    for (const patch of [
      { country: "0", region: "2" },
      { country: "1", region: "2" },
      { consoleRegion: "0" },
      { country: "255" },
    ])
      expect(() => validateTrainer({ ...draft, ...patch }, report)).toThrow(
        /geography/,
      );
    const after: SaveReport = {
      ...report,
      trainer: {
        ...report.trainer,
        geography: {
          ...report.trainer.geography!,
          value: { country: 0, region: 0, consoleRegion: null },
        },
      },
    };
    expect(rebaseTrainerDraft(draft, report, after)).toMatchObject({
      country: "0",
      region: "0",
      consoleRegion: "",
    });
    expect(
      rebaseTrainerDraft(
        { ...draft, country: "220", region: "7" },
        report,
        after,
      ),
    ).toMatchObject({ country: "220", region: "7" });
    const unusual: SaveReport = {
      ...report,
      trainer: {
        ...report.trainer,
        geography: {
          ...report.trainer.geography!,
          value: { country: 0, region: 255, consoleRegion: null },
        },
      },
    };
    expect(
      validateTrainer(trainerDraft(unusual), unusual).country,
    ).toBeUndefined();
    expect(
      validateTrainer({ ...trainerDraft(unusual), region: "0" }, unusual),
    ).toMatchObject({ country: 0, region: 0 });
  });
  it("validates badge masks by save format and rebases applied selections", () => {
    const draft = trainerDraft(emeraldReport);
    for (const badges of ["0", "1", "128", "255"])
      expect(() =>
        validateTrainer({ ...draft, badges }, emeraldReport),
      ).not.toThrow();
    for (const badges of ["", "-1", "1.5", "256"])
      expect(() =>
        validateTrainer({ ...draft, badges }, emeraldReport),
      ).toThrow(/badges/);
    const hg: SaveReport = {
      ...emeraldReport,
      trainer: { ...emeraldReport.trainer, badges: { count: 16, value: 0 } },
    };
    expect(
      validateTrainer({ ...trainerDraft(hg), badges: "65535" }, hg).badges,
    ).toBe(65535);
    expect(() =>
      validateTrainer({ ...trainerDraft(hg), badges: "65536" }, hg),
    ).toThrow(/badges/);
    const unsupported: SaveReport = {
      ...emeraldReport,
      trainer: { ...emeraldReport.trainer, badges: null },
    };
    expect(() =>
      validateTrainer(
        { ...trainerDraft(unsupported), badges: "0" },
        unsupported,
      ),
    ).toThrow(/badges/);
    const changed: SaveReport = {
      ...emeraldReport,
      trainer: { ...emeraldReport.trainer, badges: { count: 8, value: 128 } },
    };
    expect(
      rebaseTrainerDraft(trainerDraft(changed), changed, emeraldReport).badges,
    ).toBe("0");
    expect(
      rebaseTrainerDraft(
        { ...trainerDraft(changed), badges: "255" },
        changed,
        emeraldReport,
      ).badges,
    ).toBe("255");
  });
  it("validates supported currency fields and preserves unchanged abnormal balances", () => {
    const report: SaveReport = {
      ...emeraldReport,
      trainer: {
        ...emeraldReport.trainer,
        currencies: [
          { key: "bp", value: 5, max: 9999 },
          { key: "pokeMiles", value: 50, max: 9999999 },
        ],
      },
    };
    const draft = trainerDraft(report);
    expect(
      validateTrainer({ ...draft, bp: "9999", pokeMiles: "9999999" }, report)
        .currencies,
    ).toEqual({ bp: 9999, pokeMiles: 9999999 });
    for (const bp of ["", "-1", "2.5", "10000"])
      expect(() => validateTrainer({ ...draft, bp }, report)).toThrow(
        /currency/,
      );
    expect(() => validateTrainer({ ...draft, watts: "1" }, report)).toThrow(
      /currency/,
    );
    expect(validateTrainer(draft, report).currencies).toBeUndefined();
    const unusual: SaveReport = {
      ...report,
      trainer: {
        ...report.trainer,
        currencies: [{ key: "bp", value: 65535, max: 9999 }],
      },
    };
    expect(
      validateTrainer(trainerDraft(unusual), unusual).currencies,
    ).toBeUndefined();
    expect(rebaseTrainerDraft(trainerDraft(unusual), unusual, report).bp).toBe(
      "5",
    );
    expect(
      rebaseTrainerDraft(
        { ...trainerDraft(unusual), bp: "123" },
        unusual,
        report,
      ).bp,
    ).toBe("123");
  });
  it("validates game record input using its dynamic upper boundary", () => {
    const entry = {
      index: 100,
      name: "100",
      value: 15000,
      max: 15000,
      normalMax: 9999,
      offset: 400,
      timeHint: null,
    };
    expect(validateSaveRecord(entry, "14000")).toEqual({
      index: 100,
      value: 14000,
    });
    expect(validateSaveRecord(entry, "0").value).toBe(0);
    for (const text of ["", "-1", "1.5", "15001", "9007199254740993"])
      expect(() => validateSaveRecord(entry, text)).toThrow();
  });
  it("preserves original game settings and rebases applied options without losing drafts", () => {
    const draft = trainerDraft(emeraldReport);
    expect(validateTrainer(draft, emeraldReport).gameOptions).toBeUndefined();
    expect(
      validateTrainer(
        {
          ...draft,
          textSpeed: "2",
          battleStyle: "1",
          sound: "0",
          battleEffects: "0",
        },
        emeraldReport,
      ).gameOptions,
    ).toEqual({ textSpeed: 2, battleStyle: 1, sound: 0, battleEffects: 0 });
    const unusual: SaveReport = {
      ...emeraldReport,
      trainer: {
        ...emeraldReport.trainer,
        gameOptions: { ...emeraldReport.trainer.gameOptions!, textSpeed: 7 },
      },
    };
    expect(
      validateTrainer(trainerDraft(unusual), unusual).gameOptions,
    ).toBeUndefined();
    expect(
      validateTrainer({ ...trainerDraft(unusual), sound: "0" }, unusual)
        .gameOptions,
    ).toEqual({ sound: 0 });
    const pending = { ...trainerDraft(unusual), battleStyle: "1" };
    const rebased = rebaseTrainerDraft(pending, unusual, emeraldReport);
    expect(rebased.textSpeed).toBe("1");
    expect(rebased.battleStyle).toBe("1");
    expect(validateTrainer(rebased, emeraldReport).gameOptions).toEqual({
      battleStyle: 1,
    });
  });
  it("rejects unavailable or truncated game option edits", () => {
    const draft = trainerDraft(emeraldReport);
    for (const textSpeed of ["", "-1", "4", "5", "6", "7", "8", "1.5", "1e0"])
      expect(() =>
        validateTrainer({ ...draft, textSpeed }, emeraldReport),
      ).toThrow();
    for (const key of ["battleStyle", "sound", "battleEffects"] as const)
      for (const value of ["", "-1", "2", "0.5", "1e0"])
        expect(() =>
          validateTrainer({ ...draft, [key]: value }, emeraldReport),
        ).toThrow();
    const unsupported: SaveReport = {
      ...emeraldReport,
      trainer: { ...emeraldReport.trainer, gameOptions: null },
    };
    expect(
      validateTrainer(trainerDraft(unsupported), unsupported).gameOptions,
    ).toBeUndefined();
    expect(() =>
      validateTrainer(
        { ...trainerDraft(unsupported), sound: "0" },
        unsupported,
      ),
    ).toThrow();
  });
  it("validates DS map coordinates and retains an unapplied position as one group", () => {
    const report: SaveReport = {
      ...emeraldReport,
      trainer: {
        ...emeraldReport.trainer,
        position: { map: 123, x: 11, z: 33, y: 22 },
      },
    };
    const draft = trainerDraft(report);
    expect(validateTrainer(draft, report).position).toBeUndefined();
    expect(
      validateTrainer(
        { ...draft, map: "1000", x: "65535", z: "-65535", y: "0" },
        report,
      ).position,
    ).toEqual({ map: 1000, x: 65535, z: -65535, y: 0 });
    for (const patch of [
      { map: "1001" },
      { map: "-1" },
      { x: "-0" },
      { x: "65536" },
      { y: "-1" },
      { z: "-65536" },
      { z: "65536" },
      { z: "" },
      { z: "1.5" },
      { z: "1e2" },
      { map: "9007199254740993" },
    ])
      expect(() => validateTrainer({ ...draft, ...patch }, report)).toThrow(
        /position/,
      );
    expect(() =>
      validateTrainer(
        { ...trainerDraft(emeraldReport), x: "0" },
        emeraldReport,
      ),
    ).toThrow(/position/);
    const after: SaveReport = {
      ...report,
      trainer: {
        ...report.trainer,
        position: { map: 456, x: 44, z: 55, y: 66 },
      },
    };
    expect(rebaseTrainerDraft(draft, report, after)).toMatchObject({
      map: "456",
      x: "44",
      z: "55",
      y: "66",
    });
    expect(
      rebaseTrainerDraft({ ...draft, x: "77" }, report, after),
    ).toMatchObject({ map: "123", x: "77", z: "33", y: "22" });
    const unusual: SaveReport = {
      ...report,
      trainer: {
        ...report.trainer,
        position: { map: -889323519, x: 11, z: 33, y: 22 },
      },
    };
    expect(
      validateTrainer(trainerDraft(unusual), unusual).position,
    ).toBeUndefined();
    expect(
      validateTrainer({ ...trainerDraft(unusual), x: "12" }, unusual).position,
    ).toEqual({ x: 12 });
  });
  it("always exports a distinct filename", () => {
    expect(exportSaveName("main")).toBe("edited-main");
    expect(exportSaveName("../trainer.sav")).toBe("edited-.._trainer.sav");
  });
});
