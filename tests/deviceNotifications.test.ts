import assert from "node:assert/strict";
import test from "node:test";
import { createECDH, randomBytes } from "node:crypto";
import {
  billPushMessage,
  dueBillReminders,
  zonedDay,
} from "../src/lib/notifications/billReminders";
import {
  validatePushSubscription,
  devicePreferences,
} from "../src/lib/notifications/pushValidation";
import { buildMemberSchedule } from "../src/lib/calendar/memberSchedule";
const bill = {
  id: "bill-a",
  name: "Rent",
  amount: 100,
  due_date: 1,
  frequency: "monthly",
};
test("bill reminders cross months and respect partial/full payments, archive and opt-out", () => {
  const input = {
    today: "2026-09-30",
    bills: [bill],
    payments: [],
    dueToday: true,
    dueTomorrow: true,
  };
  assert.equal(dueBillReminders(input)[0]?.dueDate, "2026-10-01");
  assert.equal(
    dueBillReminders({
      ...input,
      payments: [
        { bill_id: "bill-a", cycle_due_date: "2026-10-01", amount_paid: 40 },
      ],
    })[0]?.remaining,
    60,
  );
  assert.equal(
    dueBillReminders({
      ...input,
      payments: [
        { bill_id: "bill-a", cycle_due_date: "2026-10-01", amount_paid: 100 },
      ],
    }).length,
    0,
  );
  assert.equal(
    dueBillReminders({
      ...input,
      bills: [{ ...bill, reminder_enabled: false }],
    }).length,
    0,
  );
  assert.equal(
    dueBillReminders({ ...input, bills: [{ ...bill, is_archived: true }] })
      .length,
    0,
  );
  assert.equal(dueBillReminders({ ...input, dueTomorrow: false }).length, 0);
});
test("advanced schedules, short months, and private lock-screen text", () => {
  const input = {
    today: "2026-02-28",
    bills: [{ ...bill, due_date: 31 }],
    payments: [],
    dueToday: true,
    dueTomorrow: false,
  };
  const items = dueBillReminders(input);
  assert.equal(items[0]?.dueDate, "2026-02-28");
  assert.equal(
    dueBillReminders({
      ...input,
      bills: [{ ...bill, next_due_date_after_payment: "2026-03-01" }],
    }).length,
    0,
  );
  assert.doesNotMatch(
    billPushMessage(items, input.today, false).body,
    /Rent|100/,
  );
  assert.match(
    billPushMessage(items, input.today, true).body,
    /Rent: \$100.00 due today/,
  );
  assert.deepEqual(
    zonedDay(new Date("2026-10-01T01:00:00Z"), "America/Los_Angeles"),
    { date: "2026-09-30", hour: 18 },
  );
});
test("subscription validation allows real push services and rejects SSRF/key abuse", () => {
  const key = createECDH("prime256v1");
  key.generateKeys();
  const keys = {
    p256dh: key.getPublicKey().toString("base64url"),
    auth: randomBytes(16).toString("base64url"),
  };
  for (const endpoint of [
    "https://fcm.googleapis.com/fcm/send/example",
    "https://web.push.apple.com/Q/example",
    "https://updates.push.services.mozilla.com/wpush/v2/example",
  ])
    assert.equal(
      validatePushSubscription({ endpoint, keys }).endpoint,
      endpoint,
    );
  for (const endpoint of [
    "http://fcm.googleapis.com/path",
    "https://127.0.0.1/",
    "https://fcm.googleapis.com.evil.test/",
    "https://fcm.googleapis.com:444/",
    "https://user:pass@fcm.googleapis.com/",
    "https://example.test/",
  ])
    assert.throws(() => validatePushSubscription({ endpoint, keys }));
  assert.throws(() =>
    validatePushSubscription({
      endpoint: "https://fcm.googleapis.com/test",
      keys: { ...keys, p256dh: randomBytes(65).toString("base64url") },
    }),
  );
});
test("device preferences reject invalid hours, timezones, and nonboolean opt-ins", () => {
  const prefs = {
    label: "Phone",
    notify_hour: 9,
    time_zone: "America/New_York",
    due_today: true,
    due_tomorrow: true,
    messages_enabled: true,
    show_details: false,
    quiet_start: 22,
    quiet_end: 7,
  };
  assert.equal(devicePreferences(prefs).show_details, false);
  for (const change of [
    { notify_hour: 24 },
    { quiet_start: -1 },
    { time_zone: "Mars" },
    { messages_enabled: "yes" },
    { label: "" },
  ])
    assert.throws(() => devicePreferences({ ...prefs, ...change }));
});
test("calendar uses saved dates without inventing events or showing completed goals", () => {
  const input = {
    month: "2026-09",
    today: "2026-09-18",
    bills: [],
    payments: [],
    goals: [
      {
        id: "goal",
        title: "Course",
        status: "Active",
        target_date: "2026-09-30",
      },
      {
        id: "old",
        title: "Old",
        status: "Completed",
        target_date: "2026-09-20",
      },
    ],
    appointments: [
      {
        id: "visit",
        title: "Checkup",
        status: "planned",
        occurred_on: "2026-09-22",
      },
      {
        id: "cancel",
        title: "Cancelled",
        status: "cancelled",
        occurred_on: "2026-09-22",
      },
    ],
  };
  assert.deepEqual(
    buildMemberSchedule(input).map((row) => row.id),
    ["health:visit", "goal:goal"],
  );
  assert.deepEqual(buildMemberSchedule({ ...input, month: "2026-13" }), []);
  assert.deepEqual(
    buildMemberSchedule({ ...input, goals: [], appointments: [] }),
    [],
  );
});

