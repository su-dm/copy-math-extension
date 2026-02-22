chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action !== "convertSelection") return;

  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    showToast("No selection found.");
    return;
  }

  const latexParts = extractLatexFromSelection(selection);
  if (latexParts.length === 0) {
    showToast("No math found in selection.");
    return;
  }

  const latex = latexParts.join(" ");
  navigator.clipboard.writeText(latex).then(
    () => showToast("LaTeX copied!"),
    () => showToast("Failed to copy to clipboard.")
  );
});

/**
 * Walk the selection and extract LaTeX from every math element that
 * intersects it.  Supports KaTeX, MathJax v3, MathJax v2, and raw MathML.
 */
function extractLatexFromSelection(selection) {
  const results = [];
  const seen = new Set(); // track processed DOM nodes to avoid duplicates

  for (let i = 0; i < selection.rangeCount; i++) {
    const range = selection.getRangeAt(i);
    const container = range.commonAncestorContainer;

    // The container could be a text node — walk from its parent.
    const root =
      container.nodeType === Node.ELEMENT_NODE
        ? container
        : container.parentElement;
    if (!root) continue;

    const candidates = collectMathCandidates(root, selection);

    for (const el of candidates) {
      if (seen.has(el)) continue;
      seen.add(el);

      const latex = extractLatex(el, seen);
      if (latex) results.push(latex);
    }
  }

  return results;
}

const MATH_SELECTORS =
  "[data-math], math, .katex, mjx-container, .MathJax, .MathJax_Display";

/**
 * Gather all math-related elements that intersect the selection,
 * looking both inside `root` and up through its ancestors.
 * Traverses into shadow DOMs so we can find elements in Google Gemini, etc.
 */
function collectMathCandidates(root, selection) {
  const candidates = [];

  // Look upward: root or an ancestor may itself be a math container.
  // Also cross shadow boundaries upward (shadow root → host → host's tree).
  let node = root;
  while (node) {
    if (node.closest) {
      const ancestor = node.closest(MATH_SELECTORS);
      if (ancestor) {
        candidates.push(ancestor);
        break;
      }
    }
    // Cross shadow boundary: if we're inside a shadow root, jump to the host.
    const parentRoot = node.getRootNode ? node.getRootNode() : document;
    if (parentRoot instanceof ShadowRoot) {
      node = parentRoot.host;
    } else {
      break;
    }
  }

  // Look downward: children of root, piercing shadow DOMs.
  deepQueryAll(root, candidates, selection);

  return candidates;
}

/**
 * Recursively collect matching elements, entering open shadow roots.
 */
function deepQueryAll(el, out, selection) {
  if (!el) return;

  // Direct matches in this tree scope.
  if (el.querySelectorAll) {
    for (const match of el.querySelectorAll(MATH_SELECTORS)) {
      if (selection.containsNode(match, true)) out.push(match);
    }
  }

  // Enter shadow roots of children (querySelectorAll doesn't pierce them).
  const walk = el.querySelectorAll ? el.querySelectorAll("*") : [];
  for (const child of walk) {
    if (child.shadowRoot) {
      deepQueryAll(child.shadowRoot, out, selection);
    }
  }
}

/**
 * Given a single candidate element, return its LaTeX string or null.
 * Marks any inner elements it consumes into `seen` to prevent duplicates.
 */
function extractLatex(el, seen) {
  // --- data-math attribute (Gemini and similar) ---
  if (el.hasAttribute && el.hasAttribute("data-math")) {
    const tex = el.getAttribute("data-math").trim();
    if (tex) {
      // Mark any inner .katex / <math> as seen to avoid duplicates.
      for (const inner of el.querySelectorAll(".katex, math")) seen.add(inner);
      return tex;
    }
  }

  // --- KaTeX ---
  if (el.classList && el.classList.contains("katex")) {
    const ann = el.querySelector(
      '.katex-mathml annotation[encoding="application/x-tex"]'
    );
    const tex = ann?.textContent.trim();
    if (tex) {
      // Mark inner <math> as seen so the raw-MathML path skips it.
      const inner = el.querySelector("math");
      if (inner) seen.add(inner);
      return tex;
    }
  }

  // --- MathJax v3 ---
  if (el.tagName && el.tagName.toLowerCase() === "mjx-container") {
    // First try: annotation inside assistive MathML.
    const ann = el.querySelector(
      'mjx-assistive-mml annotation[encoding="application/x-tex"]'
    );
    const tex = ann?.textContent.trim();
    if (tex) {
      const inner = el.querySelector("math");
      if (inner) seen.add(inner);
      return tex;
    }
    // Fallback: convert the assistive <math> via structural converter.
    const mathEl = el.querySelector("mjx-assistive-mml math");
    if (mathEl) {
      seen.add(mathEl);
      return mathmlToLatex(mathEl);
    }
  }

  // --- MathJax v2 ---
  if (
    el.classList &&
    (el.classList.contains("MathJax") ||
      el.classList.contains("MathJax_Display"))
  ) {
    // The original LaTeX is in a sibling <script type="math/tex">.
    let sibling = el.nextElementSibling;
    while (sibling) {
      if (
        sibling.tagName === "SCRIPT" &&
        sibling.type &&
        sibling.type.replace(/\s/g, "").startsWith("math/tex")
      ) {
        return sibling.textContent.trim() || null;
      }
      sibling = sibling.nextElementSibling;
    }
  }

  // --- Raw MathML ---
  if (el.tagName && el.tagName.toLowerCase() === "math") {
    // Fast path: TeX annotation.
    const tex = el.querySelector(
      'annotation[encoding="application/x-tex"], annotation[encoding="text/x-latex"]'
    )?.textContent.trim();
    if (tex) return tex;
    // Slow path: structural converter.
    return mathmlToLatex(el);
  }

  return null;
}

/**
 * Minimal toast notification so the user knows what happened.
 */
function showToast(message) {
  document.getElementById("mathml-latex-toast")?.remove();

  const toast = document.createElement("div");
  toast.id = "mathml-latex-toast";
  Object.assign(toast.style, {
    position: "fixed",
    bottom: "24px",
    right: "24px",
    background: "#323232",
    color: "#fff",
    padding: "10px 20px",
    borderRadius: "6px",
    fontSize: "14px",
    zIndex: 2147483647,
    fontFamily: "system-ui, sans-serif",
    boxShadow: "0 2px 8px rgba(0,0,0,.3)",
    transition: "opacity .3s",
  });
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}
