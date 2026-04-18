import { createInMemorySemanticRecallEngine } from "../../src/index.js";

const engine = createInMemorySemanticRecallEngine({
  thresholds: {
    strong: 0.6,
    weak: 0.45,
  },
});

await engine.addMemory({
  title: "Website redesign program",
  tags: ["pm", "frontend", "redesign"],
  importance: 0.85,
  content: `
Project context: redesign the product website for a sharper positioning.
Decision: keep homepage messaging bold and reduce navigation clutter.
Task: align launch checklist, open-source assets, and contributor docs.
Issue: previous sprints kept loading too much historical detail into meetings.
  `.trim(),
});

const recall = await engine.recall({
  text: "Task: align contributor docs and launch assets for the website redesign project while keeping the messaging bold.",
  loadChunks: true,
});

console.log("Agent PM recall:");
console.log(JSON.stringify(recall, null, 2));
