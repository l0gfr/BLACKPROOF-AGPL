(() => {
  const groups = Array.from(document.querySelectorAll("[data-nav-group]"));

  for (const group of groups) {
    group.addEventListener("toggle", () => {
      if (!group.open) return;

      for (const other of groups) {
        if (other !== group) {
          other.removeAttribute("open");
        }
      }
    });
  }

  document.addEventListener("click", (event) => {
    const target = event.target;

    if (!(target instanceof Element)) return;

    if (!target.closest("[data-nav-group]")) {
      for (const group of groups) {
        group.removeAttribute("open");
      }
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;

    for (const group of groups) {
      group.removeAttribute("open");
    }
  });
})();
