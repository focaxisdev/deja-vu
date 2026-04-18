import { createInMemorySemanticRecallEngine } from "../../src/index.js";

const engine = createInMemorySemanticRecallEngine({
  thresholds: {
    strong: 0.6,
    weak: 0.45,
  },
});

const { id } = await engine.addMemory({
  title: "Launch plan for the semantic recall engine",
  tags: ["launch", "oss", "memory"],
  importance: 0.9,
  content: `
Task: publish a GitHub-ready memory engine.
Decision: position it as familiarity-first, not always-retrieve RAG.
Spec: keep a layered architecture with familiarity, summary, and chunks.
Roadmap: add OpenAI embeddings, SQLite storage, and rerankers later.
  `.trim(),
});

const result = await engine.recall({
  text: "Publish a GitHub-ready familiarity-first memory engine with layered architecture and future OpenAI embeddings.",
  loadChunks: true,
});

console.log("memoryId:", id);
console.log(JSON.stringify(result, null, 2));
