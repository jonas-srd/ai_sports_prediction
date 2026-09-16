import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import nextConfig from "../../next.config.mjs";

function readConfig(path: string) {
  return JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"));
}

test("the web alias works without removed TypeScript compiler options", () => {
  const config = readConfig("../../tsconfig.json");
  const baseConfig = readConfig("../../../../tsconfig.base.json");

  assert.deepEqual(config.compilerOptions.paths["@/*"], ["./src/*"]);
  for (const { compilerOptions } of [baseConfig, config]) {
    assert.equal(Object.hasOwn(compilerOptions, "baseUrl"), false);
    assert.equal(Object.hasOwn(compilerOptions, "ignoreDeprecations"), false);
  }
  assert.equal(baseConfig.compilerOptions.strict, true);
});

test("source-only typechecking inherits the same web configuration", () => {
  const config = readConfig("../../tsconfig.source.json");
  assert.equal(config.extends, "./tsconfig.json");
  assert.equal(config.compilerOptions, undefined);
});

test("Next builds use the TypeScript 6/7-compatible CLI checker", () => {
  assert.equal(nextConfig.experimental?.useTypeScriptCli, true);
  assert.notEqual(nextConfig.typescript?.ignoreBuildErrors, true);
});
