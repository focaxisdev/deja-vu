import { createInMemorySemanticRecallEngine } from "../../src/index.js";

const engine = createInMemorySemanticRecallEngine({
  thresholds: {
    strong: 0.7,
    weak: 0.55,
  },
});

await engine.addMemory({
  title: "Recurring release checklist",
  tags: ["tasks", "release", "ops"],
  importance: 0.8,
  content: `
Task: validate changelog, run tests, publish package, and notify stakeholders.
Decision: summaries should load first, while task details stay chunked until needed.
Roadmap: turn this into a reusable automation later.
  `.trim(),
});

const recall = await engine.recall({
  text: "Before publishing the package, validate the changelog, run tests, publish, and notify stakeholders.",
  loadChunks: true,
});

console.log("Task assistant recall:");
console.log(JSON.stringify(recall, null, 2));
