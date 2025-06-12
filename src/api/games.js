// src/api/games.js

const axios = require('axios');

// Dit is de Vercel Serverless Function.
// Het neemt een verzoek (req) en stuurt een antwoord (res).
export default async function handler(req, res) {
    // Haal de zoekterm uit de URL (bv. /api/games?term=blox)
    const { term } = req.query;

    let robloxApiUrl;

    if (term) {
        // Als er een zoekterm is, gebruik de zoek-API
        robloxApiUrl = `https://games.roblox.com/v1/games/list?model.keyword=${encodeURIComponent(term)}`;
    } else {
        // Anders, haal de populaire games op
        robloxApiUrl = 'https://games.roblox.com/v1/games/list?model.sortToken=';
    }

    try {
        const response = await axios.get(robloxApiUrl);
        const games = response.data.games;

        // Vraag nu de thumbnails op voor deze games
        if (!games || games.length === 0) {
            return res.status(200).json([]);
        }

        const universeIds = games.map(game => game.universeId).join(',');
        const thumbnailsUrl = `https://thumbnails.roblox.com/v1/games/icons?universeIds=${universeIds}&size=256x256&format=Png&isCircular=false`;
        const thumbnailsResponse = await axios.get(thumbnailsUrl);
        const thumbnailsData = thumbnailsResponse.data.data;

        // Combineer de game data met de thumbnail URLs
        const enrichedGames = games.map(game => {
            const thumbnail = thumbnailsData.find(t => t.targetId === game.universeId);
            return {
                id: game.universeId,
                title: game.name,
                developer: game.creatorName,
                genre: game.genre,
                icon: thumbnail ? thumbnail.imageUrl : `https://placehold.co/150/1F2937/FFFFFF?text=${game.name[0]}`,
                description: game.description,
                visits: game.totalUpVotes, // Gebruik upvotes als stand-in
                players: game.playing,
            };
        });

        // Sta caching toe voor 5 minuten om de API-limieten te respecteren
        res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
        res.status(200).json(enrichedGames);

    } catch (error) {
        console.error('Fout in API route:', error.message);
        res.status(500).json({ message: 'Er is iets misgegaan bij het ophalen van de games.' });
    }
}
