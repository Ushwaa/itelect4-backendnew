import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../src/app";
import {
  GeminiUnavailableError,
  reviewProjectWithErrorHandling,
} from "../src/ai/gemini";
import type { Review } from "../src/ai/reviewSchema";
import { connectDB, isDbConnected } from "../src/config/db";

vi.mock("../src/config/db", () => ({
  connectDB: vi.fn().mockResolvedValue(undefined),
  isDbConnected: vi.fn().mockReturnValue(true),
}));

vi.mock("../src/ai/gemini", () => {
  class GeminiConfigurationError extends Error {}
  class GeminiInvalidResponseError extends Error {}
  class GeminiQuotaExceededError extends Error {}
  class GeminiUnavailableError extends Error {}

  return {
    GeminiConfigurationError,
    GeminiInvalidResponseError,
    GeminiQuotaExceededError,
    GeminiUnavailableError,
    reviewProjectWithErrorHandling: vi.fn(),
  };
});

const testReview: Review = {
  summary: "A clear project proposal.",
  strengths: ["The goal is specific."],
  improvements: ["Add a testing plan."],
  nextSteps: ["Write the first tests."],
  readiness: "almost",
};

function authorizationHeader(): string {
  const token = jwt.sign(
    { id: "test-user", email: "test@example.com", username: "tester" },
    "gt6-test-only-secret",
    { expiresIn: "2h" }
  );
  return `Bearer ${token}`;
}

beforeEach(() => {
  vi.mocked(connectDB).mockResolvedValue({} as never);
  vi.mocked(isDbConnected).mockReturnValue(true);
  vi.mocked(reviewProjectWithErrorHandling).mockReset();
});

describe("Express API", () => {
  it("returns database health without opening a network server", async () => {
    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok", db: true });
    expect(connectDB).toHaveBeenCalledOnce();
  });

  it("validates login fields and returns a client error", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: "test@example.com" });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Email and password are required.");
  });

  it("rejects unauthenticated access to the protected AI endpoint", async () => {
    const response = await request(app)
      .post("/api/ai")
      .send({ prompt: "A project description long enough to be valid." });

    expect(response.status).toBe(401);
    expect(response.body.message).toMatch(/Authentication required/);
    expect(reviewProjectWithErrorHandling).not.toHaveBeenCalled();
  });

  it("validates AI prompts before calling Gemini", async () => {
    const response = await request(app)
      .post("/api/ai")
      .set("Authorization", authorizationHeader())
      .send({ prompt: "short" });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Project description must be at least 20 characters long.");
    expect(reviewProjectWithErrorHandling).not.toHaveBeenCalled();
  });

  it("returns the structured AI review for a valid authenticated request", async () => {
    vi.mocked(reviewProjectWithErrorHandling).mockResolvedValue(testReview);
    const prompt = "A course submission tracker with student and instructor workflows.";

    const response = await request(app)
      .post("/api/ai")
      .set("Authorization", authorizationHeader())
      .send({ prompt });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(testReview);
    expect(reviewProjectWithErrorHandling).toHaveBeenCalledWith(prompt);
  });

  it("maps temporary Gemini unavailability to HTTP 503", async () => {
    vi.mocked(reviewProjectWithErrorHandling).mockRejectedValue(
      new GeminiUnavailableError("Gemini is temporarily unavailable.")
    );

    const response = await request(app)
      .post("/api/ai")
      .set("Authorization", authorizationHeader())
      .send({ prompt: "A course submission tracker with student and instructor workflows." });

    expect(response.status).toBe(503);
    expect(response.body.message).toBe("Gemini is temporarily unavailable.");
  });

  it("protects submission routes", async () => {
    const response = await request(app).get("/api/submissions");

    expect(response.status).toBe(401);
    expect(response.body.message).toMatch(/Authentication required/);
  });
});
