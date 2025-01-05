const { Client, GatewayIntentBits } = require('discord.js');
const axios = require('axios');

// Discord Bot Token aus Umgebungsvariablen lesen
const discordToken = process.env.DISCORD_TOKEN;

// GitHub API Details
const repoOwner = 'TheUltimateVxnom';
const repoName = 'Botdings';
const filePath = 'botStatus.json';
const githubToken = process.env.GITHUB_TOKEN; // GitHub Token aus Umgebungsvariablen

// Discord Bot Client initialisieren
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Funktion, um den aktuellen Bot-Status zu erhalten
function getBotStatus() {
  if (client.presence?.status === 'online') {
    return 'online';
  } else if (client.presence?.status === 'dnd') {
    return 'do not disturb';
  } else if (client.presence?.status === 'idle') {
    return 'away';
  } else {
    return 'offline';
  }
}

// Funktion, um den Status auf GitHub zu aktualisieren
async function updateGitHubStatus(status) {
  try {
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

    console.log('Bot status successfully updated to GitHub!');
  } catch (error) {
    console.error('Error updating GitHub status:', error.message);
  }
}

// Bot-Event: Wenn der Bot bereit ist
client.once('ready', () => {
  console.log(`Bot ist online und eingeloggt als ${client.user.tag}`);

  // Direkt den Status aktualisieren
  const initialStatus = getBotStatus();
  updateGitHubStatus(initialStatus);

  // Status regelmäßig prüfen und auf GitHub aktualisieren (z.B. alle 5 Minuten)
  setInterval(() => {
    const currentStatus = getBotStatus();
    updateGitHubStatus(currentStatus);
  }, 300000); // alle 5 Minuten
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
