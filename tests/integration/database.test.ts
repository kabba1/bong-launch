import { randomUUID, createHmac } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, afterAll, beforeEach, describe, expect, it } from "vitest";

// These tests execute PostgreSQL, real roles, constraints, functions and RLS.
// PGlite is local PostgreSQL/WASM evidence, not hosted-provider verification.
const users = {
  a: randomUUID(),
  b: randomUUID(),
  mod: randomUUID(),
  admin: randomUUID(),
};
const sessions = {
  a: randomUUID(),
  b: randomUUID(),
  mod: randomUUID(),
  admin: randomUUID(),
};
type Identity = keyof typeof users | null;
let db: PGlite;
async function as<T = Record<string, unknown>>(
  who: Identity,
  action: string,
  payload: unknown = {},
  aal = "aal1",
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.exec("SET LOCAL ROLE bong_runtime");
    await tx.query(
      `SELECT set_config('app.actor_id',$1,true), set_config('app.session_id',$2,true), set_config('app.actor_aal',$3,true), set_config('app.request_id',$4,true), set_config('app.rate_subject',$5,true)`,
      [
        who ? users[who] : "",
        who ? sessions[who] : "",
        aal,
        randomUUID(),
        who
          ? createHmac("sha256", "isolated-database-test-only")
              .update(`user\0${users[who]}`)
              .digest("hex")
          : "",
      ],
    );
    const result = await tx.query<{ result: T }>(
      "SELECT bong.api($1,$2::jsonb) AS result",
      [action, JSON.stringify(payload)],
    );
    return result.rows[0]!.result;
  });
}
async function owner(sql: string, params: unknown[] = []) {
  return db.query<Record<string, unknown>>(sql, params);
}
async function runtimeAttempt(sql: string) {
  try {
    return await db.transaction(async (tx) => {
      // SET ROLE alone leaves the test connection's original superuser
      // session identity able to switch roles; verify this negative path
      // with the restricted SESSION identity as well as current_user.
      await tx.exec("SET SESSION AUTHORIZATION bong_runtime");
      return tx.exec(sql);
    });
  } finally {
    // PGlite retains session-authorization defaults between logical queries;
    // explicitly restore the isolated fixture connection's original identity.
    await db.exec("SET SESSION AUTHORIZATION postgres");
  }
}
async function ownerAction(action: string, payload: unknown = {}) {
  return (
    await db.query<{ result: Record<string, unknown> }>(
      "SELECT bong.owner_api($1,$2::jsonb) AS result",
      [action, JSON.stringify(payload)],
    )
  ).rows[0]!.result;
}
async function maintenance(action: string, payload: unknown = {}) {
  return db.transaction(async (tx) => {
    await tx.exec("SET LOCAL ROLE bong_maintenance");
    return (
      await tx.query<{ result: Record<string, unknown> }>(
        "SELECT bong.maintenance_api($1,$2::jsonb) AS result",
        [action, JSON.stringify(payload)],
      )
    ).rows[0]!.result;
  });
}
function post(title = "A properly thoughtful title") {
  return {
    kind: "hear_me_out",
    title,
    body: "This is a meaningful personal contribution for a database test.",
    assets: [],
    idempotencyKey: randomUUID(),
    requestHash: randomUUID(),
  };
}
beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    "CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY); CREATE ROLE anon; CREATE ROLE authenticated;",
  );
  const migration = await readFile(
    resolve("supabase/migrations/202609270001_bong.sql"),
    "utf8",
  );
  await db.exec(migration);
  await ownerAction("feature.configure", {
    name: "registrations_enabled",
    enabled: true,
    reason: "Isolated integration test registrations",
  });
  for (const who of Object.keys(users) as (keyof typeof users)[]) {
    await owner("INSERT INTO auth.users(id) VALUES($1)", [users[who]]);
    await as(who, "session.register", { registrationsEnabled: true });
    await as(who, "onboarding", {
      handle: `test_${who}`,
      displayName: `Test ${who}`,
      rulesVersion: "test-rules-v1",
      termsVersion: "test-terms-v1",
      adultAcknowledged: true,
    });
  }
  await ownerAction("staff.grant", {
    userId: users.mod,
    role: "moderator",
    reason: "Isolated test moderator",
    factorId: "test-mod-factor",
  });
  await ownerAction("staff.grant", {
    userId: users.admin,
    role: "admin",
    reason: "Isolated test administrator",
    factorId: "test-admin-factor",
  });
  await as("mod", "session.stepup", { factorId: "test-mod-factor" }, "aal2");
  await as(
    "admin",
    "session.stepup",
    { factorId: "test-admin-factor" },
    "aal2",
  );
  await as(
    "admin",
    "feature.update",
    {
      name: "posting_enabled",
      value: true,
      expectedVersion: 1,
      reason: "Isolated integration test",
    },
    "aal2",
  );
  await as(
    "admin",
    "feature.update",
    {
      name: "uploads_enabled",
      value: true,
      expectedVersion: 1,
      reason: "Isolated integration test",
    },
    "aal2",
  );
}, 60_000);
afterAll(async () => {
  await db?.close();
});
// Limits are independently tested below; isolate lifecycle scenarios so tests
// never rely on wall-clock rollover or inflate deployment policy ceilings.
beforeEach(async () => {
  await owner("TRUNCATE bong.rate_buckets");
});

describe("actual PostgreSQL least privilege and identity (SEC-02/03/04, AUTH-10/11/15/16/17)", () => {
  it("all application tables enforce RLS and runtime has no table writes", async () => {
    const result = await owner(
      `SELECT c.relname,c.relrowsecurity,c.relforcerowsecurity,has_table_privilege('bong_runtime',c.oid,'INSERT,UPDATE,DELETE') AS writable FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='bong' AND c.relkind='r'`,
    );
    expect(result.rows.length).toBeGreaterThanOrEqual(19);
    for (const row of result.rows)
      expect(row).toMatchObject({
        relrowsecurity: true,
        relforcerowsecurity: true,
        writable: false,
      });
  });
  it("runtime cannot alter protected records or expose schema to provider roles", async () => {
    for (const sql of [
      "UPDATE bong.staff_roles SET role='admin'",
      "ALTER TABLE bong.posts DISABLE ROW LEVEL SECURITY",
      "DELETE FROM bong.moderation_actions",
      "CREATE TABLE bong.attacker(id int)",
      "SET ROLE bong_owner",
      "SET ROLE bong_maintenance",
      "CREATE ROLE test_privilege_escalation",
    ]) {
      await expect(runtimeAttempt(sql)).rejects.toThrow();
    }
    const r = await owner(
      `SELECT has_schema_privilege('anon','bong','USAGE') a,has_schema_privilege('authenticated','bong','USAGE') b`,
    );
    expect(r.rows[0]).toEqual({ a: false, b: false });
  });
  it("transaction context does not bleed to the next anonymous request", async () => {
    expect(await as("a", "session.get")).toMatchObject({
      userId: users.a,
      onboarded: true,
    });
    expect(await as("b", "session.get")).toMatchObject({ userId: users.b });
    expect(await as(null, "session.get")).toMatchObject({ userId: null });
    const r = await owner(
      `SELECT nullif(current_setting('app.actor_id',true),'') AS actor`,
    );
    expect(r.rows[0]).toEqual({ actor: null });
  });
  it("unknown sessions and unapproved factors do not authorize", async () => {
    const old = sessions.b;
    sessions.b = randomUUID();
    await expect(as("b", "account.content")).rejects.toThrow("UNAUTHENTICATED");
    sessions.b = old;
    await expect(
      as("mod", "session.stepup", { factorId: "attacker-factor" }, "aal2"),
    ).rejects.toThrow("MFA_REQUIRED");
    await expect(as("mod", "moderation.queue")).rejects.toThrow("MFA_REQUIRED");
    await expect(
      as("mod", "factor.approve", { factorId: "new-attacker-factor" }),
    ).rejects.toThrow();
  });
});

