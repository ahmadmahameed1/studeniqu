# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project

STUDENIQU is an academic project (team: Ahmad Mahameed, Adyan Nujidat, Gizal Gudi): an app that helps university and college students manage academic tasks and deadlines and get an AI-proposed daily or weekly study plan that the student approves.

Current stage: **product specification only**. There is no application code yet.

## Repository layout

- `README.md`: short project overview (Hebrew, RTL).
- `docs/SPEC.md`: product spec (1 Nov 2026, Hebrew, RTL), the source of truth for scope and decisions.

## Branches

- `main`: stable, reviewed content.
- `dev`: ongoing work. Make changes here and merge into `main` through a pull request.

## Writing rules for the spec

- Write in Hebrew, in the team's voice ("אנחנו מגדירים…"), not as a summary of a conversation.
- Keep RTL by wrapping Markdown content in `<div dir="rtl"> … </div>`.
- Do not invent interview results, decisions, integrations or numbers. Anything the team has not approved is marked **[הצעה]**.
- Keep every decision and open item. Unresolved items go in section 8 (החלטות פתוחות לפני פיתוח).
- When a section changes, update the reviewer-notes table (section 9) if it maps to that section.

## Core product principles (from the spec)

- The AI agent proposes; it never applies a change without the student's approval.
- Every value extracted from an imported document requires approval before it is saved.
- MVP core (priority): 1 tasks and deadlines, 2 AI study planning (daily or weekly plan, changes via chat, approval before saving). The other MVP capabilities (schedule, import, dashboard) are not ranked; do not rank them without a team decision.
- Success metric: at least 40% time saved on study planning vs. manual planning (a future target, not a measured result).
- MVP languages: Hebrew, English, Arabic (RTL and LTR).
