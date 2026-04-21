import test from "node:test";
import assert from "node:assert/strict";
import { classifyPrompt } from "@/lib/classifier";

test("classifyPrompt: short prompts -> SIMPLE with high confidence", () => {
    const r = classifyPrompt("Hi");
    assert.equal(r.complexity, "SIMPLE");
    assert.ok(r.confidence >= 0.8);
});

test("classifyPrompt: long prompts -> COMPLEX", () => {
    const r = classifyPrompt("x".repeat(500));
    assert.equal(r.complexity, "COMPLEX");
    assert.ok(r.confidence >= 0.8);
});

test("classifyPrompt: reasoning keywords -> COMPLEX", () => {
    const r = classifyPrompt("Please explain and analyze this approach in detail.");
    assert.equal(r.complexity, "COMPLEX");
});