async function published(who: Exclude<Identity, null> = "a") {
  const item = await as<{ id: string; revisionId: string; version: number }>(
    who,
    "post.create",
    post(),
  );
  await as(
    "mod",
    "moderation.decide",
    {
      targetType: "post",
      id: item.id,
      revisionId: item.revisionId,
      expectedVersion: 1,
      action: "approve",
      reason: "Isolated fixture approved by reviewer",
    },
    "aal2",
  );
  return { ...item, version: 2 };
}
async function upload(who: Exclude<Identity, null>) {
  const id = randomUUID();
  const payload = {
    id,
    mainKey: `${users[who]}/${id}/main.webp`,
    thumbKey: `${users[who]}/${id}/thumb.webp`,
    mime: "image/webp",
    width: 64,
    height: 64,
    mainBytes: 100,
    thumbBytes: 80,
    digest: "a".repeat(64),
  };
  await as(who, "media.reserve", payload);
  await as(who, "media.register", payload);
  return payload;
}

describe("comments and durable assets (COMMENT-01/02/03/05/06, MEDIA-07/08/11/12/13)", () => {
  it("pending comments are private, same-post reply constraints hold, deleted comments contain no text", async () => {
    const pa = await published("a"),
      pb = await published("b");
    const first = await as("a", "comment.create", {
      postId: pa.id,
      body: "A pending thought",
      idempotencyKey: randomUUID(),
    });
    expect((await as(null, "comment.list", { postId: pa.id })).items).toEqual(
      [],
    );
    expect((await as("b", "comment.list", { postId: pa.id })).items).toEqual(
      [],
    );
    expect(
      JSON.stringify(await as("a", "comment.list", { postId: pa.id })),
    ).toContain("A pending thought");
    await as(
      "mod",
      "moderation.decide",
      {
        targetType: "comment",
        id: first.id,
        revisionId: first.revisionId,
        expectedVersion: 1,
        action: "approve",
        reason: "Approved test comment",
      },
      "aal2",
    );
    await expect(
      as("b", "comment.create", {
        postId: pb.id,
        body: "Wrong thread",
        replyToCommentId: first.id,
        idempotencyKey: randomUUID(),
      }),
    ).rejects.toThrow("VALIDATION_ERROR");
    await expect(
      owner(
        `INSERT INTO bong.comments(post_id,author_id,reply_to_comment_id) VALUES($1,$2,$3)`,
        [pb.id, users.b, first.id],
      ),
    ).rejects.toThrow();
    const reply = await as("b", "comment.create", {
      postId: pa.id,
      body: "Same thread reply",
      replyToCommentId: first.id,
      idempotencyKey: randomUUID(),
    });
    await as("a", "comment.delete", { id: first.id, expectedVersion: 2 });
    const list = await as("b", "comment.list", { postId: pa.id });
    expect(JSON.stringify(list)).not.toContain("A pending thought");
    expect(JSON.stringify(list)).toContain(reply.id);
    await owner(
      `UPDATE bong.comments SET created_at=now()-interval '16 minutes' WHERE id=$1`,
      [reply.id],
    );
    await expect(
      as("b", "comment.edit", {
        id: reply.id,
        expectedVersion: 1,
        body: "Too late",
      }),
    ).rejects.toThrow("FORBIDDEN");
    await as("a", "post.delete", { id: pa.id, expectedVersion: 2 });
    await expect(
      as("b", "comment.create", {
        postId: pa.id,
        body: "Hidden thread",
        idempotencyKey: randomUUID(),
      }),
    ).rejects.toThrow("NOT_FOUND");
  });
  it("asset ownership, post binding and pending/public media are independently checked", async () => {
    const image = await upload("a");
    await expect(
      as("b", "media.authorize", { id: image.id, variant: "main" }),
    ).rejects.toThrow("NOT_FOUND");
    await expect(
      as("b", "post.create", {
        ...post(),
        assets: [{ id: image.id, altText: "Private owned image test" }],
      }),
    ).rejects.toThrow("ASSET_BINDING");
    const first = await as("a", "post.create", {
      ...post(),
      assets: [{ id: image.id, altText: "Private owned image test" }],
    });
    await expect(
      as(null, "media.authorize", { id: image.id, variant: "main" }),
    ).rejects.toThrow("NOT_FOUND");
    await expect(
      as("a", "post.create", {
        ...post(),
        assets: [{ id: image.id, altText: "Rebinding fails here" }],
      }),
    ).rejects.toThrow("ASSET_BINDING");
    await as(
      "mod",
      "moderation.decide",
      {
        targetType: "post",
        id: first.id,
        revisionId: first.revisionId,
        expectedVersion: 1,
        action: "approve",
        reason: "Human approved isolated test image",
      },
      "aal2",
    );
    expect(
      await as(null, "media.authorize", { id: image.id, variant: "main" }),
    ).toMatchObject({ key: image.mainKey, expiresIn: 60 });
    const next = await upload("a");
    await as("a", "post.edit", {
      ...post(),
      id: first.id,
      expectedVersion: 2,
      assets: [{ id: next.id, altText: "Image in the pending edit" }],
    });
    await expect(
      as(null, "media.authorize", { id: next.id, variant: "main" }),
    ).rejects.toThrow("NOT_FOUND");
    expect(
      await as("a", "media.authorize", { id: next.id, variant: "thumb" }),
    ).toMatchObject({ key: next.thumbKey });
    await as(
      "mod",
      "moderation.decide",
      {
        targetType: "post",
        id: first.id,
        expectedVersion: 3,
        action: "hide",
        reason: "Hide isolated image post",
      },
      "aal2",
    );
    await expect(
      as(null, "media.authorize", { id: image.id, variant: "main" }),
    ).rejects.toThrow("NOT_FOUND");
    await expect(
      as("a", "media.authorize", { id: image.id, variant: "main" }),
    ).rejects.toThrow("NOT_FOUND");
  });
  it("rejects attaching existing sanitized assets after uploads are disabled, but permits text-only edits", async () => {
    const image = await upload("a"),
      unattached = await upload("a");
    const existing = await as("a", "post.create", {
      ...post(),
      assets: [{ id: image.id, altText: "Initially permitted private image" }],
    });
    await ownerAction("feature.configure", {
      name: "uploads_enabled",
      enabled: false,
      reason: "Incident switch regression fixture",
    });
    try {
      await expect(
        as("a", "post.create", {
          ...post(),
          assets: [
            {
              id: unattached.id,
              altText: "Previously sanitized private image",
            },
          ],
        }),
      ).rejects.toThrow("READ_ONLY");
      await expect(
        as("a", "post.edit", {
          ...post(),
          id: existing.id,
          expectedVersion: 1,
          assets: [
            { id: image.id, altText: "Previously attached private image" },
          ],
        }),
      ).rejects.toThrow("READ_ONLY");
      expect(await as("a", "post.create", post())).toHaveProperty("id");
      expect(
        await as("a", "post.edit", {
          ...post(),
          id: existing.id,
          expectedVersion: 1,
          assets: [],
        }),
      ).toMatchObject({ version: 2 });
    } finally {
      await ownerAction("feature.configure", {
        name: "uploads_enabled",
        enabled: true,
        reason: "Restore isolated test switch",
      });
    }
  });
  it("fences deletion behind in-flight uploads and requeues late cleanup after session and identity removal", async () => {
    const savedUser = users.b,
      savedSession = sessions.b;
    users.b = randomUUID();
    sessions.b = randomUUID();
    const id = randomUUID(),
      cleanupToken = "x".repeat(43);
    try {
      await owner("INSERT INTO auth.users(id) VALUES($1)", [users.b]);
      await as("b", "session.register", { registrationsEnabled: true });
      await as("b", "onboarding", {
        handle: "upload_race",
        displayName: "Upload race",
        rulesVersion: "test",
        termsVersion: "test",
        adultAcknowledged: true,
      });
      await as("b", "media.reserve", {
        id,
        cleanupToken,
        mainKey: `${users.b}/${id}/main.webp`,
        thumbKey: `${users.b}/${id}/thumb.webp`,
      });
      const deletion = await as("b", "account.delete", { confirmed: true });
      // Reproduce cleanup finishing before the already accepted remote upload.
      await owner(
        "UPDATE bong.object_deletions SET status='complete',completed_at=now() WHERE object_key LIKE $1",
        [`${users.b}/${id}/%`],
      );
      await expect(
        maintenance("deletion.prepare", { id: deletion.id }),
      ).rejects.toThrow("UPLOAD_CLEANUP_PENDING");
      await owner(
        "UPDATE bong.app_sessions SET revoked_at=now() WHERE user_id=$1",
        [users.b],
      );
      await expect(as("b", "media.register", { id })).rejects.toThrow(
        "UNAUTHENTICATED",
      );
      await expect(
        as(null, "media.abort", { id, cleanupToken: "y".repeat(43) }),
      ).rejects.toThrow("NOT_FOUND");
      expect(await as(null, "media.abort", { id, cleanupToken })).toMatchObject(
        { queued: true },
      );
      const queued = (
        await owner(
          "SELECT id,status,generation FROM bong.object_deletions WHERE object_key LIKE $1",
          [`${users.b}/${id}/%`],
        )
      ).rows;
      expect(queued).toHaveLength(2);
      expect(queued.every((row) => row.status === "queued")).toBe(true);
      await expect(
        maintenance("objects.complete", { id: queued[0]!.id, generation: 1 }),
      ).rejects.toThrow("CONFLICT");
      await expect(
        maintenance("deletion.prepare", { id: deletion.id }),
      ).rejects.toThrow("MEDIA_CLEANUP_PENDING");
      for (const object of queued)
        await maintenance("objects.complete", {
          id: object.id,
          generation: object.generation,
        });
      expect(
        await maintenance("deletion.prepare", { id: deletion.id }),
      ).toMatchObject({ readyForProviderDeletion: true });
      expect(
        (await owner("SELECT 1 FROM bong.members WHERE user_id=$1", [users.b]))
          .rows,
      ).toHaveLength(0);
      // A bounded remote request's delayed result still has a private cleanup capability.
      expect(await as(null, "media.abort", { id, cleanupToken })).toMatchObject(
        { queued: true },
      );
      expect(
        (
          await owner(
            "SELECT status FROM bong.object_deletions WHERE object_key LIKE $1",
            [`${users.b}/${id}/%`],
          )
        ).rows.every((row) => row.status === "queued"),
      ).toBe(true);
      await expect(
        maintenance("deletion.prepare", { id: deletion.id }),
      ).rejects.toThrow("MEDIA_CLEANUP_PENDING");
    } finally {
      users.b = savedUser;
      sessions.b = savedSession;
    }
  });
  it("reclaims crashed upload leases, rejects stale cleanup acknowledgments and expires bounded tombstones", async () => {
    for (const sweep of ["jobs.claim", "retention.run"]) {
      const id = randomUUID(),
        cleanupToken = "z".repeat(43);
      const mainKey = `${users.a}/${id}/main.webp`,
        thumbKey = `${users.a}/${id}/thumb.webp`;
      await as("a", "media.reserve", { id, cleanupToken, mainKey, thumbKey });
      await owner(
        "INSERT INTO bong.object_deletions(bucket,object_key,status) VALUES('media',$1,'complete'),('media',$2,'complete')",
        [mainKey, thumbKey],
      );
      await owner(
        "UPDATE bong.upload_reservations SET lease_until=now()-interval '1 minute' WHERE id=$1",
        [id],
      );
      await maintenance(sweep, { limit: 10 });
      expect(
        (
          await owner(
            "SELECT status FROM bong.upload_reservations WHERE id=$1",
            [id],
          )
        ).rows[0],
      ).toEqual({ status: "aborted" });
      const rows = (
        await owner(
          "SELECT id,status,generation FROM bong.object_deletions WHERE object_key IN($1,$2)",
          [mainKey, thumbKey],
        )
      ).rows;
      expect(
        rows.every((row) => row.status !== "complete" && row.generation === 2),
      ).toBe(true);
      await expect(
        as("a", "media.register", { id, mainKey, thumbKey }),
      ).rejects.toThrow("CONFLICT");
      await as(null, "media.abort", { id, cleanupToken });
      for (const row of rows) {
        await expect(
          maintenance("objects.complete", {
            id: row.id,
            generation: row.generation,
          }),
        ).rejects.toThrow("CONFLICT");
        await maintenance("objects.complete", { id: row.id, generation: 3 });
      }
      await owner(
        "UPDATE bong.upload_reservations SET created_at=now()-interval '31 days' WHERE id=$1",
        [id],
      );
      await maintenance("retention.run");
      expect(
        (
          await owner("SELECT 1 FROM bong.upload_reservations WHERE id=$1", [
            id,
          ])
        ).rows,
      ).toHaveLength(0);
    }
  });
  it("private reservation and expired unattached asset enter retryable cleanup", async () => {
    const id = randomUUID();
    await as("b", "media.reserve", {
      id,
      mainKey: `${users.b}/${id}/main.webp`,
      thumbKey: `${users.b}/${id}/thumb.webp`,
    });
    await expect(
      as("b", "media.authorize", { id, variant: "main" }),
    ).rejects.toThrow("NOT_FOUND");
    await as("b", "media.abort", { id });
    const image = await upload("b");
    await owner(
      `UPDATE bong.media_assets SET created_at=now()-interval '25 hours' WHERE id=$1`,
      [image.id],
    );
    await maintenance("retention.run");
    await expect(
      as("b", "media.authorize", { id: image.id, variant: "main" }),
    ).rejects.toThrow("NOT_FOUND");
    const claimed = await maintenance("jobs.claim");
    const objects = claimed.objects as {
      id: string;
      key: string;
      generation: number;
    }[];
    expect(objects.map((x) => x.key)).toContain(image.mainKey);
    const target = objects.find((x) => x.key === image.mainKey)!;
    await maintenance("objects.retry", {
      id: target.id,
      generation: target.generation,
      errorCode: "STORAGE_UNAVAILABLE",
    });
    const row = await owner(
      "SELECT status,error_code FROM bong.object_deletions WHERE id=$1",
      [target.id],
    );
    expect(row.rows[0]).toEqual({
      status: "retry",
      error_code: "STORAGE_UNAVAILABLE",
    });
    await maintenance("objects.complete", {
      id: target.id,
      generation: target.generation,
    });
    await maintenance("objects.complete", {
      id: target.id,
      generation: target.generation,
    });
  });
});

