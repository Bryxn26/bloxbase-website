import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
    getAuth, 
    onAuthStateChanged, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut 
} from 'firebase/auth';
import { 
    getFirestore, 
    collection, 
    doc, 
    setDoc, 
    getDoc, 
    addDoc, 
    query, 
    onSnapshot,
    orderBy,
    Timestamp,
    updateDoc,
    arrayUnion,
    arrayRemove,
    where,
    getDocs,
    collectionGroup
} from 'firebase/firestore';
import { Star, Send, Users, Gamepad2, ThumbsUp, MessageSquare, Search, X, User, LogOut, ChevronLeft, Edit, CheckCircle, MoreVertical, Heart, Loader } from 'lucide-react';

const firebaseConfig = {
  apiKey: "AIzaSyC0R76H2CyYxpDFXggBTE7iSJ-QCHfWyOY",
  authDomain: "bloxbase-fbad8.firebaseapp.com",
  databaseURL: "https://bloxbase-fbad8-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "bloxbase-fbad8",
  storageBucket: "bloxbase-fbad8.appspot.com",
  messagingSenderId: "901902387409",
  appId: "1:901902387409:web:78ce298c1b3b60d52d5df0",
  measurementId: "G-XJHP0BRW5M"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Mock data wordt niet meer gebruikt voor de gamelijst, maar nog wel voor de favorieten op de profielpagina.
// Dit lossen we later op door game details per ID op te halen.
const mockGames = [
    { id: 920587237, title: 'Adopt Me!', developer: 'Uplift Games', icon: 'https://placehold.co/150/7E22CE/FFFFFF?text=A' },
    { id: 1537690962, title: 'Brookhaven RP', developer: 'Wolfpaq', icon: 'https://placehold.co/150/16A34A/FFFFFF?text=B' },
];

export default function App() {
    const [user, setUser] = useState(null);
    const [loadingAuth, setLoadingAuth] = useState(true);
    const [view, setView] = useState({ type: 'home', payload: {} });
    const [showAuthModal, setShowAuthModal] = useState(false);
    
    useEffect(() => {
        let unsubscribeUser;
        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
            if (unsubscribeUser) unsubscribeUser();
            if (currentUser) {
                setUser({ ...currentUser, profile: { username: 'Laden...', favorites: [] } });
                const userProfileRef = doc(db, 'users', currentUser.uid);
                unsubscribeUser = onSnapshot(userProfileRef, (docSnap) => {
                    if (docSnap.exists()) {
                        setUser(prevUser => ({ ...prevUser, ...currentUser, profile: docSnap.data() }));
                    } else {
                        const username = currentUser.email.split('@')[0];
                        const profile = { 
                            username: username.length > 15 ? username.substring(0, 15) : username,
                            avatar: `https://placehold.co/40/7C3AED/FFFFFF?text=${username[0].toUpperCase()}`,
                            bio: "Nieuwe BloxBase gebruiker!",
                            createdAt: Timestamp.now(),
                            favorites: []
                        };
                        setDoc(userProfileRef, profile).then(() => setUser({ ...currentUser, profile }));
                    }
                });
            } else {
                setUser(null);
            }
            setLoadingAuth(false);
        });
        return () => {
            unsubscribeAuth();
            if (unsubscribeUser) unsubscribeUser();
        };
    }, []);

    const navigate = (type, payload = {}) => setView({ type, payload });

    const renderView = () => {
        switch (view.type) {
            case 'game': return <GameDetail game={view.payload} user={user} onLoginClick={() => setShowAuthModal(true)} navigate={navigate} />;
            case 'profile': return <UserProfilePage profileId={view.payload.profileId} currentUser={user} navigate={navigate}/>;
            default: return <GameList onSelectGame={(game) => navigate('game', game)} />;
        }
    };

    if (loadingAuth) {
        return <div className="flex items-center justify-center min-h-screen font-bold text-white bg-gray-900 text-xl">Authenticatie controleren...</div>;
    }

    return (
        <div className="min-h-screen font-sans text-white bg-gray-900">
            <Header user={user} onLoginClick={() => setShowAuthModal(true)} navigate={navigate} currentView={view} />
            <main className="max-w-7xl p-4 mx-auto sm:p-6 lg:p-8">{renderView()}</main>
            {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
        </div>
    );
}

