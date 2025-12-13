/**
 * levels.js
 * Level configuration and progression system
 */

const LEVELS = [
  // World 1: The Beginning
  {
    id: 1,
    number: 1,
    name: "First Steps",
    description: "Your journey begins",
    type: "normal",
    music: "world-music",
    difficulty: 1,
    enemies: [
      { type: "slime", count: 5, spawnPoints: [ { x: 200, y: 400 }, { x: 600, y: 500 } ] }
    ],
    platforms: [
      { x: 300, y: 500, width: 200, height: 20 },
      { x: 700, y: 400, width: 200, height: 20 }
    ],
    collectibles: [
      { type: "heart", x: 650, y: 350, value: 1 },
      { type: "coin", x: 400, y: 450, value: 5 }
    ],
    objectives: [
      { type: "reachExit", x: 900, y: 600, label: "End of Level" }
    ],
    nextLevel: 2
  },
  {
    id: 2,
    number: 2,
    name: "Into the Unknown",
    description: "The world holds many secrets",
    type: "normal",
    music: "world-music",
    difficulty: 2,
    enemies: [
      { type: "slime", count: 8, spawnPoints: [ { x: 300, y: 400 }, { x: 800, y: 500 } ] },
      { type: "goblin", count: 2, spawnPoints: [ { x: 500, y: 450 } ] }
    ],
    platforms: [
      { x: 200, y: 500, width: 150, height: 20 },
      { x: 450, y: 400, width: 150, height: 20 },
      { x: 700, y: 300, width: 150, height: 20 },
      { x: 950, y: 400, width: 150, height: 20 }
    ],
    collectibles: [
      { type: "heart", x: 475, y: 350, value: 1 },
      { type: "love", x: 300, y: 450, value: 10 },
      { type: "courage", x: 975, y: 350, value: 8 }
    ],
    objectives: [
      { type: "reachExit", x: 1100, y: 600, label: "End of Level" }
    ],
    miniGame: {
      type: "COOKING",
      trigger: "atExit"
    },
    nextLevel: 3
  },
  {
    id: 3,
    number: 3,
    name: "The First Date",
    description: "A moment of calm in the chaos",
    type: "date",
    music: "date-music",
    difficulty: 1,
    dateScenario: "coffeeShop",
    objectives: [
      { type: "dateStart", x: 500, y: 600 }
    ],
    nextLevel: 4
  },
  
  // World 2: Growing Together
  {
    id: 4,
    number: 4,
    name: "Fighting Side by Side",
    description: "Your bond grows through shared struggles",
    type: "normal",
    music: "world-music",
    difficulty: 3,
    enemies: [
      { type: "goblin", count: 10, spawnPoints: [ { x: 300, y: 400 }, { x: 700, y: 500 }, { x: 500, y: 300 } ] },
      { type: "slime", count: 6, spawnPoints: [ { x: 400, y: 450 } ] }
    ],
    platforms: [
      { x: 200, y: 500, width: 150, height: 20 },
      { x: 450, y: 400, width: 150, height: 20 },
      { x: 700, y: 300, width: 150, height: 20 },
      { x: 950, y: 400, width: 150, height: 20 },
      { x: 1200, y: 500, width: 150, height: 20 }
    ],
    collectibles: [
      { type: "heart", x: 725, y: 250, value: 1 },
      { type: "trust", x: 475, y: 350, value: 12 },
      { type: "courage", x: 1075, y: 350, value: 10 },
      { type: "love", x: 1425, y: 450, value: 15 }
    ],
    objectives: [
      { type: "reachExit", x: 1500, y: 600, label: "End of Level" }
    ],
    nextLevel: 5
  },
  {
    id: 5,
    number: 5,
    name: "Boss: Shadow Guardian",
    description: "A powerful entity born from fear",
    type: "boss",
    music: "combat-music",
    difficulty: 4,
    boss: {
      id: "shadowGuardian",
      name: "Shadow Guardian",
      health: 200,
      damage: 25,
      speed: 200,
      attackPatterns: ["melee", "ranged", "charge"]
    },
    platforms: [
      { x: 400, y: 500, width: 400, height: 20 },
      { x: 900, y: 400, width: 200, height: 20 },
      { x: 1200, y: 500, width: 400, height: 20 }
    ],
    collectibles: [
      { type: "heart", x: 1400, y: 450, value: 2 },
      { type: "love", x: 600, y: 450, value: 20 }
    ],
    objectives: [
      { type: "defeatBoss", id: "shadowGuardian", label: "Defeat the Guardian" }
    ],
    nextLevel: 6
  },
  {
    id: 6,
    number: 6,
    name: "City Sights",
    description: "Exploring urban landscapes with Eric",
    type: "normal",
    music: "world-music",
    difficulty: 3,
    enemies: [
      { type: "goblin", count: 8, spawnPoints: [ { x: 400, y: 400 }, { x: 800, y: 500 }, { x: 1200, y: 400 } ] },
      { type: "wizard", count: 3, spawnPoints: [ { x: 600, y: 450 } ] }
    ],
    platforms: [
      { x: 300, y: 500, width: 150, height: 20 },
      { x: 600, y: 400, width: 150, height: 20 },
      { x: 900, y: 300, width: 150, height: 20 },
      { x: 1200, y: 400, width: 150, height: 20 },
      { x: 1500, y: 500, width: 150, height: 20 },
      { x: 1800, y: 400, width: 150, height: 20 }
    ],
    collectibles: [
      { type: "heart", x: 925, y: 250, value: 1 },
      { type: "love", x: 725, y: 350, value: 12 },
      { type: "trust", x: 1525, y: 450, value: 15 },
      { type: "courage", x: 1825, y: 350, value: 12 }
    ],
    objectives: [
      { type: "reachExit", x: 2000, y: 600, label: "End of Level" }
    ],
    miniGame: {
      type: "STARGAZING",
      trigger: "atExit"
    },
    nextLevel: 7
  },
  {
    id: 7,
    number: 7,
    name: "Second Date: Movie Night",
    description: "Sharing stories and laughs",
    type: "date",
    music: "date-music",
    difficulty: 1,
    dateScenario: "movieTheater",
    objectives: [
      { type: "dateStart", x: 500, y: 600 }
    ],
    nextLevel: 8
  },
  
  // World 3: Deeper Connection
  {
    id: 8,
    number: 8,
    name: "Forest Path",
    description: "Nature's beauty reflects your growing bond",
    type: "normal",
    music: "world-music",
    difficulty: 4,
    enemies: [
      { type: "wizard", count: 5, spawnPoints: [ { x: 400, y: 400 }, { x: 800, y: 500 } ] },
      { type: "goblin", count: 7, spawnPoints: [ { x: 600, y: 450 } ] },
      { type: "slime", count: 5, spawnPoints: [ { x: 1000, y: 400 } ] }
    ],
    platforms: [
      { x: 300, y: 500, width: 150, height: 20 },
      { x: 600, y: 400, width: 150, height: 20 },
      { x: 900, y: 300, width: 150, height: 20 },
      { x: 1200, y: 400, width: 150, height: 20 },
      { x: 1500, y: 500, width: 150, height: 20 },
      { x: 1800, y: 400, width: 150, height: 20 },
      { x: 2100, y: 300, width: 150, height: 20 }
    ],
    collectibles: [
      { type: "heart", x: 925, y: 250, value: 1 },
      { type: "love", x: 725, y: 350, value: 15 },
      { type: "trust", x: 1525, y: 450, value: 18 },
      { type: "courage", x: 1825, y: 350, value: 15 },
      { type: "courage", x: 2125, y: 250, value: 12 }
    ],
    objectives: [
      { type: "reachExit", x: 2300, y: 600, label: "End of Level" }
    ],
    nextLevel: 9
  },
  {
    id: 9,
    number: 9,
    name: "Amusement Park",
    description: "Joyful moments amidst danger",
    type: "normal",
    music: "world-music",
    difficulty: 5,
    enemies: [
      { type: "wizard", count: 6, spawnPoints: [ { x: 500, y: 400 }, { x: 900, y: 500 }, { x: 1300, y: 400 } ] },
      { type: "goblin", count: 8, spawnPoints: [ { x: 700, y: 450 } ] },
      { type: "shadow", count: 3, spawnPoints: [ { x: 1100, y: 400 } ] }
    ],
    platforms: [
      { x: 400, y: 500, width: 100, height: 20 },
      { x: 600, y: 450, width: 100, height: 20 },
      { x: 800, y: 400, width: 100, height: 20 },
      { x: 1000, y: 350, width: 100, height: 20 },
      { x: 1200, y: 300, width: 100, height: 20 },
      { x: 1400, y: 350, width: 100, height: 20 },
      { x: 1600, y: 400, width: 100, height: 20 },
      { x: 1800, y: 450, width: 100, height: 20 },
      { x: 2000, y: 500, width: 100, height: 20 }
    ],
    collectibles: [
      { type: "heart", x: 1225, y: 250, value: 2 },
      { type: "love", x: 1125, y: 300, value: 20 },
      { type: "trust", x: 1425, y: 350, value: 15 },
      { type: "courage", x: 1625, y: 400, value: 18 }
    ],
    objectives: [
      { type: "reachExit", x: 2200, y: 600, label: "End of Level" }
    ],
    miniGame: {
      type: "MUSIC",
      trigger: "atExit"
    },
    nextLevel: 10
  },
  {
    id: 10,
    number: 10,
    name: "Boss: Heart Eater",
    description: "A manifestation of insecurity and fear",
    type: "boss",
    music: "combat-music",
    difficulty: 6,
    boss: {
      id: "heartEater",
      name: "Heart Eater",
      health: 300,
      damage: 30,
      speed: 250,
      attackPatterns: ["lunge", "heartSteal", "multiShot"]
    },
    platforms: [
      { x: 400, y: 500, width: 400, height: 20 },
      { x: 900, y: 400, width: 200, height: 20 },
      { x: 1200, y: 500, width: 400, height: 20 },
      { x: 1700, y: 400, width: 200, height: 20 },
      { x: 2000, y: 500, width: 400, height: 20 }
    ],
    collectibles: [
      { type: "heart", x: 2200, y: 450, value: 3 },
      { type: "love", x: 600, y: 450, value: 25 },
      { type: "trust", x: 1400, y: 450, value: 20 }
    ],
    objectives: [
      { type: "defeatBoss", id: "heartEater", label: "Defeat the Heart Eater" }
    ],
    nextLevel: 11
  },
  {
    id: 11,
    number: 11,
    name: "Mountain Climb",
    description: "Reaching new heights together",
    type: "normal",
    music: "world-music",
    difficulty: 6,
    enemies: [
      { type: "shadow", count: 8, spawnPoints: [ { x: 500, y: 400 }, { x: 900, y: 500 }, { x: 1300, y: 400 } ] },
      { type: "wizard", count: 6, spawnPoints: [ { x: 700, y: 450 } ] },
      { type: "goblin", count: 5, spawnPoints: [ { x: 1100, y: 450 } ] }
    ],
    platforms: [
      { x: 400, y: 500, width: 120, height: 20 },
      { x: 650, y: 450, width: 120, height: 20 },
      { x: 900, y: 400, width: 120, height: 20 },
      { x: 1150, y: 350, width: 120, height: 20 },
      { x: 1400, y: 300, width: 120, height: 20 },
      { x: 1650, y: 350, width: 120, height: 20 },
      { x: 1900, y: 400, width: 120, height: 20 },
      { x: 2150, y: 450, width: 120, height: 20 },
      { x: 2400, y: 500, width: 120, height: 20 }
    ],
    collectibles: [
      { type: "heart", x: 1425, y: 250, value: 2 },
      { type: "love", x: 1675, y: 350, value: 20 },
      { type: "trust", x: 1925, y: 400, value: 18 },
      { type: "courage", x: 2175, y: 450, value: 20 },
      { type: "love", x: 2425, y: 450, value: 15 }
    ],
    objectives: [
      { type: "reachExit", x: 2600, y: 600, label: "End of Level" }
    ],
    nextLevel: 12
  },
  {
    id: 12,
    number: 12,
    name: "Third Date: Picnic",
    description: "A peaceful moment in nature",
    type: "date",
    music: "date-music",
    difficulty: 1,
    dateScenario: "park",
    objectives: [
      { type: "dateStart", x: 500, y: 600 }
    ],
    nextLevel: 13
  },
  
  // World 4: Ultimate Challenge
  {
    id: 13,
    number: 13,
    name: "Ancient Ruins",
    description: "Secrets of the past hold the key",
    type: "normal",
    music: "world-music",
    difficulty: 7,
    enemies: [
      { type: "shadow", count: 10, spawnPoints: [ { x: 500, y: 400 }, { x: 900, y: 500 }, { x: 1300, y: 400 } ] },
      { type: "darkWizard", count: 5, spawnPoints: [ { x: 700, y: 450 } ] },
      { type: "corruptedGoblin", count: 8, spawnPoints: [ { x: 1100, y: 450 } ] }
    ],
    platforms: [
      { x: 400, y: 500, width: 100, height: 20 },
      { x: 650, y: 450, width: 100, height: 20 },
      { x: 900, y: 400, width: 100, height: 20 },
      { x: 1150, y: 350, width: 100, height: 20 },
      { x: 1400, y: 300, width: 100, height: 20 },
      { x: 1650, y: 350, width: 100, height: 20 },
      { x: 1900, y: 400, width: 100, height: 20 },
      { x: 2150, y: 450, width: 100, height: 20 },
      { x: 2400, y: 500, width: 100, height: 20 },
      { x: 2650, y: 450, width: 100, height: 20 },
      { x: 2900, y: 400, width: 100, height: 20 }
    ],
    collectibles: [
      { type: "heart", x: 1425, y: 250, value: 3 },
      { type: "love", x: 1675, y: 350, value: 25 },
      { type: "trust", x: 1925, y: 400, value: 22 },
      { type: "courage", x: 2175, y: 450, value: 25 },
      { type: "courage", x: 2675, y: 400, value: 20 },
      { type: "love", x: 2925, y: 350, value: 30 }
    ],
    objectives: [
      { type: "reachExit", x: 3100, y: 600, label: "End of Level" }
    ],
    miniGame: {
      type: "PUZZLE",
      trigger: "atExit"
    },
    nextLevel: 14
  },
  {
    id: 14,
    number: 14,
    name: "The Final Confrontation",
    description: "One last battle before the end",
    type: "normal",
    music: "combat-music",
    difficulty: 8,
    enemies: [
      { type: "darkWizard", count: 8, spawnPoints: [ { x: 600, y: 400 }, { x: 1000, y: 500 }, { x: 1400, y: 400 } ] },
      { type: "corruptedGoblin", count: 10, spawnPoints: [ { x: 800, y: 450 } ] },
      { type: "shadow", count: 6, spawnPoints: [ { x: 1200, y: 450 } ] }
    ],
    platforms: [
      { x: 500, y: 500, width: 150, height: 20 },
      { x: 800, y: 400, width: 150, height: 20 },
      { x: 1100, y: 300, width: 150, height: 20 },
      { x: 1400, y: 400, width: 150, height: 20 },
      { x: 1700, y: 500, width: 150, height: 20 },
      { x: 2000, y: 400, width: 150, height: 20 },
      { x: 2300, y: 300, width: 150, height: 20 },
      { x: 2600, y: 400, width: 150, height: 20 },
      { x: 2900, y: 500, width: 150, height: 20 }
    ],
    collectibles: [
      { type: "heart", x: 1125, y: 250, value: 3 },
      { type: "love", x: 1925, y: 350, value: 30 },
      { type: "trust", x: 2325, y: 250, value: 25 },
      { type: "courage", x: 2625, y: 350, value: 25 },
      { type: "heart", x: 2925, y: 450, value: 2 }
    ],
    objectives: [
      { type: "reachExit", x: 3200, y: 600, label: "End of Level" }
    ],
    nextLevel: 15
  },
  {
    id: 15,
    number: 15,
    name: "Final Boss: The Void",
    description: "All fears and doubts coalesce into one final challenge",
    type: "boss",
    music: "combat-music",
    difficulty: 10,
    boss: {
      id: "theVoid",
      name: "The Void",
      health: 500,
      damage: 40,
      speed: 300,
      attackPatterns: ["voidBlast", "soulDrain", "summon", "phaseShift"]
    },
    platforms: [
      { x: 400, y: 500, width: 400, height: 20 },
      { x: 900, y: 400, width: 200, height: 20 },
      { x: 1200, y: 500, width: 400, height: 20 },
      { x: 1700, y: 400, width: 200, height: 20 },
      { x: 2000, y: 500, width: 400, height: 20 },
      { x: 2500, y: 400, width: 200, height: 20 },
      { x: 2800, y: 500, width: 400, height: 20 }
    ],
    specialFeatures: [
      { type: "safeZone", x: 100, y: 200, width: 300, height: 200, effect: "regeneration" },
      { type: "powerUp", x: 2200, y: 300, effect: "invincibility", duration: 10 }
    ],
    collectibles: [
      { type: "heart", x: 2200, y: 350, value: 5 },
      { type: "love", x: 600, y: 450, value: 50 },
      { type: "trust", x: 1400, y: 450, value: 40 }
    ],
    objectives: [
      { type: "defeatBoss", id: "theVoid", label: "Defeat the Void" }
    ],
    nextLevel: "win"
  }
];