type Row = Record<string, any>;
function database(seed: Record<string, Row[]>) {
  const tables = structuredClone(seed);
  let sequence = 0;
  return {
    tables,
    from: (name: string) => {
      let operation = "select";
      let patch: Row = {};
      let single = false;
      let count = Infinity;
      let ordering = "";
      let ascending = true;
      const filters: ((row: Row) => boolean)[] = [];
      const chain: any = {
        select: () => chain,
        eq: (key: string, value: unknown) => {
          filters.push((row) => row[key] === value);
          return chain;
        },
        neq: (key: string, value: unknown) => {
          filters.push((row) => row[key] !== value);
          return chain;
        },
        gt: (key: string, value: unknown) => {
          filters.push((row) => row[key] > value!);
          return chain;
        },
        gte: (key: string, value: unknown) => {
          filters.push((row) => row[key] >= value!);
          return chain;
        },
        lt: (key: string, value: unknown) => {
          filters.push((row) => row[key] < value!);
          return chain;
        },
        order: (key: string, options: { ascending: boolean }) => {
          ordering = key;
          ascending = options.ascending;
          return chain;
        },
        limit: (value: number) => {
          count = value;
          return chain;
        },
        maybeSingle: () => {
          single = true;
          return chain;
        },
        single: () => {
          single = true;
          return chain;
        },
        update: (value: Row) => {
          operation = "update";
          patch = value;
          return chain;
        },
        insert: (value: Row) => {
          operation = "insert";
          patch = value;
          return chain;
        },
        delete: () => {
          operation = "delete";
          return chain;
        },
        then: (resolve: (value: unknown) => void) => {
          const all = (tables[name] ||= []);
          let rows = all.filter((row) =>
            filters.every((filter) => filter(row)),
          );
          if (operation === "insert") {
            if (
              all.some(
                (row) =>
                  row.device_id === patch.device_id &&
                  row.event_key === patch.event_key,
              )
            )
              return resolve({ data: null, error: { code: "23505" } });
            const row = {
              id: `new-${++sequence}`,
              attempts: 1,
              retry_after: "2026-09-18T15:10:00Z",
              ...patch,
            };
            all.push(row);
            rows = [row];
          } else if (operation === "update")
            rows.forEach((row) => Object.assign(row, patch));
          else if (operation === "delete")
            tables[name] = all.filter((row) => !rows.includes(row));
          if (ordering)
            rows.sort(
              (a, b) =>
                String(a[ordering]).localeCompare(String(b[ordering])) *
                (ascending ? 1 : -1),
            );
          rows = rows.slice(0, count);
          resolve({ data: single ? rows[0] || null : rows, error: null });
        },
      };
      return chain;
    },
  };
}
let deliveries: Row[] = [];
let failStatus: number | undefined;
const Module = require("node:module");
const originalLoad = Module._load;
Module._load = function (id: string, ...args: unknown[]) {
  if (id === "./pushServer")
    return {
      sendDevicePush: async (subscription: unknown, payload: Row) => {
        if (failStatus) throw { statusCode: failStatus };
        deliveries.push(payload);
      },
    };
  return originalLoad.call(this, id, ...args);
};
const { dispatchDeviceReminders, isQuietHour } =
  require("../src/lib/notifications/dispatch") as typeof import("../src/lib/notifications/dispatch");
