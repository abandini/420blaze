import { describe, it, expect } from 'vitest';
import { calculateStonerScore, is420Adjacent } from '../src/filter';

describe('calculateStonerScore', () => {
  // HIGH confidence — should score 5
  it('scores 5 for Grateful Dead tribute', () => {
    expect(calculateStonerScore('Sunshine Daydream - Grateful Dead Tribute', '')).toBe(5);
  });
  it('scores 5 for Phish tribute', () => {
    expect(calculateStonerScore('Lawn Boy - Phish Tribute', 'jam band')).toBe(5);
  });
  it('scores 5 for Parliament Funkadelic', () => {
    expect(calculateStonerScore('Parliament Funkadelic Night', '')).toBe(5);
  });
  it('scores 5 for reggae', () => {
    expect(calculateStonerScore('Bob Marley Birthday Bash', 'reggae')).toBe(5);
  });
  it('scores 5 for psychedelic', () => {
    expect(calculateStonerScore('Psychedelic Space Ritual', '')).toBe(5);
  });
  it('scores 5 for 420 events', () => {
    expect(calculateStonerScore('420 HopFest', '')).toBe(5);
  });
  it('scores 5 for Billy Strings', () => {
    expect(calculateStonerScore('Billy Strings Live', '')).toBe(5);
  });
  it('scores 5 for Maggot Brain', () => {
    expect(calculateStonerScore('Maggot Brain at Midnight', '')).toBe(5);
  });

  // MEDIUM confidence — should score 3
  it('scores 3 for doom metal', () => {
    expect(calculateStonerScore('DOOM GONG + Moon Goons', 'doom')).toBe(3);
  });
  it('scores 3 for funk', () => {
    expect(calculateStonerScore('Cleveland Funk All-Stars', '')).toBe(3);
  });
  it('scores 3 for blues jam', () => {
    expect(calculateStonerScore('Monday Blues Jam', '')).toBe(3);
  });
  it('scores 3 for Pink Floyd tribute', () => {
    expect(calculateStonerScore('Dark Side - Pink Floyd Tribute', '')).toBe(3);
  });
  it('scores 3 for bluegrass', () => {
    expect(calculateStonerScore('Hillbilly Bluegrass Hootenanny', '')).toBe(3);
  });

  // Should score 0 — excluded or not 420-adjacent
  it('scores 0 for generic pop', () => {
    expect(calculateStonerScore('Taylor Swift Tribute', 'pop')).toBe(0);
  });
  it('scores 0 for karaoke', () => {
    expect(calculateStonerScore('Thursday Karaoke Night', '')).toBe(0);
  });
  it('scores 0 for comedy', () => {
    expect(calculateStonerScore('Stand-Up Comedy Showcase', '')).toBe(0);
  });
  it('scores 0 for trivia', () => {
    expect(calculateStonerScore('Tuesday Trivia Night', '')).toBe(0);
  });
  it('scores 0 for cancelled events', () => {
    expect(calculateStonerScore('Grateful Dead Night - CANCELLED', '')).toBe(0);
  });
  it('scores 0 for generic rock', () => {
    expect(calculateStonerScore('The Broken View + Execution Day', 'rock')).toBe(0);
  });
  it('scores 0 for empty strings', () => {
    expect(calculateStonerScore('', '')).toBe(0);
  });
  it('scores 0 for open mic', () => {
    expect(calculateStonerScore('Open Mic Night hosted by Dave', '')).toBe(0);
  });
});

describe('is420Adjacent', () => {
  it('returns true for Dead tributes', () => {
    expect(is420Adjacent('Sunshine Daydream', '')).toBe(true);
  });
  it('returns true for doom shows', () => {
    expect(is420Adjacent('Doom Gong', 'doom')).toBe(true);
  });
  it('returns false for generic rock', () => {
    expect(is420Adjacent('Some Local Band', 'rock')).toBe(false);
  });
  it('returns false for excluded events', () => {
    expect(is420Adjacent('Karaoke Night', '')).toBe(false);
  });
  it('returns false for zero-score events', () => {
    expect(is420Adjacent('The Broken View', 'punk')).toBe(false);
  });
});
