document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".card-info-social-icons").forEach((container) => {
    container.querySelectorAll(".social-icon").forEach((icon) => {
      icon.addEventListener("mouseenter", () => {
        container.classList.add("has-active");
        icon.classList.add("is-active");
      });
      icon.addEventListener("mouseleave", () => {
        container.classList.remove("has-active");
        icon.classList.remove("is-active");
      });
    });
  });
});
