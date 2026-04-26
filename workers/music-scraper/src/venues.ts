/**
 * Cleveland venue registry for 420-adjacent music events.
 * Only venues with verified calendar URLs are included.
 */

export interface Venue {
  slug: string;
  name: string;
  neighborhood: string;
  calendarUrl: string;
  calendarType: 'html' | 'opendate';
  address: string;
  vibeMatch: 'high' | 'medium' | 'low';
}

export const VENUES: Venue[] = [
  {
    slug: 'winchester',
    name: 'Winchester Music Tavern',
    neighborhood: 'Lakewood',
    calendarUrl: 'https://thewinchestermusictavern.com/calendar/',
    calendarType: 'html',  // NOTE: JS-rendered calendar, may need BandsInTown fallback
    address: '12112 Madison Ave, Lakewood, OH',
    vibeMatch: 'high',
  },
  {
    slug: 'beachland',
    name: 'Beachland Ballroom & Tavern',
    neighborhood: 'Waterloo',
    calendarUrl: 'https://www.beachlandballroom.com/shows',
    calendarType: 'html',
    address: '15711 Waterloo Rd, Cleveland, OH',
    vibeMatch: 'high',
  },
  {
    slug: 'happy-dog',
    name: 'Happy Dog',
    neighborhood: 'Detroit Ave',
    calendarUrl: 'https://app.opendate.io/v/happy-dog-1767',
    calendarType: 'opendate',
    address: '5801 Detroit Ave, Cleveland, OH',
    vibeMatch: 'high',
  },
  {
    slug: 'grog-shop',
    name: 'Grog Shop',
    neighborhood: 'Coventry',
    calendarUrl: 'https://grogshop.gs/calendar/',
    calendarType: 'html',
    address: '2785 Euclid Heights Blvd, Cleveland Heights, OH',
    vibeMatch: 'medium',
  },
  {
    slug: 'mahalls',
    name: "Mahall's",
    neighborhood: 'Lakewood',
    calendarUrl: 'https://www.mahalls20lanes.com/events',
    calendarType: 'html',
    address: '13200 Madison Ave, Lakewood, OH',
    vibeMatch: 'medium',
  },
  {
    slug: 'foundry',
    name: 'Foundry Concert Club',
    neighborhood: 'Old Brooklyn',
    calendarUrl: 'https://www.foundryconcertclub.com/events-2/',
    calendarType: 'html',
    address: '4256 Pearl Rd, Cleveland, OH',
    vibeMatch: 'medium',
  },
  {
    slug: 'agora',
    name: 'Agora Theatre',
    neighborhood: 'Midtown',
    calendarUrl: 'https://www.agoracleveland.com/events',
    calendarType: 'html',
    address: '5000 Euclid Ave, Cleveland, OH',
    vibeMatch: 'high',
  },
];