describe("SQL policy projections, shared budgets, search and lifecycle (SEC-03/04/11, BOARD-08/11, PRIV-01–07)", () => {
  it("direct runtime SELECT obeys RLS across author, other user, anonymous and MFA staff", async () => {
    const item = await as(
      "a",
      "post.create",
      post("RLS private pending fixture"),
    );
    async function visible(who: Identity, aal = "aal1") {
      return db.transaction(async (tx) => {
        await tx.exec("SET LOCAL ROLE bong_runtime");
        await tx.query(
          `SELECT set_config('app.actor_id',$1,true),set_config('app.session_id',$2,true),set_config('app.actor_aal',$3,true)`,
          [who ? users[who] : "", who ? sessions[who] : "", aal],
        );
        return (
          await tx.query("SELECT id FROM bong.post_revisions WHERE id=$1", [
            item.revisionId,
          ])
        ).rows;
      });
    }
    expect(await visible("a")).toHaveLength(1);
    expect(await visible("b")).toHaveLength(0);
    expect(await visible(null)).toHaveLength(0);
    expect(await visible("mod")).toHaveLength(0);
    expect(await visible("mod", "aal2")).toHaveLength(1);
    await expect(
      db.transaction(async (tx) => {
        await tx.exec("SET LOCAL ROLE bong_runtime");
        await tx.exec("SELECT * FROM bong.staff_mfa_factors");
      }),
    ).rejects.toThrow();
    await expect(
      db.transaction(async (tx) => {
        await tx.exec("SET LOCAL ROLE bong_maintenance");
        await tx.query("SELECT bong.owner_api($1,$2::jsonb)", [
          "staff.grant",
          JSON.stringify({
            userId: users.b,
            role: "admin",
            reason: "Forbidden",
          }),
        ]);
      }),
    ).rejects.toThrow();
  });
  it("parallel submission retries commit once and quotas use shared atomic counters", async () => {
    const input = post("Parallel idempotency fixture");
    const results = await Promise.all(
      Array.from({ length: 8 }, () => as("a", "post.create", input)),
    );
    expect(new Set(results.map((x) => x.id)).size).toBe(1);
    const counted = await owner(
      `SELECT consumed FROM bong.rate_buckets WHERE action='post-10m'`,
    );
    expect(counted.rows[0]).toMatchObject({ consumed: 1 });
    const quota = {
      subjectKey: "b".repeat(64),
      action: "parallel-test",
      limit: 3,
      windowSeconds: 600,
    };
    const outcomes = await Promise.allSettled(
      Array.from({ length: 12 }, () => as(null, "limit.consume", quota)),
    );
    expect(outcomes.filter((x) => x.status === "fulfilled")).toHaveLength(3);
    const bucket = await owner(
      `SELECT consumed FROM bong.rate_buckets WHERE action='parallel-test'`,
    );
    expect(bucket.rows[0]).toMatchObject({ consumed: 3 });
  });
  it("rolling cooldown cannot reset at a fixed minute boundary", async () => {
    const input = {
      subjectKey: "c".repeat(64),
      action: "auth-resend",
      seconds: 60,
    };
    expect(await as(null, "limit.cooldown", input)).toMatchObject({
      allowed: true,
    });
    await owner(
      `UPDATE bong.rate_buckets SET expires_at=now()+interval '1 second' WHERE action='cooldown:auth-resend'`,
    );
    await expect(as(null, "limit.cooldown", input)).rejects.toThrow(
      "RATE_LIMITED",
    );
    await owner(
      `UPDATE bong.rate_buckets SET expires_at=now()-interval '1 second' WHERE action='cooldown:auth-resend'`,
    );
    expect(await as(null, "limit.cooldown", input)).toMatchObject({
      allowed: true,
    });
  });
  it("snapshot cursors validate query binding and public search excludes pending text", async () => {
    const one = await published("a");
    const two = await published("b");
    const page = await as<{
      items: { id: string }[];
      page: { nextCursor: string; hasMore: boolean };
    }>(null, "post.list", { limit: 1 });
    expect(page.page.hasMore).toBe(true);
    expect(page.page.nextCursor).toMatch(/^[A-Za-z0-9_-]+$/);
    await owner(
      `INSERT INTO bong.posts(author_id,kind,state) VALUES($1,'hear_me_out','pending')`,
      [users.a],
    );
    const next = await as<{ items: { id: string }[] }>(null, "post.list", {
      limit: 1,
      cursor: page.page.nextCursor,
    });
    expect(next.items[0]!.id).not.toBe(page.items[0]!.id);
    await expect(as(null, "post.list", { limit: 51 })).rejects.toThrow(
      "VALIDATION_ERROR",
    );
    await expect(
      as(null, "post.list", {
        cursor: page.page.nextCursor,
        query: "different",
      }),
    ).rejects.toThrow("VALIDATION_ERROR");
    await expect(as(null, "post.list", { cursor: "invalid%" })).rejects.toThrow(
      "VALIDATION_ERROR",
    );
    await as("a", "post.edit", {
      ...post("Privatewordxyz pending search title"),
      id: one.id,
      expectedVersion: 2,
    });
    expect(
      (await as(null, "post.list", { query: "Privatewordxyz" })).items,
    ).toEqual([]);
    expect(
      await as(null, "member.get", { handle: "test_b" }),
    ).not.toHaveProperty("trustedText");
    expect(two.id).toBeTruthy();
  });
  it("reports coalesce privately and durable review/audit routes expose authorized DTOs", async () => {
    const item = await published("b");
    const first = await as("a", "report.create", {
      targetType: "post",
      targetId: item.id,
      reason: "privacy",
      detail: "Private reporter detail fixture",
    });
    const second = await as("a", "report.create", {
      targetType: "post",
      targetId: item.id,
      reason: "privacy",
      detail: "Duplicate",
    });
    expect(second.id).toBe(first.id);
    expect(
      JSON.stringify(await as("b", "post.get", { id: item.id })),
    ).not.toContain("Private reporter detail fixture");
    const queue = await as("mod", "moderation.queue", { limit: 1 }, "aal2");
    expect(queue).toHaveProperty("page");
    expect(
      await as("mod", "moderation.review", { id: first.id }, "aal2"),
    ).toMatchObject({
      targetType: "report",
      item: { detail: "Private reporter detail fixture" },
    });
    await as(
      "mod",
      "moderation.decide",
      {
        targetType: "report",
        id: first.id,
        expectedVersion: 1,
        action: "resolve",
        reason: "Reviewed fixture report",
      },
      "aal2",
    );
    expect(await as("admin", "audit.list", {}, "aal2")).toHaveProperty("items");
    await expect(as("mod", "audit.list", {}, "aal2")).rejects.toThrow(
      "FORBIDDEN",
    );
    expect(await as("admin", "feature.list", {}, "aal2")).toHaveProperty(
      "items",
    );
  });
  it("private exports and retried deletion remove SQL bytes without damaging independent contributors", async () => {
    const savedUser = users.b,
      savedSession = sessions.b;
    users.b = randomUUID();
    sessions.b = randomUUID();
    try {
      await owner("INSERT INTO auth.users(id) VALUES($1)", [users.b]);
      await as("b", "session.register", { registrationsEnabled: true });
      await as("b", "onboarding", {
        handle: "test_deletion",
        displayName: "Deletion fixture",
        rulesVersion: "test-rules-v1",
        termsVersion: "test-terms-v1",
        adultAcknowledged: true,
      });
      const owned = await published("b"),
        independent = await published("a");
      const image = await upload("b");
      const foreignComment = await as("a", "comment.create", {
        postId: owned.id,
        body: "Independent author comment",
        idempotencyKey: randomUUID(),
      });
      await as(
        "mod",
        "moderation.decide",
        {
          targetType: "comment",
          id: foreignComment.id,
          revisionId: foreignComment.revisionId,
          expectedVersion: 1,
          action: "approve",
          reason: "Test independent contribution",
        },
        "aal2",
      );
      await as("a", "report.create", {
        targetType: "post",
        targetId: owned.id,
        reason: "privacy",
        detail: "Secret reporter identity detail",
      });
      const exportJob = await as("b", "account.export");
      await expect(
        as("a", "account.job", { id: exportJob.id }),
      ).rejects.toThrow("NOT_FOUND");
      const data = await maintenance("jobs.export-data", { id: exportJob.id });
      expect(JSON.stringify(data)).toContain("Deletion fixture");
      expect(JSON.stringify(data)).not.toContain("Secret reporter");
      expect(JSON.stringify(data)).not.toContain("Independent author comment");
      await maintenance("jobs.complete", {
        id: exportJob.id,
        exportKey: `${exportJob.id}/export.json`,
      });
      expect(await as("b", "account.job", { id: exportJob.id })).toMatchObject({
        status: "complete",
        exportKey: `${exportJob.id}/export.json`,
      });
      const deletion = await as("b", "account.delete", { confirmed: true });
      expect(deletion.kind).toBe("deletion");
      await expect(as("b", "post.create", post())).rejects.toThrow("FORBIDDEN");
      await expect(as(null, "post.get", { id: owned.id })).rejects.toThrow(
        "NOT_FOUND",
      );
      await expect(
        maintenance("deletion.prepare", { id: deletion.id }),
      ).rejects.toThrow("MEDIA_CLEANUP_PENDING");
      const claimed = await maintenance("jobs.claim", { limit: 10 });
      for (const object of claimed.objects as {
        id: string;
        generation: number;
      }[])
        await maintenance("objects.complete", {
          id: object.id,
          generation: object.generation,
        });
      const prepared = await maintenance("deletion.prepare", {
        id: deletion.id,
      });
      expect(prepared).toEqual({
        userId: users.b,
        readyForProviderDeletion: true,
      });
      await maintenance("jobs.retry", {
        id: deletion.id,
        errorCode: "PROVIDER_UNAVAILABLE",
      });
      expect(
        await maintenance("deletion.prepare", { id: deletion.id }),
      ).toEqual(prepared);
      expect(
        (await owner("SELECT * FROM bong.members WHERE user_id=$1", [users.b]))
          .rows,
      ).toHaveLength(0);
      expect(
        (
          await owner("SELECT * FROM bong.post_revisions WHERE post_id=$1", [
            owned.id,
          ])
        ).rows,
      ).toHaveLength(0);
      expect(
        (
          await owner(
            "SELECT owner_id,state FROM bong.media_assets WHERE id=$1",
            [image.id],
          )
        ).rows[0],
      ).toEqual({ owner_id: null, state: "deleted" });
      expect(
        (
          await owner(
            "SELECT owner_id,session_id,status FROM bong.upload_reservations WHERE id=$1",
            [image.id],
          )
        ).rows[0],
      ).toEqual({ owner_id: null, session_id: null, status: "complete" });
      await owner(
        "UPDATE bong.upload_reservations SET created_at=now()-interval '31 days' WHERE id=$1",
        [image.id],
      );
      await maintenance("retention.run");
      expect(
        (
          await owner("SELECT 1 FROM bong.upload_reservations WHERE id=$1", [
            image.id,
          ])
        ).rows,
      ).toHaveLength(0);
      expect(await as(null, "post.get", { id: independent.id })).toHaveProperty(
        "body",
      );
      expect(
        (
          await owner("SELECT author_id FROM bong.comments WHERE id=$1", [
            foreignComment.id,
          ])
        ).rows[0],
      ).toEqual({ author_id: users.a });
      // This proves application FKs no longer block provider deletion. It does
      // not claim that the external provider deletion API has been exercised.
      await owner("DELETE FROM auth.users WHERE id=$1", [users.b]);
      await maintenance("deletion.complete", { id: deletion.id });
      await maintenance("deletion.complete", { id: deletion.id });
      expect(
        (
          await owner(
            "SELECT user_id,provider_subject,status FROM bong.account_jobs WHERE id=$1",
            [deletion.id],
          )
        ).rows[0],
      ).toEqual({ user_id: null, provider_subject: null, status: "complete" });
    } finally {
      users.b = savedUser;
      sessions.b = savedSession;
    }
  });
  it("deletion waits for an in-flight exporter and requeues bytes written after an early cleanup acknowledgement", async () => {
    const savedUser = users.b,
      savedSession = sessions.b;
    users.b = randomUUID();
    sessions.b = randomUUID();
    try {
      await owner("INSERT INTO auth.users(id) VALUES($1)", [users.b]);
      await as("b", "session.register", { registrationsEnabled: true });
      await as("b", "onboarding", {
        handle: "test_export_race",
        displayName: "Race fixture",
        rulesVersion: "test",
        termsVersion: "test",
        adultAcknowledged: true,
      });
      const exporting = await as("b", "account.export");
      await maintenance("jobs.claim", { limit: 10 });
      expect(
        await maintenance("jobs.export-data", { id: exporting.id }),
      ).toHaveProperty("profile");
      const deleting = await as("b", "account.delete", { confirmed: true });
      await expect(as("b", "account.export")).rejects.toThrow("FORBIDDEN");
      await expect(
        maintenance("jobs.export-data", { id: exporting.id }),
      ).rejects.toThrow("CONFLICT");
      const cleanup = await owner(
        "SELECT id,generation FROM bong.object_deletions WHERE object_key=$1",
        [`${exporting.id}/export.json`],
      );
      const objectId = cleanup.rows[0]!.id;
      await maintenance("objects.complete", {
        id: objectId,
        generation: cleanup.rows[0]!.generation,
      });
      await expect(
        maintenance("deletion.prepare", { id: deleting.id }),
      ).rejects.toThrow("EXPORT_CLEANUP_PENDING");
      // Simulate upload completed after the earlier delete. Finalization must
      // requeue the deterministic storage key in a committed transaction.
      expect(
        await maintenance("jobs.complete", {
          id: exporting.id,
          exportKey: `${exporting.id}/export.json`,
        }),
      ).toMatchObject({ status: "failed" });
      expect(
        (
          await owner("SELECT status FROM bong.object_deletions WHERE id=$1", [
            objectId,
          ])
        ).rows[0],
      ).toEqual({ status: "queued" });
      await expect(
        maintenance("deletion.prepare", { id: deleting.id }),
      ).rejects.toThrow("MEDIA_CLEANUP_PENDING");
      await expect(
        maintenance("objects.complete", {
          id: objectId,
          generation: cleanup.rows[0]!.generation,
        }),
      ).rejects.toThrow("CONFLICT");
      const renewed = await owner(
        "SELECT generation FROM bong.object_deletions WHERE id=$1",
        [objectId],
      );
      await maintenance("objects.complete", {
        id: objectId,
        generation: renewed.rows[0]!.generation,
      });
      expect(
        await maintenance("deletion.prepare", { id: deleting.id }),
      ).toMatchObject({ readyForProviderDeletion: true });
      await owner("DELETE FROM auth.users WHERE id=$1", [users.b]);
      await maintenance("deletion.complete", { id: deleting.id });
    } finally {
      users.b = savedUser;
      sessions.b = savedSession;
    }
  });
  it("exhausted leases become visible failures and failed exports queue deterministic orphan cleanup", async () => {
    const jobId = randomUUID(),
      objectId = randomUUID();
    await owner(
      `INSERT INTO bong.account_jobs(id,user_id,kind,status,attempts,lease_until) VALUES($1,$2,'export','processing',10,now()-interval '1 minute')`,
      [jobId, users.a],
    );
    await owner(
      `INSERT INTO bong.object_deletions(id,bucket,object_key,status,attempts,lease_until) VALUES($1,'media','isolated-exhausted-fixture','processing',10,now()-interval '1 minute')`,
      [objectId],
    );
    await maintenance("jobs.claim", { limit: 1 });
    expect(
      (await owner("SELECT status FROM bong.account_jobs WHERE id=$1", [jobId]))
        .rows[0],
    ).toEqual({ status: "failed" });
    expect(
      (
        await owner("SELECT status FROM bong.object_deletions WHERE id=$1", [
          objectId,
        ])
      ).rows[0],
    ).toEqual({ status: "failed" });
    await maintenance("retention.run");
    expect(
      (
        await owner(
          "SELECT status FROM bong.object_deletions WHERE object_key=$1",
          [`${jobId}/export.json`],
        )
      ).rows[0],
    ).toEqual({ status: "queued" });
  });
  it("retention expires private exports, rate state, revisions and newly detached images with explicit holds", async () => {
    const id = randomUUID(),
      revId = randomUUID(),
      image = await upload("a");
    await owner(
      `INSERT INTO bong.posts(id,author_id,kind) VALUES($1,$2,'hear_me_out')`,
      [id, users.a],
    );
    await owner(
      `INSERT INTO bong.post_revisions(id,post_id,revision_number,title,body,state,submitted_at) VALUES($1,$2,1,'Expired rejected fixture','A rejected contribution that must leave retained storage after its retention period.','rejected',now()-interval '31 days')`,
      [revId, id],
    );
    await owner("UPDATE bong.posts SET latest_revision_id=$1 WHERE id=$2", [
      revId,
      id,
    ]);
    await owner(
      `UPDATE bong.media_assets SET state='attached',bound_post_id=$1 WHERE id=$2`,
      [id, image.id],
    );
    await owner(
      `INSERT INTO bong.revision_assets(revision_id,asset_id,position,alt_text) VALUES($1,$2,0,'Rejected fixture image description')`,
      [revId, image.id],
    );
    const hold = await owner(
      `INSERT INTO bong.retention_holds(target_type,target_id,reason,expires_at) VALUES('post',$1,'Isolated justified hold fixture',now()+interval '1 day') RETURNING id`,
      [id],
    );
    await maintenance("retention.run");
    expect(
      (await owner("SELECT id FROM bong.post_revisions WHERE id=$1", [revId]))
        .rows,
    ).toHaveLength(1);
    await owner("DELETE FROM bong.retention_holds WHERE id=$1", [
      hold.rows[0]!.id,
    ]);
    const exportId = randomUUID();
    await owner(
      `INSERT INTO bong.account_jobs(id,user_id,kind,status,export_key,expires_at) VALUES($1,$2,'export','complete',$3,now()-interval '1 minute')`,
      [exportId, users.a, `${exportId}/export.json`],
    );
    await owner(
      `INSERT INTO bong.rate_buckets(subject_key,action,window_start,consumed,expires_at) VALUES($1,'expired-fixture',now()-interval '3 days',1,now()-interval '1 minute')`,
      ["d".repeat(64)],
    );
    await maintenance("retention.run");
    expect(
      (await owner("SELECT id FROM bong.post_revisions WHERE id=$1", [revId]))
        .rows,
    ).toHaveLength(0);
    expect(
      (
        await owner("SELECT state FROM bong.media_assets WHERE id=$1", [
          image.id,
        ])
      ).rows[0],
    ).toEqual({ state: "quarantined" });
    expect(
      (
        await owner(
          `SELECT * FROM bong.rate_buckets WHERE action='expired-fixture'`,
        )
      ).rows,
    ).toHaveLength(0);
    expect(await as("a", "account.job", { id: exportId })).toMatchObject({
      exportKey: null,
      phase: "expired",
    });
  });
});

