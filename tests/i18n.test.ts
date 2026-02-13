import { describe, it, expect, beforeEach } from "vitest";
import {
  getSupportedLanguages,
  getLanguageConfig,
  detectSystemLanguage,
  getLanguage,
} from "../src/utils/i18n";

describe("Multi-language Support (i18n) - 8 Languages", () => {
  beforeEach(() => {
    // Setup before each test
  });

  it("should support 8 languages", () => {
    const languages = getSupportedLanguages();

    expect(languages.length).toBe(8);
  });

  it("should include Japanese", () => {
    const languages = getSupportedLanguages();
    const ja = languages.find((l) => l.code === "ja");

    expect(ja).toBeDefined();
    expect(ja?.name).toBe("Japanese");
    expect(ja?.nativeName).toBe("日本語");
  });

  it("should include English", () => {
    const languages = getSupportedLanguages();
    const en = languages.find((l) => l.code === "en");

    expect(en).toBeDefined();
    expect(en?.name).toBe("English");
  });

  it("should include Simplified Chinese", () => {
    const languages = getSupportedLanguages();
    const zhCN = languages.find((l) => l.code === "zh-CN");

    expect(zhCN).toBeDefined();
    expect(zhCN?.name).toBe("Chinese (Simplified)");
  });

  it("should include Traditional Chinese", () => {
    const languages = getSupportedLanguages();
    const zhTW = languages.find((l) => l.code === "zh-TW");

    expect(zhTW).toBeDefined();
    expect(zhTW?.name).toBe("Chinese (Traditional)");
  });

  it("should include Korean", () => {
    const languages = getSupportedLanguages();
    const ko = languages.find((l) => l.code === "ko");

    expect(ko).toBeDefined();
    expect(ko?.name).toBe("Korean");
  });

  it("should include Spanish", () => {
    const languages = getSupportedLanguages();
    const es = languages.find((l) => l.code === "es");

    expect(es).toBeDefined();
    expect(es?.name).toBe("Spanish");
  });

  it("should include French", () => {
    const languages = getSupportedLanguages();
    const fr = languages.find((l) => l.code === "fr");

    expect(fr).toBeDefined();
    expect(fr?.name).toBe("French");
  });

  it("should include German", () => {
    const languages = getSupportedLanguages();
    const de = languages.find((l) => l.code === "de");

    expect(de).toBeDefined();
    expect(de?.name).toBe("German");
  });

  it("should have left-to-right direction for all languages", () => {
    const languages = getSupportedLanguages();

    languages.forEach((lang) => {
      expect(lang.direction).toBe("ltr");
    });
  });

  it("should get language config", () => {
    const jaConfig = getLanguageConfig("ja");

    expect(jaConfig).toBeDefined();
    expect(jaConfig?.code).toBe("ja");
    expect(jaConfig?.name).toBe("Japanese");
  });

  it("should detect system language", () => {
    const language = detectSystemLanguage();

    expect(typeof language).toBe("string");
    expect(["ja", "en", "zh-CN", "zh-TW", "ko", "es", "fr", "de"]).toContain(
      language
    );
  });

  it("should get current language", async () => {
    const language = await getLanguage();

    expect(typeof language).toBe("string");
    expect(["ja", "en", "zh-CN", "zh-TW", "ko", "es", "fr", "de"]).toContain(
      language
    );
  });

  it("should have native names for all languages", () => {
    const languages = getSupportedLanguages();

    languages.forEach((lang) => {
      expect(lang.nativeName).toBeDefined();
      expect(lang.nativeName.length).toBeGreaterThan(0);
    });
  });

  it("should have unique language codes", () => {
    const languages = getSupportedLanguages();
    const codes = languages.map((l) => l.code);
    const uniqueCodes = new Set(codes);

    expect(uniqueCodes.size).toBe(codes.length);
  });

  it("should support language switching", () => {
    const languages = getSupportedLanguages();

    expect(languages.length).toBeGreaterThanOrEqual(2);
  });

  it("should have English as fallback language", () => {
    const languages = getSupportedLanguages();
    const en = languages.find((l) => l.code === "en");

    expect(en).toBeDefined();
  });

  it("should have Japanese as primary language", () => {
    const languages = getSupportedLanguages();
    const ja = languages.find((l) => l.code === "ja");

    expect(ja).toBeDefined();
    expect(ja?.code).toBe("ja");
  });

  it("should have proper language codes format", () => {
    const languages = getSupportedLanguages();

    languages.forEach((lang) => {
      // Language codes should be like 'en', 'ja', 'zh-CN', etc.
      expect(lang.code).toMatch(/^[a-z]{2}(-[A-Z]{2})?$/);
    });
  });

  it("should support Asian languages", () => {
    const languages = getSupportedLanguages();
    const asianLanguages = languages.filter((l) =>
      ["ja", "zh-CN", "zh-TW", "ko"].includes(l.code)
    );

    expect(asianLanguages.length).toBe(4);
  });

  it("should support European languages", () => {
    const languages = getSupportedLanguages();
    const europeanLanguages = languages.filter((l) =>
      ["en", "es", "fr", "de"].includes(l.code)
    );

    expect(europeanLanguages.length).toBe(4);
  });

  it("should have consistent language structure", () => {
    const languages = getSupportedLanguages();

    languages.forEach((lang) => {
      expect(lang).toHaveProperty("code");
      expect(lang).toHaveProperty("name");
      expect(lang).toHaveProperty("nativeName");
      expect(lang).toHaveProperty("direction");
    });
  });

  it("should get language config for all supported languages", () => {
    const languages = getSupportedLanguages();

    languages.forEach((lang) => {
      const config = getLanguageConfig(lang.code);
      expect(config).toBeDefined();
      expect(config?.code).toBe(lang.code);
    });
  });
});
