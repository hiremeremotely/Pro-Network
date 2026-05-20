// Glassdoor application submission detector

import { showToast, showBadge } from "./toast";

let applied = false;
let badgeInjected = false;

function extractJobInfo(): { jobTitle: string; companyName: string; jobUrl: string } {
  const jobTitle =
    document.querySelector<HTMLElement>("[data-test='jobTitle']")?.innerText?.trim() ||
    document.querySelector<HTMLElement>(".JobDetails_jobTitle__Rw_gn")?.innerText?.trim() ||
    document.querySelector<HTMLElement>("h1[class*='job-title'], h1[class*='jobTitle']")?.innerText?.trim() ||
    "Unknown Role";

  const companyName =
    document.querySelector<HTMLElement>("[data-test='employer-name']")?.innerText?.trim() ||
    document.querySelector<HTMLElement>(".EmployerProfile_employerName__Xemli")?.innerText?.trim() ||
    document.querySelector<HTMLElement>("[class*='employer-name'], [class*='employerName']")?.innerText?.trim() ||
    "Unknown Company";

  return { jobTitle, companyName, jobUrl: window.location.href };
}

function injectBadge() {
  if (badgeInjected) return;
  const applyBtn = document.querySelector(
    "[data-test='applyButton'], button[class*='apply'], a[class*='apply-btn']",
  );
  if (applyBtn) {
    showBadge(applyBtn);
    badgeInjected = true;
  }
}

function isConfirmationPage(): boolean {
  const url = window.location.href;
  if (url.includes("/apply/success") || url.includes("/app/complete")) return true;

  const confirmTexts = [
    "application submitted",
    "you've applied",
    "application was sent",
    "successfully submitted",
    "thanks for applying",
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
    platform: "glassdoor",
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
