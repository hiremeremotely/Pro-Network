"""Generate the editable ProConnect product feature guide without external packages."""

from html import escape
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

OUTPUT = Path(__file__).with_name("ProConnect-Product-Features.docx")


def text_run(text: str, bold: bool = False) -> str:
    properties = "<w:rPr><w:b/></w:rPr>" if bold else ""
    return f"<w:r>{properties}<w:t xml:space=\"preserve\">{escape(text)}</w:t></w:r>"


def paragraph(text: str, style: str = "Normal") -> str:
    return f'<w:p><w:pPr><w:pStyle w:val="{style}"/></w:pPr>{text_run(text)}</w:p>'


def bullet(text: str) -> str:
    return paragraph("•  " + text, "BulletText")


def heading(text: str, level: int = 1) -> str:
    return paragraph(text, f"Heading{level}")


def page_break() -> str:
    return '<w:p><w:r><w:br w:type="page"/></w:r></w:p>'


parts = [
    paragraph("PRODUCT FEATURE GUIDE", "Eyebrow"),
    paragraph("ProConnect", "Title"),
    paragraph("Features for professionals and businesses", "Subtitle"),
    paragraph("Hire Me Remotely  |  September 2026", "Meta"),
    paragraph(
        "A practical overview of what each account type can do in the current product. "
        "This guide describes implemented workflows, not a roadmap or a promise that "
        "every external integration is enabled in every environment.",
        "Lead",
    ),
    heading("At a glance"),
    bullet("Professionals build a privacy-aware profile, discover work and people, manage applications, and control introductions."),
    bullet("Businesses present their company, post roles, find talent, manage applications, and coordinate offers and team operations."),
    bullet("A company’s expression of interest is reviewed by HMR; the professional must approve before protected identity or conversation access is released."),
    heading("Who this guide is for"),
    paragraph(
        "“Professional” means an individual account, including job seekers and hired team members. "
        "“Business” means a company account. Some experiences depend on the user’s role, an approved introduction, or an optional connected service."
    ),
    page_break(),
    heading("For professionals"),
    heading("Profile and professional hub", 2),
    bullet("Create an account, verify email, sign in, reset a password, and manage account details."),
    bullet("Build a profile with a headline, bio, location, work experience, education, skills, portfolio projects, and professional links."),
    bullet("Import project information from GitHub; review and edit portfolio entries and decide what work appears in the hub."),
    bullet("Control discovery and field visibility. External source links are kept private unless the applicable introduction and release rules allow sharing."),
    bullet("View the public profile and edit it separately. The individual dashboard shows a profile shortcut and a completion bar for photo, headline, location, about section, and experience."),
    heading("Community and connections", 2),
    bullet("Browse and filter profiles, find recommended professionals and companies, and send, accept, decline, or remove connection requests."),
    bullet("Read and publish feed posts with media or links; interact through comments and reactions, and save posts or other items."),
    bullet("Use direct conversations for messages and share supported posts or jobs with existing connections. Receive notifications for activity and requests."),
    heading("Jobs and application tracking", 2),
    bullet("Search and filter job listings, view job details, save opportunities, and apply to platform roles with a cover letter and explicit sharing consent."),
    bullet("Track platform and external applications in a dashboard; add or update records, status, dates, notes, and associated platform links."),
    bullet("Optionally connect Gmail or Outlook for read-only application-email discovery and selective import. Mailbox connection is not required to use the tracker."),
    heading("Introductions and post-hire work", 2),
    bullet("Review business interest requests, choose whether to approve an introduction, and control what information may be released."),
    bullet("Access work records and, where relevant to employment, work logs and time-off requests."),
    page_break(),
    heading("For businesses"),
    heading("Company presence and hiring", 2),
    bullet("Create a company account and maintain its profile and business information."),
    bullet("Use the company dashboard for hiring, team, onboarding, insights, and offers."),
    bullet("Post roles with job details such as category, level, salary, and location; manage listings and review applicants."),
    bullet("Browse talent profiles using search and filters. Candidate visibility follows the professional’s privacy choices."),
    heading("Interest and introductions", 2),
    bullet("Express interest in a professional, optionally in connection with an owned job."),
    bullet("Track requests in My Interests, including pending HMR review, pending professional approval, approved connections, and declined requests."),
    bullet("Protected identity and chat access are not automatic: HMR reviews the request, then the professional decides whether to approve the introduction."),
    heading("Applications, offers, and team operations", 2),
    bullet("Review incoming applications, move candidates through the hiring pipeline, and add successful candidates to the team."),
    bullet("Prepare offers from editable full-time, contractor, or freelance templates; preview or download the resulting HTML, then share an offer link or send it through platform messaging."),
    bullet("Candidates can accept or decline an offer using the offer page; the company receives the resulting update."),
    bullet("Manage employees, onboarding, contract documents and renewals, attendance, work logs, and time-off workflows."),
    heading("Insights and communication", 2),
    bullet("See hiring metrics such as posted jobs, received applications, listing performance, and pipeline breakdowns."),
    bullet("Use messaging, notifications, and saved items where account access and introduction rules permit."),
    page_break(),
    heading("Availability and important boundaries"),
    heading("Privacy and approvals", 2),
    paragraph(
        "Professional profile fields are viewer-aware. HMR review and professional approval are part of the business-introduction workflow, "
        "not an instant messaging bypass. An approved introduction may release only the information permitted by its consent settings."
    ),
    heading("Connected services", 2),
    paragraph(
        "Gmail and Outlook email-assisted tracking is optional and depends on provider authorization and availability. "
        "The core application tracker works without connecting a mailbox."
    ),
    heading("Analytics and offer templates", 2),
    paragraph(
        "Job and application aggregates are backed by product data. Profile-view figures shown in the analytics interface "
        "are simulated and should not be represented as measured traffic. Editable offer templates are saved in the "
        "current browser, not as a shared organization-wide template library. Offer generation is not an e-signature, "
        "payroll, or legal-compliance service."
    ),
    heading("Scope of this guide", 2),
    paragraph(
        "This document covers features visible in the current application code. Proposed improvements, including some "
        "messaging refinements and portfolio refresh behavior, are intentionally excluded. Screens and permissions may "
        "differ by account type and the status of a connection, application, or introduction."
    ),
]

