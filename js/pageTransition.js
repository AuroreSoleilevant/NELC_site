(() => {
  const FADE_CLASS = "loaded";
  const FADE_DURATION = 500; // 与 CSS 中的 transition 时间一致

  function getMain() {
    return (
      document.querySelector("main") || document.querySelector("#content-inner")
    );
  }

  // 页面加载时淡入
  window.addEventListener("pageshow", () => {
    const main = getMain();
    if (main) main.classList.add(FADE_CLASS);
  });

  // 点击拦截
  document.addEventListener(
    "click",
    (e) => {
      const a = e.target.closest("a");
      if (!a || !a.href || a.target === "_blank") return;

      const url = new URL(a.href);
      if (url.origin !== location.origin) return; // 仅限站内

      e.preventDefault();

      const main = getMain();
      if (main) {
        main.style.transition = `opacity ${FADE_DURATION}ms`;
        main.style.opacity = 0;

        // 等待动画结束后跳转
        setTimeout(() => {
          window.location.href = a.href;
        }, FADE_DURATION);
      } else {
        window.location.href = a.href;
      }
    },
    true,
  );
})();
