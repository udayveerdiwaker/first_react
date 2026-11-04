/**
 * In-Memory & Persistent Background Job Queue
 */

const crypto = require("crypto");
const db = require("../db");

const jobs = new Map();

class JobQueue {
  /**
   * Enqueues an asynchronous background job
   * @param {string} type - 'research' | 'workflow' | 'document_chunking' | 'export'
   * @param {object} payload - Job data
   * @param {Function} handler - Async function(payload, updateProgress)
   * @returns {string} Job ID
   */
  enqueue(type, payload, handler) {
    const jobId = `job-${crypto.randomUUID()}`;
    const jobRecord = {
      id: jobId,
      type,
      payload,
      status: "queued",
      progress: 0,
      result: null,
      error: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    jobs.set(jobId, {
      ...jobRecord,
      handler,
    });

    // Process job asynchronously on next tick
    setImmediate(() => this.processNext(jobId));

    return jobId;
  }

  async processNext(jobId) {
    const job = jobs.get(jobId);
    if (!job || job.status !== "queued") return;

    job.status = "processing";
    job.updatedAt = Date.now();

    const updateProgress = (pct, currentStep = "") => {
      job.progress = Math.min(100, Math.max(0, pct));
      job.currentStep = currentStep;
      job.updatedAt = Date.now();
    };

    try {
      const result = await job.handler(job.payload, updateProgress);
      job.status = "completed";
      job.progress = 100;
      job.result = result;
      job.updatedAt = Date.now();
    } catch (err) {
      job.status = "failed";
      job.error = err?.message || String(err);
      job.updatedAt = Date.now();
      console.error(`[JobQueue] Job ${jobId} failed:`, err);
    }
  }

  getJob(jobId) {
    const job = jobs.get(jobId);
    if (!job) return null;
    const { handler, ...safeJob } = job;
    return safeJob;
  }

  listJobs(type = null) {
    const list = [];
    for (const [, job] of jobs.entries()) {
      if (!type || job.type === type) {
        const { handler, ...safeJob } = job;
        list.push(safeJob);
      }
    }
    return list.sort((a, b) => b.createdAt - a.createdAt);
  }

  retryJob(jobId) {
    const job = jobs.get(jobId);
    if (!job || job.status !== "failed") return null;

    job.status = "queued";
    job.progress = 0;
    job.error = null;
    job.result = null;
    job.updatedAt = Date.now();

    setImmediate(() => this.processNext(jobId));
    return this.getJob(jobId);
  }
}

const jobQueue = new JobQueue();

module.exports = jobQueue;
