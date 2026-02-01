import { describe, it, expect, beforeEach } from "vitest";

/**
 * Test suite for scheduled costume exclusion feature
 * Tests filtering costumes based on scheduled usage dates
 */

interface CostumeData {
  id: string;
  name: string;
  scheduledUsageDates?: string[];
}

describe("Scheduled Costume Exclusion", () => {
  let costumes: CostumeData[];
  let today: Date;

  beforeEach(() => {
    today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const in3Days = new Date(today);
    in3Days.setDate(in3Days.getDate() + 3);

    const in7Days = new Date(today);
    in7Days.setDate(in7Days.getDate() + 7);

    const in30Days = new Date(today);
    in30Days.setDate(in30Days.getDate() + 30);

    const in40Days = new Date(today);
    in40Days.setDate(in40Days.getDate() + 40);

    costumes = [
      {
        id: "1",
        name: "明日使用予定のドレス",
        scheduledUsageDates: [tomorrow.toISOString()],
      },
      {
        id: "2",
        name: "3日後使用予定のスーツ",
        scheduledUsageDates: [in3Days.toISOString()],
      },
      {
        id: "3",
        name: "7日後使用予定のシャツ",
        scheduledUsageDates: [in7Days.toISOString()],
      },
      {
        id: "4",
        name: "30日後使用予定のジャケット",
        scheduledUsageDates: [in30Days.toISOString()],
      },
      {
        id: "5",
        name: "40日後使用予定のパンツ",
        scheduledUsageDates: [in40Days.toISOString()],
      },
      {
        id: "6",
        name: "使用予定なしの帽子",
      },
    ];
  });

  function filterCostumesByExcludePeriod(
    costumes: CostumeData[],
    excludePeriodDays: number | null
  ): CostumeData[] {
    if (excludePeriodDays === null) {
      return costumes;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const excludeUntil = new Date(today);
    excludeUntil.setDate(excludeUntil.getDate() + excludePeriodDays);

    return costumes.filter((costume) => {
      if (!costume.scheduledUsageDates || costume.scheduledUsageDates.length === 0) {
        return true;
      }

      const isScheduledForUse = costume.scheduledUsageDates.some((dateStr) => {
        const scheduleDate = new Date(dateStr);
        scheduleDate.setHours(0, 0, 0, 0);
        return scheduleDate >= today && scheduleDate <= excludeUntil;
      });

      return !isScheduledForUse;
    });
  }

  it("should not exclude any costumes when excludePeriodDays is null", () => {
    const filtered = filterCostumesByExcludePeriod(costumes, null);
    expect(filtered.length).toBe(6);
  });

  it("should exclude costumes scheduled within 3 days", () => {
    const filtered = filterCostumesByExcludePeriod(costumes, 3);
    expect(filtered.length).toBe(4);
    expect(filtered.map((c) => c.id)).toEqual(["3", "4", "5", "6"]);
  });

  it("should exclude costumes scheduled within 7 days", () => {
    const filtered = filterCostumesByExcludePeriod(costumes, 7);
    expect(filtered.length).toBe(3);
    expect(filtered.map((c) => c.id)).toEqual(["4", "5", "6"]);
  });

  it("should exclude costumes scheduled within 30 days", () => {
    const filtered = filterCostumesByExcludePeriod(costumes, 30);
    expect(filtered.length).toBe(2);
    expect(filtered.map((c) => c.id)).toEqual(["5", "6"]);
  });

  it("should exclude costumes scheduled within 40 days", () => {
    const filtered = filterCostumesByExcludePeriod(costumes, 40);
    expect(filtered.length).toBe(1);
    expect(filtered[0].id).toBe("6");
  });

  it("should always include costumes with no scheduled usage dates", () => {
    const filtered = filterCostumesByExcludePeriod(costumes, 3);
    const costumeWithoutSchedule = filtered.find((c) => c.id === "6");
    expect(costumeWithoutSchedule).toBeDefined();
  });

  it("should handle multiple scheduled dates for same costume", () => {
    const in2Days = new Date(today);
    in2Days.setDate(in2Days.getDate() + 2);

    const in10Days = new Date(today);
    in10Days.setDate(in10Days.getDate() + 10);

    const multiScheduledCostume: CostumeData = {
      id: "7",
      name: "複数予定のドレス",
      scheduledUsageDates: [in2Days.toISOString(), in10Days.toISOString()],
    };

    const testCostumes = [...costumes, multiScheduledCostume];
    const filtered = filterCostumesByExcludePeriod(testCostumes, 3);

    const found = filtered.find((c) => c.id === "7");
    expect(found).toBeUndefined(); // Should be excluded due to 2-day scheduled date
  });

  it("should correctly handle edge case of exactly excludePeriodDays", () => {
    const exactDay = new Date(today);
    exactDay.setDate(exactDay.getDate() + 7);

    const edgeCostume: CostumeData = {
      id: "8",
      name: "7日目ちょうどのドレス",
      scheduledUsageDates: [exactDay.toISOString()],
    };

    const testCostumes = [edgeCostume];
    const filtered = filterCostumesByExcludePeriod(testCostumes, 7);

    expect(filtered.length).toBe(0); // Should be excluded
  });

  it("should not exclude costume scheduled after excludePeriodDays", () => {
    const afterPeriod = new Date(today);
    afterPeriod.setDate(afterPeriod.getDate() + 8);

    const afterCostume: CostumeData = {
      id: "9",
      name: "8日目のドレス",
      scheduledUsageDates: [afterPeriod.toISOString()],
    };

    const testCostumes = [afterCostume];
    const filtered = filterCostumesByExcludePeriod(testCostumes, 7);

    expect(filtered.length).toBe(1); // Should not be excluded
    expect(filtered[0].id).toBe("9");
  });

  it("should correctly calculate 3-day exclude period", () => {
    const filtered = filterCostumesByExcludePeriod(costumes, 3);
    const excludedIds = costumes
      .filter((c) => !filtered.includes(c))
      .map((c) => c.id);
    expect(excludedIds).toEqual(["1", "2"]);
  });

  it("should correctly calculate 1-week exclude period", () => {
    const filtered = filterCostumesByExcludePeriod(costumes, 7);
    const excludedIds = costumes
      .filter((c) => !filtered.includes(c))
      .map((c) => c.id);
    expect(excludedIds).toEqual(["1", "2", "3"]);
  });

  it("should correctly calculate 1-month exclude period", () => {
    const filtered = filterCostumesByExcludePeriod(costumes, 30);
    const excludedIds = costumes
      .filter((c) => !filtered.includes(c))
      .map((c) => c.id);
    expect(excludedIds).toEqual(["1", "2", "3", "4"]);
  });

  it("should handle empty scheduled dates array", () => {
    const emptyCostume: CostumeData = {
      id: "10",
      name: "空の予定配列",
      scheduledUsageDates: [],
    };

    const testCostumes = [emptyCostume];
    const filtered = filterCostumesByExcludePeriod(testCostumes, 7);

    expect(filtered.length).toBe(1);
    expect(filtered[0].id).toBe("10");
  });

  it("should handle undefined scheduled dates", () => {
    const undefinedCostume: CostumeData = {
      id: "11",
      name: "未定義の予定",
    };

    const testCostumes = [undefinedCostume];
    const filtered = filterCostumesByExcludePeriod(testCostumes, 7);

    expect(filtered.length).toBe(1);
    expect(filtered[0].id).toBe("11");
  });
});
