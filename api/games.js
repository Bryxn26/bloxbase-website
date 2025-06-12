const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = 3001;

// Sta alle localhost origins toe voor flexibele ontwikkeling.
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || origin.startsWith('http://localhost')) {
      callback(null, true);
    } else {
      callback(new Error('Niet toegestaan door CORS'));
    }
  }
}));

// Functie om de data van meerdere Roblox API's te combineren.
// Dit maakt de server veel krachtiger.
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

        // Combineer alle data in één object per game
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


// Endpoint voor de meest populaire games
app.get('/api/games/popular', async (req, res) => {
    try {
        const popularGamesUrl = 'https://games.roblox.com/v1/games/list?model.sortToken=';
        const response = await axios.get(popularGamesUrl);
        const enrichedData = await enrichGameData(response.data.games);
        res.json(enrichedData);
    } catch (error) {
        console.error('Fout bij /api/games/popular:', error.message);
        res.status(500).json({ message: 'Kon populaire games niet ophalen' });
    }
});

// NIEUW: Endpoint voor de zoekfunctie
app.get('/api/search', async (req, res) => {
    const { term } = req.query;
    if (!term) {
        return res.status(400).json({ message: 'Zoekterm ontbreekt' });
    }

    try {
        // Gebruik de Roblox search API
        const searchUrl = `https://games.roblox.com/v1/games/list?model.keyword=${encodeURIComponent(term)}`;
        const response = await axios.get(searchUrl);
        const enrichedData = await enrichGameData(response.data.games);
        res.json(enrichedData);
    } catch (error) {
        console.error('Fout bij /api/search:', error.message);
        res.status(500).json({ message: 'Kon zoekresultaten niet ophalen' });
    }
});


app.listen(PORT, () => {
    console.log(`Proxy server luistert op poort ${PORT}`);
});
