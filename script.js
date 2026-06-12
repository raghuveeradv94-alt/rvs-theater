// Function to handle section switching
function showSection(sectionId, btnElement) {
    // 1. Remove 'active' class from all sections
    const sections = document.querySelectorAll('.section');
    sections.forEach(section => {
        section.classList.remove('active');
    });

    // 2. Add 'active' class to the clicked section (Fade in animation)
    const targetSection = document.getElementById(sectionId);
    targetSection.classList.add('active');

    // 3. Handle Button Styling
    const allBtns = document.querySelectorAll('.nav-btn');
    allBtns.forEach(btn => btn.classList.remove('active'));

    // Add active class to clicked button with a small timeout to allow the click effect to register
    setTimeout(() => {
        btnElement.classList.add('active');
    }, 100);
}

// ---- Supabase (Public site) ----
// NOTE: client-side writes require permissive RLS policies.
const SUPABASE_URL = "https://saflkxxvrsfehxndwncs.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_QmLY9GfaGSowMcd205hQSA_AxkV9vWN";

function getSupabaseClient() {
    // Prefer the official CDN client if present.
    if (window.supabase?.createClient) {
        return window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }

    // Fallback (do nothing): cards will render from localStorage defaults.
    console.warn("Supabase client not found. Include @supabase/supabase-js via CDN in index.html.");
    return null;
}

function getSavedContent() {
    try {
        return JSON.parse(localStorage.getItem('rvsContent')) || {};
    } catch {
        return {};
    }
}

function getLocalMoviesFallback() {
    const saved = getSavedContent();

    const items = saved.movies?.items;
    if (Array.isArray(items) && items.length) return items;

    if (typeof saved.movies?.text === 'string' && saved.movies.text.trim()) {
        return [
            {
                name: saved.movies?.title || 'Movie',
                poster: 'https://via.placeholder.com/600x900/0b0b0b/e50914?text=Movie',
                description: saved.movies.text,
                releaseDate: '',
                watchLink: 'watch.html'
            }
        ];
    }

    return [
        {
            name: 'Shadow Striker',
            poster: 'https://via.placeholder.com/600x900/0b0b0b/e50914?text=Shadow+Striker',
            shortDescription: 'Action-packed thriller with non-stop adrenaline.',
            releaseDate: '2026-01-10',
            watchLink: 'watch.html?movie=shadow-striker'
        },
        {
            name: 'Laugh Factory',
            poster: 'https://via.placeholder.com/600x900/0b0b0b/e50914?text=Laugh+Factory',
            shortDescription: 'A comedy ride guaranteed to keep you laughing.',
            releaseDate: '2026-02-05',
            watchLink: 'watch.html?movie=laugh-factory'
        },
        {
            name: 'Neon Nights',
            poster: 'https://via.placeholder.com/600x900/0b0b0b/e50914?text=Neon+Nights',
            shortDescription: 'A futuristic sci-fi adventure under electric skies.',
            releaseDate: '2026-03-18',
            watchLink: 'watch.html?movie=neon-nights'
        }
    ];
}

function formatReleaseDate(value) {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });
}

// ---- MOVIES (ALWAYS render ONLY into #movies-cards) ----
async function getMoviesFromSupabase() {
    const supabase = getSupabaseClient();
    if (!supabase) return getLocalMoviesFallback();

    // Fetch movies (separate from hero banners)
    const { data, error } = await supabase
        .from('noticecards')
        .select('movie_name,short_description,release_date,watch_link,movie_poster')
        .order('created_at', { ascending: false });


    if (error) {

        console.error('Supabase fetch failed:', error);
        return getLocalMoviesFallback();
    }

    if (!Array.isArray(data) || !data.length) return [];

    return data.map((row) => ({
        name: row.movie_name,
        poster: row.movie_poster,
        shortDescription: row.short_description,
        releaseDate: row.release_date,
        watchLink: row.watch_link
    }));


}

// TEMP
async function getMovies() {
    try {
        return await getMoviesFromSupabase();
    } catch (e) {
        console.warn('Supabase unreachable; using local fallback', e);
        return getLocalMoviesFallback();
    }
}

