import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
    getAuth, 
    onAuthStateChanged, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut 
} from 'firebase/auth';
import { User, LogOut, CheckCircle, X } from 'lucide-react';


// Jouw persoonlijke Firebase configuratie
// We zetten de sleutels hier direct in om elke mogelijke build-fout
// met Environment Variables te elimineren.
const firebaseConfig = {
  apiKey: "AIzaSyC0R76H2CyYxpDFXggBTE7iSJ-QCHfWyOY",
  authDomain: "bloxbase-fbad8.firebaseapp.com",
  projectId: "bloxbase-fbad8",
  storageBucket: "bloxbase-fbad8.appspot.com",
  messagingSenderId: "901902387409",
  appId: "1:901902387409:web:78ce298c1b3b60d52d5df0",
  measurementId: "G-XJHP0BRW5M"
};

// --- Firebase Initialisatie ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);


// --- HOOFD APP COMPONENT ---
export default function App() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showAuthModal, setShowAuthModal] = useState(false);
    
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    if (loading) {
        return <div className="flex items-center justify-center min-h-screen font-bold text-white bg-gray-900 text-xl">Laden...</div>;
    }

    return (
        <div className="min-h-screen font-sans text-white bg-gray-900">
            <header className="sticky top-0 z-40 w-full border-b border-gray-700 bg-gray-900/80 backdrop-blur-sm">
                <div className="flex items-center justify-between h-16 max-w-7xl px-4 mx-auto sm:px-6 lg:px-8">
                    <div className="text-2xl font-bold text-purple-400">BloxBase</div>
                    <div className="flex items-center space-x-4">
                        {user ? (
                            <div className="flex items-center gap-2">
                                <User className="text-purple-400" />
                                <span className="hidden sm:inline">{user.email}</span>
                                <button onClick={() => signOut(auth)} className="px-3 py-1.5 text-sm font-medium text-red-400 rounded-md hover:bg-gray-700"><LogOut size={18}/></button>
                            </div>
                        ) : (
                            <button onClick={() => setShowAuthModal(true)} className="px-4 py-2 text-sm font-medium text-white transition-colors bg-purple-600 rounded-md hover:bg-purple-700">Aanmelden</button>
                        )}
                    </div>
                </div>
            </header>
            
            <main className="max-w-7xl p-4 mx-auto sm:p-6 lg:p-8">
                <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl mb-4">Welkom bij BloxBase</h1>
                <p className="text-lg text-gray-300">De website wordt momenteel gebouwd. Kom snel terug voor meer features!</p>
            </main>

            {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
        </div>
    );
}

// AuthModal (Aanmeld/Registreer pop-up)
function AuthModal({ onClose }) {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            if (isLogin) {
                await signInWithEmailAndPassword(auth, email, password);
            } else {
                await createUserWithEmailAndPassword(auth, email, password);
            }
            setSuccess(true);
            setTimeout(() => onClose(), 1500);
        } catch (err) {
            switch (err.code) {
                case 'auth/invalid-email': setError('Ongeldig e-mailadres.'); break;
                case 'auth/user-not-found': setError('Geen account gevonden met dit e-mailadres.'); break;
                case 'auth/wrong-password': setError('Onjuist wachtwoord.'); break;
                case 'auth/email-already-in-use': setError('Dit e-mailadres is al in gebruik.'); break;
                case 'auth/weak-password': setError('Wachtwoord moet minstens 6 karakters lang zijn.'); break;
                default: setError('Er is iets misgegaan. Probeer het opnieuw.');
            }
        } finally {
            setLoading(false);
        }
    };
    
    if (success) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
                <div className="flex flex-col items-center justify-center w-full max-w-sm p-8 bg-gray-800 rounded-lg shadow-xl">
                    <CheckCircle size={64} className="mb-4 text-green-500"/>
                    <h2 className="text-2xl font-bold">Succes!</h2>
                    <p className="text-gray-300">Je bent nu ingelogd.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
            <div className="w-full max-w-sm p-8 bg-gray-800 rounded-lg shadow-xl" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold">{isLogin ? 'Aanmelden' : 'Registreren'}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={24} /></button>
                </div>
                {error && <p className="p-3 mb-4 text-sm text-red-300 rounded-md bg-red-500/20">{error}</p>}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <input type="email" placeholder="E-mailadres" value={email} onChange={e => setEmail(e.target.value)} required className="w-full px-4 py-2 text-white bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500" />
                    <input type="password" placeholder="Wachtwoord" value={password} onChange={e => setPassword(e.target.value)} required className="w-full px-4 py-2 text-white bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500" />
                    <button type="submit" disabled={loading} className="w-full px-4 py-2 font-bold text-white transition-colors bg-purple-600 rounded-md hover:bg-purple-700 disabled:bg-gray-500"> {loading ? 'Bezig...' : (isLogin ? 'Aanmelden' : 'Registreren')} </button>
                </form>
                <p className="mt-6 text-sm text-center text-gray-400">
                    {isLogin ? "Nog geen account? " : "Heb je al een account? "}
                    <span onClick={() => {setIsLogin(!isLogin); setError('')}} className="font-bold text-purple-400 cursor-pointer hover:underline">
                        {isLogin ? 'Registreer hier' : 'Meld je hier aan'}
                    </span>
                </p>
            </div>
        </div>
    );
}
