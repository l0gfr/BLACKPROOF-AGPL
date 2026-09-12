const COPY_FEEDBACK_DELAY = 2400;

async function copyShareUrl(button, shareUrl) {
  try {
    if (!navigator.clipboard?.writeText) throw new Error("Clipboard API unavailable");
    await navigator.clipboard.writeText(shareUrl);
    return;
  } catch {
    const fallback = button.closest("[data-share-panel]")?.querySelector("[data-share-copy-fallback]");
    if (!(fallback instanceof HTMLTextAreaElement)) throw new Error("Clipboard fallback unavailable");

    fallback.value = shareUrl;
    fallback.select();
    fallback.setSelectionRange(0, fallback.value.length);

    const copied = document.execCommand("copy");
    fallback.value = "";
    button.focus({ preventScroll: true });

    if (!copied) throw new Error("Clipboard fallback failed");
  }
}

for (const button of document.querySelectorAll("[data-share-copy]")) {
  let resetTimer;
  const label = button.querySelector("[data-share-copy-label]");
  const status = button.querySelector("[data-share-copy-status]");
  const defaultLabel = label?.textContent ?? "Copier le lien";

  button.addEventListener("click", async () => {
    const shareUrl = button.getAttribute("data-share-url");
    let message;
    let state;

    try {
      if (!shareUrl) throw new Error("Share URL unavailable");
      await copyShareUrl(button, shareUrl);
      message = "Lien copié";
      state = "copied";
    } catch {
      message = "Copie impossible";
      state = "error";
    }

    button.setAttribute("data-copy-state", state);
    if (label) label.textContent = message;
    if (status) status.textContent = message;

    window.clearTimeout(resetTimer);
    resetTimer = window.setTimeout(() => {
      button.removeAttribute("data-copy-state");
      if (label) label.textContent = defaultLabel;
      if (status) status.textContent = "";
    }, COPY_FEEDBACK_DELAY);
  });
}