describe("staff, registration, revocation and state matrix (AUTH-10–19, MOD-04/05/06/07/09)", () => {
  it("email-only staff cannot enroll replacement factor, stale step-up cannot write, self image review fails", async () => {
    await expect(as("mod", "factor.enroll-allowed")).rejects.toThrow(
      "MFA_REQUIRED",
    );
    await as(
      "mod",
      "factor.pending",
      { factorId: "pending-replacement" },
      "aal2",
    );
    await expect(
      as("mod", "factor.approve", { factorId: "pending-replacement" }),
    ).rejects.toThrow("MFA_REQUIRED");
    await owner(
      `UPDATE bong.app_sessions SET step_up_at=now()-interval '16 minutes' WHERE session_id=$1`,
      [sessions.mod],
    );
    expect(await as("mod", "moderation.queue", {}, "aal2")).toHaveProperty(
      "posts",
    );
    await expect(
      as(
        "mod",
        "member.status",
        { id: users.b, action: "trust", reason: "Stale MFA test" },
        "aal2",
      ),
    ).rejects.toThrow("MFA_REQUIRED");
    await as("mod", "session.stepup", { factorId: "test-mod-factor" }, "aal2");
    const image = await upload("mod");
    const item = await as(
      "mod",
      "post.create",
      {
        ...post(),
        assets: [
          { id: image.id, altText: "Moderator own uploaded test image" },
        ],
      },
      "aal2",
    );
    await expect(
      as(
        "mod",
        "moderation.decide",
        {
          targetType: "post",
          id: item.id,
          revisionId: item.revisionId,
          expectedVersion: 1,
          action: "approve",
          reason: "Self approval must fail",
        },
        "aal2",
      ),
    ).rejects.toThrow("SELF_REVIEW");
    await expect(
      as(
        "mod",
        "member.status",
        { id: users.mod, action: "trust", reason: "Self trust must fail" },
        "aal2",
      ),
    ).rejects.toThrow("FORBIDDEN");
    await expect(
      as(
        "mod",
        "member.status",
        { id: users.b, action: "ban", reason: "Moderator cannot ban" },
        "aal2",
      ),
    ).rejects.toThrow("FORBIDDEN");
  });
  it("trusted text can publish but image and strict launch policy still require review", async () => {
    await as(
      "mod",
      "member.status",
      {
        id: users.b,
        action: "trust",
        reason: "Reviewed test contribution history",
      },
      "aal2",
    );
    await as(
      "admin",
      "feature.update",
      {
        name: "review_everything",
        value: false,
        expectedVersion: 1,
        reason: "Test trusted text mode",
      },
      "aal2",
    );
    const text = await as("b", "post.create", post());
    expect(text.state).toBe("published");
    const image = await upload("b");
    const imagePost = await as("b", "post.create", {
      ...post(),
      assets: [{ id: image.id, altText: "Trusted member image still pending" }],
    });
    expect(imagePost.state).toBe("pending");
    const strict = await as("b", "post.create", { ...post(), reviewAll: true });
    expect(strict.state).toBe("pending");
    await as(
      "admin",
      "feature.update",
      {
        name: "review_everything",
        value: true,
        expectedVersion: 2,
        reason: "Restore strict test mode",
      },
      "aal2",
    );
    await as(
      "mod",
      "member.status",
      { id: users.b, action: "untrust", reason: "Restore test account state" },
      "aal2",
    );
  });
  it("read-only cannot be bypassed; registration flags gate unknown verified provider identities", async () => {
    await as(
      "admin",
      "feature.update",
      {
        name: "posting_enabled",
        value: false,
        expectedVersion: 2,
        reason: "Incident test",
      },
      "aal2",
    );
    await expect(as("a", "post.create", post())).rejects.toThrow("READ_ONLY");
    await expect(as("a", "media.upload-allowed")).rejects.toThrow("READ_ONLY");
    await as(
      "admin",
      "feature.update",
      {
        name: "posting_enabled",
        value: true,
        expectedVersion: 3,
        reason: "Incident resolved in test",
      },
      "aal2",
    );
    const original = users.b,
      originalSession = sessions.b;
    users.b = randomUUID();
    sessions.b = randomUUID();
    await owner("INSERT INTO auth.users(id) VALUES($1)", [users.b]);
    await expect(as("b", "session.register")).rejects.toThrow(
      "REGISTRATION_CLOSED",
    );
    users.b = original;
    sessions.b = originalSession;
  });
  it("expired and revoked sessions cannot be resurrected; suspension/ban override retained tokens", async () => {
    const original = sessions.b;
    await owner(
      `UPDATE bong.app_sessions SET last_seen_at=now()-interval '8 days' WHERE session_id=$1`,
      [original],
    );
    await expect(as("b", "account.content")).rejects.toThrow("UNAUTHENTICATED");
    await expect(
      as("b", "session.register", { registrationsEnabled: true }),
    ).rejects.toThrow("UNAUTHENTICATED");
    await owner(
      "UPDATE bong.app_sessions SET last_seen_at=now() WHERE session_id=$1",
      [original],
    );
    await as("b", "session.revoke");
    await expect(
      as("b", "session.register", { registrationsEnabled: true }),
    ).rejects.toThrow("UNAUTHENTICATED");
    sessions.b = randomUUID();
    await as("b", "session.register", { registrationsEnabled: true });
    await as(
      "mod",
      "member.status",
      {
        id: users.b,
        action: "suspend",
        until: new Date(Date.now() + 86400000).toISOString(),
        reason: "Test suspension",
      },
      "aal2",
    );
    await expect(as("b", "post.create", post())).rejects.toThrow(
      "UNAUTHENTICATED",
    );
    sessions.b = randomUUID();
    await as("b", "session.register", { registrationsEnabled: true });
    expect(await as("b", "session.get")).toMatchObject({
      member: { state: "suspended" },
    });
    await expect(as("b", "post.create", post())).rejects.toThrow("FORBIDDEN");
    await as(
      "mod",
      "member.status",
      { id: users.b, action: "unsuspend", reason: "Test suspension cleared" },
      "aal2",
    );
    await as(
      "admin",
      "member.status",
      { id: users.b, action: "ban", reason: "Test ban" },
      "aal2",
    );
    await expect(as("b", "account.content")).rejects.toThrow("UNAUTHENTICATED");
    sessions.b = randomUUID();
    await as("b", "session.register", { registrationsEnabled: true });
    await expect(as("b", "post.create", post())).rejects.toThrow("FORBIDDEN");
    await as(
      "admin",
      "member.status",
      { id: users.b, action: "unban", reason: "Test ban cleared" },
      "aal2",
    );
  });
  it("last admin and fresh reauthentication protect account operations", async () => {
    await expect(
      as("admin", "account.delete", { confirmed: true }, "aal2"),
    ).rejects.toThrow("LAST_ADMIN");
    await owner(
      `UPDATE bong.app_sessions SET reauthenticated_at=now()-interval '11 minutes' WHERE session_id=$1`,
      [sessions.a],
    );
    await expect(as("a", "account.export")).rejects.toThrow("REAUTH_REQUIRED");
    await expect(as("a", "session.revoke", { all: true })).rejects.toThrow(
      "REAUTH_REQUIRED",
    );
    await as("a", "session.reauthenticate");
  });
});

