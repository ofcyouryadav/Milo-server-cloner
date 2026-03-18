const { ChannelType, PermissionsBitField } = require("discord.js");
const { sleep, log, logSuccess, logError, logWarn } = require("./utils");

/**
 * Main clone runner
 */
async function run(client, source, target, options = {}) {
  const startTime = Date.now();
  const stats = { roles: 0, channels: 0, emojis: 0, errors: 0 };

  console.log("\n🚀 Starting clone process...\n");

  try {
    // 1. Clone Roles
    if (options.roles) {
      log("🎭 Cloning roles...");
      stats.roles = await cloneRoles(source, target);
    }

    // 2. Clone Channels
    if (options.channels) {
      log("📁 Cloning channels...");
      stats.channels = await cloneChannels(source, target);
    }

    // 3. Clone Emojis
    if (options.emojis) {
      log("😀 Cloning emojis...");
      stats.emojis = await cloneEmojis(source, target);
    }

    // 4. Clone Server Icon & Banner
    log("🖼️  Cloning server icon...");
    await cloneServerIcon(source, target);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log("\n" + "━".repeat(50));
    console.log("✅  CLONE COMPLETE");
    console.log("━".repeat(50));
    console.log(`   🎭 Roles cloned:    ${stats.roles}`);
    console.log(`   📁 Channels cloned: ${stats.channels}`);
    console.log(`   😀 Emojis cloned:   ${stats.emojis}`);
    console.log(`   ⏱️  Time elapsed:    ${elapsed}s`);
    console.log("━".repeat(50));
  } catch (err) {
    logError("Clone process failed: " + err.message);
  }
}

/**
 * Clone all roles from source → target
 */
async function cloneRoles(source, target) {
  let count = 0;

  try {
    // Delete existing non-default roles in target
    log("   🗑️  Clearing existing roles...");
    const existingRoles = target.roles.cache
      .filter((r) => r.id !== target.id && r.managed === false)
      .sort((a, b) => b.position - a.position);

    for (const [, role] of existingRoles) {
      try {
        await role.delete("Milo Cloner - clearing for clone");
        await sleep(300);
      } catch {
        // Can't delete managed/bot roles
      }
    }

    // Get source roles sorted by position (lowest first)
    const sourceRoles = source.roles.cache
      .filter((r) => r.id !== source.id)
      .sort((a, b) => a.position - b.position);

    log(`   📥 Cloning ${sourceRoles.size} roles...`);

    for (const [, role] of sourceRoles) {
      try {
        await target.roles.create({
          name: role.name,
          color: role.color,
          hoist: role.hoist,
          permissions: role.permissions,
          mentionable: role.mentionable,
          reason: "Milo Cloner by Ofcyouryadav",
        });
        count++;
        logSuccess(`   ✅ Role: ${role.name}`);
        await sleep(400);
      } catch (err) {
        logError(`   ❌ Failed role "${role.name}": ${err.message}`);
      }
    }
  } catch (err) {
    logError("Role clone failed: " + err.message);
  }

  return count;
}

/**
 * Clone all channels from source → target
 */