function createMovieCard(movie) {
    const card = document.createElement('div');
    card.className = 'movie-card';
    card.tabIndex = 0;
    card.setAttribute('role', 'button');

    const watchLink = movie.watchLink || '#';

    const poster = movie.poster || 'https://via.placeholder.com/600x900/0b0b0b/e50914?text=No+Poster';
    const name = movie.name || movie.title || '';
    const desc = movie.description || movie.shortDescription || '';

    const releaseDate = formatReleaseDate(movie.releaseDate || movie.date || '');

    // Badges for movies (kept separate from notices)
    const isNew = Boolean(releaseDate);
    const badgeNew = isNew ? '🆕 NEW' : '';
    const badgeWatch = '▶️ WATCH NOW';

    card.innerHTML = `
        <img class="movie-poster" src="${poster}" alt="${name}">
        <div class="movie-card-body">
            <div class="movie-title">${name}</div>
            <div class="movie-desc">${desc}</div>
            <div class="movie-meta">
                <span class="movie-tag">${badgeNew}</span>
                <span style="color:#ddd; font-weight:900;">${badgeWatch}</span>
            </div>
        </div>
    `;

    function openDetails() {
        // Persist clicked movie data for the detail page.
        try {
            localStorage.setItem('rvsMovieDetail', JSON.stringify({
                name,
                title: movie.name,
                poster,
                description: movie.description,
                shortDescription: movie.shortDescription,
                releaseDate: movie.releaseDate,
                watchLink,
                watch_link: watchLink
            }));
        } catch (e) {
            // ignore storage errors
        }

        // Route to detail page (no Telegram open here).
        const safeSlug = String(name || '')
            .trim()
            .toLowerCase()
            .replaceAll(/\s+/g, '-')
            .replaceAll(/[^a-z0-9\-]/g, '');

        const url = `movie-detail.html?movie=${encodeURIComponent(safeSlug || name)}`;
        window.location.href = url;
    }

    card.addEventListener('click', openDetails);
    card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openDetails();
        }
    });

    return card;
}

function renderMoviesInto(containerId, movies) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '';

    if (!movies || !movies.length) {
        container.innerHTML = '<p style="color:#aaa;">No movies available.</p>';
        return;
    }

    movies.forEach((m) => container.appendChild(createMovieCard(m)));
}

// ---- NOTICES (ALWAYS render ONLY into #notice-movies) ----
async function getNoticesFromSupabase() {
    const supabase = getSupabaseClient();
    if (!supabase) return [];

    const { data, error } = await supabase
        .from('noticecards')
        .select('movie_name,short_description,release_date,watch_link,movie_poster')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Supabase notice fetch failed:', error);
        return [];
    }

    if (!Array.isArray(data) || !data.length) return [];

    return data.map((row) => ({
        name: row.movie_name,
        poster: row.movie_poster,
        description: row.short_description,
        releaseDate: row.release_date,
        watchLink: row.watch_link
    }));
}

async function getNotices() {
    try {
        return await getNoticesFromSupabase();
    } catch (e) {
        console.warn('Supabase unreachable; notices unavailable', e);
        return [];
    }
}

function pickNoticeBadge(notice) {
    // Since notice upload UI currently has no badge type field, deterministically choose one.
    // Uses releaseDate if provided to alternate between badges.
    const releaseDate = String(notice?.releaseDate || '');
    const seed = releaseDate ? releaseDate : String(notice?.name || '');

    // Simple deterministic choice
    if (hashString(seed) % 2 === 0) return '⭐ MUST WATCH';
    return '▶️ WATCH NOW';
}

function hashString(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
    return h;
}

function createNoticeCard(notice) {
    const card = document.createElement('div');
    card.className = 'notice-card';
    card.tabIndex = 0;
    card.setAttribute('role', 'button');

    const watchLink = notice.watchLink || '#';
    const poster = notice.poster || 'https://via.placeholder.com/600x900/0b0b0b/e50914?text=No+Poster';
    const name = notice.name || '';
    const desc = notice.description || notice.shortDescription || '';

    const badge = pickNoticeBadge(notice);

    card.innerHTML = `
        <div class="notice-ribbon ${badge.includes('MUST') ? 'must' : 'watch'}">${badge}</div>
        <img class="notice-poster" src="${poster}" alt="${name}">
        <div class="notice-card-body">
            <div class="notice-title">${name}</div>
            <div class="notice-desc">${desc}</div>
            <div class="notice-meta">
                <span class="notice-meta-item">Notice</span>
                <span class="notice-meta-item notice-meta-badge">${badge}</span>
            </div>
        </div>
    `;

    function openWatch() {
        if (!watchLink || watchLink === '#') return;
        window.location.href = watchLink;
    }

    card.addEventListener('click', openWatch);
    card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openWatch();
        }
    });

    return card;
}

function renderNoticesInto(containerId, notices) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '';

    if (!notices || !notices.length) {
        container.innerHTML = '<p style="color:#aaa;">No notices available.</p>';
        return;
    }

    notices.forEach((n) => container.appendChild(createNoticeCard(n)));
}

// ---- HERO BANNER (rotates trending movies on Home) ----
let heroRotationTimer = null;

function setHeroFallback() {
    const heroTitle = document.getElementById('hero-title');
    const heroDesc = document.getElementById('hero-desc');
    const heroPoster = document.getElementById('hero-poster');

    if (heroTitle) heroTitle.textContent = 'Trending Now';
    if (heroDesc) heroDesc.textContent = 'Loading top picks...';
    if (heroPoster) heroPoster.src = 'https://via.placeholder.com/900x500/0b0b0b/e50914?text=Trending';
}

