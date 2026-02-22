/**
 * Convert a <math> DOM element to a LaTeX string.
 *
 * Handles the most common MathML presentation elements produced by
 * AI chat interfaces (ChatGPT, Claude, Gemini, etc.).
 */
function mathmlToLatex(node) {
  return convertNode(node).trim();
}

/* ------------------------------------------------------------------ */
/*  Node dispatcher                                                    */
/* ------------------------------------------------------------------ */

function convertNode(node) {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent;
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return "";

  const tag = node.tagName.toLowerCase().replace(/^[a-z]+:/, ""); // strip ns prefix

  switch (tag) {
    case "math":
      return convertChildren(node);
    case "semantics":
      return convertSemantics(node);
    case "mrow":
    case "mstyle":
    case "mpadded":
    case "merror":
      return convertChildren(node);
    case "mi":
      return convertMi(node);
    case "mn":
      return node.textContent;
    case "mo":
      return convertMo(node);
    case "mtext":
      return `\\text{${node.textContent}}`;
    case "mspace":
      return convertMspace(node);
    case "mfrac":
      return convertMfrac(node);
    case "msqrt":
      return `\\sqrt{${convertChildren(node)}}`;
    case "mroot":
      return convertMroot(node);
    case "msup":
      return convertMsup(node);
    case "msub":
      return convertMsub(node);
    case "msubsup":
      return convertMsubsup(node);
    case "munder":
      return convertMunder(node);
    case "mover":
      return convertMover(node);
    case "munderover":
      return convertMunderover(node);
    case "mtable":
      return convertMtable(node);
    case "mtr":
    case "mlabeledtr":
      return convertMtr(node);
    case "mtd":
      return convertChildren(node);
    case "mfenced":
      return convertMfenced(node);
    case "menclose":
      return convertMenclose(node);
    case "mphantom":
      return `\\phantom{${convertChildren(node)}}`;
    case "mmultiscripts":
      return convertMmultiscripts(node);
    case "mglyph":
      return node.getAttribute("alt") || "";
    case "annotation":
    case "annotation-xml":
      return ""; // skip
    default:
      return convertChildren(node);
  }
}

function convertChildren(node) {
  return Array.from(node.childNodes).map(convertNode).join("");
}

function childElements(node) {
  return Array.from(node.children);
}

/* ------------------------------------------------------------------ */
/*  <semantics>                                                        */
/* ------------------------------------------------------------------ */

function convertSemantics(node) {
  // Prefer an embedded TeX annotation.
  const ann = node.querySelector(
    'annotation[encoding="application/x-tex"], annotation[encoding="text/x-latex"]'
  );
  if (ann && ann.textContent.trim()) return ann.textContent.trim();
  // Otherwise convert the first child (the presentation tree).
  const first = node.firstElementChild;
  return first ? convertNode(first) : convertChildren(node);
}

/* ------------------------------------------------------------------ */
/*  <mi> — identifiers                                                 */
/* ------------------------------------------------------------------ */

const MI_MAP = {
  "\u03B1": "\\alpha",
  "\u03B2": "\\beta",
  "\u03B3": "\\gamma",
  "\u03B4": "\\delta",
  "\u03B5": "\\epsilon",
  "\u03B6": "\\zeta",
  "\u03B7": "\\eta",
  "\u03B8": "\\theta",
  "\u03B9": "\\iota",
  "\u03BA": "\\kappa",
  "\u03BB": "\\lambda",
  "\u03BC": "\\mu",
  "\u03BD": "\\nu",
  "\u03BE": "\\xi",
  "\u03BF": "o",
  "\u03C0": "\\pi",
  "\u03C1": "\\rho",
  "\u03C2": "\\varsigma",
  "\u03C3": "\\sigma",
  "\u03C4": "\\tau",
  "\u03C5": "\\upsilon",
  "\u03C6": "\\phi",
  "\u03C7": "\\chi",
  "\u03C8": "\\psi",
  "\u03C9": "\\omega",
  "\u0391": "A",
  "\u0392": "B",
  "\u0393": "\\Gamma",
  "\u0394": "\\Delta",
  "\u0395": "E",
  "\u0396": "Z",
  "\u0397": "H",
  "\u0398": "\\Theta",
  "\u0399": "I",
  "\u039A": "K",
  "\u039B": "\\Lambda",
  "\u039C": "M",
  "\u039D": "N",
  "\u039E": "\\Xi",
  "\u039F": "O",
  "\u03A0": "\\Pi",
  "\u03A1": "P",
  "\u03A3": "\\Sigma",
  "\u03A4": "T",
  "\u03A5": "\\Upsilon",
  "\u03A6": "\\Phi",
  "\u03A7": "X",
  "\u03A8": "\\Psi",
  "\u03A9": "\\Omega",
  "\u03D5": "\\varphi",
  "\u03F5": "\\varepsilon",
  "\u03D1": "\\vartheta",
  "\u03F0": "\\varkappa",
  "\u03D6": "\\varpi",
  "\u03F1": "\\varrho",
  "\u2102": "\\mathbb{C}",
  "\u210D": "\\mathbb{H}",
  "\u2115": "\\mathbb{N}",
  "\u2119": "\\mathbb{P}",
  "\u211A": "\\mathbb{Q}",
  "\u211D": "\\mathbb{R}",
  "\u2124": "\\mathbb{Z}",
  "\u2113": "\\ell",
  "\u210F": "\\hbar",
  "\u2207": "\\nabla",
  "\u2202": "\\partial",
  "\u221E": "\\infty",
  "\u2205": "\\emptyset",
  "\u2200": "\\forall",
  "\u2203": "\\exists",
};

