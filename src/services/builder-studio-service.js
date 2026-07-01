import {
  listBuilders, getBuilderRow, insertBuilder, updateBuilder,
  setBuilderStatus, setBuilderVersion, softDeleteBuilder,
  insertVersion, listVersions,
  recordAnalyticsEvent, listAnalyticsEvents,
} from './builder-studio-db.js';
import { runProvider } from './provider-service.js';

// ── Builder CRUD (every save writes an immutable version snapshot) ─────────────

export async function getBuilders(workspaceId, opts) {
  return listBuilders(workspaceId, opts);
}

export async function getBuilder(id) {
  return getBuilderRow(id);
}

export async function createBuilder(workspaceId, builder) {
  const created = await insertBuilder(builder, workspaceId);
  await insertVersion(created.id, 1, created, 'Tạo Builder');
  return created;
}

export async function saveBuilder(id, workspaceId, builder, changeNote) {
  const existing = await getBuilderRow(id);
  const nextVersion = (existing?.currentVersion ?? 0) + 1;
  const updated = await updateBuilder(id, builder, workspaceId);
  await insertVersion(id, nextVersion, updated, changeNote || 'Cập nhật Builder');
  await setBuilderVersion(id, nextVersion);
  return { ...updated, currentVersion: nextVersion };
}

export async function publishBuilder(id) {
  return setBuilderStatus(id, 'published');
}

export async function unpublishBuilder(id) {
  return setBuilderStatus(id, 'draft');
}

export async function deleteBuilder(id) {
  return softDeleteBuilder(id);
}

// ── Version history ──────────────────────────────────────────────────────────

export async function getVersionHistory(builderId) {
  return listVersions(builderId);
}

// ── Test Playground — runs the builder's current draft through the real
// AI provider pipeline without persisting a document, just an analytics event.

export async function testBuilder(builder, sampleInput, workspaceId) {
  const t0 = Date.now();
  const metaPrompt = `${builder.systemPrompt ?? ''}\n\n${builder.promptTemplate ?? ''}\n\n${sampleInput ?? ''}`.trim();

  try {
    const result = await runProvider(metaPrompt, {
      provider: builder.model === 'openai' ? 'openai' : 'mock',
      builderId:   builder.id ?? 'draft',
      builderName: builder.name,
      title:       `Test — ${builder.name}`,
    });
    const responseTimeMs = Date.now() - t0;
    if (builder.id) {
      recordAnalyticsEvent(builder.id, workspaceId, {
        eventType: 'test_run',
        success: true,
        tokensUsed: result.tokens?.total ?? 0,
        responseTimeMs,
      }).catch(() => {});
    }
    return { ...result, responseTimeMs };
  } catch (err) {
    const responseTimeMs = Date.now() - t0;
    if (builder.id) {
      recordAnalyticsEvent(builder.id, workspaceId, {
        eventType: 'test_run',
        success: false,
        tokensUsed: 0,
        responseTimeMs,
      }).catch(() => {});
    }
    throw err;
  }
}

// ── Analytics summary ────────────────────────────────────────────────────────

export async function getAnalyticsSummary(builderId) {
  const events = await listAnalyticsEvents(builderId);
  const total       = events.length;
  const successes   = events.filter((e) => e.success).length;
  const totalTokens = events.reduce((s, e) => s + (e.tokensUsed ?? 0), 0);
  const avgResponseMs = total
    ? Math.round(events.reduce((s, e) => s + (e.responseTimeMs ?? 0), 0) / total)
    : 0;

  return {
    totalRuns:    total,
    successRate:  total ? Math.round((successes / total) * 100) : null,
    totalTokens,
    avgResponseMs,
    recentEvents: events.slice(0, 10),
  };
}
