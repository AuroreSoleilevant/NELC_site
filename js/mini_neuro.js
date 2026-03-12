(function () {
  // 等待 DOM 准备
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", main);
  } else {
    main();
  }

  function main() {
    // ========== 资源/帧定义 ==========
    const S = [
      "/NELC_site/image/mini_neuro/S_look_ahead.svg",
      "/NELC_site/image/mini_neuro/S_look_you.svg",
    ]; // 静止
    const C = [
      "/NELC_site/image/mini_neuro/C1.svg",
      "/NELC_site/image/mini_neuro/C2.svg",
    ]; // 眨眼两帧（C1 -> C2）
    const W = [
      "/NELC_site/image/mini_neuro/W1.svg",
      "/NELC_site/image/mini_neuro/W2.svg",
      "/NELC_site/image/mini_neuro/W3.svg",
      "/NELC_site/image/mini_neuro/W4.svg",
    ]; // 行走四帧，必须从 W1 开始并在 W1 时切换回 S

    // ========== 创建或获取 DOM ==========
    // 如果都已经有了
    let puppet = document.getElementById("puppet");
    let sprite = document.getElementById("sprite");
    let bubble = document.getElementById("bubble");
    let loadUI = document.getElementById("load-ui");
    let fileInput = null;
    let btnLoad = null;

    // 如果没有
    if (!puppet) {
      puppet = document.createElement("div");
      puppet.id = "puppet";
      puppet.setAttribute("aria-label", "puppet");
      // 插入到 body 末尾
      document.body.appendChild(puppet);
    }
    if (!sprite) {
      sprite = document.createElement("img");
      sprite.id = "sprite";
      sprite.alt = "puppet";
      sprite.draggable = false;
      // 默认 src 会由 init() 设置
      puppet.appendChild(sprite);
    }
    if (!bubble) {
      bubble = document.createElement("div");
      bubble.id = "bubble";
      bubble.setAttribute("role", "tooltip");
      bubble.setAttribute("aria-hidden", "true");
      document.body.appendChild(bubble);
    }
    if (!loadUI) {
      loadUI = document.createElement("div");
      loadUI.id = "load-ui";
      loadUI.innerHTML = `
        mini_neuro_sentence.json 加载失败或被浏览器阻止。
        <input id="fileinput" type="file" accept="application/json" style="display:none" />
        <button id="btnLoad">从本地选择 JSON</button>
      `;
      document.body.appendChild(loadUI);
    }

    // 安全获取 fileInput / btnLoad
    fileInput = document.getElementById("fileinput");
    btnLoad = document.getElementById("btnLoad");

    // ========== 状态 ==========
    let state = "standing"; // 'standing' | 'blinking' | 'walking'
    let currentS = 0; // index into S
    let walkIndex = 0; // 0..3 -> W[walkIndex]
    // 素材本身朝左，facing='left' 表示不翻转；facing='right' 时添加 .facing-right 翻转
    let facing = "right";

    // 位置与速度
    let x = 8;
    let speed = 1.6; // px per tick (可以调整)

    // 行走定时器
    let walkTimer = null;
    let stopRequested = false;

    // 闲置控制
    let idleTimeout = null;

    // 文本数据（来自 mini_neuro_sentence.json）
    let phrases = null;
    let forcedNextId = null;
    let lastShownId = null;

    // ========== 辅助：viewport / bounds ==========
    function getBounds() {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const rect = puppet.getBoundingClientRect();
      return { vw, vh, rect };
    }

    const footer = document.querySelector("footer");

    // ========== footer 处理 ==========
    // 如果页面含有 footer，小人将站在 footer 顶部（bottom = footerHeight）
    // 虽然看起来有点延迟，如果有人有精力就帮我修一下吧
    function updateBottomByFooter() {
      if (!footer) {
        puppet.style.bottom = "0px";
        return;
      }

      const rect = footer.getBoundingClientRect();
      const vh = window.innerHeight;

      if (rect.top < vh) {
        const overlap = vh - rect.top;
        puppet.style.bottom = overlap + "px";
      } else {
        puppet.style.bottom = "0px";
      }
    }

    // ========== 初始化 ==========
    function init() {
      // 初始站立姿态
      currentS = Math.random() < 0.5 ? 0 : 1;
      sprite.src = S[currentS];

      // 交互
      puppet.addEventListener("mouseenter", onHover);
      puppet.addEventListener("mouseleave", onLeave);

      // 启动闲置循环
      scheduleIdleAction();

      // 启动渲染循环
      startRenderLoop();

      // 立即计算一次 footer 位置
      updateBottomByFooter();

      // 尝试加载 JSON（主文件名，希望后面别忘了改：mini_neuro_sentence.json）
      fetchPhrases().catch((err) => {
        // 如果 fetch 失败（例如 file:// 导致 CORS），显示本地加载回退
        loadUI.style.display = "block";
      });

      // 本地文件选择回退
      if (btnLoad) {
        btnLoad.addEventListener("click", () => fileInput && fileInput.click());
      }
      if (fileInput) {
        fileInput.addEventListener("change", (e) => {
          const f = e.target.files && e.target.files[0];
          if (!f) return;
          const reader = new FileReader();
          reader.onload = () => {
            try {
              const data = JSON.parse(reader.result);
              phrases = Array.isArray(data) ? data : data.items || [];
              loadUI.style.display = "none";
            } catch (err) {
              // 忽略解析错误（用户应该会看到无文本）
              loadUI.style.display = "block";
            }
          };
          reader.readAsText(f, "utf-8");
        });
      }
    }

    // ========== 渲染循环 ==========
    let rafId = null;
    function startRenderLoop() {
      let lastTime = performance.now();
      function loop(now) {
        const dt = now - lastTime;
        lastTime = now;

        // 每帧更新 footer 碰撞
        updateBottomByFooter();

        if (state === "walking") {
          x += (facing === "right" ? 1 : -1) * speed * (dt / 16);
        }

        clampX();
        puppet.style.left = Math.round(x) + "px";

        if (bubble.classList.contains("show")) {
          positionBubbleNearPuppet();
        }

        rafId = requestAnimationFrame(loop);
      }

      rafId = requestAnimationFrame(loop);
    }
    function clampX() {
      const { vw, rect } = getBounds();
      const w = rect.width || puppet.offsetWidth;
      const maxX = Math.max(0, vw - w - 8);
      if (x < 0) x = 0;
      if (x > maxX) x = maxX;
    }

    // ========== 闲置行为（随机眨眼、换站立、短走） ==========
    function scheduleIdleAction() {
      if (idleTimeout) clearTimeout(idleTimeout);
      // 可以调整：闲置动作间隔分布（目前 3s .. 10s）
      const delay = 3000 + Math.random() * 7000; // <-- 闲置间隔分布
      idleTimeout = setTimeout(() => {
        performIdleAction();
        scheduleIdleAction();
      }, delay);
    }

    function performIdleAction() {
      if (state !== "standing") return;
      const r = Math.random();

      // 动作的概率分配
      // 1) 眨眼概率（当前占比 0.45）
      // 2) 切换站立姿态概率（当前占比 0.20）
      // 3) 开始短暂走路概率（剩余 ~0.35）
      if (r < 0.45) {
        // 眨眼
        triggerBlink();
      } else if (r < 0.65) {
        // 切换站立姿态
        currentS = 1 - currentS;
        sprite.src = S[currentS];
      } else {
        // 开始一次短暂的走路
        startWalkingShort();
      }
    }

    // 眨眼实现（S -> C1 -> C2 -> S）
    function triggerBlink() {
      if (state !== "standing") return;
      state = "blinking";
      sprite.src = C[0];
      // 以下两个时间是眨眼帧持续时长，可以改
      setTimeout(() => {
        sprite.src = C[1];
        setTimeout(() => {
          state = "standing";
          sprite.src = S[currentS];
        }, 140); // <-- C2 持续时长（ms）
      }, 120); // <-- C1 持续时长（ms）
    }

    // ========== 行走 ==========
    function startWalkingShort() {
      if (state !== "standing") return;

      const { vw, rect } = getBounds();
      const w = rect.width || puppet.offsetWidth;
      const maxX = Math.max(0, vw - w - 8);

      // 朝向决策：尽量不走出屏幕（基于当前位置）
      if (x > maxX * 0.7) facing = "left";
      else if (x < maxX * 0.15) facing = "right";
      else facing = Math.random() < 0.5 ? "left" : "right";

      // 从 W1 开始（强制）
      walkIndex = 0;
      sprite.src = W[walkIndex];
      state = "walking";
      stopRequested = false;
      puppet.classList.toggle("facing-right", facing === "right");

      // 帧切换间隔
      const frameInterval = 180; // ms per walk frame <-- 改变步伐速度/帧率
      if (walkTimer) clearInterval(walkTimer);
      walkTimer = setInterval(() => {
        walkIndex = (walkIndex + 1) % W.length;
        sprite.src = W[walkIndex];
        // 停止请求的随机触发（仅在未来 W1 时生效）
        // 这里可以改在循环中止步的概率
        if (Math.random() < 0.08) stopRequested = true;
      }, frameInterval);

      // 本次走动持续时间（在此时间后会请求停止，实际停止需等到 W1）
      // 这里可以改本次走动时长范围（ms）
      const walkDuration = 600 + Math.random() * 1400; // 0.6s .. 2.0s
      setTimeout(() => {
        stopRequested = true;
      }, walkDuration);

      // 监督停止条件：只有在 W1（walkIndex == 0）时才能真正停止并切回 S
      const stopWatcher = setInterval(() => {
        if (stopRequested && walkIndex === 0) {
          clearInterval(walkTimer);
          walkTimer = null;
          clearInterval(stopWatcher);
          state = "standing";
          currentS = Math.random() < 0.5 ? 0 : 1;
          sprite.src = S[currentS];
          // 保持朝向类（别删），这样下一次走动朝向延续
          puppet.classList.toggle("facing-right", facing === "right");
        }
      }, 80);
    }

    // ========== 文本加载与选择 ==========
    async function fetchPhrases() {
      if (phrases) return phrases;
      try {
        // json位置
        const res = await fetch("/NELC_site/json/mini_neuro_sentence.json", {
          cache: "no-store",
        });
        if (!res.ok) throw new Error("HTTP " + res.status);
        const data = await res.json();
        phrases = Array.isArray(data) ? data : data.items || [];
      } catch (e) {
        phrases = null;
        throw e;
      }
      return phrases;
    }

    // 时间限制检查（timeRange.from / timeRange.to）; 支持跨午夜
    function timeInRange(range) {
      if (!range || !range.from || !range.to) return true;
      const now = new Date();
      const parseHM = (str) => {
        const [hh, mm] = (str || "0:0")
          .split(":")
          .map((x) => parseInt(x, 10) || 0);
        return hh * 60 + mm;
      };
      const tnow = now.getHours() * 60 + now.getMinutes();
      const from = parseHM(range.from);
      const to = parseHM(range.to);
      if (from <= to) return tnow >= from && tnow <= to;
      // 跨午夜
      return tnow >= from || tnow <= to;
    }

    // 页面限制匹配
    function pagesMatch(pages) {
      if (!pages || !pages.length) return true;
      const path = location.pathname || "/";
      return pages.indexOf(path) !== -1;
    }

    // 加权随机选择
    function chooseWeighted(list) {
      const total = list.reduce((s, i) => s + (i.weight || 1), 0);
      let r = Math.random() * total;
      for (const item of list) {
        r -= item.weight || 1;
        if (r <= 0) return item;
      }
      return list[list.length - 1];
    }

    // 悬浮触发（鼠标进入）
    async function onHover(ev) {
      try {
        await fetchPhrases();
      } catch (e) {
        showBubble("...");
        return;
      }

      let candidate = null;

      // 如果 forcedNextId 存在，优先播放对应 id
      if (forcedNextId) {
        candidate = phrases.find((p) => p.id === forcedNextId);
        forcedNextId = null;
      }

      if (!candidate) {
        // 过滤候选：排除 onlyChain（除非强制），并应用 timeRange / pages
        const available = (phrases || []).filter((p) => {
          if (p.onlyChain) return false;
          if (!timeInRange(p.timeRange)) return false;
          if (!pagesMatch(p.pages)) return false;
          return true;
        });
        if (available.length === 0) {
          // 退化：若没有满足条件的则尝试使用非 onlyChain 的全部条目或回退至完整数据
          const fallback = (phrases || []).filter((p) => !p.onlyChain);
          candidate = fallback.length
            ? chooseWeighted(fallback)
            : phrases && phrases[0]
              ? phrases[0]
              : null;
        } else {
          candidate = chooseWeighted(available);
        }
      }

      if (!candidate) {
        showBubble("...");
        return;
      }
      if (candidate.nextId) forcedNextId = candidate.nextId;
      lastShownId = candidate.id || null;
      showBubble(candidate.text || "");
    }
    function onLeave(ev) {
      hideBubble();
    }

    // ========== 气泡显示/隐藏及位置 ==========
    function showBubble(text) {
      bubble.textContent = text || "";

      bubble.classList.add("show");
      bubble.setAttribute("aria-hidden", "false");

      requestAnimationFrame(() => {
        positionBubbleNearPuppet();
      });
    }
    function hideBubble() {
      bubble.classList.remove("show");
      bubble.setAttribute("aria-hidden", "true");
    }

    // 将气泡放在小人头顶（或在顶部不足时放到下方，当然我觉得下面大概也没空），并在小人移动时被 repeatedly 调用以实现跟随
    function positionBubbleNearPuppet() {
      const pr = puppet.getBoundingClientRect();

      requestAnimationFrame(() => {
        const bw = bubble.offsetWidth;
        const bh = bubble.offsetHeight;

        let left = pr.left + pr.width / 2 - bw / 2;
        left = Math.min(window.innerWidth - bw - 8, Math.max(8, left));

        let top = pr.top - bh - 12;

        if (top < 8) {
          top = pr.bottom + 8;
        }

        bubble.style.left = left + "px";
        bubble.style.top = top + "px";
      });
    }

    // ========== 事件绑定 ==========
    // puppet 的mouseenter/leave 在 init() 中已绑定，应该不用再绑了

    // ========== 启动 ==========
    init();

    // ========== 对外调试接口 ==========
    // 万一用得上呢，可以删掉
    window.__puppet = {
      startWalking: startWalkingShort,
      triggerBlink: triggerBlink,
      getState: () => state,
      setFacing: (dir) => {
        facing = dir;
        puppet.classList.toggle("facing-right", dir === "right");
      },
    };
  }
})();
