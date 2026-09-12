(() => {
  const openVideoButton = document.querySelector("[data-video-open]");
  const videoDialog = document.querySelector("[data-video-dialog]");
  const closeVideoButton = document.querySelector("[data-video-close]");
  const demoVideo = document.querySelector("[data-video-player]");

  if (
    !(openVideoButton instanceof HTMLButtonElement)
    || !(videoDialog instanceof HTMLDialogElement)
    || !(closeVideoButton instanceof HTMLButtonElement)
    || !(demoVideo instanceof HTMLVideoElement)
  ) {
    return;
  }

  const stopVideo = () => {
    demoVideo.pause();
    demoVideo.currentTime = 0;
  };

  const closeVideo = async () => {
    stopVideo();
    if (document.fullscreenElement) {
      await document.exitFullscreen().catch(() => undefined);
    }
    if (videoDialog.open) videoDialog.close();
    openVideoButton.focus();
  };

  openVideoButton.addEventListener("click", () => {
    videoDialog.showModal();
    void demoVideo.play().catch(() => undefined);

    if (videoDialog.requestFullscreen) {
      void videoDialog.requestFullscreen().catch(() => undefined);
      return;
    }

    demoVideo.webkitEnterFullscreen?.();
  });

  closeVideoButton.addEventListener("click", () => {
    void closeVideo();
  });

  videoDialog.addEventListener("close", stopVideo);
})();