function convertMi(node) {
  const text = node.textContent.trim();
  if (MI_MAP[text]) return MI_MAP[text];
  // Multi-character identifiers that aren't Greek → wrap in \mathrm.
  if (text.length > 1) return `\\mathrm{${text}}`;
  return text;
}

/* ------------------------------------------------------------------ */
/*  <mo> — operators                                                   */
/* ------------------------------------------------------------------ */

const MO_MAP = {
  "\u00B1": "\\pm",
  "\u2213": "\\mp",
  "\u00D7": "\\times",
  "\u00F7": "\\div",
  "\u22C5": "\\cdot",
  "\u2217": "\\ast",
  "\u2218": "\\circ",
  "\u2219": "\\bullet",
  "\u2020": "\\dagger",
  "\u2021": "\\ddagger",
  "\u2229": "\\cap",
  "\u222A": "\\cup",
  "\u2227": "\\wedge",
  "\u2228": "\\vee",
  "\u2295": "\\oplus",
  "\u2297": "\\otimes",
  "\u2264": "\\leq",
  "\u2265": "\\geq",
  "\u226A": "\\ll",
  "\u226B": "\\gg",
  "\u2260": "\\neq",
  "\u2248": "\\approx",
  "\u223C": "\\sim",
  "\u2243": "\\simeq",
  "\u2245": "\\cong",
  "\u221D": "\\propto",
  "\u2261": "\\equiv",
  "\u227A": "\\prec",
  "\u227B": "\\succ",
  "\u2282": "\\subset",
  "\u2283": "\\supset",
  "\u2286": "\\subseteq",
  "\u2287": "\\supseteq",
  "\u2208": "\\in",
  "\u2209": "\\notin",
  "\u220B": "\\ni",
  "\u2192": "\\to",
  "\u2190": "\\leftarrow",
  "\u2194": "\\leftrightarrow",
  "\u21D2": "\\Rightarrow",
  "\u21D0": "\\Leftarrow",
  "\u21D4": "\\Leftrightarrow",
  "\u2191": "\\uparrow",
  "\u2193": "\\downarrow",
  "\u21A6": "\\mapsto",
  "\u2223": "\\mid",
  "\u2225": "\\parallel",
  "\u22A5": "\\perp",
  "\u2220": "\\angle",
  "\u2207": "\\nabla",
  "\u2202": "\\partial",
  "\u222B": "\\int",
  "\u222C": "\\iint",
  "\u222D": "\\iiint",
  "\u222E": "\\oint",
  "\u2211": "\\sum",
  "\u220F": "\\prod",
  "\u2210": "\\coprod",
  "\u22C0": "\\bigwedge",
  "\u22C1": "\\bigvee",
  "\u22C2": "\\bigcap",
  "\u22C3": "\\bigcup",
  "\u2026": "\\ldots",
  "\u22EF": "\\cdots",
  "\u22EE": "\\vdots",
  "\u22F1": "\\ddots",
  "\u221E": "\\infty",
  "\u2205": "\\emptyset",
  "\u2200": "\\forall",
  "\u2203": "\\exists",
  "\u00AC": "\\neg",
  "\u22A2": "\\vdash",
  "\u22A8": "\\models",
  "\u22A4": "\\top",
  "\u22A5": "\\bot",
  "\u2032": "'",
  "\u2033": "''",
  "{": "\\{",
  "}": "\\}",
  "|": "\\vert",
  "\u2016": "\\Vert",
  "\u230A": "\\lfloor",
  "\u230B": "\\rfloor",
  "\u2308": "\\lceil",
  "\u2309": "\\rceil",
  "\u27E8": "\\langle",
  "\u27E9": "\\rangle",
  "\u2329": "\\langle",
  "\u232A": "\\rangle",
};

