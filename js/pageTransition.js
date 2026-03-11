(() => {
  const FADE_DURATION = 500;

  // 页面加载淡入
  window.addEventListener("pageshow", () => {
    document.documentElement.classList.add("loaded");
  });

  document.addEventListener(
    "click",
    (e) => {
      const a = e.target.closest("a");
      if (!a || !a.href || a.target === "_blank") return;
      if (a.getAttribute("href").startsWith("#") || a.hasAttribute("download"))
        return;

      const url = new URL(a.href);
      if (url.origin !== location.origin) return;

      e.preventDefault();

      document.body.style.transition = `opacity ${FADE_DURATION}ms`;
      document.body.style.opacity = 0;

      window.location.href = a.href;
    },
    true,
  );
})();
