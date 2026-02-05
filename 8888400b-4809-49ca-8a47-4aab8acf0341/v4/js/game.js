document.addEventListener("mouseup", () => {
  // Note drag cleanup
  dragState.active = false;
  dragState.action = null;
  dragState.noteId = null;
  document.body.classList.remove("is-dragging");

  // Section drag cleanup
  if (sectionDragState.active) {
    if (sectionDragState.tabEl) {
      sectionDragState.tabEl.classList.remove("section-tab--dragging");
    }
    
    if (!sectionDragState.hasMoved) {
      switchToSection(sectionDragState.sectionId);
    } else {
      updateSectionOrder();
      scheduleSave();
    }
    
    sectionDragState.active = false;
    sectionDragState.sectionId = null;
    sectionDragState.tabEl = null;
    sectionDragState.hasMoved = false;
  }
});
