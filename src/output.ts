// Central output module for blog (§19.4).
//
// All user-facing messages route through the semantic helpers below so that
// formatting and routing can change in one place. Raw `console.log`/`process.stderr.write`
// must not appear outside this module.

export function status(msg: string): void {
  process.stderr.write(`✓  ${msg}\n`);
}

export function warn(msg: string): void {
  process.stderr.write(`!  ${msg}\n`);
}

export function info(msg: string): void {
  process.stderr.write(`${msg}\n`);
}

export function header(msg: string): void {
  process.stderr.write(`== ${msg} ==\n`);
}

export function error(msg: string): void {
  process.stderr.write(`✗  ${msg}\n`);
}
