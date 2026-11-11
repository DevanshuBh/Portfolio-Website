# job-apply

Runs on your own computer. Given your Excel list of companies and your resume, it:

1. finds each company's public job board,
2. pulls the current openings and keeps the ones that fit your role, location and experience settings,
3. writes a tailored resume (PDF) and a cover letter for each job,
4. opens each application form in a browser, fills it in from your profile, attaches the documents, and submits it — after your confirmation, or on its own if you turn that on.

Everything personal (company list, resume, profile, generated documents, browser session, tracker) stays in `data/`, `config.yaml` and `profile.yaml`, which git ignores.

## What it can and cannot do

| Company's hiring system | Find jobs | Fill the form | Submit |
|---|---|---|---|
| Greenhouse, Lever, Ashby | yes | yes | yes |
| SmartRecruiters, Workable, Recruitee | yes | yes, where the form is a single page | you press submit |
| Workday | yes, once you give its careers URL | no (needs an account and a multi-step wizard) | you |
| Anything else (a company's own portal, Taleo, SuccessFactors, iCIMS, …) | no | no | you |

Your spreadsheet has company names but no careers links, so the tool guesses each company's board from its name and checks that the board really is that company's. Many large companies will not be found this way. They are listed in `data/careers_urls.csv`; paste the careers URL next to the name and run `discover` again.

It never solves CAPTCHAs, creates accounts, or logs in for you. When a CAPTCHA appears it waits for you to solve it in the browser window.

**Status of testing.** The search, filtering, tailoring checks and form filling are covered by automated tests that run against a mocked job-board API and a local test form. The tool has not yet been run against the live job-board sites. Do your first run with `--dry-run` and then without `--auto`, and watch what it does.

## Setup (once)

You need [Node.js 20 or newer](https://nodejs.org) and an [Anthropic API key](https://console.anthropic.com/) (used to tailor the resume, write cover letters, and answer open form questions).

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

- Put your Excel file at `data/companies.xlsx` and your resume at `data/resume.pdf` (or change the paths in `config.yaml`).
- Fill in `profile.yaml`. These are the facts typed into forms: name, email, phone, notice period, work authorisation and so on. Anything you leave empty is never guessed.
- Review `config.yaml`: which job titles to include and exclude, which locations, the maximum years of experience a job may ask for, and which tiers of your spreadsheet to process. By default rows marked "Low Fit" are skipped.
- Set your API key in the terminal you will run the tool from:

```bash
export ANTHROPIC_API_KEY=sk-ant-...
```

(Windows PowerShell: `$env:ANTHROPIC_API_KEY="sk-ant-..."`)

Check the setup:

```bash
node src/cli.js doctor
```

## Running it

```bash
node src/cli.js init
```

Reads your resume PDF into `data/resume.json`. **Open that file and check every line against your resume.** It is the only source the tool tailors from, so a mistake here ends up in every application.

```bash
node src/cli.js discover
```

Finds the job boards. With ~900 companies this takes around half an hour the first time; it saves as it goes and resumes if interrupted.

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

**Against invented resume content.** Employers, titles, dates, education and contact details are copied from your original resume and cannot be changed by tailoring. A rewritten line is discarded, and your original wording kept, if it contains a number that is not in your resume, a keyword from the job description that your resume lacks, or a technology or proper noun that does not appear in your resume. Skills can be reordered and dropped but not added. The tracker lists the job's keywords you do not have.

**About the "ATS score".** The tracker shows the share of the job description's keywords found in your resume, before and after tailoring. That is how keyword screening works, but it is an estimate; no employer's system reports a universal score, and the tool will not raise it by adding skills you do not have.

**Against wrong or duplicate applications.**

- A job is never applied to twice: its status is saved before the submit button is pressed. If a run dies mid-submit, or the site shows no confirmation, the job is marked `unconfirmed` and is not retried — check your email first.
- The same role re-posted under a new id is recognised and skipped.
- In `--auto` mode an application is sent only if all of these hold: every required question was answered from your profile, no answer was written by the model (unless you allow it in `config.yaml`), the resume was attached, the page mentions the company's name, the board was verified as that company's, a real submit button was found, and there is no CAPTCHA on the page.
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

## Cost

Each prepared job is one model request (resume plus cover letter), and each application with open questions is one more. The model is set in `config.yaml` (`llm.model`); `claude-sonnet-5-5` and `claude-haiku-5-5` are cheaper than the default `claude-opus-5-5`. Use `--limit` to control how many jobs a run handles.

## Good to know

- Job sites' terms often restrict automated applications, and mass identical applications get filtered. Keep the delay between applications (default 25–60 seconds) and the per-run cap.
- The browser profile in `data/browser-profile` keeps cookies between runs, so a login you complete by hand is remembered.
- If `tracker.xlsx` is open in Excel when the tool tries to rewrite it, it writes `tracker-<number>.xlsx` instead.
- Run the tests with `npm test`.
