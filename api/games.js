// /api/games.js

const axios = require('axios');

// Functie om de data van meerdere Roblox API's te combineren.
const enrichGameData = async (games) => {
    // Vang het geval op dat 'games' niet bestaat of leeg is.
    if (!games || games.length === 0) {
        return [];
    }

    // Filter ongeldige game-objecten eruit om fouten te voorkomen.
    const validGames = games.filter(game => game && game.universeId);
    if (validGames.length === 0) {
        return [];
    }

    const universeIds = validGames.map(game => game.universeId).join(',');

    const thumbnailsUrl = `https://thumbnails.roblox.com/v1/games/icons?universeIds=${universeIds}&size=256x256&format=Png&isCircular=false`;

    try {
        const thumbnailsResponse = await axios.get(thumbnailsUrl);
        const thumbnailsData = thumbnailsResponse.data.data;

        const enrichedGames = validGames.map(game => {
            // Vind de bijbehorende thumbnail.
            const thumbnail = thumbnailsData.find(t => t.targetId === game.universeId);
            return {
                id: game.universeId,
                title: game.name || 'Onbekende Game',
                developer: game.creatorName || 'Onbekende Ontwikkelaar',
                genre: game.genre || 'Algemeen',
                // Gebruik de thumbnail als deze bestaat, anders een fallback.
                icon: thumbnail && thumbnail.imageUrl ? thumbnail.imageUrl : `https://placehold.co/150/1F2937/FFFFFF?text=${(game.name || '?')[0]}`,
                description: game.description || 'Geen beschrijving beschikbaar.',
                visits: game.totalUpVotes || 0, // Gebruik upvotes als stand-in, met een fallback
                players: game.playing || 0,
            };
        });

        return enrichedGames;
    } catch (error) {
        console.error("Fout bij het ophalen van thumbnails:", error.message);
        // Als thumbnails ophalen mislukt, geef dan de basisinformatie terug.
        return validGames.map(game => ({
            id: game.universeId,
            title: game.name || 'Onbekende Game',
            developer: game.creatorName || 'Onbekende Ontwikkelaar',
            genre: game.genre || 'Algemeen',
            icon: `https://placehold.co/150/1F2937/FFFFFF?text=${(game.name || '?')[0]}`,
            description: game.description || 'Geen beschrijving beschikbaar.',
            visits: game.totalUpVotes || 0,
            players: game.playing || 0,
        }));
    }
};

export default async function handler(req, res) {
    // CORS headers om verbindingen toe te staan.
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { term } = req.query;
    let robloxApiUrl;

    if (term) {
        robloxApiUrl = `https://games.roblox.com/v1/games/list?model.keyword=${encodeURIComponent(term)}`;
    } else {
        robloxApiUrl = 'https://games.roblox.com/v1/games/list?model.sortToken=';
    }

    try {
        const response = await axios.get(robloxApiUrl, { timeout: 5000 }); // Voeg een timeout toe
        const enrichedData = await enrichGameData(response.data.games);
        
        res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
        res.status(200).json(enrichedData);
    } catch (error) {
        console.error('Fout in API route:', error.message);
        res.status(500).json({ message: 'Kon geen games ophalen van Roblox. Probeer het later opnieuw.' });
    }
}