Module._load = originalLoad;
const device = {
  id: "device",
  owner_id: "member",
  enabled: true,
  messages_enabled: true,
  message_cursor: "2026-09-18T12:00:00Z",
  quiet_start: 22,
  quiet_end: 7,
  notify_hour: 9,
  time_zone: "UTC",
  due_today: true,
  due_tomorrow: true,
  show_details: false,
  updated_at: "2026-09-18T12:00:00Z",
};
const config = { public_key: "test", private_key: "test" };
function seed() {
  deliveries = [];
  failStatus = undefined;
  return database({
    beast_push_devices: [device],
    beast_push_deliveries: [],
    beast_push_config: [{ id: true }],
    profiles: [{ id: "member", role: "admin", birthday: "1980-01-01" }],
    beast_admin_member_module_access: [],
    bill_events: [
      { ...bill, due_date: 18, user_id: "member", is_archived: false },
    ],
    bill_payments: [],
    beast_admin_message_notifications: [
      {
        id: "message",
        user_id: "member",
        state: "Unread",
        created_at: "2026-09-18T14:00:00Z",
        action_url: "/dashboard/messages",
      },
      {
        id: "other-member",
        user_id: "other",
        state: "Unread",
        created_at: "2026-09-18T14:30:00Z",
        action_url: "/dashboard/messages",
      },
    ],
  });
}
const now = new Date("2026-09-18T15:00:00Z");
test("quiet hours wrap midnight and equal hours disable quiet time", () => {
  assert.ok(isQuietHour(23, 22, 7));
  assert.ok(isQuietHour(6, 22, 7));
  assert.equal(isQuietHour(7, 22, 7), false);
  assert.equal(isQuietHour(12, 7, 7), false);
});
test("scheduler sends owner-scoped messages and bills once across repeated runs", async () => {
  const db = seed();
  await dispatchDeviceReminders(db as any, config, now);
  assert.equal(deliveries.length, 2);
  assert.match(deliveries[0].body, /private message/);
  assert.equal(
    db.tables.beast_push_devices[0].message_cursor,
    "2026-09-18T14:00:00Z",
  );
  await dispatchDeviceReminders(db as any, config, now);
  assert.equal(deliveries.length, 2);
});
test("paused devices, quiet hours, message opt-out and read messages stop message pushes", async () => {
  for (const change of [
    { enabled: false },
    { quiet_start: 14, quiet_end: 16 },
    { messages_enabled: false },
  ]) {
    const db = seed();
    Object.assign(db.tables.beast_push_devices[0], change, {
      due_today: false,
      due_tomorrow: false,
    });
    await dispatchDeviceReminders(db as any, config, now);
    assert.equal(deliveries.length, 0);
  }
  const db = seed();
  db.tables.beast_admin_message_notifications[0].state = "Read";
  db.tables.beast_push_devices[0].due_today = false;
  await dispatchDeviceReminders(db as any, config, now);
  assert.equal(deliveries.length, 0);
});
test("expired endpoints are disabled; transient errors wait before retrying", async () => {
  const db = seed();
  failStatus = 410;
  await dispatchDeviceReminders(db as any, config, now);
  assert.equal(db.tables.beast_push_devices[0].enabled, false);
  const retry = seed();
  failStatus = 503;
  await dispatchDeviceReminders(retry as any, config, now);
  failStatus = undefined;
  await dispatchDeviceReminders(retry as any, config, now);
  assert.equal(deliveries.length, 0);
  await dispatchDeviceReminders(
    retry as any,
    config,
    new Date("2026-09-18T15:11:00Z"),
  );
  assert.equal(deliveries.length, 2);
});

let apiDatabase=seed();let signedIn=true;
const loadForRoutes=Module._load;
Module._load=function(id:string,...args:unknown[]){
 if(id==='@/lib/supabase/server')return{createRouteClient:()=>({auth:{getUser:async()=>({data:{user:signedIn?{id:'member'}:null},error:null})}})};
 if(id==='@/lib/notifications/pushServer')return{pushConfiguration:async()=>({client:apiDatabase,config:{...config,scheduler_token:'scheduler-test-token',enabled:false}}),devicePublicColumns:'id,label,enabled',sendDevicePush:async()=>{throw new Error('Unexpected send');}};
 if(id==='@/lib/notifications/pushValidation')return require('../src/lib/notifications/pushValidation');
 if(id==='@/lib/notifications/dispatch')return {dispatchDeviceReminders};
 return loadForRoutes.call(this,id,...args);
};
const deviceRoutes=require('../src/app/api/notifications/devices/route') as typeof import('../src/app/api/notifications/devices/route');
const dispatchRoute=require('../src/app/api/notifications/dispatch/route') as typeof import('../src/app/api/notifications/dispatch/route');
Module._load=loadForRoutes;
test('device API requires sign-in and same-origin writes',async()=>{
 signedIn=false;assert.equal((await deviceRoutes.GET()).status,401);
 const request=new Request('https://beast.test/api/notifications/devices',{method:'POST',headers:{origin:'https://other.test'},body:'{}'});
 assert.equal((await deviceRoutes.POST(request)).status,403);signedIn=true;
});
test('device API never lets a member remove or test someone else’s subscription',async()=>{
 apiDatabase=seed();apiDatabase.tables.beast_push_devices=[{...device,id:'11111111-1111-1111-1111-111111111111',owner_id:'another'}];
 for(const action of ['remove','test','update'])assert.equal((await deviceRoutes.POST(new Request('https://beast.test/api/notifications/devices',{method:'POST',headers:{origin:'https://beast.test'},body:JSON.stringify({action,id:'11111111-1111-1111-1111-111111111111'})}))).status,404);
 assert.equal(apiDatabase.tables.beast_push_devices.length,1);
});
test('scheduler rejects unauthenticated requests and keeps inactive environments silent',async()=>{
 assert.equal((await dispatchRoute.POST(new Request('https://beast.test/api/notifications/dispatch',{method:'POST'}))).status,401);
 const result=await dispatchRoute.POST(new Request('https://beast.test/api/notifications/dispatch',{method:'POST',headers:{authorization:'Bearer scheduler-test-token'}}));assert.equal(result.status,200);assert.deepEqual(await result.json(),{enabled:false});
});