function convertMo(node) {
  const text = node.textContent.trim();
  if (MO_MAP[text]) return MO_MAP[text];

  // Large operator stretchy chars that map directly.
  if (text === "\u2061") return ""; // function application (invisible)
  if (text === "\u2062") return ""; // invisible times
  if (text === "\u2063") return ""; // invisible separator
  if (text === "\u2064") return ""; // invisible plus

  return text;
}

/* ------------------------------------------------------------------ */
/*  <mspace>                                                           */
/* ------------------------------------------------------------------ */

function convertMspace(node) {
  const w = node.getAttribute("width") || "";
  if (w.includes("thick") || parseFloat(w) >= 0.28) return "\\;";
  if (w.includes("medium") || parseFloat(w) >= 0.22) return "\\:";
  if (w.includes("thin") || parseFloat(w) >= 0.17) return "\\,";
  if (w === "1em") return "\\quad";
  if (w === "2em") return "\\qquad";
  return "\\,";
}

/* ------------------------------------------------------------------ */
/*  Fractions, roots, scripts                                          */
/* ------------------------------------------------------------------ */

function convertMfrac(node) {
  const kids = childElements(node);
  const num = kids[0] ? convertNode(kids[0]) : "";
  const den = kids[1] ? convertNode(kids[1]) : "";
  const lineThick = node.getAttribute("linethickness");
  if (lineThick === "0" || lineThick === "0px") {
    return `{${num} \\choose ${den}}`;
  }
  return `\\frac{${num}}{${den}}`;
}

function convertMroot(node) {
  const kids = childElements(node);
  const base = kids[0] ? convertNode(kids[0]) : "";
  const index = kids[1] ? convertNode(kids[1]) : "";
  return `\\sqrt[${index}]{${base}}`;
}

function convertMsup(node) {
  const kids = childElements(node);
  const base = kids[0] ? convertNode(kids[0]) : "";
  const sup = kids[1] ? convertNode(kids[1]) : "";
  return `${base}^{${sup}}`;
}

function convertMsub(node) {
  const kids = childElements(node);
  const base = kids[0] ? convertNode(kids[0]) : "";
  const sub = kids[1] ? convertNode(kids[1]) : "";
  return `${base}_{${sub}}`;
}

function convertMsubsup(node) {
  const kids = childElements(node);
  const base = kids[0] ? convertNode(kids[0]) : "";
  const sub = kids[1] ? convertNode(kids[1]) : "";
  const sup = kids[2] ? convertNode(kids[2]) : "";
  return `${base}_{${sub}}^{${sup}}`;
}

/* ------------------------------------------------------------------ */
/*  Under / over scripts                                               */
/* ------------------------------------------------------------------ */

const OVER_ACCENT_MAP = {
  "\u0302": "\\hat",
  "^": "\\hat",
  "\u0303": "\\tilde",
  "~": "\\tilde",
  "\u0304": "\\bar",
  "\u00AF": "\\bar",
  "\u2015": "\\bar",
  "\u0307": "\\dot",
  "\u02D9": "\\dot",
  "\u0308": "\\ddot",
  "\u20DB": "\\dddot",
  "\u2192": "\\vec",
  "\u20D7": "\\vec",
  "\u2190": "\\overleftarrow",
  "\u23DE": "\\overbrace",
};

const UNDER_ACCENT_MAP = {
  "\u0332": "\\underline",
  "_": "\\underline",
  "\u23DF": "\\underbrace",
};

function convertMunder(node) {
  const kids = childElements(node);
  const base = kids[0] ? convertNode(kids[0]) : "";
  const under = kids[1] ? convertNode(kids[1]).trim() : "";

  if (UNDER_ACCENT_MAP[under]) return `${UNDER_ACCENT_MAP[under]}{${base}}`;

  // Large operators with limits: sum, prod, etc.
  const baseText = kids[0] ? kids[0].textContent.trim() : "";
  if (isLargeOp(baseText)) {
    return `${base}_{${under}}`;
  }

  return `\\underset{${under}}{${base}}`;
}

function convertMover(node) {
  const kids = childElements(node);
  const base = kids[0] ? convertNode(kids[0]) : "";
  const over = kids[1] ? convertNode(kids[1]).trim() : "";

  if (OVER_ACCENT_MAP[over]) return `${OVER_ACCENT_MAP[over]}{${base}}`;

  const baseText = kids[0] ? kids[0].textContent.trim() : "";
  if (isLargeOp(baseText)) {
    return `${base}^{${over}}`;
  }

  return `\\overset{${over}}{${base}}`;
}

function convertMunderover(node) {
  const kids = childElements(node);
  const base = kids[0] ? convertNode(kids[0]) : "";
  const under = kids[1] ? convertNode(kids[1]) : "";
  const over = kids[2] ? convertNode(kids[2]) : "";
  return `${base}_{${under}}^{${over}}`;
}

