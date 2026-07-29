import { describe, expect, it } from "vitest";
import { sortByRisk } from "./ranking";
import type { ProjectDto, ProjectHealth, Priority } from "@/lib/domain/contracts/projects";

function project(
  code: string,
  health: ProjectHealth,
  nextCheckpointDate: string | null = null,
  priority: Priority = "P2",
): ProjectDto {
  return {
    id: `id-${code}`,
    code,
    name: `Projekt ${code}`,
    description: null,
    area: "Platforma",
    status: "on_track",
    health,
    progress: 50,
    owner: "Jana Kováčová",
    ownerInitials: "JK",
    startDate: null,
    endDate: null,
    priority,
    nextCheckpoint: nextCheckpointDate ? "Revízia" : null,
    nextCheckpointDate,
    version: 1,
    createdAt: null,
    updatedAt: null,
    createdBy: null,
    updatedBy: null,
  };
}

const codes = (rows: ReadonlyArray<ProjectDto>) => rows.map((p) => p.code);

describe("sortByRisk", () => {
  it("puts red first, then amber, then grey, then green", () => {
    const rows = sortByRisk([
      project("GREEN", "green"),
      project("GREY", "grey"),
      project("RED", "red"),
      project("AMBER", "amber"),
    ]);
    expect(codes(rows)).toEqual(["RED", "AMBER", "GREY", "GREEN"]);
  });

  it("orders equal health by the nearest checkpoint", () => {
    const rows = sortByRisk([
      project("LATE", "red", "2026-09-01"),
      project("SOON", "red", "2026-08-01"),
    ]);
    expect(codes(rows)).toEqual(["SOON", "LATE"]);
  });

  it("sorts a project with NO checkpoint after one that has a date", () => {
    const rows = sortByRisk([
      project("NONE", "amber", null),
      project("DATED", "amber", "2027-12-31"),
    ]);
    expect(codes(rows)).toEqual(["DATED", "NONE"]);
  });

  it("falls back to priority, then to the code", () => {
    const rows = sortByRisk([
      project("B", "green", null, "P3"),
      project("A", "green", null, "P3"),
      project("C", "green", null, "P1"),
    ]);
    expect(codes(rows)).toEqual(["C", "A", "B"]);
  });

  it("never mutates the input array", () => {
    const input = [project("GREEN", "green"), project("RED", "red")];
    const before = codes(input);
    sortByRisk(input);
    expect(codes(input)).toEqual(before);
  });

  it("handles an empty list", () => {
    expect(sortByRisk([])).toEqual([]);
  });
});
