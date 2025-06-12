// /api/games.js

const axios = require('axios');

// Functie om de data van meerdere Roblox API's te combineren.
// Dit is nodig omdat de ene API de lijst geeft, en de andere de iconen.
const enrichGameData = async (games) => {
    if (!games || games.length === 0) {
        return [];
    }

    const universeIds = games.map(game => game.universeId).join(',');

    // API-eindpunten voor details en iconen
    const detailsUrl = `https://games.roblox.com/v1/games?universeIds=${universeIds}`;
    const thumbnailsUrl = `https://thumbnails.roblox.com/v1/games/icons?universeIds=${universeIds}&size=256x256&format=Png&isCircular=false`;

    try {
        // Vraag details en thumbnails tegelijkertijd op voor snelheid
        const [detailsResponse, thumbnailsResponse] = await Promise.all([
            axios.get(detailsUrl),
            axios.get(thumbnailsUrl)
        ]);

        const detailsData = detailsResponse.data.data;
        const thumbnailsData = thumbnailsResponse.data.data;

        // Combineer alle data in één schoon object per game
        const enrichedGames = detailsData.map(detail => {
            const thumbnail = thumbnailsData.find(t => t.targetId === detail.id);
            return {
                id: detail.id,
                title: detail.name,
                developer: detail.creator.name,
                genre: detail.genre,
                icon: thumbnail ? thumbnail.imageUrl : `https://placehold.co/150/1F2937/FFFFFF?text=${detail.name[0]}`, // Fallback
                description: detail.description,
                visits: detail.visits,
                players: detail.playing,
            };
        });

        return enrichedGames;

    } catch (error) {
        console.error("Fout bij het verrijken van game data:", error);
        return []; // Geef een lege array terug bij een fout
    }
};

// Dit is de Vercel Serverless Function.
// Het neemt een verzoek (req) en stuurt een antwoord (res).
export default async function handler(req, res) {
    // Sta verzoeken van elke origin toe (noodzakelijk voor Vercel)
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
        const response = await axios.get(robloxApiUrl);
        const enrichedData = await enrichGameData(response.data.games);
        
        // Sta caching toe voor 5 minuten om de API-limieten te respecteren
        res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
        res.status(200).json(enrichedData);

    } catch (error) {
        console.error('Fout in API route:', error.message);
        res.status(500).json({ message: 'Er is iets misgegaan bij het ophalen van de games.' });
    }
}
