# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project

STUDENIQU is an academic project (team: Ahmad Mahameed, Adyan Nujidat, Gizal Gudi): an app that helps university and college students manage academic tasks and deadlines and get an AI-proposed daily or weekly study plan that the student approves.

Current stage: first working version of the two core capabilities (tasks and study planning). Static site, no build step and no dependencies.

## Repository layout

- `README.md`: project overview and how to run (Hebrew, RTL).
- `docs/SPEC.md`: product spec (1 Nov 2026, Hebrew, RTL), the source of truth for scope and decisions.
- `docs/PLAN.md`: implementation plan for the current version.
- `index.html`, `css/style.css`: UI (Hebrew, RTL, light and dark).
- `js/planner.js`: pure planning functions (`buildPlan`, `missedSessions`, date helpers). No DOM access.
- `js/chat.js`: pure Hebrew command parser (`applyCommand`) that returns new plan options. No DOM access.
- `js/data.js`: pure data functions (`fromSample`, `toExport`, `parseImport`). Imports are validated against the shape in `data/schema.json`.
- `js/search.js`: pure `filterTasks(tasks, query)`: case-insensitive substring match on task title or course. The search box only filters the task list; it is not saved and does not affect the summary or the plan.
- `data/`: `sample-data.js` (sample student data, dates relative to today), `schema.json` (export/import format), `README.md` (data model in Hebrew). Keep all three in sync when the data model changes.
- `js/charts.js` (experimental): pure `chartData` plus inline-SVG rendering with a table view. Single-series bars in `--series-1`; text uses text colors, not the series color. Show/table preferences in `localStorage` key `studeniqu.chartsPrefs`.
- `js/app.js`: state, `localStorage` persistence (key `studeniqu.v1`) and rendering.
- `tests/tests.html` + `tests/planner.test.js`: browser tests for planner and chat.

## Code conventions

- Plain ES5-style classic scripts sharing the `window.Studeniqu` namespace, so `index.html` opens straight from disk (ES modules would not load over `file://`).
- Keep planning and chat logic pure and covered by tests; keep DOM code in `app.js`.
- Build DOM with `textContent`, never `innerHTML` with user data.
- The planner is a local algorithm, not an AI model. Never commit API keys; the repo is public.

## Testing

Open `tests/tests.html` in a browser (via a local static server if `file://` blocks scripts). All tests must pass before pushing.

## Branches

- `main`: stable, reviewed content.
- `dev`: ongoing work. Make changes here and merge into `main` through a pull request.
- `feature/*`: experimental features branched from `dev` (e.g. `feature/charts-experimental`). Merge into `dev` only after the team approves.

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
