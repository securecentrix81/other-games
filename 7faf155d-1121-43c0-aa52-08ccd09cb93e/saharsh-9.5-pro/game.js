/**
 * Change game state
 */
changeState(newState) {
    const oldState = this.state;
    this.state = newState;
    
    switch (newState) {
        case GameState.MENU:
            this.ui.showScreen('screen-menu');
            this.stopGameLoop();
            break;
            
        case GameState.SONG_SELECT:
            this.ui.showScreen('screen-song-select');
            this.songSelect.refresh();
            break;
            
        case GameState.MOD_SELECT:
            this.ui.showScreen('screen-mod-select');
            this.ui.updateModButtons(this.mods.activeMods);
            break;
            
        case GameState.COUNTDOWN:
            this.ui.showScreen('gameplay');
            break;
            
        case GameState.PLAYING:
            this.ui.showScreen('gameplay');
            this.ui.hidePause();
            break;
            
        case GameState.PAUSED:
            this.ui.showPause();
            break;
            
        case GameState.RESULTS:
            this.showResults();
            break;
            
        case GameState.FAILED:
            this.showFailed();
            break;
    }
}
