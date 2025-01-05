const { Client, GatewayIntentBits } = require('discord.js');
const axios = require('axios');
const fs = require('fs');
const git = require('simple-git')();

// Discord Bot Token
const discordToken = 'MTMyNTE2OTI1NTMyMjIyNjc2MA.GOIDXi.B6wzPffC6wpOW1m24lHlcEu59ICLG6XsnEzSBQ';

// GitHub API Details
const repoOwner = 'TheUltimateVxnom';
const repoName = 'Botdings';
const filePath = 'botStatus.json';
const token = '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';  // Dein GitHub Personal Access Token

// Discord Bot Client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// Funktion, um den aktuellen Status zu erhalten
function getBotStatus() {
  if (client.user?.presence?.status === 'online') {
    return 'online';
  } else if (client.user?.presence?.status === 'dnd') {
    return 'do not disturb';
  } else if (client.user?.presence?.status === 'idle') {
    return 'away';
  } else {
    return 'offline';
  }
}

// Funktion, um den Status auf GitHub zu aktualisieren
async function updateGitHubStatus(status) {
  try {
    // Holen der Datei und deren Inhalt
    const response = await axios.get(`https://api.github.com/repos/${repoOwner}/${repoName}/contents/${filePath}`);
    const sha = response.data.sha;

    // Den neuen Inhalt der JSON-Datei erstellen
    const data = JSON.stringify({ status: status });

    // Datei über die GitHub API updaten
    await axios.put(`https://api.github.com/repos/${repoOwner}/${repoName}/contents/${filePath}`, {
      message: `Update bot status to ${status}`,
      content: Buffer.from(data).toString('base64'),
      sha: sha
    }, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    console.log('Bot status successfully updated to GitHub!');
  } catch (error) {
    console.error('Error updating GitHub status:', error);
  }
}

// Bot Login und Status überprüfen
client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);

  // Regelmäßig den Status prüfen (z.B. alle 5 Minuten)
  setInterval(() => {
    const status = getBotStatus();
    updateGitHubStatus(status);
  }, 300000); // alle 5 Minuten
});

// Login
client.login(discordToken);
