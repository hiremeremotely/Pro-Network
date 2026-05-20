// LinkedIn Easy Apply detector

import { showToast, showBadge } from "./toast";

let applied = false;
let badgeInjected = false;

function extractJobInfo(): { jobTitle: string; companyName: string; jobUrl: string } {
  const jobTitle =
    document.querySelector<HTMLElement>(".job-details-jobs-unified-top-card__job-title h1")?.innerText?.trim() ||
    document.querySelector<HTMLElement>(".jobs-unified-top-card__job-title")?.innerText?.trim() ||
    document.querySelector<HTMLElement>("h1.t-24")?.innerText?.trim() ||
    "Unknown Role";

  const companyName =
    document.querySelector<HTMLElement>(".job-details-jobs-unified-top-card__company-name a")?.innerText?.trim() ||
    document.querySelector<HTMLElement>(".jobs-unified-top-card__company-name")?.innerText?.trim() ||
    document.querySelector<HTMLElement>(".topcard__org-name-link")?.innerText?.trim() ||
    "Unknown Company";

  return { jobTitle, companyName, jobUrl: window.location.href };
}

function injectBadge() {
  if (badgeInjected) return;
  const applyBtn = document.querySelector(
    ".jobs-apply-button--top-card .jobs-apply-button, .jobs-s-apply button, [data-control-name='jobdetails_topcard_inapply']",
  );
  if (applyBtn) {
    showBadge(applyBtn);
    badgeInjected = true;
  }
}

function isConfirmationPage(): boolean {
  // LinkedIn shows a modal with "Your application was sent" or similar
  const confirmTexts = [
    "application was sent",
    "application has been submitted",
    "you've applied",
    "thanks for applying",
    "successfully applied",
  ];
  const bodyText = document.body.innerText.toLowerCase();
  return confirmTexts.some((t) => bodyText.includes(t));
}

function handleApplicationDetected() {
  if (applied) return;
  applied = true;

  const info = extractJobInfo();
  chrome.runtime.sendMessage({
    type: "APPLICATION_DETECTED",
    jobTitle: info.jobTitle,
    companyName: info.companyName,
    platform: "linkedin",
    jobUrl: info.jobUrl,
  }, (response: { success: boolean; error?: string } | undefined) => {
    if (response?.success) {
      showToast("Logged to Hire Me Remotely ✓", true);
    } else if (response?.error && response.error !== "Not authenticated" && response.error !== "No API URL configured") {
      showToast("Could not log application", false);
    }
  });
}

// MutationObserver to detect Easy Apply confirmation dialog
const observer = new MutationObserver(() => {
  injectBadge();

  if (!applied && isConfirmationPage()) {
    handleApplicationDetected();
  }
});

observer.observe(document.body, { childList: true, subtree: true });

// Initial check
injectBadge();
if (isConfirmationPage()) {
  handleApplicationDetected();
}