// Endless Arena configuration
const ENDLESS_ARENA = {
  waves: [
    { number: 1, enemies: [{ type: "slime", count: 5 }], duration: 60 },
    { number: 2, enemies: [{ type: "slime", count: 8 }, { type: "goblin", count: 2 }], duration: 60 },
    { number: 3, enemies: [{ type: "goblin", count: 6 }, { type: "wizard", count: 2 }], duration: 60 },
    { number: 4, enemies: [{ type: "slime", count: 10 }, { type: "goblin", count: 5 }], duration: 60 },
    { number: 5, boss: "shadowGuardian", duration: 120 },
    { number: 6, enemies: [{ type: "goblin", count: 8 }, { type: "wizard", count: 4 }, { type: "shadow", count: 3 }], duration: 60 },
    { number: 7, enemies: [{ type: "wizard", count: 6 }, { type: "corruptedGoblin", count: 5 }], duration: 60 },
    { number: 8, enemies: [{ type: "darkWizard", count: 3 }, { type: "corruptedGoblin", count: 8 }, { type: "shadow", count: 5 }], duration: 60 },
    { number: 9, enemies: [{ type: "darkWizard", count: 5 }, { type: "corruptedGoblin", count: 10 }], duration: 60 },
    { number: 10, boss: "heartEater", duration: 150 },
    // Increasing difficulty
    { number: 11, enemies: [{ type: "darkWizard", count: 6 }, { type: "corruptedGoblin", count: 12 }, { type: "shadow", count: 8 }], duration: 60 },
    { number: 12, enemies: [{ type: "darkWizard", count: 8 }, { type: "corruptedGoblin", count: 15 }], duration: 60 },
    { number: 13, enemies: [{ type: "darkWizard", count: 10 }, { type: "corruptedGoblin", count: 20 }], duration: 60 },
    { number: 14, boss: "theVoid", duration: 180 },
    { number: 15, multiplier: 1.5, duration: 60 },
    { number: 16, multiplier: 1.8, duration: 60 },
    { number: 17, multiplier: 2.0, duration: 60 },
    { number: 18, boss: "heartEater", multiplier: 1.5, duration: 180 },
    { number: 19, multiplier: 2.5, duration: 60 },
    { number: 20, boss: "theVoid", multiplier: 2.0, duration: 240 }
  ],
  maxWaves: 100 // Actually infinite, but this is the defined progression
};

