const { Client, GatewayIntentBits, MessageActionRow, MessageButton } = require('discord.js');
const axios = require('axios');
const express = require('express');

// Discord Bot Token und GitHub Token aus Umgebungsvariablen lesen
const discordToken = process.env.DISCORD_TOKEN;
const githubToken = process.env.GITHUB_TOKEN; // GitHub Token aus Umgebungsvariablen

// GitHub API Details
const repoOwner = 'TheUltimateVxnom';
const repoName = 'Botdings';
const filePath = 'botStatus.json';

// Überprüfen, ob die notwendigen Umgebungsvariablen gesetzt sind
if (!discordToken || !githubToken) {
  console.error('Fehlende Umgebungsvariablen: DISCORD_TOKEN oder GITHUB_TOKEN');
  process.exit(1); // Stoppe den Bot, wenn die Umgebungsvariablen fehlen
}

// Discord Bot Client initialisieren
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Express-Server für Uptime Robot
const app = express();
const port = process.env.PORT || 3000; // Render verwendet oft dynamische Ports

// Letzter bekannter Status
let previousStatus = null;

// Funktion, um den aktuellen Bot-Status zu erhalten
function getBotStatus() {
  if (client.presence?.status === 'online' || client.presence?.status === 'dnd' || client.presence?.status === 'idle') {
    return 'online';
  } else {
    return 'offline';
  }
}

// API-Endpoint für Uptime Robot oder BetterStack
app.get('/status', (req, res) => {
  const status = getBotStatus();
  res.json({ status: status });
});

// Funktion, um den Status auf GitHub zu aktualisieren
async function updateGitHubStatus(status) {
  try {
    if (status === previousStatus) {
      console.log('Status unverändert. Kein Update nötig.');
      return;
    }

    console.log(`Status hat sich geändert: ${previousStatus} -> ${status}`);
    previousStatus = status;

    const url = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${filePath}`;

    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${githubToken}`,
      },
    });

    const sha = response.data.sha;

    const data = JSON.stringify({ status });

    await axios.put(
      url,
      {
        message: `Update bot status to ${status}`,
        content: Buffer.from(data).toString('base64'),
        sha,
      },
      {
        headers: {
          Authorization: `Bearer ${githubToken}`,
        },
      }
    );

    console.log('Bot-Status erfolgreich auf GitHub aktualisiert!');
  } catch (error) {
    console.error('Fehler beim Aktualisieren des GitHub-Status:', error.response ? error.response.data : error.message);
  }
}

// Bot-Event: Wenn der Bot bereit ist
client.once('ready', async () => {
  console.log(`Bot ist online und eingeloggt als ${client.user.tag}`);

  // Sicherstellen, dass der Bot vollständig bereit ist, bevor der Status geprüft wird
  setTimeout(() => {
    const initialStatus = getBotStatus();
    updateGitHubStatus(initialStatus);
  }, 1000);

  // Status regelmäßig prüfen und auf GitHub aktualisieren
  setInterval(() => {
    const currentStatus = getBotStatus();
    updateGitHubStatus(currentStatus);
  }, 300000); // alle 5 Minuten

  // Channel für den Button finden und Nachricht senden
  const channel = await client.channels.fetch('1325576429672595600'); // Ersetze 'DEIN_CHANNEL_ID' mit der ID des Channels, in dem der Button erscheinen soll
  const row = new MessageActionRow().addComponents(
    new MessageButton()
      .setCustomId('go_offline')
      .setLabel('Bot Offline schalten')
      .setStyle('DANGER')
  );

  // Sende eine Nachricht mit dem Button
  await channel.send({
    content: 'Klicke den Button, um den Bot offline zu schalten.',
    components: [row],
  });
});

// Event für Button-Click
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;

  if (interaction.customId === 'go_offline') {
    // Setze den Bot offline
    await interaction.reply({ content: 'Der Bot wird jetzt offline geschaltet...', ephemeral: true });

    // Setze die Präsenz auf offline
    await client.user.setPresence({ status: 'invisible' });

    // Aktualisiere GitHub mit dem Offline-Status
    await updateGitHubStatus('offline');
  }
});

// Login des Discord-Bots
client
  .login(discordToken)
  .then(() => {
    console.log('Discord-Bot erfolgreich eingeloggt!');
  })
  .catch((error) => {
    console.error('Fehler beim Einloggen des Discord-Bots:', error.message);
  });

// Fehlerbehandlung
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err.message);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
});

// Starte den Express-Server
app.listen(port, () => {
  console.log(`Server läuft auf Port ${port}`);
});
