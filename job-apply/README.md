# job-apply

Runs on your own computer. Given your Excel list of companies and your resume, it:

1. finds each company's public job board,
2. pulls the current openings and keeps the ones that fit your role, location and experience settings,
3. writes a tailored resume (PDF) and a cover letter for each job,
4. opens each application form in a browser, fills it in from your profile, attaches the documents, and submits it — after your confirmation, or on its own if you turn that on.

**It is free to run.** By default nothing is sent to any paid service: no API key, no subscription. An optional paid mode exists (see "Free mode and paid mode") and is off unless you turn it on.

Everything personal (company list, resume, profile, generated documents, browser session, tracker) stays in `data/`, `config.yaml` and `profile.yaml`, which git ignores.

## What it can and cannot do

| Company's hiring system | Find jobs | Fill the form | Submit |
|---|---|---|---|
| Greenhouse, Lever, Ashby | yes | yes | yes |
| SmartRecruiters, Workable, Recruitee | yes | yes, where the form is a single page | you press submit |
| Workday | yes, once you give its careers URL | no (needs an account and a multi-step wizard) | you |
| Anything else (a company's own portal, Taleo, SuccessFactors, iCIMS, …) | no | no | you |

**How it gets from your Excel to a careers page.** For every company in the sheet it tries, in this order:

1. a `Careers URL` column in the Excel, if you add one (any of: "Careers URL", "Career Page", "URL", "Website", "Link");
2. a link you put in `data/careers_urls.csv`;
3. the company's name on each supported job-board system, accepted only when the board says it belongs to that company;
4. the company's own website (`name.com`, `.io`, `.in`, …): it opens the site, follows its Careers link, and picks up whichever job-board system that page uses.

Your current sheet has names only, so steps 3 and 4 do the work. Companies whose careers page is found but runs on an unsupported system are listed in the tracker's Companies sheet with the link, for you to apply by hand. Companies it cannot find at all are listed in `data/careers_urls.csv`; paste the careers URL next to the name and run `discover` again.

It never solves CAPTCHAs, creates accounts, or logs in for you. When a CAPTCHA appears it waits for you to solve it in the browser window.

**Status of testing.** The search, filtering, tailoring checks and form filling are covered by automated tests that run against a mocked job-board API and a local test form. The tool has not yet been run against the live job-board sites. Do your first run with `--dry-run` and then without `--auto`, and watch what it does.

## Setup (once)

You need [Node.js 20 or newer](https://nodejs.org) (free). Nothing else.

```bash
cd job-apply
```

```bash
npm install
```

Create your settings from the examples:

```bash
cp config.example.yaml config.yaml
```

```bash
cp profile.example.yaml profile.yaml
```

(On Windows use `copy` instead of `cp`.)

Then:

- Put your Excel file at `data/companies.xlsx` and your resume data at `data/resume.json` (see `init` below).
- Fill in `profile.yaml`. These are the facts typed into forms: name, email, phone, notice period, work authorisation and so on. Anything you leave empty is never guessed.
- Review `config.yaml`: which job titles to include and exclude, which locations, the maximum years of experience a job may ask for, and which tiers of your spreadsheet to process. By default rows marked "Low Fit" are skipped.

Check the setup:

```bash
node src/cli.js doctor
```

## Running it

```bash
node src/cli.js init
```

Creates `data/resume.json` from a template for you to fill in with your resume's content (skip this if you already have the file). **Check every line against your resume.** It is the only source the tool builds documents from, so a mistake here ends up in every application.

```bash
node src/cli.js discover
```

Finds the careers pages and job boards. With ~900 companies expect this to take an hour or more the first time; it saves as it goes and resumes if interrupted.

```bash
node src/cli.js search
```

Fetches openings and records the relevant ones. Open `data/tracker.xlsx` to see them.

```bash
node src/cli.js prepare --limit 5
```

Writes a tailored resume and cover letter per job into `data/out/<company>__<title>__<id>/`. Start with a few and read them before doing the rest.

```bash
node src/cli.js apply --dry-run --limit 3
```

Fills the forms, takes a screenshot (`dry-run.png` in the job's folder), submits nothing.

```bash
node src/cli.js apply
```

Fills each form and then waits for you. Look at the browser window, fix anything, then answer in the terminal: `s` submit now, `d` I submitted it myself, `l` later, `k` skip for good, `q` quit.

```bash
node src/cli.js apply --auto
```

Submits without asking — but only when nothing is in doubt (see below). Everything else is marked `needs_manual` for you.

`node src/cli.js run` does discover → search → prepare → apply in one go. `node src/cli.js status` prints counts and rebuilds the tracker. Running any step again is safe: finished work is not repeated.

## Safeguards

**Against invented resume content.** In free mode the tailored resume contains exactly the same lines as your original, re-ordered so the skills, bullets and projects the job asks for come first; nothing new is written. In paid mode, employers, titles, dates, education and contact details still cannot be changed, and a rewritten line is discarded if it contains a number, a job-description keyword, or a technology that is not in your resume. The tracker lists the job's keywords you do not have.

**About the "ATS score".** The tracker shows the share of the job description's keywords found in your resume, before and after tailoring. That is how keyword screening works, but it is an estimate; no employer's system reports a universal score, and the tool will not raise it by adding skills you do not have.

**Against wrong or duplicate applications.**

- A job is never applied to twice: its status is saved before the submit button is pressed. If a run dies mid-submit, or the site shows no confirmation, the job is marked `unconfirmed` and is not retried — check your email first.
- The same role re-posted under a new id is recognised and skipped.
- In `--auto` mode an application is sent only if all of these hold: every required question was answered from your profile, no answer was written by a model (paid mode only, unless you allow it in `config.yaml`), the resume was attached, the page mentions the company's name, the board was verified as that company's, a real submit button was found, and there is no CAPTCHA on the page.
- Required questions the tool cannot answer are left empty, never guessed. Voluntary demographic questions are answered "decline" unless you filled them in your profile. Marketing opt-ins are left unticked.
- Postings that have closed are detected and marked `closed`.

## Statuses in the tracker

| Status | Meaning |
|---|---|
| `new` | Relevant job found; documents not written yet |
| `prepared` | Resume and cover letter ready; not applied yet |
| `submitted` | Sent (confirmed by the site, or by you) |
| `needs_manual` | Needs you; the Note column says why |
| `unconfirmed` | Submit was pressed but no confirmation was seen. Check your email; not retried |
| `skipped` | Deliberately not applied (too senior, duplicate, or skipped by you) |
| `closed` | Posting no longer open |
| `failed` | An error occurred; the Note column has it. Safe to fix and re-run |

To retry a job, change its `status` back to `prepared` in `data/state.json`.

## Free mode and paid mode

`llm.provider` in `config.yaml` decides this. The default is `none`.

| | `none` (free, default) | `anthropic` (paid) |
|---|---|---|
| Cost | Nothing | Billed to your Anthropic API key, per job |
| Resume | Your own lines, re-ordered per job | Bullets also rephrased in the job's wording |
| Keyword match | Unchanged by tailoring (shown so you can see the gap) | Can rise where your real experience matches |
| Cover letter | Assembled from your own resume lines; skipped when the job and your resume barely overlap | Written for the specific job |
| Open form questions ("Why do you want to work here?") | Left for you, or answered from `answers:` in `profile.yaml` | Drafted from your resume, flagged for review |
| `init` | You fill in `data/resume.json` | Reads your resume PDF |

In free mode, put the questions you see repeatedly into `answers:` in `profile.yaml`; each one you add is one fewer stop. Set `cover_letter: false` in `config.yaml` if you would rather not send the assembled letter.

## Good to know

- Job sites' terms often restrict automated applications, and mass identical applications get filtered. Keep the delay between applications (default 25–60 seconds) and the per-run cap.
- The browser profile in `data/browser-profile` keeps cookies between runs, so a login you complete by hand is remembered.
- If `tracker.xlsx` is open in Excel when the tool tries to rewrite it, it writes `tracker-<number>.xlsx` instead.
- Run the tests with `npm test`.