// Time Trial levels - variations of main levels
const TIME_TRIAL_LEVELS = LEVELS.filter(level => level.type === 'normal' || level.type === 'boss')
  .map(level => ({
    ...level,
    timeLimit: level.type === 'boss' ? 180 : (level.difficulty * 60),
    checkpoints: [
      { x: level.platforms[0]?.x || 200, y: level.platforms[0]?.y || 400, number: 1 },
      { x: level.platforms[Math.floor(level.platforms.length / 2)]?.x || 600, 
        y: level.platforms[Math.floor(level.platforms.length / 2)]?.y || 500, number: 2 },
      { x: level.objectives[0]?.x || 1000, y: level.objectives[0]?.y || 600, number: 3 }
    ]
  }));

// Relationship Recall - revisiting key moments
const RELATIONSHIP_RECALL = [
  {
    id: "firstMeeting",
    title: "Our First Meeting",
    description: "Remember when we first met?",
    dateId: "firstDate",
    choices: [
      { text: "I remember you were nervous", effect: { relationship: 3, memory: "words" } },
      { text: "I remember holding your hand", effect: { relationship: 4, memory: "touch" } },
      { text: "I remember the flowers you gave me", effect: { relationship: 2, memory: "gifts" } }
    ]
  },
  {
    id: "firstFight",
    title: "Our First Argument",
    description: "We had our first fight during the monster attack",
    dateId: "firstDate",
    choices: [
      { text: "I should have protected you better", effect: { relationship: 2, memory: "acts" } },
      { text: "I was scared for both of us", effect: { relationship: 4, memory: "words" } },
      { text: "We got through it together", effect: { relationship: 5, memory: "connection" } }
    ]
  },
  {
    id: "resolution",
    title: "Making Up",
    description: "After the fight, we talked things out",
    dateId: "secondDate",
    choices: [
      { text: "I promised to always be honest", effect: { relationship: 5, memory: "words" } },
      { text: "We shared a dance under the stars", effect: { relationship: 6, memory: "time" } },
      { text: "I gave you a charm for protection", effect: { relationship: 4, memory: "gifts" } }
    ]
  }
];

