document.addEventListener("DOMContentLoaded", function () {
  /* ---------- 页面淡入 ---------- */

  document.body.classList.add("page-loaded");

  /* ---------- 页面淡出 ---------- */

  const links = document.querySelectorAll("a");

  links.forEach((link) => {
    const href = link.getAttribute("href");

    if (!href) return;

    // 排除可能的奇怪情况
    if (
      href.startsWith("#") || // 页面锚点
      href.startsWith("javascript") ||
      href.startsWith("mailto:") ||
      href.startsWith("tel:") ||
      link.target === "_blank" || // 新标签
      href.includes("giscus") || // 评论系统
      (href.startsWith("http") && !href.includes(location.hostname)) // 外链
    )
      return;

    link.addEventListener("click", function (e) {
      e.preventDefault();

      document.body.classList.remove("page-loaded");
      document.body.classList.add("page-fade-out");

      setTimeout(function () {
        window.location.href = href;
      }, 350);
    });
  });
});
