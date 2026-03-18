require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");
const readline = require("readline");
const cloner = require("./src/cloner");
const { banner } = require("./src/utils");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildEmojisAndStickers,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildWebhooks,
    GatewayIntentBits.GuildBans,
    GatewayIntentBits.MessageContent,
  ],
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const ask = (q) => new Promise((res) => rl.question(q, res));

client.once("ready", async () => {
  banner();
  console.log(`\n✅ Logged in as: ${client.user.tag}`);
  console.log("━".repeat(50));

  try {
    await mainMenu(client, rl, ask);
  } catch (err) {
    console.error("❌ Fatal error:", err.message);
  } finally {
    rl.close();
    client.destroy();
    process.exit(0);
  }
});

async function mainMenu(client, rl, ask) {
  console.log("\n📋  MAIN MENU");
  console.log("━".repeat(50));
  console.log("  [1] Clone Server");
  console.log("  [2] Clone Channels Only");
  console.log("  [3] Clone Roles Only");
  console.log("  [4] Clone Emojis Only");
  console.log("  [5] Full Clone (Roles + Channels + Emojis)");
  console.log("  [0] Exit");
  console.log("━".repeat(50));

  const choice = await ask("\n➜ Select option: ");

  switch (choice.trim()) {
    case "1":
    case "5":
      await runClone(client, ask, {
        roles: true,
        channels: true,
        emojis: true,
        bans: choice === "5",
      });
      break;
    case "2":
      await runClone(client, ask, { roles: false, channels: true, emojis: false });
      break;
    case "3":
      await runClone(client, ask, { roles: true, channels: false, emojis: false });
      break;
    case "4":
      await runClone(client, ask, { roles: false, channels: false, emojis: true });
      break;
    case "0":
      console.log("\n👋 Goodbye!\n");
      break;
    default:
      console.log("❌ Invalid option.");
      await mainMenu(client, rl, ask);
  }
}

async function runClone(client, ask, options) {
  console.log("\n━".repeat(50));
  const sourceId = await ask("➜ Source Server ID (to clone FROM): ");
  const targetId = await ask("➜ Target Server ID (to clone INTO): ");

  const source = client.guilds.cache.get(sourceId.trim());
  const target = client.guilds.cache.get(targetId.trim());

  if (!source) return console.log("❌ Source server not found. Make sure the bot is in it.");
  if (!target) return console.log("❌ Target server not found. Make sure the bot is in it.");

  console.log(`\n📤 Source: ${source.name}`);
  console.log(`📥 Target: ${target.name}`);

  const confirm = await ask("\n⚠️  This will OVERWRITE existing roles/channels in the target. Continue? (yes/no): ");
  if (confirm.trim().toLowerCase() !== "yes") {
    return console.log("❌ Cancelled.");
  }

  await cloner.run(client, source, target, options);
}

client.login(process.env.TOKEN).catch((err) => {
  console.error("❌ Failed to login:", err.message);
  console.error("   Check your TOKEN in the .env file.");
  process.exit(1);
});
