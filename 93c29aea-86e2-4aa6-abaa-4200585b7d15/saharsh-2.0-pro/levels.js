// levels.js
// Chapter and event definitions

const chapters = [
  {
    id: 'ch1',
    title: 'First Meeting',
    background: 'assets/backgrounds/schoolyard.png',
    storyStartNodeId: 'ch1_start',
    minigames: [
      { type: 'memoryMatch', triggerNodeId: 'ch1_park' }
    ],
    events: [
      { trigger: (gs) => gs.relationshipStats.saharshToAnbu >= 10, action: () => unlockCG('cg1') }
    ]
  },
  {
    id: 'ch2',
    title: 'The Park',
    background: 'assets/backgrounds/park.png',
    storyStartNodeId: 'ch2_start',
    minigames: [
      { type: 'logicPuzzle', triggerNodeId: 'ch2_mg1' }
    ],
    events: []
  }
  // More chapters can be added here
];

/**
 * Unlock CG (gallery image)
 */
function unlockCG(cgId) {
  if (!window.gameState.unlockedCGs.includes(cgId)) {
    window.gameState.unlockedCGs.push(cgId);
  }
}

/**
 * Get chapter by id
 */
function getChapterById(id) {
  return chapters.find(ch => ch.id === id);
}

/**
 * Reset unlocked CGs
 */
function resetCGs() {
  window.gameState.unlockedCGs = [];
}

/**
 * Get next chapter
 */
function getNextChapter(currentId) {
  const idx = chapters.findIndex(ch => ch.id === currentId);
  return idx >= 0 && idx < chapters.length - 1 ? chapters[idx + 1] : null;
}

/**
 * Check if chapter is unlocked
 */
function isChapterUnlocked(id) {
  // For now, all chapters are unlocked; expand for progression
  return true;
}

window.levels = {
  chapters,
  unlockCG,
  getChapterById,
  resetCGs,
  getNextChapter,
  isChapterUnlocked
};
