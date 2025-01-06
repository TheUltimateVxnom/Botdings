const { Client, GatewayIntentBits } = require('discord.js');
const axios = require('axios');

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
function getTargetBotStatus() {
  const targetPresence = client.guilds.cache
    .map((guild) => guild.presences.cache.get(targetBotId))
    .find((presence) => presence);

  if (!targetPresence) return 'offline';

  const status = targetPresence.status;
  if (status === 'online' || status === 'dnd' || status === 'idle') {
    return 'up';
  } else {
    return 'offline';
  }
}

// Funktion, um den Status auf GitHub zu aktualisieren
async function updateGitHubStatus(status) {
  try {
    // Prüfen, ob der Status sich geändert hat
    if (status === previousStatus) {
      console.log('Status unverändert. Kein Update nötig.');
      return;
    }

    console.log(`Status hat sich geändert: ${previousStatus} -> ${status}`);
    previousStatus = status;

    const url = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${filePath}`;

    // Bestehende Datei auf GitHub abrufen
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${githubToken}`,
      },
    });
    const sha = response.data.sha;

    // Status-Update erstellen
    const data = JSON.stringify({ status });

    // Datei aktualisieren
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
client.once('ready', () => {
  console.log(`Wächter-Bot ist online und eingeloggt als ${client.user.tag}`);

  // Direkt den Status des Ziel-Bots überprüfen und aktualisieren
  const initialStatus = getTargetBotStatus();
  updateGitHubStatus(initialStatus);

  // Status des Ziel-Bots regelmäßig überprüfen (z.B. alle 30 Sekunden)
  setInterval(() => {
    const currentStatus = getTargetBotStatus();
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
