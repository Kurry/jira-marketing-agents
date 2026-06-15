import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeIssue } from "../helpers";

vi.mock("../../src/jira", () => ({
  addComment: vi.fn(),
  getIssueContext: vi.fn(),
  searchIssues: vi.fn(),
}));

import { addComment, getIssueContext, searchIssues } from "../../src/jira";
import * as handlers from "../../src/index";

const mockGetIssueContext = vi.mocked(getIssueContext);
const mockSearchIssues = vi.mocked(searchIssues);
const mockAddComment = vi.mocked(addComment);

const fixtureIssue = makeIssue({
  issueKey: "AIGO-3",
  summary: "Email and SMS creative: guaranteed diabetes reversal",
  description: [
    "Employer launch needs email and SMS copy for eligible members.",
    "Creative says guaranteed reversal of diabetes in 30 days and get off your medication.",
    "Need experiment design, dashboard tracking, signup funnel QA, suppression, and human approval.",
    "Mobile Safari signup has a 500 error and is blocked on engineering logs.",
    "Launch date is June 20 with landing page ready but tracking unconfirmed.",
  ].join("\n"),
  issueType: "Task",
  labels: ["aigo-seed", "claims-risk", "experiment", "mobile"],
  status: "To Do",
  projectKey: "AIGO",
  dueDate: "2026-06-20",
});

const rawSearchIssue = (key: string, summary: string, status = "To Do") => ({
  key,
  fields: {
    summary,
    status: { name: status },
    labels: ["aigo-seed"],
    components: [{ name: "Growth" }],
    issuetype: { name: "Task" },
    updated: "2026-06-14T00:00:00.000+0000",
  },
});

describe("Forge action handler integration contracts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetIssueContext.mockResolvedValue(fixtureIssue);
    mockSearchIssues.mockResolvedValue([
      rawSearchIssue("AIGO-6", "Signup page broken on mobile Safari", "To Do"),
      rawSearchIssue("AIGO-15", "Shipped new employer landing page", "Done"),
    ]);
    mockAddComment.mockResolvedValue({ id: "comment-1" });
  });

  it("normalizes nested Forge payloads before fetching issue context", async () => {
    const result = await handlers.classifyGrowthIssue({ payload: { issueKey: "AIGO-3" } });

    expect(mockGetIssueContext).toHaveBeenCalledWith("AIGO-3");
    expect(result).toMatchObject({
      issueKey: "AIGO-3",
      recommendedIssueType: expect.any(String),
      workflowArea: expect.any(String),
    });
  });

  it("executes every issue-key read action against a normalized Jira issue", async () => {
    const issueKeyHandlers = [
      handlers.proposeAcceptanceCriteria,
      handlers.proposeRequirementsGaps,
      handlers.breakDownEpic,
      handlers.assessSprintRisk,
      handlers.generateQATestCases,
      handlers.proposeExperimentSpec,
      handlers.reviewCreativeClaimsRisk,
      handlers.createEmployerLaunchPlan,
      handlers.createDashboardSpec,
      handlers.analyzeFunnelFriction,
      handlers.generateCreativeVariants,
      handlers.buildAudienceSegment,
      handlers.proposePersonalization,
      handlers.buildCampaignPlan,
      handlers.createLandingPageSpec,
      handlers.designReferralLoop,
      handlers.proposeActivationPlan,
    ];

    for (const handler of issueKeyHandlers) {
      const result = await handler({ issueKey: "AIGO-3" });
      expect(result).toBeTruthy();
      expect(typeof result).toBe("object");
    }

    expect(mockGetIssueContext).toHaveBeenCalledTimes(issueKeyHandlers.length);
  });

  it("searches within the current project when looking for duplicate issues", async () => {
    const result = await handlers.findSimilarIssues({ issueKey: "AIGO-3" });

    expect(mockSearchIssues).toHaveBeenCalledOnce();
    const [jql, maxResults] = mockSearchIssues.mock.calls[0] as [string, number];
    expect(jql).toContain('project = "AIGO"');
    expect(jql).toContain('key != "AIGO-3"');
    expect(maxResults).toBe(50);
    expect(result).toMatchObject({ issueKey: "AIGO-3" });
  });

  it("uses the default weekly JQL when the action input omits one", async () => {
    const result = await handlers.generateWeeklyReadout({ payload: { days: 7 } });

    expect(mockSearchIssues).toHaveBeenCalledOnce();
    const [jql, maxResults] = mockSearchIssues.mock.calls[0] as [string, number];
    expect(jql).toContain("project = AIGO");
    expect(maxResults).toBe(100);
    expect(result).toMatchObject({
      period: "Last 7 day(s)",
      completedWork: expect.any(Array),
      topThreeActions: expect.any(Array),
    });
  });

  it("keeps the mutating handler scoped to adding an AI-labeled comment", async () => {
    const result = await handlers.addAnalysisComment({
      payload: { issueKey: "AIGO-3", commentBody: "Claims risk analysis complete." },
    });

    expect(result).toEqual({ id: "comment-1" });
    expect(mockAddComment).toHaveBeenCalledOnce();
    const [issueKey, markdown] = mockAddComment.mock.calls[0] as [string, string];
    expect(issueKey).toBe("AIGO-3");
    expect(markdown).toContain("AI Growth Ops");
    expect(markdown).toContain("analysis only");
    expect(markdown).toContain("Claims risk analysis complete.");
  });
});
