import path from 'node:path';
import { chromium } from 'playwright';
import { DATA, ensureDir } from './util.js';

const exe = () => (process.env.JOB_APPLY_CHROMIUM ? { executablePath: process.env.JOB_APPLY_CHROMIUM } : {});

function explain(err) {
  if (/Executable doesn't exist|browserType\.launch/.test(String(err.message))) {
    return new Error(`The browser could not start. Run "npx playwright install chromium" in the job-apply folder, then try again.\n(${String(err.message).split('\n')[0]})`);
  }
  return err;
}

/** Throwaway headless browser, used only to turn HTML into PDF. */
export async function launchHeadless() {
  try { return await chromium.launch({ headless: true, ...exe() }); } catch (err) { throw explain(err); }
}

/**
 * The browser used for applying. Its profile is kept in data/browser-profile, so cookies and any
 * logins you complete by hand survive between runs.
 */
export async function launchApplyContext({ headless = false } = {}) {
  try {
    return await chromium.launchPersistentContext(ensureDir(path.join(DATA, 'browser-profile')), {
      headless, viewport: { width: 1280, height: 900 }, ...exe(),
    });
  } catch (err) {
    if (/ProcessSingleton|profile.*in use|SingletonLock/i.test(String(err.message))) {
      throw new Error('The apply browser is already open (another run still going?). Close it and try again.');
    }
    throw explain(err);
  }
}