function Header({ user, onLoginClick, navigate, currentView }) {
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);
    const handleLogout = async () => { await signOut(auth); setDropdownOpen(false); navigate('home'); };
    useEffect(() => {
        function handleClickOutside(event) { if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setDropdownOpen(false); }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [dropdownRef]);
    return (
        <header className="sticky top-0 z-40 w-full border-b border-gray-700 bg-gray-900/80 backdrop-blur-sm">
            <div className="flex items-center justify-between h-16 max-w-7xl px-4 mx-auto sm:px-6 lg:px-8">
                <div className="flex items-center space-x-4">
                    {currentView.type !== 'home' && (<button onClick={() => navigate('home')} className="flex items-center gap-1 text-gray-300 transition-colors hover:text-white"><ChevronLeft size={20}/> Terug</button>)}
                    <div className="text-2xl font-bold text-purple-400 cursor-pointer flex-shrink-0" onClick={() => navigate('home')}>BloxBase</div>
                </div>
                <div className="flex items-center space-x-4">
                    {user && user.profile ? (
                        <div className="relative" ref={dropdownRef}>
                            <button onClick={() => setDropdownOpen(!dropdownOpen)} className="flex items-center gap-2 p-1 rounded-full hover:bg-gray-700">
                                <span className="hidden font-medium sm:inline">{user.profile.username}</span>
                                {user.profile.avatar && <img src={user.profile.avatar} alt="User Avatar" className="w-9 h-9 rounded-full ring-2 ring-purple-500"/>}
                                <MoreVertical size={20} className={dropdownOpen ? 'text-white' : 'text-gray-400'}/>
                            </button>
                            {dropdownOpen && (<div className="absolute right-0 z-50 py-1 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-md shadow-lg animate-fade-in-fast"><button onClick={() => {navigate('profile', {profileId: user.uid}); setDropdownOpen(false);}} className="flex items-center w-full gap-2 px-4 py-2 text-sm text-left text-gray-200 transition-colors hover:bg-gray-700"><User size={16}/> Mijn Profiel</button><button onClick={handleLogout} className="flex items-center w-full gap-2 px-4 py-2 text-sm text-left text-red-400 transition-colors hover:bg-gray-700"><LogOut size={16}/> Uitloggen</button></div>)}
                        </div>
                    ) : (<button onClick={onLoginClick} className="px-4 py-2 text-sm font-medium text-white transition-colors bg-purple-600 rounded-md hover:bg-purple-700">Aanmelden</button>)}
                </div>
            </div>
        </header>
    );
}

