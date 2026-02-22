chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action !== "convertSelection") return;

  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    showToast("No selection found.");
    return;
  }

  const latexParts = extractLatexFromSelection(selection);
  if (latexParts.length === 0) {
    showToast("No MathML found in selection.");
    return;
  }

  const latex = latexParts.join(" ");
  navigator.clipboard.writeText(latex).then(
    () => showToast("LaTeX copied!"),
    () => showToast("Failed to copy to clipboard.")
  );
});

/**
 * Walk the selection and collect every <math> element that intersects it.
 * For each one, try the fast path (embedded annotation) first, then fall
 * back to the structural converter.
 */
function extractLatexFromSelection(selection) {
  const results = [];

  for (let i = 0; i < selection.rangeCount; i++) {
    const range = selection.getRangeAt(i);
    const container = range.commonAncestorContainer;

    // The container could be a text node — walk from its parent.
    const root =
      container.nodeType === Node.ELEMENT_NODE
        ? container
        : container.parentElement;
    if (!root) continue;

    // Collect <math> elements inside the selection range.
    const mathEls = root.querySelectorAll
      ? root.querySelectorAll("math")
      : [];

    // If root itself is a <math> or inside one, include it.
    const closestMath = root.closest ? root.closest("math") : null;
    const allMath = closestMath ? [closestMath] : [...mathEls];

    for (const mathEl of allMath) {
      if (!selection.containsNode(mathEl, true)) continue;

      // Fast path: look for a TeX annotation inside <semantics>.
      const annotation = mathEl.querySelector(
        'annotation[encoding="application/x-tex"], annotation[encoding="text/x-latex"]'
      );
      if (annotation && annotation.textContent.trim()) {
        results.push(annotation.textContent.trim());
        continue;
      }

      // Slow path: convert MathML DOM → LaTeX.
      results.push(mathmlToLatex(mathEl));
    }
  }

  return results;
}

/**
 * Minimal toast notification so the user knows what happened.
 */
function showToast(message) {
  const existing = document.getElementById("mathml-latex-toast");
  if (existing) existing.remove();

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
