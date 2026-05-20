// Generic fallback — detects pages with /apply/ or /applied URL patterns + confirmation text

import { showToast } from "./toast";

let applied = false;

function shouldActivate(): boolean {
  const url = window.location.href.toLowerCase();
  return (
    url.includes("/apply/") ||
    url.includes("/applied") ||
    url.includes("/application/confirm") ||
    url.includes("/application-submitted") ||
    url.includes("/jobs/apply")
  );
}

function isConfirmationPage(): boolean {
  if (!shouldActivate()) return false;

  const confirmTexts = [
    "application submitted",
    "application was sent",
    "you've applied",
    "thanks for applying",
    "successfully applied",
    "application complete",
    "your application has been",
    "we've received your application",
    "application received",
  ];
  const bodyText = document.body.innerText.toLowerCase();
  return confirmTexts.some((t) => bodyText.includes(t));
}

function extractJobInfo(): { jobTitle: string; companyName: string } {
  // Try common selectors across many job sites
  const jobTitle =
    document.querySelector<HTMLElement>("h1")?.innerText?.trim() ||
    document.querySelector<HTMLElement>("[class*='job-title'], [class*='jobTitle'], [class*='position']")?.innerText?.trim() ||
    document.title.split(" - ")[0]?.trim() ||
    "Unknown Role";

  // Company name: look in title or common selectors
  const companyName =
    document.querySelector<HTMLElement>("[class*='company-name'], [class*='companyName'], [class*='employer']")?.innerText?.trim() ||
    document.title.split(" - ")[1]?.trim() ||
    new URL(window.location.href).hostname.replace("www.", "").split(".")[0] ||
    "Unknown Company";

  return { jobTitle, companyName };
}

function handleApplicationDetected() {
  if (applied) return;
  applied = true;

  const info = extractJobInfo();
  const platform = new URL(window.location.href).hostname.replace("www.", "").split(".")[0] || "other";

  chrome.runtime.sendMessage({
    type: "APPLICATION_DETECTED",
    jobTitle: info.jobTitle,
    companyName: info.companyName,
    platform,
    jobUrl: window.location.href,
  }, (response: { success: boolean; error?: string } | undefined) => {
    if (response?.success) {
      showToast("Logged to Hire Me Remotely ✓", true);
    }
  });
}

// Only run mutation observer on pages that look like apply flows
if (shouldActivate()) {
  const observer = new MutationObserver(() => {
    if (!applied && isConfirmationPage()) {
      handleApplicationDetected();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  if (isConfirmationPage()) {
    handleApplicationDetected();
  }
}
