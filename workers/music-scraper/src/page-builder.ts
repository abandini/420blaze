/**
 * Generates the music-events page HTML content.
 * Output is stored in KV and served by the SEO proxy.
 */

export function buildMusicEventsPage(events: any[]): string {
  const now = new Date();
  const endOfWeekend = getEndOfWeekend();
  const updated = now.toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

  const thisWeekend = events.filter(e => e.event_date <= endOfWeekend);
  const comingUp = events.filter(e => e.event_date > endOfWeekend);

  return `
<section class="page-banner">
  <h2>Stoner-Friendly Shows in Cleveland</h2>
  <p>Jam bands, Dead tributes, psych, funk, reggae &mdash; updated nightly from venue calendars</p>
</section>

<div class="container" style="padding: 2rem 20px; max-width: 900px; margin: 0 auto;">

  <p style="color: #666; font-size: 0.9rem; margin-bottom: 2rem;">
    Last updated: ${updated}. Events sourced directly from venue websites &mdash; zero false positives.
    <a href="/blog/best-dry-herb-vaporizers.html" style="color: var(--primary-color);">Heading to a show? Don&rsquo;t forget your vaporizer.</a>
  </p>

  ${thisWeekend.length > 0 ? `
  <h2 style="font-family: 'Righteous', cursive; color: var(--deep-green);">This Weekend</h2>
  <div class="events-list">${thisWeekend.map(eventCard).join('\n')}</div>
  ` : ''}

  ${comingUp.length > 0 ? `
  <h2 style="font-family: 'Righteous', cursive; color: var(--deep-green); margin-top: 2.5rem;">Coming Up</h2>
  <div class="events-list">${comingUp.map(eventCard).join('\n')}</div>
  ` : ''}

  ${events.length === 0 ? `
  <div style="text-align: center; padding: 3rem 0; color: #666;">
    <p style="font-size: 1.2rem;">No 420-friendly shows found in the next 30 days.</p>
    <p>We scrape Cleveland venue calendars nightly. Check back soon.</p>
  </div>
  ` : ''}

  <div style="background: var(--deep-green); border-radius: 12px; padding: 1.5rem 2rem; margin: 3rem 0; text-align: center;">
    <p style="color: #aaa; font-size: 0.95rem; margin: 0 0 0.5rem;">Best way to enjoy the show and the flower</p>
    <a href="/blog/best-dry-herb-vaporizers.html" style="color: #63D471; font-weight: 600; font-size: 1.1rem;">Best Dry Herb Vaporizers 2026 &rarr;</a>
  </div>

  <div style="font-size: 0.85rem; color: #999; margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #ddd;">
    <p><strong>How this works:</strong> We scrape the actual calendar pages of Cleveland-area music venues every night at 2 AM. Events are filtered for 420-adjacent vibes (jam, Dead, psych, funk, reggae, doom). We only list events that appear on the venue&rsquo;s own website &mdash; never from aggregators alone. <a href="/about.html" style="color: var(--primary-color);">Learn more about 420Blazin</a>.</p>
    <p><strong>Venues we check:</strong> Winchester Music Tavern, Beachland Ballroom, Happy Dog, Grog Shop, Mahall&rsquo;s, Foundry Concert Club, Agora Theatre.</p>
    <p><strong>Missing a show?</strong> <a href="/contact.html" style="color: var(--primary-color);">Let us know</a> and we&rsquo;ll add the venue.</p>
  </div>

</div>`;
}

function eventCard(event: any): string {
  const date = new Date(event.event_date + 'T12:00:00');
  const month = date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
  const day = date.getDate();
  const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
  const vibeLeaves = Array(Math.min(event.stoner_score, 5)).fill('🌿').join('');

  return `
    <div class="event-card" style="margin-bottom: 1rem;">
      <div class="event-date">
        <span class="month">${month}</span>
        <span class="day">${day}</span>
      </div>
      <div class="event-details">
        <h3>${escapeHtml(event.event_name)}</h3>
        <p class="location"><i class="fas fa-map-marker-alt"></i> ${escapeHtml(event.venue_name)}</p>
        ${event.show_time || event.doors_time ? `<p class="time"><i class="far fa-clock"></i> ${event.doors_time ? 'Doors ' + escapeHtml(event.doors_time) + ' &bull; ' : ''}${event.show_time ? 'Show ' + escapeHtml(event.show_time) : ''}</p>` : ''}
        ${event.price ? `<p style="color: var(--secondary-color); font-weight: 600;">${escapeHtml(event.price)}</p>` : ''}
        <p style="font-size: 0.85rem; color: #888;">${dayName} &bull; Vibe: ${vibeLeaves}</p>
        ${event.ticket_url ? `<a href="${escapeHtml(event.ticket_url)}" class="btn-small" target="_blank" rel="noopener noreferrer">Tickets / Details</a>` : `<a href="${escapeHtml(event.source_url)}" class="btn-small" target="_blank" rel="noopener noreferrer">Venue Calendar</a>`}
      </div>
    </div>`;
}

function getEndOfWeekend(): string {
  const now = new Date();
  const day = now.getDay(); // 0=Sun
  const daysUntilSunday = day === 0 ? 0 : 7 - day;
  const sunday = new Date(now);
  sunday.setDate(now.getDate() + daysUntilSunday);
  return sunday.toISOString().split('T')[0];
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
