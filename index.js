const { Client, GatewayIntentBits } = require('discord.js');
const axios = require('axios');
const express = require('express');

// Discord-Bot-Token für den Wächter-Bot
const discordToken = process.env.DISCORD_TOKEN; // Wächter-Bot Token
const targetBotId = '1325169255322226760'; // Ersetze ZIEL_BOT_ID durch die ID des zu überwachenden Bots

// GitHub API Details
const repoOwner = 'TheUltimateVxnom';
const repoName = 'Botdings';
const filePath = 'botStatus.json';
const githubToken = process.env.GITHUB_TOKEN; // GitHub Token aus Umgebungsvariablen

// Wächter-Bot initialisieren
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildPresences],
});

// Letzter bekannter Status
let previousStatus = null;

// Funktion, um den Status des Ziel-Bots zu überprüfen
async function getTargetBotStatus() {
  let status = 'offline'; // Standardstatus
  try {
    // Über alle Gilden iterieren
    for (const [guildId, guild] of client.guilds.cache) {
      const presence = guild.presences.cache.get(targetBotId);
      if (presence) {
        console.log(`Präsenz gefunden in Gilde ${guild.name}: ${presence.status}`);
        if (['online', 'dnd', 'idle'].includes(presence.status)) {
          status = 'up'; // Bot ist online
          break; // Keine weitere Suche erforderlich
        }
      } else {
        console.log(`Keine Präsenz gefunden in Gilde ${guild.name} für Bot-ID ${targetBotId}`);
      }
    }
  } catch (error) {
    console.error('Fehler bei der Überprüfung des Ziel-Bots:', error.message);
  }
  return status;
}

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
    console.error('Fehler beim Aktualisieren des GitHub-Status:', error.message);
  }
}

// Bot-Event: Wenn der Wächter-Bot bereit ist
client.once('ready', async () => {
  console.log(`Wächter-Bot ist online und eingeloggt als ${client.user.tag}`);
  console.log(`Überwache Ziel-Bot mit der ID: ${targetBotId}`);

  // Direkt den Status des Ziel-Bots überprüfen und aktualisieren
  const initialStatus = await getTargetBotStatus();
  await updateGitHubStatus(initialStatus);

  // Status des Ziel-Bots regelmäßig überprüfen (z.B. alle 30 Sekunden)
  setInterval(async () => {
    const currentStatus = await getTargetBotStatus();
    await updateGitHubStatus(currentStatus);
  }, 30000); // alle 30 Sekunden
});

// Login des Wächter-Bots
client
  .login(discordToken)
  .then(() => {
    console.log('Wächter-Bot erfolgreich eingeloggt!');
  })
  .catch((error) => {
    console.error('Fehler beim Einloggen des Wächter-Bots:', error.message);
  });

// Fehlerbehandlung
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err.message);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
});

// Express-Server für Uptime-Monitoring
const app = express();
const PORT = process.env.PORT || 3000;

// Uptime-Monitoring-Endpunkt
app.get('/', (req, res) => {
  res.status(200).send('Wächter-Bot läuft und überwacht!');
});

// Webserver starten
app.listen(PORT, () => {
  console.log(`Webserver läuft auf Port ${PORT}`);
});
