import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { expect, it } from "vitest";

it("reviews indexed bounded feeds/search and comments with 10,000 posts and 100,000 comments (spec 11.6)", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      "CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY);",
    );
    await db.exec(
      await readFile(
        resolve("supabase/migrations/202609270001_bong.sql"),
        "utf8",
      ),
    );
    // Deliberately isolated fixture data. This file is never a production seed.
    await db.exec(`
      INSERT INTO auth.users(id) VALUES('00000000-0000-4000-8000-000000000001');
      INSERT INTO bong.members(user_id,handle,display_name) VALUES('00000000-0000-4000-8000-000000000001','query_fixture','Isolated query fixture');
      INSERT INTO bong.member_state(user_id) VALUES('00000000-0000-4000-8000-000000000001');
      INSERT INTO bong.posts(id,author_id,kind,created_at,published_at)
      SELECT md5('fixture-post-'||g)::uuid,'00000000-0000-4000-8000-000000000001','hear_me_out',timestamptz '2026-01-01'+g*interval '1 second',timestamptz '2026-01-01'+g*interval '1 second' FROM generate_series(1,10000) g;
      INSERT INTO bong.post_revisions(id,post_id,revision_number,title,body,state)
      SELECT md5('fixture-revision-'||g)::uuid,md5('fixture-post-'||g)::uuid,1,'Isolated fixture title '||g,'A substantial isolated fixture contribution about mechanical gears and careful experiments.','approved' FROM generate_series(1,10000) g;
      UPDATE bong.posts p SET state='published',approved_revision_id=r.id,latest_revision_id=r.id,search_vector=to_tsvector('english',r.title||' '||r.body) FROM bong.post_revisions r WHERE r.post_id=p.id;
      INSERT INTO bong.comments(id,post_id,author_id,created_at)
      SELECT md5('fixture-comment-'||g)::uuid,md5('fixture-post-1')::uuid,'00000000-0000-4000-8000-000000000001',timestamptz '2026-01-01'+g*interval '1 second' FROM generate_series(1,100000) g;
      INSERT INTO bong.comment_revisions(id,comment_id,revision_number,body,state)
      SELECT md5('fixture-comment-revision-'||g)::uuid,md5('fixture-comment-'||g)::uuid,1,'Isolated comment fixture '||g,'approved' FROM generate_series(1,100000) g;
      UPDATE bong.comments c SET state='published',approved_revision_id=r.id,latest_revision_id=r.id FROM bong.comment_revisions r WHERE r.comment_id=c.id;
      ANALYZE bong.posts; ANALYZE bong.post_revisions; ANALYZE bong.comments;
    `);
    // The embedded engine does not run the hosted autovacuum service. Flush
    // this deliberately large bulk-insert GIN pending list before examining
    // the normal, maintained-index plan (also an operational staging check).
    await db.query(
      `SELECT gin_clean_pending_list('bong.posts_search'::regclass)`,
    );
    await db.exec("ANALYZE bong.posts");
    const counts = await db.query<{ posts: number; comments: number }>(
      "SELECT (SELECT count(*)::integer FROM bong.posts) posts,(SELECT count(*)::integer FROM bong.comments) comments",
    );
    expect(counts.rows[0]).toEqual({ posts: 10000, comments: 100000 });
    const feed = await db.query(
      "EXPLAIN (ANALYZE,BUFFERS,FORMAT JSON) SELECT id,published_at FROM bong.posts WHERE state='published' ORDER BY published_at DESC,id DESC LIMIT 20",
    );
    expect(JSON.stringify(feed.rows)).toContain("published_posts_cursor");
    const comments = await db.query(
      `EXPLAIN (ANALYZE,BUFFERS,FORMAT JSON) SELECT id,created_at FROM bong.comments WHERE post_id=md5('fixture-post-1')::uuid AND state IN ('published','deleted') ORDER BY created_at,id LIMIT 30`,
    );
    expect(JSON.stringify(comments.rows)).toContain("comments_post_cursor");
    const search = await db.query(
      `EXPLAIN (ANALYZE,BUFFERS,FORMAT JSON) SELECT id FROM bong.posts WHERE state='published' AND search_vector @@ plainto_tsquery('english','fixture 9876') ORDER BY published_at DESC,id DESC LIMIT 20`,
    );
    expect(JSON.stringify(search.rows)).toContain("posts_search");
    // Query planning is local PostgreSQL evidence, not hosted concurrency/load,
    // pooler behavior, network latency, or a production performance guarantee.
    console.info(
      "PostgreSQL fixture: 10000 posts / 100000 comments; published_posts_cursor, comments_post_cursor, posts_search indexes used.",
    );
  } finally {
    await db.close();
  }
}, 120_000);
