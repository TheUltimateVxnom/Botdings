const { Client, GatewayIntentBits } = require('discord.js');
const axios = require('axios');
const express = require('express');
const bodyParser = require('body-parser');

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
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

let websiteStatus = 'online'; // Standardmäßig online
let manualOverride = false; // Manuelle Steuerung des Website-Status

// Website-Route (mit Button zum Umschalten)
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Website Status</title>
    </head>
    <body>
        <h1>Website Status: ${websiteStatus}</h1>
        <form method="POST" action="/toggle">
            <button type="submit">${manualOverride ? 'Automatik aktivieren' : 'Manuell down schalten'}</button>
        </form>
        <p>${manualOverride ? 'Manueller Modus ist aktiv!' : 'Automatischer Modus ist aktiv.'}</p>
    </body>
    </html>
  `);
});

// Route für das Umschalten des Status
app.post('/toggle', (req, res) => {
  manualOverride = !manualOverride; // Schaltet den manuellen Modus ein/aus
  if (manualOverride) {
    websiteStatus = 'offline'; // Setzt die Website manuell auf offline
  } else {
    const botStatus = getTargetBotStatus(); // Rückkehr in den automatischen Modus
    updateWebsiteStatus(botStatus);
  }
  res.redirect('/'); // Nach dem Umschalten zurück zur Hauptseite
});

// Starten des Express-Servers
app.listen(3000, () => {
  console.log('Website läuft auf http://localhost:3000');
});

// Letzter bekannter Status
let previousStatus = null;

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
    if (manualOverride) {
      console.log('Manueller Modus ist aktiv. Keine Änderungen am Status.');
      return; // Wenn manuelle Steuerung aktiv ist, passiert nichts
    }

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
