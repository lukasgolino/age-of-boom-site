// Site copy and game numbers. Numbers mirror ../age-of-boom/data/*.tres and GAME.md; update both together.

export const PAGAN_URL = "https://github.com/lukasgolino/PAGAN"; // swap for the PAGAN website once it is live
export const STEAM_URL = ""; // Steam store page, once it exists ("" = "coming soon")
export const LINKS: { label: string; href: string }[] = [
  // { label: "Discord", href: "https://discord.gg/..." },
  // { label: "YouTube", href: "https://youtube.com/@..." },
];

export interface Clip {
  id: string;
  title: string;
  blurb: string;
  /** public/video/<loop>.mp4|.webm|.jpg: the muted website loop. */
  loop: string;
  /** YouTube video id of the full cut ("" = play the loop instead). */
  youtube: string;
}

export const CLIPS: Clip[] = [
  {
    id: "galleons",
    title: "Galleon battle",
    blurb: "Two gun decks a side. Fires, splintered hulls and powder magazines going up.",
    loop: "loop_galleons",
    youtube: "",
  },
  {
    id: "ffa",
    title: "Free-for-all",
    blurb: "Four captains, one sea, no friends. Online deathmatch with mates or bots.",
    loop: "loop_ffa",
    youtube: "",
  },
  {
    id: "sloop",
    title: "Sloop duel",
    blurb: "One gun a side. Whoever gets the broadside on first wins.",
    loop: "loop_sloop",
    youtube: "",
  },
  { id: "sinking", title: "Feed the fishes", blurb: "Capsize, bubbles, debris and gold. Every sinking is a show.", loop: "loop_sinking", youtube: "" },
];

/** Hero kill feed: [killer, team, victim, team, how]. */
export const KILL_FEED: [string, string, string, string, string][] = [
  ["Mad Morgan", "red", "Cpt Barnacle", "blue", "broadside"],
  ["Anne Bonny", "gold", "One-Eyed Sal", "red", "fire shot"],
  ["Cpt Barnacle", "blue", "Mad Morgan", "red", "MAGAZINE!"],
  ["One-Eyed Sal", "red", "Anne Bonny", "gold", "chain shot"],
  ["Anne Bonny", "gold", "Cpt Barnacle", "blue", "grape shot"],
  ["Mad Morgan", "red", "Anne Bonny", "gold", "rammed"],
];

/** Announcer banners that flash over the hero (the game's own streak calls). */
export const BANNERS = ["FIRST BLOOD!", "BROADSIDE!", "DOUBLE SINK!", "MAGAZINE!", "FEED THE FISHES!"];

export interface Ship {
  id: "sloop" | "brig" | "frigate" | "galleon";
  name: string;
  role: string;
  hp: number;
  speed: number;
  turn: number;
  /** Max cannons per broadside (guns per row × rows). */
  guns: number;
  extras: string;
}

export const SHIPS: Ship[] = [
  { id: "sloop", name: "Sloop", role: "Quick, nimble, out-runs anything that floats.", hp: 100, speed: 90, turn: 90, guns: 1, extras: "Sails over reefs" },
  { id: "brig", name: "Brig", role: "The brawler. First ship with a bow chaser and a swivel gun.", hp: 230, speed: 75, turn: 65, guns: 3, extras: "Bow chaser, swivel" },
  { id: "frigate", name: "Frigate", role: "Two gun decks and the legs to choose its fights.", hp: 640, speed: 65, turn: 45, guns: 8, extras: "2 bow chasers, swivel, stern lanterns" },
  { id: "galleon", name: "Galleon", role: "A floating fortress. Slow to turn, terrible to face.", hp: 1300, speed: 50, turn: 30, guns: 12, extras: "2 bow chasers, swivel, stern lanterns" },
];
export const SHIP_MAX = { hp: 1300, speed: 90, turn: 90, guns: 12 };

export interface Ammo {
  id: string;
  name: string;
  /** public/sprites/ui/icon_<sprite>.png */
  sprite: string;
  text: string;
  dmg: string;
  range: string;
}

export const AMMO: Ammo[] = [
  { id: "round", name: "Round shot", sprite: "round_shot", text: "Long range, honest damage. The default for a reason.", dmg: "12", range: "220" },
  { id: "chain", name: "Chain shot", sprite: "chain_shot", text: "Shreds sails. A ship with torn canvas limps along at half speed.", dmg: "6", range: "176" },
  { id: "grape", name: "Grape shot", sprite: "grape_shot", text: "A shotgun blast at close range. Every pellet kills crew and slows their reload.", dmg: "6 x3", range: "121" },
  { id: "fire", name: "Fire shot", sprite: "fire_shot", text: "Sets the target alight. Burning ships blow their magazines far more often.", dmg: "8 + burn", range: "220" },
];

export interface Mode {
  name: string;
  tag: string;
  text: string;
}

export const MODES: Mode[] = [
  { name: "Deathmatch", tag: "Online · up to 4", text: "Pick a fully rigged ship, hunt the others, first to the kill limit wins. Host for your mates and fill empty seats with bots." },
  { name: "Co-op Last Stand", tag: "Online · up to 4", text: "Hold the port together against growing raider waves, with a boss galleon every fifth wave. Split the gold by damage dealt." },
  { name: "Last Stand", tag: "Solo", text: "One port, endless waves, a shop between rounds. Chase your best score on the leaderboard." },
  { name: "Open sea", tag: "Solo", text: "Islands, ports, pirates and fat merchant hulls. Plunder, upgrade, and climb from sloop to galleon." },
  { name: "Sandbox", tag: "Solo", text: "Any ship, every upgrade, place enemies wherever you like and watch it all burn." },
  { name: "Tutorial", tag: "Solo", text: "Learn to sail, to aim with your hull, and when to switch to chain shot." },
];

export interface SeaFeature {
  name: string;
  text: string;
}

export const SEA: SeaFeature[] = [
  { name: "Wind", text: "Fastest on a beam reach, crawling into the wind. The sea pushes back." },
  { name: "Fog banks", text: "Drifting fog hides ships until you're right on top of them." },
  { name: "Smoke screens", text: "Lay a cloud astern, break the line of sight, come about." },
  { name: "Night", text: "Only lanterns, fires and muzzle flashes give a ship away." },
  { name: "Arctic", text: "Ice floes to hide behind, crack with round shot, or ram." },
  { name: "Reefs", text: "Light hulls sail over them. Deep hulls run aground." },
];
