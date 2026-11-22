# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project

STUDENIQU is an academic project: a study-management app for university and college students (schedule, tasks with subtasks, AI-proposed weekly study plan that the student approves, progress dashboard, document import).

Current stage: **product specification only**. There is no application code yet.

## Repository layout

- `README.md`: short project overview (Hebrew, RTL).
- `docs/SPEC.md`: product spec v1.1 (Hebrew, RTL), the source of truth for scope and decisions.

## Branches

- `main`: stable, reviewed content.
- `dev`: ongoing work. Make changes here and merge into `main` through a pull request.

## Writing rules for the spec

- Write in Hebrew, in the team's voice ("אנחנו מגדירים…"), not as a summary of a conversation.
- Keep RTL by wrapping Markdown content in `<div dir="rtl"> … </div>`.
- Do not invent interview results, decisions, integrations or numbers. Anything the team has not approved is marked **[הצעה]**.
- Keep every decision and open item. Unresolved items go in section 14 (נושאים פתוחים).
- When a section changes, update the reviewer-notes appendix (section 16) if it maps to that section.

## Core product principles (from the spec)

- The AI agent proposes; it never applies a change without the student's approval.
- Every value extracted from an imported document requires approval before it is saved.
- MVP priority: 1 tasks and deadlines, 2 AI study planning, 3 schedule and lectures, 4 dashboard, 5 import.
- MVP languages: Hebrew, English, Arabic (RTL and LTR).
