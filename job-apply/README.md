# job-apply

You give it your resume and your Excel list of companies. It then goes through the companies one by one and, for each job based in India that fits you:

1. opens the application form in a browser window,
2. fills in everything it knows (from your profile and a resume tailored to that job),
3. **asks you in the terminal** for anything it does not know, and types your answer into the form,
4. **shows you everything on the form and asks whether it is all correct**,
5. submits only when you say yes (or you submit it yourself), then moves on to the next job.

It never submits anything without your confirmation. It is free to run: nothing is sent to any paid service (see "Free mode and paid mode").

## How it reaches every company

**Companies on a job board it can search** (Greenhouse, Lever, Ashby, SmartRecruiters, Workable, Recruitee, Workday). It finds the board, lists the openings, and keeps those whose title and location match your settings (by default software roles in India, up to 3 years of experience). For each one it opens the form and goes through steps 2–5 above.

**All other companies** (their own careers portal, or a board it cannot search). After the job-board jobs, it opens each company's careers page. If it knows no careers page, it opens a web search for "<company> careers India". You open a job that suits you and press Enter. The tool then prepares a resume for that job and goes through steps 2–5 with you on whatever page is open. Multi-step forms work the same way: you click Next in the browser and press Enter, and it fills the next page.

It does not solve CAPTCHAs, create accounts or log in for you. When a site asks for those, you do them in the browser window and press Enter to carry on.

## Setup (once)

You need [Node.js 20 or newer](https://nodejs.org). Nothing else.

```bash
cd job-apply
```

```bash
npm install
```

Create your settings from the examples (on Windows use `copy` instead of `cp`):

```bash
cp config.example.yaml config.yaml
```

```bash
cp profile.example.yaml profile.yaml
```

Then:

- Make a `data` folder inside `job-apply`. Put your Excel file in it as `data/companies.xlsx`, and your resume data as `data/resume.json`. (Running `node src/cli.js init` creates a template if you need one.) Check every line of `resume.json` against your resume: it is the only source the tool builds your documents from.
- Fill in at least your name, email and phone in `profile.yaml`. You do not have to fill in the rest now. When a form asks for something that is missing, the tool asks you once and saves your answer in `profile.yaml`, so you are not asked again.
- Look at the `search:` section of `config.yaml`: which job titles to include and exclude, which Indian cities, and the most years of experience a job may ask for.

Check everything is ready:

```bash
node src/cli.js doctor
```

## Running it

```bash
node src/cli.js discover
```

Works out where each company posts its jobs. With ~900 companies, expect an hour or more the first time. It saves as it goes: stop it with Ctrl+C any time and run it again to continue.

```bash
node src/cli.js search
```

Collects the matching jobs in India from the job boards it found. You can see them in `data/tracker.xlsx`.

```bash
node src/cli.js apply
```

This starts the application loop. A browser window opens. For each job, the terminal shows:

```
[3/40] Razorpay - Software Engineer II (Bengaluru, India)
   Resume: data/out/Razorpay__Software_Engineer_II__1234/Devanshu_Bhargava_Resume.pdf

   Filled 11 field(s) from your profile and documents.

   1 required question(s) I don't have an answer for:

   ? What is your notice period? *   (required)
     Your answer (text; Enter = leave it to you): 30 days
     Saved to profile.yaml as notice_period; it will be filled in automatically from now on.

   Here is everything on the form now:
     First Name *                                        Devanshu
     Email *                                             bhargavadevanshu10@gmail.com
     Resume/CV *                                         Devanshu_Bhargava_Resume.pdf
     What is your notice period? *                       30 days
     ...

   Are all the details correct?
   [s] Yes, submit it   [Enter] Check the page again (after you change something, log in, or go to the next step)
   [d] I submitted it myself   [l] Later   [k] Skip this job   [q] Quit
```

- If something is wrong, correct it in the browser, then press **Enter**. The form is read again and shown to you.
- **s** submits, and the tool waits for the site's confirmation. If the site rejects the form (for example, a field it does not like), nothing has been sent; you fix it and choose again.
- **d** if you pressed the site's own submit button yourself.
- **l** leaves the job for the next run. **k** skips it for good. **q** stops; you continue later where you left off.

Questions with options are shown as a numbered list; type the number. For free-text questions such as "Why do you want to work here?", the tool asks whether to reuse your answer when the same question appears again.

After the job-board jobs, it asks whether to start on the remaining companies' careers sites. For each company:

```
[company 12/520] Infosys (India)
   Careers page: https://career.infosys.com/...
   Find a job based in India that suits you and open it in the browser, then press Enter.
   [Enter] I have opened a job   [n] No suitable job here, next company   [l] Later   [q] Quit
```

Useful options:

- `node src/cli.js apply --only Razorpay` limits the run to one company.
- `--no-sites` does the job-board jobs only.
- `--limit 5` handles at most 5 job-board jobs.
- `node src/cli.js apply --dry-run --limit 3` fills a few forms, saves a screenshot of each (`dry-run.png` in the job's folder), and neither asks nor submits anything. It is a safe way to see how it behaves.
- `node src/cli.js prepare` writes all the tailored resumes in advance, so you can read them before applying (otherwise each one is made just before its form).
- `node src/cli.js status` shows counts and rebuilds `data/tracker.xlsx`.

Run `search` and `apply` again whenever you like. Jobs you have handled are not offered again, and the same role re-posted under a new link is recognised.

## Your documents

For each job it writes a one-page PDF resume (and, when there is enough overlap with the job, a cover letter) in `data/out/<company>__<title>__<id>/`.

- **Free mode** uses exactly the lines of your resume, re-ordered so the skills, bullets and projects this job asks for come first. Nothing is reworded and nothing is added. The cover letter is assembled from your own resume lines. Set `cover_letter: false` in `config.yaml` if you would rather not send it.
- The tracker shows the share of the job's keywords your resume contains, and lists the ones it lacks. This is an estimate of how keyword screening sees you, not a score any employer reports.

## Free mode and paid mode

`llm.provider` in `config.yaml` decides this. The default is `none`, which is free.

| | `none` (free, default) | `anthropic` (paid) |
|---|---|---|
| Cost | Nothing | Billed per job to your Anthropic API key (set `ANTHROPIC_API_KEY`) |
| Resume | Your own lines, re-ordered per job | Bullets also rephrased in the job's wording; nothing invented |
| Cover letter | Assembled from your resume lines | Written for the job |
| Questions it cannot answer from your profile | Asked to you | Drafted by the model and shown to you for checking; anything uncertain is asked to you |

## Statuses in the tracker

| Status | Meaning |
|---|---|
| `new` / `prepared` | Found, not applied yet |
| `submitted` | Sent (confirmed by the site, or by you) |
| `needs_manual` | You chose "later" |
| `unconfirmed` | Submit was pressed but no confirmation appeared, and you were not sure it went through. Check your email; it is not offered again |
| `skipped` | You skipped it, it was already applied to, or it asks for more experience than your setting allows |
| `closed` | The posting is no longer open |
| `failed` | Something went wrong; the Note column says what. It is offered again next run |

## Good to know

- The browser window remembers logins between runs (`data/browser-profile`), so a site you signed in to stays signed in.
- Some careers sites block automated browsers or need an account; on those you fill the form yourself and answer `d`.
- If `tracker.xlsx` is open in Excel when it is rewritten, the tool writes `tracker-<number>.xlsx` instead.
- Everything personal (company list, resume, profile, documents, browser session, tracker) is in `data/`, `config.yaml` and `profile.yaml`, which git ignores.
- Run the tests with `npm test`.
