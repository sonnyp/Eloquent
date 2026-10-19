export function noop() {}

// Take a function that return a promise and returns a function
// that will discard all calls during a pending execution
// it's like a job queue with a max size of 1 and no concurrency
export function coalesce(fn, onResolve = noop, onReject = console.error) {
  let running = false;
  let queued = false;
  let latest_arguments;

  async function run() {
    running = true;
    try {
      do {
        queued = false;
        try {
          onResolve(await fn(...latest_arguments));
        } catch (err) {
          onReject(err);
        }
      } while (queued);
    } finally {
      running = false;
    }
  }

  return function coalesce_wrapper(...args) {
    latest_arguments = args;
    if (running) {
      queued = true;
      return;
    }
    run();
  };
}

// Never rejects
export function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

// Never rejects
export async function retry(fn, ms, onReject = console.error) {
  let resolved = false;
  let res;

  while (!resolved) {
    try {
      res = await fn();
      resolved = true;
    } catch (err) {
      onReject(err);
      await delay(ms);
    }
  }

  return res;
}
