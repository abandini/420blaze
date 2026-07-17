import { describe, it, expect } from 'vitest';
import { buildProxyTarget, isIngestPath } from '../src/posthog.js';

const target = (u: string) => buildProxyTarget(new URL(u)).toString();

describe('isIngestPath', () => {
  it('matches the ingest root and its children', () => {
    expect(isIngestPath('/ingest')).toBe(true);
    expect(isIngestPath('/ingest/')).toBe(true);
    expect(isIngestPath('/ingest/e/')).toBe(true);
    expect(isIngestPath('/ingest/static/array.js')).toBe(true);
  });

  it('does not hijack lookalike paths', () => {
    expect(isIngestPath('/ingestion')).toBe(false);
    expect(isIngestPath('/ingest-data')).toBe(false);
    expect(isIngestPath('/blog/ingest')).toBe(false);
    expect(isIngestPath('/')).toBe(false);
  });
});

describe('buildProxyTarget', () => {
  it('routes ingestion to the API host and strips the prefix', () => {
    expect(target('https://420blazin.com/ingest/e/')).toBe('https://us.i.posthog.com/e/');
  });

  it('routes static assets to the assets host', () => {
    expect(target('https://420blazin.com/ingest/static/array.js')).toBe(
      'https://us-assets.i.posthog.com/static/array.js',
    );
    expect(target('https://420blazin.com/ingest/static/recorder.js')).toBe(
      'https://us-assets.i.posthog.com/static/recorder.js',
    );
  });

  it('preserves the query string (PostHog puts the payload there on GET)', () => {
    expect(target('https://420blazin.com/ingest/e/?ip=1&ver=1.0')).toBe(
      'https://us.i.posthog.com/e/?ip=1&ver=1.0',
    );
  });

  it('maps the bare /ingest root to the API host root', () => {
    expect(target('https://420blazin.com/ingest')).toBe('https://us.i.posthog.com/');
  });

  it('always uses https and no explicit port', () => {
    const u = buildProxyTarget(new URL('https://420blazin.com/ingest/decide/'));
    expect(u.protocol).toBe('https:');
    expect(u.port).toBe('');
  });

  it('does not send static-looking paths outside /static/ to the assets host', () => {
    expect(target('https://420blazin.com/ingest/e/static')).toBe('https://us.i.posthog.com/e/static');
  });
});
