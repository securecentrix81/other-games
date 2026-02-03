// ==================== SAVE MANAGER ====================
class SaveManager {
  constructor() {
    this.storageKey = 'minecraft_saves_saharsh_version';
  }

  getAllSaves() {
    try {
      const data = localStorage.getItem(this.storageKey);
      return data ? JSON.parse(data) : {};
    } catch (e) {
      console.error('Failed to load saves:', e);
      return {};
    }
  }

  getSave(slotId) {
    const saves = this.getAllSaves();
    return saves[slotId] || null;
  }

  saveGame(slotId, saveData) {
    try {
      const saves = this.getAllSaves();
      saves[slotId] = {
        ...saveData,
        savedAt: Date.now()
      };
      localStorage.setItem(this.storageKey, JSON.stringify(saves));
      return true;
    } catch (e) {
      console.error('Failed to save game:', e);
      if (e.name === 'QuotaExceededError') {
        alert('Storage full! Consider exporting and deleting old worlds.');
      }
      return false;
    }
  }

  deleteSave(slotId) {
    try {
      const saves = this.getAllSaves();
      delete saves[slotId];
      localStorage.setItem(this.storageKey, JSON.stringify(saves));
      return true;
    } catch (e) {
      console.error('Failed to delete save:', e);
      return false;
    }
  }

  exportSave(slotId) {
    const save = this.getSave(slotId);
    if (!save) return null;
    return JSON.stringify(save, null, 2);
  }

  importSave(jsonString, slotId) {
    try {
      const saveData = JSON.parse(jsonString);
      if (!saveData.version || !saveData.worldName) {
        throw new Error('Invalid save file format');
      }
      return this.saveGame(slotId, saveData);
    } catch (e) {
      console.error('Failed to import save:', e);
      alert('Invalid save file!');
      return false;
    }
  }

  getStorageUsage() {
    try {
      const data = localStorage.getItem(this.storageKey) || '';
      return (data.length * 2) / 1024 / 1024; // Approximate MB
    } catch (e) {
      return 0;
    }
  }
}
