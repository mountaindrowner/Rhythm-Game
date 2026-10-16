// =============================================================================
// songs.js — the set list: every song in the game, with its chart, recording
// and venue.
//
// TO ADD A SONG:
//   1. Put the MP3 in assets/audio/.
//   2. Make its chart:  python3 scripts/chart/make_chart.py assets/audio/<file>.mp3
//        --id <id> --title "<Title>" --vocalist singer --venue <venue>
//      (see scripts/chart/make_chart.py; check charts/<id>.png)
//   3. Import the chart and MP3 below and add an entry to SONGS.
// The venue names are in world/venues.js.
//
// Optional big moments (v0.9):
//   solo: { section: 'BRIDGE', who: 'guitarist' }  a call-and-response solo in
//         that section: the soloist plays a 2-bar lick, then you copy it
//   bigRockEnding: true  the last 4 bars are a free-for-all: mash the pads for
//         bonus points, and bank them by hitting the final note (only for songs
//         that end on a big hit rather than fading out)
// =============================================================================
import ywlmfChart from '../../charts/you_wont_let_me_fall.json';
import ywlmfAudio from '../../assets/audio/you_wont_let_me_fall.mp3';
import planBChart from '../../charts/youre_not_my_plan_b.json';
import planBAudio from '../../assets/audio/youre_not_my_plan_b.mp3';
import trustChart from '../../charts/trust_god_anyway.json';
import trustAudio from '../../assets/audio/trust_god_anyway.mp3';

export const SONGS = [
  {
    id: 'you_wont_let_me_fall', chart: ywlmfChart, audio: ywlmfAudio, venue: 'arena',
    solo: { section: 'BRIDGE', who: 'guitarist' }, bigRockEnding: true,
  },
  {
    // No clear solo spot found in this one (no bridge).
    id: 'youre_not_my_plan_b', chart: planBChart, audio: planBAudio, venue: 'rooftop',
    bigRockEnding: true,
  },
  {
    id: 'trust_god_anyway', chart: trustChart, audio: trustAudio, venue: 'sunrise',
    solo: { section: 'BRIDGE', who: 'bassist' }, bigRockEnding: true,
  },
];
