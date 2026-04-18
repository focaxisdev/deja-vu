import { createInMemorySemanticRecallEngine } from "../../src/index.js";

const engine = createInMemorySemanticRecallEngine({
  thresholds: {
    strong: 0.7,
    weak: 0.45,
  },
});

await engine.addMemory({
  title: "User preference: concise technical answers",
  tags: ["chat", "preference"],
  importance: 0.7,
  content: `
Conversation: the user prefers concise, high-signal responses.
Prompt: avoid fluff, keep answers practical, surface tradeoffs early.
Note: only expand details when the question asks for depth.
  `.trim(),
});

const recall = await engine.recall({
  text: "The user prefers concise and practical answers, with tradeoffs surfaced early and no fluff.",
});

console.log("Chat memory recall:");
console.log(JSON.stringify(recall, null, 2));