describe("durable revisions, visibility and retry (BOARD-01–09/15, MOD-02/03/05)", () => {
  let id: string, revisionId: string;
  it("untrusted submission is pending and the identical retry creates one post", async () => {
    const input = post();
    const one = await as("a", "post.create", input);
    const two = await as("a", "post.create", input);
    expect(one).toMatchObject({ state: "pending", version: 1 });
    expect(two).toEqual(one);
    id = one.id as string;
    revisionId = one.revisionId as string;
    expect(await as("a", "post.create", { ...input, reviewAll: true })).toEqual(
      one,
    );
    await expect(
      as("a", "post.create", {
        ...input,
        body: "A changed payload must not be accepted as the same committed request.",
      }),
    ).rejects.toThrow("CONFLICT");
    await expect(as("b", "post.get", { id })).rejects.toThrow("NOT_FOUND");
    await expect(as(null, "post.get", { id })).rejects.toThrow("NOT_FOUND");
    expect(await as("a", "post.get", { id })).toMatchObject({
      id,
      state: "pending",
    });
  });
  it("approves atomically and rejects the stale repeated decision", async () => {
    await as(
      "mod",
      "moderation.decide",
      {
        targetType: "post",
        id,
        revisionId,
        expectedVersion: 1,
        action: "approve",
        reason: "Reviewed exact test revision",
      },
      "aal2",
    );
    expect(await as(null, "post.get", { id })).toMatchObject({
      title: "A properly thoughtful title",
      state: "published",
      version: 2,
    });
    await expect(
      as(
        "mod",
        "moderation.decide",
        {
          targetType: "post",
          id,
          revisionId,
          expectedVersion: 1,
          action: "approve",
          reason: "Stale test decision",
        },
        "aal2",
      ),
    ).rejects.toThrow("CONFLICT");
  });
  it("pending edits keep public approved content and private reasons separate", async () => {
    const edit = await as("a", "post.edit", {
      ...post("A newly submitted changed title"),
      id,
      expectedVersion: 2,
    });
    expect(await as(null, "post.get", { id })).toMatchObject({
      title: "A properly thoughtful title",
    });
    await expect(
      as("a", "post.edit", { ...post(), id, expectedVersion: 2 }),
    ).rejects.toThrow("CONFLICT");
    await as(
      "mod",
      "moderation.decide",
      {
        targetType: "post",
        id,
        revisionId: edit.revisionId,
        expectedVersion: 3,
        action: "reject",
        reason: "Please expand this thought",
        privateNote: "Private test note must stay private",
      },
      "aal2",
    );
    expect(await as(null, "post.get", { id })).toMatchObject({
      title: "A properly thoughtful title",
    });
    expect(JSON.stringify(await as("a", "post.get", { id }))).not.toContain(
      "Private test note",
    );
  });
  it("same-parent revision foreign key and immutable content reject corruption", async () => {
    const other = await as(
      "b",
      "post.create",
      post("Another unrelated post title"),
    );
    await expect(
      owner("UPDATE bong.posts SET approved_revision_id=$1 WHERE id=$2", [
        other.revisionId,
        id,
      ]),
    ).rejects.toThrow();
    await expect(
      owner(
        `UPDATE bong.post_revisions SET body='Changed under reviewer' WHERE id=$1`,
        [revisionId],
      ),
    ).rejects.toThrow("IMMUTABLE_REVISION");
  });
  it("deleting public post removes all public representations and prevents resurrection", async () => {
    await as("a", "post.delete", { id, expectedVersion: 4 });
    await expect(as(null, "post.get", { id })).rejects.toThrow("NOT_FOUND");
    await expect(
      as("a", "post.edit", { ...post(), id, expectedVersion: 5 }),
    ).rejects.toThrow();
    const r = await owner("SELECT search_vector FROM bong.posts WHERE id=$1", [
      id,
    ]);
    expect(r.rows[0]).toMatchObject({ search_vector: "" });
  });
});