// BIJGEWERKT: GameList met robuustere foutafhandeling
function GameList({ onSelectGame }) {
    const [games, setGames] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const searchTimeout = useRef(null);

    const fetchGames = async (term = '') => {
        setLoading(true);
        setError(null);
        try {
            const endpoint = term ? `/api/games?term=${term}` : '/api/games';
            const response = await fetch(endpoint);
            if (!response.ok) {
                // Probeer de foutmelding van de API te lezen, anders een standaard HTTP-fout
                const errorData = await response.json().catch(() => ({ message: `HTTP fout! Server reageerde met status: ${response.status}` }));
                throw new Error(errorData.message);
            }
            const data = await response.json();
            setGames(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };
    
    useEffect(() => {
        fetchGames();
    }, []);

    const handleSearch = (e) => {
        const term = e.target.value;
        setSearchTerm(term);
        if (searchTimeout.current) clearTimeout(searchTimeout.current);
        searchTimeout.current = setTimeout(() => {
            fetchGames(term.trim());
        }, 500);
    };

    return (
        <div>
            <div className="mb-8 text-center"><h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">Ontdek Roblox Games</h1><p className="mt-4 text-lg text-gray-300">Zoek naar games of bekijk de populairste van dit moment.</p></div>
            <div className="flex flex-col gap-4 p-4 mb-6 bg-gray-800 rounded-lg sm:flex-row items-center">
                <div className="relative flex-grow w-full"><Search className="absolute top-1/2 left-3 text-gray-400 -translate-y-1/2" size={20} /><input type="text" placeholder="Zoek een game op naam..." value={searchTerm} onChange={handleSearch} className="w-full py-2 pl-10 pr-4 text-white bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"/></div>
            </div>
            {loading ? (<div className="flex flex-col items-center justify-center text-center h-64"><Loader className="animate-spin text-purple-400 mb-4" size={48} /></div>) : 
             error ? (<div className="p-6 text-center text-red-300 bg-red-500/10 rounded-lg"><h3 className="font-bold text-lg mb-2">Fout bij het laden</h3><p>{error}</p></div>) : 
            (<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">{games.length > 0 ? (games.map(game => <GameCard key={game.id} game={game} onSelectGame={onSelectGame} />)) : (<p className="col-span-full py-10 text-center text-gray-400">Geen games gevonden.</p>)}</div>)}
        </div>
    );
}

function GameCard({ game, onSelectGame }) { return ( <div onClick={() => onSelectGame(game)} className="overflow-hidden transition-transform duration-200 transform bg-gray-800 rounded-lg shadow-lg cursor-pointer group hover:-translate-y-1 hover:shadow-purple-500/20"><img src={game.icon} alt={game.title} className="object-cover w-full bg-gray-700 aspect-square" /><div className="p-4"><h3 className="text-lg font-bold transition-colors truncate group-hover:text-purple-400">{game.title}</h3><p className="text-sm text-gray-400 truncate">{game.developer}</p><div className="flex items-center justify-between mt-3 text-xs text-gray-300"><span className="flex items-center gap-1"><Users size={14} /> {game.players ? game.players.toLocaleString() : 'N/A'}</span><span className="px-2 py-0.5 text-purple-300 rounded-full bg-purple-500/20">{game.genre || 'Onbekend'}</span></div></div></div>); }
function GameDetail({ game, user, onLoginClick, navigate }) { const [activeTab, setActiveTab] = useState('reviews'); const isFavorited = user?.profile?.favorites?.includes(game.id); const handleFavoriteToggle = async () => { if (!user) { onLoginClick(); return; } const userRef = doc(db, 'users', user.uid); await updateDoc(userRef, { favorites: isFavorited ? arrayRemove(game.id) : arrayUnion(game.id) }); }; return ( <div className="animate-fade-in"> <div className="flex flex-col gap-8 mb-8 md:flex-row"> <div className="relative flex-shrink-0"> <img src={game.icon} alt={game.title} className="w-48 h-48 rounded-lg shadow-lg bg-gray-700" /> </div> <div className="flex-grow"> <div className="flex items-start justify-between"> <h1 className="text-4xl font-bold">{game.title}</h1> <button onClick={handleFavoriteToggle} className={`p-2 rounded-full transition-colors duration-200 ${isFavorited ? 'text-pink-500 bg-pink-500/20' : 'text-gray-400 bg-gray-700 hover:bg-gray-600'}`} title={isFavorited ? "Verwijder uit favorieten" : "Voeg toe aan favorieten"}> <Heart fill={isFavorited ? 'currentColor' : 'none'} size={24} /> </button> </div> <div className="flex items-center gap-2 mt-1 text-lg text-gray-400"> <span>door {game.developer}</span> </div> <p className="max-w-2xl mt-4 text-gray-300">{game.description || "Geen beschrijving beschikbaar."}</p> <div className="flex flex-wrap gap-4 mt-4 text-sm"> <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 rounded-full"><Users size={16} /> <span>{game.players ? game.players.toLocaleString() : 'N/A'} spelers</span></div> <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 rounded-full"><ThumbsUp size={16} /> <span>{game.visits ? game.visits.toLocaleString() : 'N/A'} bezoeken</span></div> <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 rounded-full"><Gamepad2 size={16} /> <span>{game.genre || 'Onbekend'}</span></div> </div> </div> </div> <div className="mb-6 border-b border-gray-700"> <nav className="flex -mb-px space-x-8" aria-label="Tabs"> <button onClick={() => setActiveTab('reviews')} className={`py-4 px-1 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${activeTab === 'reviews' ? 'border-purple-500 text-purple-400' : 'text-gray-400 border-transparent hover:text-gray-200 hover:border-gray-500'}`}>Reviews</button> <button onClick={() => setActiveTab('chat')} className={`py-4 px-1 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${activeTab === 'chat' ? 'border-purple-500 text-purple-400' : 'text-gray-400 border-transparent hover:text-gray-200 hover:border-gray-500'}`}>Community Chat</button> </nav> </div> <div> {activeTab === 'reviews' && <ReviewSection game={game} user={user} onLoginClick={onLoginClick} navigate={navigate} />} {activeTab === 'chat' && <ChatSection game={game} user={user} onLoginClick={onLoginClick} />} </div> </div> ); }
function ReviewSection({ game, user, onLoginClick, navigate }) { const [reviews, setReviews] = useState([]); const [loading, setLoading] = useState(true); const [sortBy, setSortBy] = useState('upvotes'); useEffect(() => { const q = query(collection(db, `games/${game.id}/reviews`), orderBy("timestamp", "desc")); const unsubscribe = onSnapshot(q, (querySnapshot) => { let reviewsData = []; querySnapshot.forEach((doc) => reviewsData.push({ id: doc.id, ...doc.data() })); if (sortBy === 'upvotes') { reviewsData.sort((a, b) => ((b.upvotedBy?.length || 0) - (b.downvotedBy?.length || 0)) - ((a.upvotedBy?.length || 0) - (a.downvotedBy?.length || 0))); } setReviews(reviewsData); setLoading(false); }); return () => unsubscribe(); }, [game.id, sortBy]); const avgRating = reviews.length > 0 ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1) : 'N/A'; return ( <div> <div className="flex flex-col gap-4 p-4 mb-6 bg-gray-800 rounded-lg sm:flex-row justify-between items-center"> <div className="flex items-center gap-2 text-2xl font-bold text-yellow-400"> <Star fill="currentColor" /> <span>Gemiddelde score: {avgRating}</span> </div> <div> <span className="mr-2 text-sm text-gray-400">Sorteer op:</span> <button onClick={() => setSortBy('upvotes')} className={`px-3 py-1 text-sm rounded-l-md ${sortBy === 'upvotes' ? 'bg-purple-600' : 'bg-gray-700 hover:bg-gray-600'}`}>Top</button> <button onClick={() => setSortBy('timestamp')} className={`px-3 py-1 text-sm rounded-r-md ${sortBy === 'timestamp' ? 'bg-purple-600' : 'bg-gray-700 hover:bg-gray-600'}`}>Nieuwste</button> </div> </div> <ReviewForm game={game} user={user} onLoginClick={onLoginClick} /> {loading ? <p>Reviews laden...</p> : reviews.length === 0 ? ( <p className="py-8 text-center text-gray-400">Nog geen reviews. Wees de eerste!</p> ) : ( <div className="space-y-6"> {reviews.map(review => <Review key={review.id} review={review} gameId={game.id} user={user} onLoginClick={onLoginClick} navigate={navigate} />)} </div> )} </div> ); }
function Review({ review, gameId, user, onLoginClick, navigate }) { const hasUpvoted = user && review.upvotedBy?.includes(user.uid); const hasDownvoted = user && review.downvotedBy?.includes(user.uid); const voteScore = (review.upvotedBy?.length || 0) - (review.downvotedBy?.length || 0); const handleVote = async (type) => { if (!user) { onLoginClick(); return; } const reviewRef = doc(db, `games/${gameId}/reviews`, review.id); const oppositeVote = type === 'upvote' ? 'downvotedBy' : 'upvotedBy'; const currentVote = type === 'upvote' ? 'upvotedBy' : 'downvotedBy'; const hasVotedCurrent = type === 'upvote' ? hasUpvoted : hasDownvoted; await updateDoc(reviewRef, { [oppositeVote]: arrayRemove(user.uid), [currentVote]: hasVotedCurrent ? arrayRemove(user.uid) : arrayUnion(user.uid) }); }; return ( <div className="flex gap-4 p-4 bg-gray-800 rounded-lg"> <div className="flex flex-col items-center pt-2 space-y-1 text-gray-400"> <button onClick={() => handleVote('upvote')} className={`p-1 rounded-full ${hasUpvoted ? 'text-green-500 bg-green-500/20' : 'hover:bg-gray-700'}`}><ThumbsUp size={18}/></button> <span className="text-sm font-bold select-none">{voteScore}</span> <button onClick={() => handleVote('downvote')} className={`p-1 rounded-full ${hasDownvoted ? 'text-red-500 bg-red-500/20' : 'hover:bg-gray-700'}`}><ThumbsUp size={18} className="transform rotate-180"/></button> </div> <div className="flex-grow"> <div className="flex items-start space-x-3"> <img src={review.avatar} alt={review.username} className="w-10 h-10 rounded-full cursor-pointer" onClick={() => navigate('profile', {profileId: review.userId})}/> <div> <p className="font-bold cursor-pointer hover:underline" onClick={() => navigate('profile', {profileId: review.userId})}>{review.username}</p> <p className="text-xs text-gray-400">{review.timestamp ? new Date(review.timestamp.toDate()).toLocaleString() : 'Recent'}</p> </div> </div> <div className="flex items-center my-2"> {[...Array(5)].map((_, i) => <Star key={i} size={16} className={i < review.rating ? 'text-yellow-400' : 'text-gray-600'} fill="currentColor" />)} </div> <h4 className="text-lg font-bold">{review.title}</h4> <p className="mt-1 text-gray-300 whitespace-pre-wrap">{review.text}</p> </div> </div> ); }
function UserProfilePage({ profileId, currentUser, navigate }) { const [profile, setProfile] = useState(null); const [reviews, setReviews] = useState([]); const [loading, setLoading] = useState(true); const [showEditModal, setShowEditModal] = useState(false); const isOwnProfile = currentUser?.uid === profileId; const favoriteGames = profile?.favorites ? mockGames.filter(game => profile.favorites.includes(game.id)) : []; useEffect(() => { setLoading(true); const profileRef = doc(db, 'users', profileId); const unsubscribeProfile = onSnapshot(profileRef, (docSnap) => { if (docSnap.exists()) { setProfile({ id: docSnap.id, ...docSnap.data() }); } else { setProfile(null); } setLoading(false); }); const fetchReviews = async () => { const q = query(collectionGroup(db, 'reviews'), where('userId', '==', profileId), orderBy('timestamp', 'desc')); const querySnapshot = await getDocs(q); const userReviews = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id, gameId: doc.ref.parent.parent.id })); const reviewsWithGameTitles = await Promise.all(userReviews.map(async review => { const game = mockGames.find(g => g.id === review.gameId); return { ...review, gameTitle: game?.title || 'Onbekende Game' }; })); setReviews(reviewsWithGameTitles); }; fetchReviews(); return () => unsubscribeProfile(); }, [profileId]); if (loading || !profile) return <div className="p-10 text-center flex items-center justify-center"><Loader className="animate-spin text-purple-400" /></div>; return ( <div className="animate-fade-in"> <div className="relative flex flex-col gap-6 p-6 mb-8 bg-gray-800 rounded-lg sm:flex-row items-center"> <img src={profile.avatar} alt="avatar" className="w-24 h-24 rounded-full ring-4 ring-purple-500"/> <div> <h1 className="text-3xl font-bold">{profile.username}</h1> <p className="mt-1 text-gray-400">{profile.bio}</p> <p className="mt-2 text-xs text-gray-500">Lid sinds: {profile.createdAt ? new Date(profile.createdAt.toDate()).toLocaleDateString() : 'N/A'}</p> </div> {isOwnProfile && ( <button onClick={() => setShowEditModal(true)} className="absolute p-2 text-white transition-colors bg-gray-700 rounded-full top-4 right-4 hover:bg-gray-600"> <Edit size={18} /> </button> )} </div> <div className="mb-8"> <h2 className="mb-4 text-2xl font-bold">Favoriete Games ({favoriteGames.length})</h2> {favoriteGames.length > 0 ? ( <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6"> {favoriteGames.map(game => ( <div key={game.id} onClick={() => navigate('game', game)} className="cursor-pointer group"> <img src={game.icon} alt={game.title} className="w-full rounded-lg aspect-square object-cover mb-2 transition-transform group-hover:scale-105"/> <p className="text-sm font-bold text-center truncate">{game.title}</p> </div> ))} </div> ) : ( <p className="text-gray-400">Deze gebruiker heeft nog geen favoriete games.</p> )} </div> <h2 className="mb-4 text-2xl font-bold">Geschreven reviews ({reviews.length})</h2> <div className="space-y-4"> {reviews.length > 0 ? reviews.map(r => ( <div key={r.id} className="p-4 bg-gray-800 rounded-lg"> <p className="mb-2 text-sm text-gray-400">Review voor <span className="font-bold text-purple-400">{r.gameTitle}</span></p> <div className="flex items-center mb-2"> {[...Array(5)].map((_, i) => <Star key={i} size={16} className={i < r.rating ? 'text-yellow-400' : 'text-gray-600'} fill="currentColor" />)} </div> <h4 className="text-lg font-bold">{r.title}</h4> <p className="mt-1 text-gray-300 whitespace-pre-wrap">{r.text}</p> </div> )) : <p className="text-gray-400">Deze gebruiker heeft nog geen reviews geschreven.</p>} </div> {isOwnProfile && showEditModal && ( <EditProfileModal user={currentUser} onClose={() => setShowEditModal(false)} /> )} </div> ); }
function EditProfileModal({ user, onClose }) { const [username, setUsername] = useState(user.profile.username); const [bio, setBio] = useState(user.profile.bio); const [loading, setLoading] = useState(false); const [error, setError] = useState(''); const handleSubmit = async (e) => { e.preventDefault(); if (username.length < 3) { setError('Gebruikersnaam moet minstens 3 karakters lang zijn.'); return; } setLoading(true); setError(''); const userRef = doc(db, 'users', user.uid); try { await updateDoc(userRef, { username: username, bio: bio }); onClose(); } catch (err) { setError('Er is iets misgegaan. Probeer het opnieuw.'); console.error(err); } finally { setLoading(false); } }; return ( <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 animate-fade-in-fast" onClick={onClose}> <div className="w-full max-w-md p-8 bg-gray-800 rounded-lg shadow-xl" onClick={e => e.stopPropagation()}> <div className="flex items-center justify-between mb-6"> <h2 className="text-2xl font-bold">Profiel Bewerken</h2> <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={24} /></button> </div> {error && <p className="p-3 mb-4 text-sm text-red-300 rounded-md bg-red-500/20">{error}</p>} <form onSubmit={handleSubmit} className="space-y-4"> <div> <label htmlFor="username" className="block mb-1 text-sm font-medium text-gray-300">Gebruikersnaam</label> <input id="username" type="text" value={username} onChange={e => setUsername(e.target.value)} className="w-full px-4 py-2 text-white bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500" /> </div> <div> <label htmlFor="bio" className="block mb-1 text-sm font-medium text-gray-300">Bio</label> <textarea id="bio" value={bio} onChange={e => setBio(e.target.value)} rows="3" maxLength="150" className="w-full px-4 py-2 text-white bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"></textarea> </div> <button type="submit" disabled={loading} className="w-full px-4 py-2 font-bold text-white transition-colors bg-purple-600 rounded-md hover:bg-purple-700 disabled:bg-gray-500"> {loading ? 'Opslaan...' : 'Wijzigingen Opslaan'} </button> </form> </div> </div> ); }
function ReviewForm({ game, user, onLoginClick }) { const [rating, setRating] = useState(0); const [hoverRating, setHoverRating] = useState(0); const [text, setText] = useState(''); const [title, setTitle] = useState(''); const [submitting, setSubmitting] = useState(false); const handleSubmit = async (e) => { e.preventDefault(); if (!user) { onLoginClick(); return; } if (text.length < 10 || rating === 0 || title.length < 3) { alert("Zorg ervoor dat je een titel, een rating en een review van minstens 10 karakters hebt ingevuld."); return; } setSubmitting(true); try { await addDoc(collection(db, `games/${game.id}/reviews`), { userId: user.uid, username: user.profile.username, avatar: user.profile.avatar, rating, title, text, timestamp: Timestamp.now(), upvotedBy: [], downvotedBy: [] }); setRating(0); setText(''); setTitle(''); } catch (error) { console.error("Fout bij het plaatsen van review:", error); alert("Er is iets misgegaan. Probeer het opnieuw."); } finally { setSubmitting(false); } }; if (!user) { return ( <div className="p-4 mb-6 text-center bg-gray-800 rounded-lg"> <p>Je moet aangemeld zijn om een review te schrijven.</p> <button onClick={onLoginClick} className="px-4 py-2 mt-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700">Aanmelden</button> </div> ) } return ( <form onSubmit={handleSubmit} className="p-6 mb-6 bg-gray-800 rounded-lg"> <h3 className="mb-4 text-xl font-bold">Schrijf je eigen review</h3> <div className="flex items-center mb-4"> {[...Array(5)].map((_, index) => { const starValue = index + 1; return ( <Star key={starValue} size={32} className={`cursor-pointer transition-colors ${starValue <= (hoverRating || rating) ? 'text-yellow-400' : 'text-gray-600'}`} fill={starValue <= (hoverRating || rating) ? 'currentColor' : 'none'} onClick={() => setRating(starValue)} onMouseEnter={() => setHoverRating(starValue)} onMouseLeave={() => setHoverRating(0)} /> ); })} </div> <input type="text" placeholder="Titel van je review" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-4 py-2 mb-4 text-white bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500" /> <textarea placeholder="Schrijf hier je review..." value={text} onChange={(e) => setText(e.target.value)} className="w-full px-4 py-2 mb-4 text-white bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500" rows="4"></textarea> <button type="submit" disabled={submitting} className="w-full px-4 py-2 font-medium text-white transition-colors bg-purple-600 rounded-md hover:bg-purple-700 disabled:bg-gray-500"> {submitting ? 'Bezig met plaatsen...' : 'Review plaatsen'} </button> </form> ); }
function ChatSection({ game, user, onLoginClick }) { const [messages, setMessages] = useState([]); const [newMessage, setNewMessage] = useState(''); const [sending, setSending] = useState(false); const chatEndRef = useRef(null); useEffect(() => { const q = query(collection(db, `games/${game.id}/chat`), orderBy('timestamp', 'asc')); const unsubscribe = onSnapshot(q, (querySnapshot) => { const msgs = []; querySnapshot.forEach((doc) => { msgs.push({ id: doc.id, ...doc.data() }); }); setMessages(msgs); }); return () => unsubscribe(); }, [game.id]); useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]); const handleSendMessage = async (e) => { e.preventDefault(); if (!user) { onLoginClick(); return; } if (newMessage.trim() === '') return; setSending(true); try { await addDoc(collection(db, `games/${game.id}/chat`), { userId: user.uid, username: user.profile.username, avatar: user.profile.avatar, text: newMessage, timestamp: Timestamp.now(), }); setNewMessage(''); } catch (error) { console.error("Fout bij verzenden bericht:", error); } finally { setSending(false); } }; return ( <div className="flex flex-col h-[60vh] bg-gray-800 rounded-lg"> <h2 className="p-4 text-xl font-bold border-b border-gray-700">Community Chat voor {game.title}</h2> <div className="flex-grow p-4 space-y-4 overflow-y-auto"> {messages.map(msg => ( <div key={msg.id} className="flex items-start space-x-3"> <img src={msg.avatar} alt={msg.username} className="w-10 h-10 rounded-full"/> <div> <div className="flex items-baseline space-x-2"> <p className="font-bold text-purple-400">{msg.username}</p> <p className="text-xs text-gray-500">{msg.timestamp ? new Date(msg.timestamp.toDate()).toLocaleTimeString() : ''}</p> </div> <p className="text-gray-200">{msg.text}</p> </div> </div> ))} <div ref={chatEndRef} /> </div> {user ? ( <form onSubmit={handleSendMessage} className="flex items-center gap-3 p-4 border-t border-gray-700"> <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Zeg iets..." className="w-full px-4 py-2 text-white bg-gray-700 border border-gray-600 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500" /> <button type="submit" disabled={sending} className="p-3 text-white transition-colors bg-purple-600 rounded-full hover:bg-purple-700 disabled:bg-gray-500"> <Send size={20} /> </button> </form> ) : ( <div className="p-4 text-center border-t border-gray-700"> <p>Je moet <span onClick={onLoginClick} className="font-bold text-purple-400 cursor-pointer hover:underline">aangemeld</span> zijn om te chatten.</p> </div> )} </div> ); }
function AuthModal({ onClose }) { const [isLogin, setIsLogin] = useState(true); const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [error, setError] = useState(''); const [loading, setLoading] = useState(false); const [success, setSuccess] = useState(false); const handleSubmit = async (e) => { e.preventDefault(); setLoading(true); setError(''); try { if (isLogin) { await signInWithEmailAndPassword(auth, email, password); } else { await createUserWithEmailAndPassword(auth, email, password); } setSuccess(true); setTimeout(() => onClose(), 1500); } catch (err) { switch (err.code) { case 'auth/invalid-email': setError('Ongeldig e-mailadres.'); break; case 'auth/user-not-found': setError('Geen account gevonden met dit e-mailadres.'); break; case 'auth/wrong-password': setError('Onjuist wachtwoord.'); break; case 'auth/email-already-in-use': setError('Dit e-mailadres is al in gebruik.'); break; case 'auth/weak-password': setError('Wachtwoord moet minstens 6 karakters lang zijn.'); break; default: setError('Er is iets misgegaan. Probeer het opnieuw.'); } } finally { setLoading(false); } }; if (success) { return ( <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 animate-fade-in-fast"> <div className="flex flex-col items-center justify-center w-full max-w-sm p-8 bg-gray-800 rounded-lg shadow-xl"> <CheckCircle size={64} className="text-green-500 mb-4"/> <h2 className="text-2xl font-bold">Succes!</h2> <p className="text-gray-300">Je bent nu ingelogd.</p> </div> </div> ); } return ( <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 animate-fade-in-fast" onClick={onClose}> <div className="w-full max-w-sm p-8 bg-gray-800 rounded-lg shadow-xl" onClick={e => e.stopPropagation()}> <div className="flex items-center justify-between mb-6"> <h2 className="text-2xl font-bold">{isLogin ? 'Aanmelden' : 'Registreren'}</h2> <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={24} /></button> </div> {error && <p className="p-3 mb-4 text-sm text-red-300 rounded-md bg-red-500/20">{error}</p>} <form onSubmit={handleSubmit} className="space-y-4"> <input type="email" placeholder="E-mailadres" value={email} onChange={e => setEmail(e.target.value)} required className="w-full px-4 py-2 text-white bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500" /> <input type="password" placeholder="Wachtwoord" value={password} onChange={e => setPassword(e.target.value)} required className="w-full px-4 py-2 text-white bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500" /> <button type="submit" disabled={loading} className="w-full px-4 py-2 font-bold text-white transition-colors bg-purple-600 rounded-md hover:bg-purple-700 disabled:bg-gray-500"> {loading ? 'Bezig...' : (isLogin ? 'Aanmelden' : 'Registreren')} </button> </form> <p className="mt-6 text-sm text-center text-gray-400"> {isLogin ? "Nog geen account? " : "Heb je al een account? "} <span onClick={() => {setIsLogin(!isLogin); setError('')}} className="font-bold text-purple-400 cursor-pointer hover:underline"> {isLogin ? 'Registreer hier' : 'Meld je hier aan'} </span> </p> </div> </div> ); }

const style = document.createElement('style');
style.textContent = `
  @keyframes fade-in { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
  .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }
  @keyframes fade-in-fast { from { opacity: 0; } to { opacity: 1; } }
  .animate-fade-in-fast { animation: fade-in-fast 0.2s ease-out forwards; }
`;
document.head.appendChild(style);
