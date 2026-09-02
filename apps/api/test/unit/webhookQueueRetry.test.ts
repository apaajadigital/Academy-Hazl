import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * BL-141 — a permanently-failed job must never swallow DOKU's next delivery.
 *
 * These tests exercise the QUEUED path, which the rest of the suite never
 * reaches: REDIS_URL is empty in vitest.config, so dispatch() normally runs the
 * processor inline. Redis and bullmq are faked here so the enqueue branch — the
 * one that actually runs in production — is the branch under test.
 */

const addedJobs: Array<{ name: string; data: unknown; opts?: { jobId?: string } }> = [];
const removedJobIds: string[] = [];

/** State the fake queue reports for a given jobId, keyed by id. */
const existingJobs = new Map<string, string>();

class FakeQueue {
  constructor(public readonly name: string) {}
  async add(name: string, data: unknown, opts?: { jobId?: string }) {
    const id = opts?.jobId;
    // Mirrors BullMQ: add() is a no-op when a job with that id still exists.
    if (id && existingJobs.has(id)) return { id };
    if (id) existingJobs.set(id, "waiting");
    addedJobs.push({ name, data, opts });
    return { id };
  }
  async getJob(jobId: string) {
    const state = existingJobs.get(jobId);
    if (!state) return null;
    return {
      id: jobId,
      getState: async () => state,
      remove: async () => {
        existingJobs.delete(jobId);
        removedJobIds.push(jobId);
      },
    };
  }
}

vi.mock("bullmq", () => ({ Queue: FakeQueue }));
vi.mock("../../src/jobs/connection.js", () => ({
  isQueueEnabled: () => true,
  getRedisConnection: async () => ({}),
}));
vi.mock("../../src/jobs/processors/webhook.js", () => ({
  processWebhookPayment: vi.fn().mockResolvedValue(undefined),
}));

const { enqueueWebhook } = await import("../../src/jobs/queues.js");

const job = { invoiceNumber: "JA0001", txStatus: "SUCCESS", amount: 10000 };

beforeEach(() => {
  addedJobs.length = 0;
  removedJobIds.length = 0;
  existingJobs.clear();
});

describe("enqueueWebhook — dead-letter must not block retries (BL-141)", () => {
  it("gives each DOKU delivery its own jobId via Request-Id", async () => {
    await enqueueWebhook({ ...job, requestId: "req-A" });
    await enqueueWebhook({ ...job, requestId: "req-B" });

    expect(addedJobs).toHaveLength(2);
    expect(addedJobs[0]?.opts?.jobId).toBe("webhook:JA0001:SUCCESS:req-A");
    expect(addedJobs[1]?.opts?.jobId).toBe("webhook:JA0001:SUCCESS:req-B");
  });

  it("reclaims a failed job so a redelivery under the same id still enqueues", async () => {
    // The exact production scenario: the first delivery exhausted its attempts
    // and sits in the failed set. Before BL-141 the redelivery below silently
    // no-opped and fulfillment never ran.
    existingJobs.set("webhook:JA0001:SUCCESS:req-A", "failed");

    await enqueueWebhook({ ...job, requestId: "req-A" });

    expect(removedJobIds).toEqual(["webhook:JA0001:SUCCESS:req-A"]);
    expect(addedJobs).toHaveLength(1);
  });

  it("leaves an in-flight job alone — removing it would drop work, not unblock it", async () => {
    for (const state of ["waiting", "active", "delayed"]) {
      existingJobs.clear();
      addedJobs.length = 0;
      removedJobIds.length = 0;
      existingJobs.set("webhook:JA0001:SUCCESS:req-A", state);

      await enqueueWebhook({ ...job, requestId: "req-A" });

      expect(removedJobIds, `state=${state}`).toEqual([]);
      expect(addedJobs, `state=${state}`).toHaveLength(0);
    }
  });

  it("still enqueues when DOKU sends no Request-Id, and still reclaims", async () => {
    existingJobs.set("webhook:JA0001:SUCCESS", "failed");

    await enqueueWebhook(job);

    expect(removedJobIds).toEqual(["webhook:JA0001:SUCCESS"]);
    expect(addedJobs[0]?.opts?.jobId).toBe("webhook:JA0001:SUCCESS");
  });
});
