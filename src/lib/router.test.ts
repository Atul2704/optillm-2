import test from "node:test";
import assert from "node:assert/strict";
import { routeModel } from "@/lib/router";

test("routeModel: SIMPLE -> PHI_3_MINI when confident", () => {
  assert.equal(routeModel("SIMPLE", 0.9), "PHI_3_MINI");
});

test("routeModel: low confidence escalates to LLAMA_3", () => {
  assert.equal(routeModel("SIMPLE", 0.1), "LLAMA_3");
  assert.equal(routeModel("MEDIUM", 0.1), "LLAMA_3");
  assert.equal(routeModel("COMPLEX", 0.1), "LLAMA_3");
});

