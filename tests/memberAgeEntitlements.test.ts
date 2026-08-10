import test from "node:test";
import assert from "node:assert/strict";
import { beastModuleRegistry, getModuleRegistryEntry } from "../src/lib/moduleRegistry";
import { calculateMemberAge, classifyMemberAge, resolveMemberModuleEntitlement } from "../src/lib/memberAgeEntitlements";

const asOf = new Date("2026-08-09T12:00:00Z");
const decision = (module: "money" | "learning", birthday?: string | null, options?: { isAdmin?: boolean; simulatingMember?: boolean }) => resolveMemberModuleEntitlement({ module, birthday, entry: getModuleRegistryEntry(module), asOf, ...options });

test("BH-REL-02 releases Health for eligible adults while retaining age gates", () => {
    const health = getModuleRegistryEntry("health");
    assert.equal(health?.visibility, "released");
    assert.equal(resolveMemberModuleEntitlement({ module: "health", birthday: "2000-01-01", entry: health, asOf }).allowed, true);
    assert.equal(resolveMemberModuleEntitlement({ module: "health", birthday: "2010-01-01", entry: health, asOf }).reason, "minor_education_only");
    assert.equal(resolveMemberModuleEntitlement({ module: "health", birthday: null, entry: health, asOf }).reason, "unknown_age");
});

test("BO-600 calculates birthdays on the boundary", () => {
    assert.equal(calculateMemberAge("2008-08-09", asOf), 18);
    assert.equal(calculateMemberAge("2008-08-10", asOf), 17);
    assert.equal(classifyMemberAge("2008-08-10", asOf), "minor");
  });

test("BO-600 allows education and blocks adult modules for minors", () => {
    assert.equal(decision("learning", "2010-01-01").allowed, true);
    assert.equal(decision("money", "2010-01-01").reason, "minor_education_only");
  });

test("BO-600 fails closed when birthday is unknown", () => {
    assert.equal(decision("learning", null).allowed, true);
    assert.deepEqual(decision("money", null), { allowed: false, ageStatus: "unknown", reason: "unknown_age", needsBirthday: true });
  });

test("BO-600 automatically admits an adult without a separate flag", () => {
    assert.equal(decision("money", "2000-01-01").allowed, true);
  });

test("BO-600 keeps admin access and supports minor View As simulation", () => {
    assert.equal(decision("money", null, { isAdmin: true }).reason, "admin");
    assert.equal(decision("money", "2010-01-01", { isAdmin: true, simulatingMember: true }).allowed, false);
  });

test("BO-600 requires every registry entry to declare an age floor", () => {
    assert.equal(beastModuleRegistry.every((entry) => typeof entry.minimumAge === "number"), true);
});
