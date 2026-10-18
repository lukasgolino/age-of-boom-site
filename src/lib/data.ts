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
    id: "ffa",
    title: "Free-for-all",
    blurb: "Four captains, one sea, nobody's friend. Online deathmatch with friends or bots.",
    loop: "loop_ffa",
    youtube: "",
  },
  {
    id: "sloop",
    title: "Sloop duel",
    blurb: "Two sloops, one gun a side. It all comes down to who gets the broadside first.",
    loop: "loop_sloop",
    youtube: "",
  },
  {
    id: "galleons",
    title: "Galleon battle",
    blurb: "Ten guns a side, two decks of them. Fires, falling masts and powder magazines going up.",
    loop: "loop_galleons",
    youtube: "",
  },
];

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
  sprite: string;
  text: string;
}

export const AMMO: Ammo[] = [
  { id: "round", name: "Round shot", sprite: "cannonball", text: "Long range, honest damage. The default for a reason." },
  { id: "chain", name: "Chain shot", sprite: "chain_shot", text: "Shreds sails. A ship with torn canvas turns and runs at half speed." },
  { id: "grape", name: "Grape shot", sprite: "grape_shot", text: "A shotgun blast at close range. Every pellet slows the enemy's reload." },
  { id: "fire", name: "Fire shot", sprite: "fire_ball", text: "Sets the target alight. Burning ships blow their magazines more often." },
];

export interface Mode {
  name: string;
  tag: string;
  text: string;
}

export const MODES: Mode[] = [
  { name: "Deathmatch", tag: "Online · up to 4", text: "Pick a fully rigged ship, hunt the others, first to the kill limit wins. Fill empty seats with bots. Join by room code, no port forwarding." },
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
