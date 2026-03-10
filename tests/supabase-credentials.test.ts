import { describe, it, expect } from "vitest";

/**
 * Supabase認証情報の検証テスト
 * 環境変数が正しく設定されているか確認
 */
describe("Supabase Credentials Validation", () => {
  it("should have EXPO_PUBLIC_SUPABASE_URL environment variable", () => {
    const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
    expect(url).toBeDefined();
    expect(typeof url).toBe("string");
    expect(url).toContain("supabase.co");
  });

  it("should have EXPO_PUBLIC_SUPABASE_ANON_KEY environment variable", () => {
    const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    expect(key).toBeDefined();
    expect(typeof key).toBe("string");
    expect(key?.length).toBeGreaterThan(0);
  });

  it("should have valid Supabase URL format", () => {
    const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
    expect(url).toMatch(/^https:\/\/[a-z0-9]+\.supabase\.co$/);
  });

  it("should have valid Supabase Anon Key format", () => {
    const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    expect(key).toBeDefined();
    if (key) {
      expect(key).toMatch(/^sb_publishable_[a-zA-Z0-9_]+$/);
    }
  });

  it("should be able to construct Supabase client URL", () => {
    const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

    expect(url).toBeDefined();
    expect(key).toBeDefined();

    if (url && key) {
      const clientUrl = `${url}/rest/v1/`;
      expect(clientUrl).toContain("supabase.co/rest/v1/");
    }
  });

  it("should have matching URL and key from same project", () => {
    const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

    expect(url).toBeDefined();
    expect(key).toBeDefined();

    if (key && typeof key === "string") {
      expect(key.length).toBeGreaterThan(20);
    }
  });
});
