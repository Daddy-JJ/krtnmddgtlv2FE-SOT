import { safeHttpUrl, safeImageUrl, safeMailtoHref, safeTelHref } from "../utils/safe-url.js";
import { formatCardDisplayName } from "../utils/name-format.js";

const FIELD_SELECTORS = {
  fullName: "[data-field='fullName']",
  jobTitle: "[data-field='jobTitle']",
  organization: "[data-field='organization']",
  officePhone: "[data-field='officePhone']",
  mobilePhone: "[data-field='mobilePhone']",
  email: "[data-field='email']",
  websiteUrl: "[data-field='websiteUrl']",
  addressText: "[data-field='addressText']",
  mapsUrl: "[data-field='mapsUrl']",
  logoUrl: "[data-field='logoUrl']",
  qrUrl: "[data-field='qrUrl']",
  canonicalUrl: "[data-field='canonicalUrl']"
};

function setText(root, field, value) {
  root.querySelectorAll(FIELD_SELECTORS[field] || "").forEach((node) => {
    node.textContent = value || "";
    node.hidden = !value;
    if (value && !node.classList.contains("sr-only")) node.title = value;
  });
}

function setLink(root, field, value, href) {
  root.querySelectorAll(FIELD_SELECTORS[field] || "").forEach((node) => {
    node.textContent = value || "";
    node.hidden = !value;
    const row = node.closest("[data-contact-row]");
    if (row) row.hidden = !value;
    if (node instanceof HTMLAnchorElement) {
      if (href) {
        node.href = href;
        node.removeAttribute("aria-disabled");
      } else {
        node.removeAttribute("href");
        if (value) node.setAttribute("aria-disabled", "true");
      }
      if (value) node.title = value;
    }
  });
}

function normalizeLength(value) {
  return String(value || "").trim().length;
}

function setSplitName(root, value) {
  const normalized = String(value || "").trim();
  const [lead = "", ...tailParts] = normalized.split(/\s+/);
  const tail = tailParts.join(" ");

  root.querySelectorAll("[data-name-lead]").forEach((node) => {
    node.textContent = lead;
    node.hidden = !lead;
  });
  root.querySelectorAll("[data-name-tail]").forEach((node) => {
    node.textContent = tail;
    node.hidden = !tail;
  });
  root.querySelectorAll(".digital-card__name--split").forEach((node) => {
    if (normalized) node.title = normalized;
  });
}

function updateAdaptiveClasses(root, card) {
  const nameLength = normalizeLength(formatCardDisplayName(card.fullName));
  const roleLength = normalizeLength(card.jobTitle);
  const orgLength = normalizeLength(card.organization);
  const longestContactLength = Math.max(
    normalizeLength(card.officePhone),
    normalizeLength(card.mobilePhone),
    normalizeLength(card.email),
    normalizeLength(card.websiteUrl),
    normalizeLength(card.addressText)
  );

  root.classList.toggle("digital-card--name-long", nameLength >= 28);
  root.classList.toggle("digital-card--name-very-long", nameLength >= 42);
  root.classList.toggle("digital-card--role-long", roleLength >= 54);
  root.classList.toggle("digital-card--org-long", orgLength >= 42);
  root.classList.toggle("digital-card--contacts-dense", longestContactLength >= 28);

  const compact = nameLength >= 42 || roleLength >= 80 || longestContactLength >= 40;
  root.classList.toggle("digital-card--compact", compact);
}

export function renderCardTheme(root, card) {
  if (!root) throw new Error("Theme root is required.");

  const displayName = formatCardDisplayName(card.fullName);
  setText(root, "fullName", displayName);
  setSplitName(root, displayName);
  setText(root, "jobTitle", card.jobTitle);
  setText(root, "organization", card.organization);
  setText(root, "canonicalUrl", card.canonicalUrl);

  setLink(root, "officePhone", card.officePhone, safeTelHref(card.officePhone));
  setLink(root, "mobilePhone", card.mobilePhone, safeTelHref(card.mobilePhone));
  setLink(root, "email", card.email, safeMailtoHref(card.email));
  setLink(root, "websiteUrl", card.websiteUrl, safeHttpUrl(card.websiteUrl));
  setLink(root, "addressText", card.addressText, safeHttpUrl(card.mapsUrl));

  root.querySelectorAll(FIELD_SELECTORS.logoUrl).forEach((img) => {
    const safeLogo = safeImageUrl(card.logoUrl);
    img.hidden = !safeLogo;
    if (safeLogo) img.src = safeLogo;
  });
  root.querySelectorAll("[data-logo-slot]").forEach((slot) => {
    slot.hidden = !card.logoUrl;
  });

  root.querySelectorAll(FIELD_SELECTORS.qrUrl).forEach((img) => {
    const safeQr = safeImageUrl(card.qrUrl);
    img.hidden = !safeQr;
    if (safeQr) img.src = safeQr;
  });

  const socials = root.querySelector("[data-list='socialLinks']");
  if (socials) {
    socials.replaceChildren();
    for (const item of card.socialLinks || []) {
      const href = safeHttpUrl(item.url);
      if (!href) continue;
      const link = document.createElement("a");
      link.href = href;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = item.label || item.platform;
      socials.append(link);
    }
    socials.hidden = socials.childElementCount === 0;
  }

  updateAdaptiveClasses(root, card);
}
