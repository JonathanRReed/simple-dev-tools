import { expect, test } from "bun:test";

import { deferComponent } from "./deferred-component";

const Stub = () => null;

test("the module is requested once, however many callers ask for it", async () => {
  let calls = 0;
  const deferred = deferComponent(async () => {
    calls++;
    return { default: Stub };
  });
  await Promise.all([deferred.load(), deferred.load(), deferred.load()]);
  await deferred.load();
  expect(calls).toBe(1);
});

test("a failed download is forgotten, so the next request retries", async () => {
  let calls = 0;
  const deferred = deferComponent(async () => {
    calls++;
    if (calls === 1) throw new Error("offline");
    return { default: Stub };
  });
  await deferred.load(); // swallowed: nothing to render yet
  await deferred.load();
  expect(calls).toBe(2);
  await deferred.load();
  expect(calls).toBe(2);
});
