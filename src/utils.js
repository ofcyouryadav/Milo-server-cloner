const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

const log = (msg) => console.log(`\x1b[36m${msg}\x1b[0m`);
const logSuccess = (msg) => console.log(`\x1b[32m${msg}\x1b[0m`);
const logError = (msg) => console.log(`\x1b[31m${msg}\x1b[0m`);
const logWarn = (msg) => console.log(`\x1b[33m${msg}\x1b[0m`);

function banner() {
  const c = {
    purple: "\x1b[35m",
    cyan:   "\x1b[36m",
    white:  "\x1b[97m",
    gray:   "\x1b[90m",
    reset:  "\x1b[0m",
  };

  console.clear();
  console.log(c.purple + `
  ╔══════════════════════════════════════════════════╗
  ║                                                  ║
  ║        🌙  M I L O  S E R V E R  C L O N E R    ║
  ║                                                  ║
  ╚══════════════════════════════════════════════════╝` + c.reset);

  console.log(c.cyan + `
  ┌──────────────────────────────────────────────────┐
  │  Developer  :  Ofcyouryadav                            │
  │  Tool       :  Milo Server Cloner               │
  │  Version    :  1.0.0                            │
  │  Support    :  discord.gg/4season │
  └──────────────────────────────────────────────────┘` + c.reset);

  console.log(c.gray + `
  ⚠️  Use responsibly. Only clone servers you own.
  ⚠️  Bot must be in both source and target servers.
  ` + c.reset);
}

module.exports = { sleep, log, logSuccess, logError, logWarn, banner };
rn, banner };
