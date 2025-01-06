const { Client, GatewayIntentBits } = require('discord.js');
const axios = require('axios');
const express = require('express');

// Discord-Bot-Token und Ziel-Bot-ID aus Umgebungsvariablen
const discordToken = process.env.DISCORD_TOKEN; // Wächter-Bot Token
const targetBotId = process.env.TARGET_BOT_ID; // Ziel-Bot-ID aus Umgebungsvariablen

// GitHub API Details
const repoOwner = 'TheUltimateVxnom';
const repoName = 'Botdings';
const filePath = 'botStatus.json';
const githubToken = process.env.GITHUB_TOKEN; // GitHub Token aus Umgebungsvariablen

// Wächter-Bot initialisieren
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildPresences],
});

// Website mit Express starten
const app = express();
let websiteStatus = 'online'; // Standardmäßig online

// Website-Route
app.get('/', (req, res) => {
  if (websiteStatus === 'offline') {
    res.send('Website ist derzeit offline wegen Wartung.');
  } else {
    res.send('Willkommen auf der Website!');
  }
});

// Starten des Express-Servers
app.listen(3000, () => {
  console.log('Website läuft auf http://localhost:3000');
});

// Letzter bekannter Status
let previousStatus = null;
let previousWebsiteStatus = null;

// Funktion, um den Status des Ziel-Bots zu überprüfen
function getTargetBotStatus() {
  const targetPresence = client.guilds.cache
    .map((guild) => guild.presences.cache.get(targetBotId))
    .find((presence) => presence);

  if (!targetPresence) {
    console.log(`Ziel-Bot mit der ID ${targetBotId} nicht in der Guild oder keine Präsenzdaten.`);
    return 'offline'; // Bot ist entweder nicht in einer Guild oder keine Präsenz verfügbar
  }

  const status = targetPresence.status;
  if (status === 'online' || status === 'dnd' || status === 'idle') {
    return 'up';
  } else {
    return 'offline';
  }
}

// Funktion, um die Website je nach Bot-Status zu steuern
async function updateWebsiteStatus(status) {
  try {
    if (status === 'up' && websiteStatus !== 'online') {
      console.log('Bot ist online! Website wird wieder verfügbar.');
      websiteStatus = 'online'; // Setzt Website wieder auf "online"
    } else if (status === 'offline' && websiteStatus !== 'offline') {
      console.log('Bot ist offline! Website wird auf Wartung gesetzt.');
      websiteStatus = 'offline'; // Setzt Website auf "offline"
    }
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Website-Status:', error.message);
  }
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
      headers: { Authorization: `Bearer ${githubToken}` },
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
      { headers: { Authorization: `Bearer ${githubToken}` } }
    );

    console.log('Bot-Status erfolgreich auf GitHub aktualisiert!');
  } catch (error) {
    console.error('Fehler beim Aktualisieren des GitHub-Status:', error.message);
  }
}

// Bot-Event: Wenn der Wächter-Bot bereit ist
client.once('ready', () => {
  console.log(`Wächter-Bot ist online und eingeloggt als ${client.user.tag}`);

  // Direkt den Status des Ziel-Bots überprüfen und Website-Status anpassen
  const initialStatus = getTargetBotStatus();
  updateWebsiteStatus(initialStatus);

  // Status des Ziel-Bots regelmäßig überprüfen (z.B. alle 30 Sekunden)
  setInterval(() => {
    const currentStatus = getTargetBotStatus();
    updateWebsiteStatus(currentStatus);
    updateGitHubStatus(currentStatus);
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
