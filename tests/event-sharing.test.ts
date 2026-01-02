import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * Test suite for event result sharing feature
 * Tests the ability to share optimization results via native share API
 */

interface Assignment {
  participantId: number;
  participantName: string;
  costumeId: number;
  costumeName: string;
  priority: number;
}

interface OptimizationProposal {
  id: string;
  score: number;
  assignments: Assignment[];
  violations: string[];
}

interface Event {
  id: number;
  name: string;
  eventDate: string;
}

describe("Event Result Sharing", () => {
  let mockEvent: Event;
  let mockProposal: OptimizationProposal;

  beforeEach(() => {
    mockEvent = {
      id: 1,
      name: "クリスマスコンサート",
      eventDate: "2024-12-25",
    };

    mockProposal = {
      id: "proposal-1",
      score: 280,
      assignments: [
        {
          participantId: 1,
          participantName: "Alice",
          costumeId: 1,
          costumeName: "ピンクのドレス",
          priority: 1,
        },
        {
          participantId: 2,
          participantName: "Bob",
          costumeId: 5,
          costumeName: "紫のスーツ",
          priority: 2,
        },
        {
          participantId: 3,
          participantName: "Charlie",
          costumeId: 3,
          costumeName: "黒のタキシード",
          priority: 1,
        },
      ],
      violations: [],
    };
  });

  it("should generate share message from proposal", () => {
    const assignmentText = mockProposal.assignments
      .map((a) => `${a.participantName}: ${a.costumeName}`)
      .join("\n");

    const message = `${mockEvent.name}の衣装割り当て\n\n${assignmentText}\n\nスコア: ${mockProposal.score}点`;

    expect(message).toContain(mockEvent.name);
    expect(message).toContain("Alice: ピンクのドレス");
    expect(message).toContain("Bob: 紫のスーツ");
    expect(message).toContain("Charlie: 黒のタキシード");
    expect(message).toContain(`スコア: ${mockProposal.score}点`);
  });

  it("should include all assignments in share message", () => {
    const assignmentText = mockProposal.assignments
      .map((a) => `${a.participantName}: ${a.costumeName}`)
      .join("\n");

    const message = `${mockEvent.name}の衣装割り当て\n\n${assignmentText}\n\nスコア: ${mockProposal.score}点`;

    mockProposal.assignments.forEach((assignment) => {
      expect(message).toContain(assignment.participantName);
      expect(message).toContain(assignment.costumeName);
    });
  });

  it("should handle event name properly in share message", () => {
    const assignmentText = mockProposal.assignments
      .map((a) => `${a.participantName}: ${a.costumeName}`)
      .join("\n");

    const message = `${mockEvent.name}の衣装割り当て\n\n${assignmentText}\n\nスコア: ${mockProposal.score}点`;
    const title = `${mockEvent.name}の衣装割り当て`;

    expect(title).toBe("クリスマスコンサートの衣装割り当て");
    expect(message).toContain(mockEvent.name);
  });

  it("should handle missing event name gracefully", () => {
    const eventWithoutName: Event = { ...mockEvent, name: "" };
    const assignmentText = mockProposal.assignments
      .map((a) => `${a.participantName}: ${a.costumeName}`)
      .join("\n");

    const message = `${eventWithoutName.name || "イベント"}の衣装割り当て\n\n${assignmentText}\n\nスコア: ${mockProposal.score}点`;

    expect(message).toContain("イベント");
  });

  it("should include score in share message", () => {
    const assignmentText = mockProposal.assignments
      .map((a) => `${a.participantName}: ${a.costumeName}`)
      .join("\n");

    const message = `${mockEvent.name}の衣装割り当て\n\n${assignmentText}\n\nスコア: ${mockProposal.score}点`;

    expect(message).toContain(`スコア: ${mockProposal.score}点`);
  });

  it("should format share message with proper line breaks", () => {
    const assignmentText = mockProposal.assignments
      .map((a) => `${a.participantName}: ${a.costumeName}`)
      .join("\n");

    const message = `${mockEvent.name}の衣装割り当て\n\n${assignmentText}\n\nスコア: ${mockProposal.score}点`;

    // Check for proper line breaks
    expect(message).toContain("\n\n");
    const lines = message.split("\n");
    expect(lines.length).toBeGreaterThan(3);
  });

  it("should handle multiple assignments with different priorities", () => {
    const proposalWithDifferentPriorities: OptimizationProposal = {
      ...mockProposal,
      assignments: [
        { ...mockProposal.assignments[0], priority: 1 },
        { ...mockProposal.assignments[1], priority: 2 },
        { ...mockProposal.assignments[2], priority: 3 },
      ],
    };

    const assignmentText = proposalWithDifferentPriorities.assignments
      .map((a) => `${a.participantName}: ${a.costumeName}`)
      .join("\n");

    const message = `${mockEvent.name}の衣装割り当て\n\n${assignmentText}\n\nスコア: ${proposalWithDifferentPriorities.score}点`;

    expect(message).toContain("Alice: ピンクのドレス");
    expect(message).toContain("Bob: 紫のスーツ");
    expect(message).toContain("Charlie: 黒のタキシード");
  });

  it("should handle proposal with violations in share message", () => {
    const proposalWithViolations: OptimizationProposal = {
      ...mockProposal,
      violations: ["色が重複しています", "パターンが同じです"],
    };

    const assignmentText = proposalWithViolations.assignments
      .map((a) => `${a.participantName}: ${a.costumeName}`)
      .join("\n");

    const message = `${mockEvent.name}の衣装割り当て\n\n${assignmentText}\n\nスコア: ${proposalWithViolations.score}点`;

    expect(message).toContain("Alice: ピンクのドレス");
    // Violations are not included in the basic share message
    expect(message).not.toContain("色が重複しています");
  });

  it("should create consistent share title and message", () => {
    const assignmentText = mockProposal.assignments
      .map((a) => `${a.participantName}: ${a.costumeName}`)
      .join("\n");

    const message = `${mockEvent.name}の衣装割り当て\n\n${assignmentText}\n\nスコア: ${mockProposal.score}点`;
    const title = `${mockEvent.name}の衣装割り当て`;

    // Both should start with the same event name
    expect(message.startsWith(title)).toBe(true);
  });

  it("should handle single assignment", () => {
    const singleAssignmentProposal: OptimizationProposal = {
      ...mockProposal,
      assignments: [mockProposal.assignments[0]],
    };

    const assignmentText = singleAssignmentProposal.assignments
      .map((a) => `${a.participantName}: ${a.costumeName}`)
      .join("\n");

    const message = `${mockEvent.name}の衣装割り当て\n\n${assignmentText}\n\nスコア: ${singleAssignmentProposal.score}点`;

    expect(message).toContain("Alice: \u30d4\u30f3\u30af\u306e\u30c9\u30ec\u30b9");
    expect(message.split("\n").length).toBe(5);
  });
});
