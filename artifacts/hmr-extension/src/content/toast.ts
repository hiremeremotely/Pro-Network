// Shared toast utility — inlined into each content script bundle

export function showToast(message: string, success: boolean): void {
  const existing = document.getElementById("__hmr_ext_toast__");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.id = "__hmr_ext_toast__";
  toast.textContent = message;

  Object.assign(toast.style, {
    position: "fixed",
    bottom: "24px",
    right: "24px",
    zIndex: "2147483647",
    padding: "12px 16px",
    borderRadius: "10px",
    fontSize: "13px",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    fontWeight: "500",
    lineHeight: "1.4",
    maxWidth: "280px",
    boxShadow: "0 4px 20px rgba(0,0,0,0.18)",
    color: "#fff",
    backgroundColor: success ? "#4f46e5" : "#dc2626",
    transition: "opacity 0.3s ease, transform 0.3s ease",
    opacity: "0",
    transform: "translateY(8px)",
    pointerEvents: "none",
  } as Partial<CSSStyleDeclaration>);

  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    toast.style.opacity = "1";
    toast.style.transform = "translateY(0)";
  });

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(8px)";
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

export function showBadge(nearEl: Element | null, label = "HMR"): void {
  if (!nearEl || document.getElementById("__hmr_badge__")) return;

  const badge = document.createElement("span");
  badge.id = "__hmr_badge__";
  badge.textContent = label;
  Object.assign(badge.style, {
    display: "inline-flex",
    alignItems: "center",
    marginLeft: "8px",
    padding: "2px 7px",
    borderRadius: "4px",
    fontSize: "11px",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    fontWeight: "700",
    color: "#fff",
    backgroundColor: "#4f46e5",
    verticalAlign: "middle",
    letterSpacing: "0.03em",
    flexShrink: "0",
  } as Partial<CSSStyleDeclaration>);

  try {
    nearEl.parentElement?.insertBefore(badge, nearEl.nextSibling);
  } catch {
    // ignore
  }
}
