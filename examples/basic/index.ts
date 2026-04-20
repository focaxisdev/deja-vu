import { createInMemorySemanticRecallEngine } from "../../src/index.js";

const engine = createInMemorySemanticRecallEngine({
  thresholds: {
    strong: 0.6,
    weak: 0.45,
  },
});

const { id } = await engine.addMemory({
  title: "Launch plan for the optional semantic recall layer",
  tags: ["launch", "oss", "memory"],
  importance: 0.9,
  content: `
Task: publish a GitHub-ready protocol-first memory system.
Decision: keep rules, workflow, and Markdown memory as the primary adoption path.
Spec: position the semantic engine as an optional familiarity-first enhancement layer.
Roadmap: add OpenAI embeddings, SQLite storage, and rerankers later.
  `.trim(),
});

const result = await engine.recall({
  text: "Publish a protocol-first memory system with an optional familiarity-first semantic engine and future OpenAI embeddings.",
  loadChunks: true,
});

console.log("memoryId:", id);
console.log(JSON.stringify(result, null, 2));
