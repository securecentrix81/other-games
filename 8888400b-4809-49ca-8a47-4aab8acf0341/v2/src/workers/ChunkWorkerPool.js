export default class ChunkWorkerPool {
  constructor({ size = Math.max(2, Math.min(6, navigator.hardwareConcurrency || 4)) } = {}) {
    this.size = size;
    this.workers = [];
    this.idSeq = 1;
    this.inflight = new Map(); // id -> {resolve,reject}
    this.queue = [];

    for (let i = 0; i < size; i++) this.#spawnWorker();
  }

  #spawnWorker() {
    const worker = new Worker(new URL("./chunkWorker.js", import.meta.url), { type: "module" });
    worker._busy = false;

    worker.onmessage = (e) => {
      const msg = e.data;
      const pending = this.inflight.get(msg.id);
      if (!pending) return;

      this.inflight.delete(msg.id);
      worker._busy = false;

      if (msg.ok) pending.resolve(msg);
      else pending.reject(new Error(msg.error || "Worker error"));

      this.#pump();
    };

    worker.onerror = (e) => {
      // Fail all inflight? Here we just log. You can make this more robust.
      console.error("chunk worker error:", e);
      worker._busy = false;
      this.#pump();
    };

    this.workers.push(worker);
  }

  #pump() {
    const worker = this.workers.find((w) => !w._busy);
    if (!worker) return;

    const job = this.queue.shift();
    if (!job) return;

    worker._busy = true;
    this.inflight.set(job.id, job.defer);

    worker.postMessage(job.payload, job.transfer || []);
  }

  #run(payload, transfer) {
    const id = this.idSeq++;
    return new Promise((resolve, reject) => {
      this.queue.push({
        id,
        payload: { ...payload, id },
        transfer,
        defer: { resolve, reject },
      });
      this.#pump();
    });
  }

  generateChunk({ cx, cz, worldSeed, mods }) {
    // mods: array of [lx, y, lz, type]
    return this.#run({ type: "generate", cx, cz, worldSeed, mods }, undefined);
  }

  meshChunk({ cx, cz, chunkCopyBuffer, yMax }) {
    return this.#run(
      { type: "mesh", cx, cz, chunkCopyBuffer, yMax },
      [chunkCopyBuffer] // transfer the copy
    );
  }

  dispose() {
    for (const w of this.workers) w.terminate();
    this.workers.length = 0;
    this.queue.length = 0;
    this.inflight.clear();
  }
}
