// Indeed application confirmation detector

import { showToast, showBadge } from "./toast";

let applied = false;
let badgeInjected = false;

function extractJobInfo(): { jobTitle: string; companyName: string; jobUrl: string } {
  const jobTitle =
    document.querySelector<HTMLElement>(".jobsearch-JobInfoHeader-title span")?.innerText?.trim() ||
    document.querySelector<HTMLElement>("h1.jobsearch-JobInfoHeader-title")?.innerText?.trim() ||
    document.querySelector<HTMLElement>("[data-testid='jobsearch-JobInfoHeader-title']")?.innerText?.trim() ||
    "Unknown Role";

  const companyName =
    document.querySelector<HTMLElement>("[data-testid='inlineHeader-companyName']")?.innerText?.trim() ||
    document.querySelector<HTMLElement>(".jobsearch-InlineCompanyRating-companyName")?.innerText?.trim() ||
    document.querySelector<HTMLElement>(".css-1ioi40n")?.innerText?.trim() ||
    "Unknown Company";

  return { jobTitle, companyName, jobUrl: window.location.href };
}

function injectBadge() {
  if (badgeInjected) return;
  const applyBtn = document.querySelector(
    "[data-testid='applyButton'], .ia-IndeedApplyButton, button[id='indeedApplyButton']",
  );
  if (applyBtn) {
    showBadge(applyBtn);
    badgeInjected = true;
  }
}

function isConfirmationPage(): boolean {
  // Indeed redirects to /jobs/viewjob?... with ?applied=1, or shows a confirmation card
  const url = window.location.href;
  if (url.includes("applied=1") || url.includes("/viewjob") && url.includes("applied")) return true;

  const confirmTexts = [
    "application was submitted",
    "you've applied",
    "your application has been sent",
    "thanks for applying",
    "application submitted",
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
    platform: "indeed",
    jobUrl: info.jobUrl,
  }, (response: { success: boolean; error?: string } | undefined) => {
    if (response?.success) {
      showToast("Logged to Hire Me Remotely ✓", true);
    }
  });
}

const observer = new MutationObserver(() => {
  injectBadge();
  if (!applied && isConfirmationPage()) {
    handleApplicationDetected();
  }
});

observer.observe(document.body, { childList: true, subtree: true });

// Check on URL change (SPA navigation)
let lastUrl = window.location.href;
setInterval(() => {
  if (window.location.href !== lastUrl) {
    lastUrl = window.location.href;
    applied = false;
    badgeInjected = false;
    setTimeout(() => {
      injectBadge();
      if (isConfirmationPage()) handleApplicationDetected();
    }, 1500);
  }
}, 1000);

injectBadge();
if (isConfirmationPage()) handleApplicationDetected();