// Secret Realm - only accessible with max relationship
const SECRET_REALM = {
  levels: [
    {
      id: "shadowRealm1",
      name: "The Hidden Garden",
      description: "A place only lovers can access",
      type: "secret",
      music: "secret-music",
      difficulty: 12,
      enemies: [
        { type: "spirit", count: 5, spawnPoints: [ { x: 400, y: 400 }, { x: 800, y: 500 } ] },
        { type: "shadow", count: 8, spawnPoints: [ { x: 600, y: 450 } ] }
      ],
      platforms: [
        { x: 300, y: 500, width: 150, height: 20 },
        { x: 600, y: 400, width: 150, height: 20 },
        { x: 900, y: 300, width: 150, height: 20 },
        { x: 1200, y: 400, width: 150, height: 20 },
        { x: 1500, y: 500, width: 150, height: 20 }
      ],
      collectibles: [
        { type: "heart", x: 925, y: 250, value: 5 },
        { type: "love", x: 725, y: 350, value: 100 },
        { type: "trust", x: 1525, y: 450, value: 80 },
        { type: "courage", x: 425, y: 450, value: 60 }
      ],
      objectives: [
        { type: "reachExit", x: 1700, y: 600, label: "End of Level" }
      ],
      nextLevel: "secret2"
    }
  ],
  boss: {
    id: "shadowKing",
    name: "King of Shadows",
    health: 1000,
    damage: 50,
    speed: 350,
    attackPatterns: ["shadowBlast", "darkPulse", "summonElite", "rage"]
  }
};

// Export for game access
if (typeof module !== 'undefined') {
  module.exports = {
    LEVELS,
    ENDLESS_ARENA,
    TIME_TRIAL_LEVELS,
    RELATIONSHIP_RECALL,
    SECRET_REALM
  };
}
