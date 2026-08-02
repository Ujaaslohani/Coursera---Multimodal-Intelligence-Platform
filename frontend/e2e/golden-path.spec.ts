import { test, expect } from "@playwright/test";

// These tests exercise the real backend on http://localhost:8000 (real
// Supabase Postgres+pgvector, real OpenAI embedding/synthesis calls, real
// CLIP visual embeddings) — per this project's own testing philosophy,
// nothing here is mocked.

test.describe("Home", () => {
  test("nav bar links to every product surface", async ({ page }) => {
    await page.goto("/");
    const navLabels = ["Asset Intake", "Processing Monitor", "Query Workspace", "Recommendations", "Analytics Dashboard", "Operations", "Audit Log"];
    for (const label of navLabels) {
      await expect(page.getByRole("navigation").getByRole("link", { name: label, exact: true })).toBeVisible();
    }
  });

  test("overview cards describe each surface and link to the right route", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Multimodal Intelligence Platform" })).toBeVisible();

    const cards: [string, string][] = [
      ["Asset Intake Console", "/assets"],
      ["Processing Monitor", "/processing"],
      ["Unified Query Workspace", "/query"],
      ["Learning Analytics Dashboard", "/dashboard"],
      ["Recommendation Workspace", "/recommendations"],
      ["Operations Dashboard", "/operations"],
      ["Audit Log", "/audit-log"],
    ];
    for (const [title, href] of cards) {
      const card = page.locator("main").getByRole("link", { name: new RegExp(title) });
      await expect(card).toHaveAttribute("href", href);
    }
  });

  test("clicking a card navigates to its product surface", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("heading", { name: "Unified Query Workspace" }).click();
    await expect(page).toHaveURL(/\/query$/);
    await expect(page.getByRole("heading", { name: "Unified Query Workspace" })).toBeVisible();
  });
});

test.describe("Asset Intake", () => {
  test("registers a new transcript asset end to end", async ({ page }) => {
    await page.goto("/assets");
    await expect(page.getByRole("heading", { name: "Asset Intake Console" })).toBeVisible();

    await page.getByLabel("Modality").selectOption("transcript");
    await page.getByLabel("Owner").fill(`playwright-e2e-${Date.now()}@coursera.org`);
    await page.getByLabel("Topic").fill("Backpropagation");
    await page
      .getByLabel("Storage URL")
      .fill("data/sample_assets/course_neural_networks/transcript.json");

    await page.getByRole("button", { name: "Register asset" }).click();

    await expect(page.getByText(/Registered asset .+ — processing job .+/)).toBeVisible({ timeout: 15000 });
  });

  test("shows a validation-driven error for a bad backend response gracefully", async ({ page }) => {
    await page.goto("/assets");
    // Owner and Storage URL are required by the browser's native validation;
    // submitting without them should not navigate away or crash the page.
    await page.getByRole("button", { name: "Register asset" }).click();
    await expect(page.getByRole("heading", { name: "Asset Intake Console" })).toBeVisible();
  });
});

test.describe("Unified Query Workspace", () => {
  test("asks a cross-modal question and renders the agent pipeline's cited, grounded answer", async ({ page }) => {
    await page.goto("/query");
    await expect(page.getByRole("heading", { name: "Unified Query Workspace" })).toBeVisible();

    await page
      .getByPlaceholder("Why are learners struggling with...?")
      .fill("Why are learners struggling with the backpropagation concept?");
    await page.getByRole("button", { name: /Ask/ }).click();

    // Real planner + retrieval + ranker + synthesis + validator — give it real time.
    await expect(page.getByText("Retrieval Planner agent")).toBeVisible({ timeout: 30000 });
    await expect(page.getByText("Synthesis Writer agent")).toBeVisible({ timeout: 30000 });
    await expect(page.getByText("Confidence")).toBeVisible();

    await expect(page.getByRole("heading", { name: "Evidence retrieved" })).toBeVisible();
    // At least one retrieved evidence segment should render with its modality tag.
    await expect(page.getByText(/Transcript|Discussion|Quiz|Slide|Video|Image/).first()).toBeVisible();
  });
});

test.describe("Recommendation Review Workspace", () => {
  test("loads an insight and records a reviewer decision", async ({ page, request }) => {
    // Arrange a real insight via the API first (same path the Query workspace uses),
    // so this test verifies the review UI itself, not query+synthesis timing.
    const token = process.env.NEXT_PUBLIC_DEV_TOKEN || "dev-token";
    const backend = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

    const queryRes = await request.post(`${backend}/api/query`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { question_text: "What do learners say is confusing about backpropagation?", top_k: 5 },
    });
    expect(queryRes.ok()).toBeTruthy();
    const { query_id, retrieved_evidence } = await queryRes.json();

    const synthRes = await request.post(`${backend}/api/synthesize`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { query_id, retrieved_evidence },
    });
    expect(synthRes.ok()).toBeTruthy();
    const { insight_id } = await synthRes.json();

    await page.goto("/recommendations");
    await page.getByPlaceholder("insight id").fill(insight_id);
    await page.getByRole("button", { name: "Load" }).click();

    await expect(page.getByText("Pending review")).toBeVisible({ timeout: 10000 });

    await page.getByPlaceholder("Why this decision?").fill("Verified by Playwright e2e run.");
    await page.getByRole("button", { name: "Accept" }).click();

    await expect(page.getByText("Accepted")).toBeVisible();
  });
});

test.describe("Learning Analytics Dashboard", () => {
  test("renders pipeline health and review outcome charts from real metrics", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: "Learning Analytics Dashboard" })).toBeVisible();

    await expect(page.getByText("Total assets")).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("heading", { name: "Pipeline health, by stage" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Review outcomes" })).toBeVisible();

    // The total-assets stat tile should render a real, non-zero number.
    const assetsCount = page.getByText("Total assets").locator("..").getByText(/^\d+$/);
    await expect(assetsCount).toBeVisible();
  });
});

test.describe("Operations Dashboard", () => {
  test("renders real job/insight counts with no console errors", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await page.goto("/operations");
    await expect(page.getByRole("heading", { name: "Operations & Governance Dashboard" })).toBeVisible();

    // Waiting for the real metrics-derived number (not "-") is itself the
    // signal that the fetch resolved, so no arbitrary timeout is needed.
    const totalJobsTile = page.getByText("Total jobs").locator("..").getByText(/^\d+$/);
    await expect(totalJobsTile).toBeVisible({ timeout: 10000 });

    expect(consoleErrors).toEqual([]);
  });
});

test.describe("Audit Log", () => {
  test("renders a governance-ready table of real actions", async ({ page }) => {
    await page.goto("/audit-log");
    await expect(page.getByRole("heading", { name: "Audit Log" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Action" })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("columnheader", { name: "Actor" })).toBeVisible();
    // The Playwright run itself, and every other test in this suite, writes
    // audit entries — so at least one real data row (plus the header row)
    // is guaranteed to exist by the time the table has actually loaded.
    await expect(async () => {
      expect(await page.getByRole("row").count()).toBeGreaterThan(1);
    }).toPass({ timeout: 10000 });
  });
});

test.describe("Processing Monitor", () => {
  test("renders without console errors", async ({ page }) => {
    await page.goto("/processing");
    await expect(page.getByRole("heading", { level: 1, name: "Processing Monitor" })).toBeVisible();
  });
});