async function cloneChannels(source, target) {
  let count = 0;
  const categoryMap = new Map(); // sourceId → targetId

  try {
    // Delete existing channels in target
    log("   🗑️  Clearing existing channels...");
    const existingChannels = target.channels.cache.filter(
      (c) => c.type !== ChannelType.GuildCategory
    );
    for (const [, ch] of existingChannels) {
      try {
        await ch.delete("Milo Cloner - clearing for clone");
        await sleep(300);
      } catch {}
    }
    const existingCategories = target.channels.cache.filter(
      (c) => c.type === ChannelType.GuildCategory
    );
    for (const [, ch] of existingCategories) {
      try {
        await ch.delete("Milo Cloner - clearing for clone");
        await sleep(300);
      } catch {}
    }

    // Get role mapping (source role name → target role)
    const roleNameMap = new Map();
    for (const [, role] of target.roles.cache) {
      roleNameMap.set(role.name, role);
    }

    const buildPermissions = (overwrites, targetGuild) => {
      return overwrites.cache.map((overwrite) => {
        // Map @everyone
        if (overwrite.id === source.roles.everyone.id) {
          return {
            id: targetGuild.roles.everyone.id,
            allow: overwrite.allow,
            deny: overwrite.deny,
          };
        }
        // Map named roles
        const targetRole = roleNameMap.get(
          source.roles.cache.get(overwrite.id)?.name
        );
        if (targetRole) {
          return {
            id: targetRole.id,
            allow: overwrite.allow,
            deny: overwrite.deny,
          };
        }
        return null;
      }).filter(Boolean);
    };

    // 1. Clone Categories first
    const categories = source.channels.cache
      .filter((c) => c.type === ChannelType.GuildCategory)
      .sort((a, b) => a.position - b.position);

    log(`   📂 Cloning ${categories.size} categories...`);
    for (const [, cat] of categories) {
      try {
        const newCat = await target.channels.create({
          name: cat.name,
          type: ChannelType.GuildCategory,
          position: cat.position,
          permissionOverwrites: buildPermissions(cat.permissionOverwrites, target),
          reason: "Milo Cloner by Ofcyouryadav",
        });
        categoryMap.set(cat.id, newCat.id);
        logSuccess(`   ✅ Category: ${cat.name}`);
        count++;
        await sleep(400);
      } catch (err) {
        logError(`   ❌ Category "${cat.name}": ${err.message}`);
      }
    }

    // 2. Clone Text/Voice/Stage/Forum channels
    const channels = source.channels.cache
      .filter((c) => c.type !== ChannelType.GuildCategory)
      .sort((a, b) => a.position - b.position);

    log(`   📁 Cloning ${channels.size} channels...`);
    for (const [, ch] of channels) {
      try {
        const options = {
          name: ch.name,
          type: ch.type,
          position: ch.position,
          permissionOverwrites: buildPermissions(ch.permissionOverwrites, target),
          reason: "Milo Cloner by Ofcyouryadav",
        };

        if (ch.parent) {
          const newParentId = categoryMap.get(ch.parent.id);
          if (newParentId) options.parent = newParentId;
        }

        // Type-specific options
        if (ch.type === ChannelType.GuildText || ch.type === ChannelType.GuildAnnouncement) {
          options.topic = ch.topic || null;
          options.nsfw = ch.nsfw;
          options.rateLimitPerUser = ch.rateLimitPerUser;
        }

        if (ch.type === ChannelType.GuildVoice || ch.type === ChannelType.GuildStageVoice) {
          options.bitrate = Math.min(ch.bitrate, target.maximumBitrate);
          options.userLimit = ch.userLimit;
        }

        await target.channels.create(options);
        logSuccess(`   ✅ Channel: #${ch.name}`);
        count++;
        await sleep(400);
      } catch (err) {
        logError(`   ❌ Channel "#${ch.name}": ${err.message}`);
      }
    }
  } catch (err) {
    logError("Channel clone failed: " + err.message);
  }

  return count;
}

/**
 * Clone emojis from source → target
 */
async function cloneEmojis(source, target) {
  let count = 0;

  try {
    log("   🗑️  Clearing existing emojis...");
    for (const [, emoji] of target.emojis.cache) {
      try {
        await emoji.delete("Milo Cloner - clearing for clone");
        await sleep(300);
      } catch {}
    }

    log(`   😀 Cloning ${source.emojis.cache.size} emojis...`);
    for (const [, emoji] of source.emojis.cache) {
      try {
        const url = emoji.imageURL({ size: 128 });
        await target.emojis.create({
          attachment: url,
          name: emoji.name,
          reason: "Milo Cloner by Ofcyouryadav",
        });
        logSuccess(`   ✅ Emoji: :${emoji.name}:`);
        count++;
        await sleep(500);
      } catch (err) {
        logError(`   ❌ Emoji ":${emoji.name}:": ${err.message}`);
      }
    }
  } catch (err) {
    logError("Emoji clone failed: " + err.message);
  }

  return count;
}

/**
 * Clone server icon
 */
async function cloneServerIcon(source, target) {
  try {
    const iconURL = source.iconURL({ size: 4096, extension: "png" });
    if (iconURL) {
      await target.setIcon(iconURL, "Milo Cloner by Ofcyouryadav");
      logSuccess("   ✅ Server icon cloned");
    }
  } catch (err) {
    logWarn("   ⚠️  Could not clone icon: " + err.message);
  }
}

module.exports = { run };
