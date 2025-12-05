const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

const fs = require("fs");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
});

// ====== ADMIN IDS (can use !add...) ======
const ADMINS = ["484424098164768773"];

// ====== USERS WITH 10s COOLDOWN ======
// add any user id here to give them 0s instead of 30s
const FAST_COOLDOWN_USERS = [
  // "484424098164768773",
];

// ====== COOLDOWN SETTINGS ======
const NORMAL_COOLDOWN_MS = 30 * 1000; // 30 seconds
const FAST_COOLDOWN_MS = 2 * 1000;   // 10 seconds
const cooldowns = new Map(); // userId -> timestamp (ms)

// ====== STOCK FUNCTIONS ======
function loadStock() {
  return JSON.parse(fs.readFileSync("./stock.json", "utf8"));
}

function saveStock(stock) {
  fs.writeFileSync("./stock.json", JSON.stringify(stock, null, 2));
}

// ====== BOT READY ======
client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

// ====== ADD ACCOUNT COMMANDS + !generator ======
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const stock = loadStock();

  // ---- ADD FIVEM ----
  if (message.content.startsWith("!addfivem ")) {
    if (!ADMINS.includes(message.author.id))
      return message.reply("❌ You are not allowed to use this command.");

    const account = message.content.replace("!addfivem ", "").trim();
    if (!account) return message.reply("❌ Please enter an account.");

    stock.fivem.push(account);
    saveStock(stock);
    return message.reply("✅ FiveM account added!");
  }

  // ---- ADD STEAM ----
  if (message.content.startsWith("!addsteam ")) {
    if (!ADMINS.includes(message.author.id))
      return message.reply("❌ You are not allowed to use this command.");

    const account = message.content.replace("!addsteam ", "").trim();
    if (!account) return message.reply("❌ Please enter an account.");

    stock.steam.push(account);
    saveStock(stock);
    return message.reply("✅ Steam account added!");
  }

  // ---- ADD DISCORD ----
  if (message.content.startsWith("!adddiscord ")) {
    if (!ADMINS.includes(message.author.id))
      return message.reply("❌ You are not allowed to use this command.");

    const account = message.content.replace("!adddiscord ", "").trim();
    if (!account) return message.reply("❌ Please enter an account.");

    stock.discord.push(account);
    saveStock(stock);
    return message.reply("✅ Discord account added!");
  }

  // ---- GENERATOR EMBED ----
  if (message.content !== "!generator") return;

  const embed = new EmbedBuilder()
    .setTitle("GENERATOR")
    .setDescription(
      "Click on the buttons below to select the type of account you want.\n\n" +
        "Available services :\n" +
        `│  FiveM Ready Account (Stock: ${stock.fivem.length})\n` +
        `│  Steam Fresh Account (Stock: ${stock.steam.length})\n` +
        `│  Discord Fresh Account (Stock: ${stock.discord.length})\n\n` +
        "If a product is out of stock, please wait."
    )
    .setColor(0xff0000);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("fivem")
      .setLabel("FiveM Ready Account")
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId("steam")
      .setLabel("Steam Fresh Account")
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId("discord")
      .setLabel("Discord Fresh Account")
      .setStyle(ButtonStyle.Primary)
  );

  await message.channel.send({
    embeds: [embed],
    components: [row],
  });
});

// ====== BUTTON INTERACTION + COOLDOWN ======
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;

  const id = interaction.customId;
  if (!["fivem", "steam", "discord"].includes(id)) return;

  const userId = interaction.user.id;

  // ---- COOLDOWN CHECK ----
  const isFastUser =
    FAST_COOLDOWN_USERS.includes(userId) || ADMINS.includes(userId);

  const cooldownDuration = isFastUser
    ? FAST_COOLDOWN_MS
    : NORMAL_COOLDOWN_MS;

  const now = Date.now();
  const userCooldownEnd = cooldowns.get(userId) || 0;

  if (now < userCooldownEnd) {
    const remainingMs = userCooldownEnd - now;
    const remainingSec = Math.ceil(remainingMs / 1000);

    return interaction.reply({
      content: `Please wait **${remainingSec}s** before generating again ⏳.`,
      ephemeral: true,
    });
  }

  // set new cooldown
  cooldowns.set(userId, now + cooldownDuration);

  // ---- STOCK / ACCOUNT LOGIC ----
  const stock = loadStock();
  const list = stock[id];

  if (!list || list.length === 0) {
    return interaction.reply({
      content: "This service is currently **out of stock**❌.",
      ephemeral: true,
    });
  }

  const account = list.shift();
  saveStock(stock);

  try {
    await interaction.user.send(
      " Here is your account:\n\n" +
        "```txt\n" +
        account +
        "\n```\n" +
        "enjoy."
    );

    const serviceName =
      id === "fivem"
        ? "FiveM Ready Account"
        : id === "steam"
        ? "Steam Fresh Account"
        : "Discord Fresh Account";

    await interaction.reply({
      content: `Your **${serviceName}** has been sent to your DMs! 📩`,
      ephemeral: true,
    });
  } catch (err) {
    // if DM failed, return account to stock & remove cooldown (اختياري)
    const stock2 = loadStock();
    stock2[id].unshift(account);
    saveStock(stock2);

    cooldowns.delete(userId);

    await interaction.reply({
      content: "I couldn't send you a DM. Please open your DMs ❌ .",
      ephemeral: true,
    });
  }

});

client.login(process.env.BOT_TOKEN);