function clearHeroTimer() {
    if (heroRotationTimer) {
        clearInterval(heroRotationTimer);
        heroRotationTimer = null;
    }
}

function slugify(input) {
    return String(input || '')
        .trim()
        .toLowerCase()
        .replaceAll(/\s+/g, '-')
        .replaceAll(/[^a-z0-9\-]/g, '');
}

function openMovieDetailsFromHero(movie) {
    if (!movie) return;

    const name = movie.name || movie.title || 'Movie';
    const poster = movie.poster || 'https://via.placeholder.com/600x900/0b0b0b/e50914?text=Poster';
    const description = movie.description || movie.shortDescription || '';
    const releaseDate = movie.releaseDate || movie.release_date || '';
    const watchLink = movie.watchLink || movie.watch_link || '#';

    // Persist selected hero movie so movie-detail.html can render correct data.
    try {
        localStorage.setItem('rvsMovieDetail', JSON.stringify({
            name,
            title: movie.title || movie.name,
            poster,
            description,
            shortDescription: movie.shortDescription || description,
            releaseDate,
            watchLink,
            watch_link: watchLink
        }));
    } catch (e) {
        // ignore localStorage errors
    }

    const safeSlug = slugify(name) || 'movie';
    window.location.href = `movie-detail.html?movie=${encodeURIComponent(safeSlug)}`;
}

function renderHero(heroes) {

    const heroTitle = document.getElementById('hero-title');
    const heroDesc = document.getElementById('hero-desc');
    const heroPoster = document.getElementById('hero-poster');
    const heroWatchBtn = document.getElementById('hero-watch-btn');

    if (!heroTitle || !heroDesc || !heroPoster || !heroWatchBtn) return;
    if (!heroes || !heroes.length) {
        setHeroFallback();
        heroWatchBtn.onclick = null;
        heroWatchBtn.style.opacity = '0.8';
        return;
    }

    heroWatchBtn.style.opacity = '1';

    let idx = 0;
    function showAt(i) {
        const m = heroes[i];
        if (!m) return;
        heroTitle.textContent = m.name || m.title || 'Trending';
        heroDesc.textContent = m.description || m.shortDescription || '';
        heroPoster.src = m.poster || 'https://via.placeholder.com/900x500/0b0b0b/e50914?text=Trending';
        heroWatchBtn.onclick = () => openMovieDetailsFromHero(m);
    }


    showAt(idx);
    clearHeroTimer();
    heroRotationTimer = setInterval(() => {
        idx = (idx + 1) % heroes.length;
        showAt(idx);
    }, 3500);
}

// ---- INIT ----
window.addEventListener('DOMContentLoaded', async () => {
    // MOVIES
    const moviesContainer = document.getElementById('movies-cards');
    const moviesSearchInput = document.getElementById('movies-search-input');
    const moviesClearBtn = document.getElementById('movies-clear-btn');


    if (moviesContainer) {
        const movies = await getMovies();
        const allMovies = Array.isArray(movies) ? movies : [];

        function applyFilter() {
            const q = String(moviesSearchInput?.value || '').trim().toLowerCase();
            const filtered = !q
                ? allMovies
                : allMovies.filter(m => {
                    const name = String(m?.name || '').toLowerCase();
                    const desc = String(m?.description || m?.shortDescription || '').toLowerCase();
                    return name.includes(q) || desc.includes(q);
                });
            renderMoviesInto('movies-cards', filtered);
        }

        if (moviesSearchInput) {
            moviesSearchInput.addEventListener('input', applyFilter);
        }
        if (moviesClearBtn && moviesSearchInput) {
            moviesClearBtn.addEventListener('click', () => {
                moviesSearchInput.value = '';
                applyFilter();
                moviesSearchInput.focus();
            });
        }

        renderMoviesInto('movies-cards', allMovies);
        applyFilter();
    }


    // NOTICES (Notice Board)
    const noticeContainer = document.getElementById('notice-movies');
    if (noticeContainer) {
        const notices = await getNotices();
        renderNoticesInto('notice-movies', Array.isArray(notices) ? notices : []);
    }

    // HERO banner (Home only) - fetch from herobanner table
    const heroContainer = document.getElementById('hero-banner');
    if (heroContainer) {
        const supabase = getSupabaseClient();
        let heroItems = [];

        if (supabase) {
            try {
                const { data, error } = await supabase
                    .from('herobanner')
                    .select('movie_name,short_description,watch_link,movie_poster')
                    .order('created_at', { ascending: false });

                if (!error && Array.isArray(data)) {
                    heroItems = data.map(row => ({
                        name: row.movie_name,
                        description: row.short_description,
                        watchLink: row.watch_link,
                        poster: row.movie_poster
                    }));
                }
            } catch (e) {
                console.warn('Hero banner fetch failed; using fallback', e);
            }
        }

        renderHero(heroItems.slice(0, 5));
    }

});