body = "".join(parts)
document = (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
    f'<w:body>{body}<w:sectPr><w:pgSz w:w="12240" w:h="15840"/>'
    '<w:pgMar w:top="1100" w:right="1150" w:bottom="1050" w:left="1150"/>'
    '</w:sectPr></w:body></w:document>'
)

styles = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
  <w:sz w:val="22"/><w:color w:val="243044"/></w:rPr></w:rPrDefault></w:docDefaults>
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/>
    <w:pPr><w:spacing w:after="150" w:line="300" w:lineRule="auto"/></w:pPr></w:style>
  <w:style w:type="paragraph" w:styleId="Eyebrow"><w:name w:val="Eyebrow"/>
    <w:pPr><w:spacing w:before="400" w:after="180"/></w:pPr>
    <w:rPr><w:b/><w:color w:val="5547CD"/><w:sz w:val="20"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/>
    <w:pPr><w:spacing w:after="100"/></w:pPr>
    <w:rPr><w:b/><w:color w:val="172238"/><w:sz w:val="62"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Subtitle"><w:name w:val="Subtitle"/>
    <w:pPr><w:spacing w:after="220"/></w:pPr>
    <w:rPr><w:color w:val="5547CD"/><w:sz w:val="32"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Meta"><w:name w:val="Meta"/>
    <w:pPr><w:spacing w:after="450"/></w:pPr>
    <w:rPr><w:color w:val="66738C"/><w:sz w:val="20"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Lead"><w:name w:val="Lead"/>
    <w:pPr><w:spacing w:after="400" w:line="340"/></w:pPr>
    <w:rPr><w:color w:val="3D4D64"/><w:sz w:val="25"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/>
    <w:pPr><w:keepNext/><w:spacing w:before="300" w:after="200"/></w:pPr>
    <w:rPr><w:b/><w:color w:val="172238"/><w:sz w:val="36"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/>
    <w:pPr><w:keepNext/><w:spacing w:before="280" w:after="130"/></w:pPr>
    <w:rPr><w:b/><w:color w:val="5547CD"/><w:sz w:val="25"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="BulletText"><w:name w:val="Bullet Text"/>
    <w:pPr><w:ind w:left="240" w:hanging="200"/><w:spacing w:after="100" w:line="285"/></w:pPr></w:style>
</w:styles>'''

content_types = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
</Types>'''

root_rels = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
</Relationships>'''

document_rels = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>'''

core = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"
  xmlns:dc="http://purl.org/dc/elements/1.1/">
<dc:title>ProConnect Product Feature Guide</dc:title>
<dc:subject>Features for professionals and businesses</dc:subject>
<dc:creator>Hire Me Remotely</dc:creator>
</cp:coreProperties>'''

with ZipFile(OUTPUT, "w", ZIP_DEFLATED) as archive:
    for name, value in {
        "[Content_Types].xml": content_types,
        "_rels/.rels": root_rels,
        "docProps/core.xml": core,
        "word/document.xml": document,
        "word/styles.xml": styles,
        "word/_rels/document.xml.rels": document_rels,
    }.items():
        archive.writestr(name, value)

print(OUTPUT)