function isLargeOp(text) {
  const ops = [
    "\u2211", "\u220F", "\u2210", "\u222B", "\u222C", "\u222D", "\u222E",
    "\u22C0", "\u22C1", "\u22C2", "\u22C3",
    "lim", "max", "min", "sup", "inf", "det", "Pr",
  ];
  return ops.includes(text);
}

/* ------------------------------------------------------------------ */
/*  Tables / matrices                                                  */
/* ------------------------------------------------------------------ */

function convertMtable(node) {
  const rows = childElements(node)
    .filter((r) => {
      const t = r.tagName.toLowerCase().replace(/^[a-z]+:/, "");
      return t === "mtr" || t === "mlabeledtr";
    })
    .map(convertMtr);

  // Detect surrounding delimiters from a parent <mrow> with <mo> fences.
  let env = "matrix";
  const parent = node.parentElement;
  if (parent) {
    const fences = getFences(parent);
    if (fences === "()" || fences === "()") env = "pmatrix";
    else if (fences === "[]") env = "bmatrix";
    else if (fences === "{}") env = "Bmatrix";
    else if (fences === "||") env = "vmatrix";
    else if (fences === "‖‖" || fences === "∥∥") env = "Vmatrix";
  }

  return `\\begin{${env}} ${rows.join(" \\\\ ")} \\end{${env}}`;
}

function getFences(parent) {
  const kids = childElements(parent);
  if (kids.length < 2) return "";
  const first = kids[0];
  const last = kids[kids.length - 1];
  const tag = (el) => el.tagName.toLowerCase().replace(/^[a-z]+:/, "");
  if (tag(first) === "mo" && tag(last) === "mo") {
    return first.textContent.trim() + last.textContent.trim();
  }
  return "";
}

function convertMtr(node) {
  return childElements(node)
    .filter((c) => {
      const t = c.tagName.toLowerCase().replace(/^[a-z]+:/, "");
      return t === "mtd";
    })
    .map(convertNode)
    .join(" & ");
}

/* ------------------------------------------------------------------ */
/*  <mfenced>                                                          */
/* ------------------------------------------------------------------ */

function convertMfenced(node) {
  const open = node.getAttribute("open") || "(";
  const close = node.getAttribute("close") || ")";
  const separators = (node.getAttribute("separators") || ",").trim();

  const kids = childElements(node).map(convertNode);
  const sep = separators[0] || ",";
  const inner = kids.join(` ${sep} `);

  const l = MO_MAP[open] || open;
  const r = MO_MAP[close] || close;
  return `\\left${l} ${inner} \\right${r}`;
}

/* ------------------------------------------------------------------ */
/*  <menclose>                                                         */
/* ------------------------------------------------------------------ */

function convertMenclose(node) {
  const notation = node.getAttribute("notation") || "longdiv";
  const inner = convertChildren(node);
  if (notation.includes("radical")) return `\\sqrt{${inner}}`;
  if (notation.includes("box") || notation.includes("roundedbox"))
    return `\\boxed{${inner}}`;
  if (notation.includes("cancel") || notation.includes("updiagonalstrike"))
    return `\\cancel{${inner}}`;
  if (notation.includes("horizontalstrike")) return `\\hcancel{${inner}}`;
  return inner;
}

/* ------------------------------------------------------------------ */
/*  <mmultiscripts>                                                    */
/* ------------------------------------------------------------------ */

function convertMmultiscripts(node) {
  const kids = childElements(node);
  if (kids.length === 0) return "";
  let base = convertNode(kids[0]);
  let sub = "",
    sup = "";
  let preSub = "",
    preSup = "";
  let inPre = false;
  for (let i = 1; i < kids.length; i++) {
    const t = kids[i].tagName.toLowerCase().replace(/^[a-z]+:/, "");
    if (t === "mprescripts") {
      inPre = true;
      continue;
    }
    if (t === "none") {
      // skip placeholder
      if (!inPre) {
        if (!sub) sub = "skip";
        else sup = "skip";
      } else {
        if (!preSub) preSub = "skip";
        else preSup = "skip";
      }
      continue;
    }
    const val = convertNode(kids[i]);
    if (!inPre) {
      if (!sub || sub === "skip") sub = val;
      else sup = val;
    } else {
      if (!preSub || preSub === "skip") preSub = val;
      else preSup = val;
    }
  }
  let result = "";
  if (preSub && preSub !== "skip") result += `{}_{${preSub}}`;
  if (preSup && preSup !== "skip") result += `{}^{${preSup}}`;
  result += base;
  if (sub && sub !== "skip") result += `_{${sub}}`;
  if (sup && sup !== "skip") result += `^{${sup}}`;
  return result;
}
