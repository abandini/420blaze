/**
 * 420Blazin Music Events Scraper Worker
 *
 * Cron: Daily at 6 AM UTC (2 AM ET)
 * Manual: GET /trigger to run scrape on demand
 * Events: GET /events for JSON event data
 */

import { scrapeAllVenues } from './scraper';
import { markPastEvents, getUpcomingEvents, getEventCount } from './db';
import { buildMusicEventsPage } from './page-builder';

interface Env {
  DB: D1Database;
  PAGES: KVNamespace;
}

export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    console.log('[CRON] Music events scrape starting:', new Date().toISOString());

    await markPastEvents(env.DB);

    const result = await scrapeAllVenues(env.DB);
    console.log(`[CRON] Scraped: ${result.scraped}, Filtered: ${result.filtered}, Stored: ${result.stored}`);

    if (result.errors.length > 0) {
      console.error('[CRON] Errors:', result.errors.join('; '));
    }

    const events = await getUpcomingEvents(env.DB, 30);
    const pageHtml = buildMusicEventsPage(events);
    await env.PAGES.put('music-events-page', pageHtml);
    console.log(`[CRON] Page updated with ${events.length} events`);
  },

  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/trigger') {
      await markPastEvents(env.DB);
      const result = await scrapeAllVenues(env.DB);
      const events = await getUpcomingEvents(env.DB, 30);
      const pageHtml = buildMusicEventsPage(events);
      await env.PAGES.put('music-events-page', pageHtml);

      return Response.json({
        ok: true,
        timestamp: new Date().toISOString(),
        scraped: result.scraped,
        filtered: result.filtered,
        stored: result.stored,
        published: events.length,
        errors: result.errors,
      });
    }

    if (url.pathname === '/events') {
      const events = await getUpcomingEvents(env.DB, 30);
      return Response.json({ events, count: events.length });
    }

    if (url.pathname === '/status') {
      const count = await getEventCount(env.DB);
      return Response.json({
        status: 'ok',
        totalConfirmed: count,
        worker: '420blazin-music-scraper',
        cron: '0 6 * * * (2 AM ET)',
      });
    }

    return new Response('420Blazin Music Events Scraper\n\nEndpoints:\n  /trigger — run scrape now\n  /events — JSON events\n  /status — health check\n', {
      headers: { 'Content-Type': 'text/plain' },
    });
  },
};
