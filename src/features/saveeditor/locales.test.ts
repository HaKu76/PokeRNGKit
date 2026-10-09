import { describe, expect, it } from "vitest";
import { createInstance } from "i18next";
import { saveEditorResources, localizeSaveError } from "./locales";

describe("save editor localization", () => {
  it("resolves all supported languages and game names without key fallbacks", async () => {
    const i18n = createInstance();
    await i18n.init({
      resources: Object.fromEntries(
        Object.entries(saveEditorResources).map(([language, values]) => [
          language,
          { translation: { saveEditor: values } },
        ]),
      ),
      lng: "zh",
    });
    for (const lang of ["zh", "en", "ja"] as const) {
      await i18n.changeLanguage(lang);
      const words = i18n.t("saveEditor", {
        returnObjects: true,
      }) as typeof saveEditorResources.en;
      expect(Object.keys(words).sort()).toEqual(
        Object.keys(saveEditorResources.en).sort(),
      );
      expect(words.games["ultra-sun"]).toBe(
        saveEditorResources[lang].games["ultra-sun"],
      );
      expect(words.trainerName).toBe(saveEditorResources[lang].trainerName);
      expect(
        localizeSaveError(
          "GS Ball event is unavailable for this format.",
          words,
        ),
      ).toBe(words.gsBallError);
      expect(
        localizeSaveError("Box archive contains no eligible Pokemon.", words),
      ).toBe(words.boxArchiveEmpty);
      expect(localizeSaveError("Box archive options are invalid.", words)).toBe(
        words.boxArchiveError,
      );
      expect(localizeSaveError("Unrecognized save file.", words)).toBe(
        words.fileError,
      );
      expect(
        localizeSaveError(
          "Gen3 secret base name cannot be encoded without loss.",
          words,
        ),
      ).toBe(words.secretBase3NameError);
      expect(
        localizeSaveError("Invalid Gen3 secret base form preview.", words),
      ).toBe(words.secretBase3Error);
      expect(localizeSaveError("OT: 1–7 characters.", words)).toBe(
        words.nameError,
      );
      expect(
        localizeSaveError("Rival name cannot be encoded without loss.", words),
      ).toBe(words.rivalError);
      expect(
        localizeSaveError(
          "The first raw party PID changed. Read the Mirage Island source again.",
          words,
        ),
      ).toBe(words.mirageSourceError);
      expect(
        localizeSaveError("Invalid trainer card icon changes.", words),
      ).toBe(words.misc3Error);
      expect(
        localizeSaveError("Gen3 main settings require valid checksums.", words),
      ).toBe(words.invalid);
    }
    expect(saveEditorResources.zh.title).toContain("存档编辑器");
  });
});
