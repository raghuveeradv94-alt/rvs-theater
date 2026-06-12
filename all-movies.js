// Admin: list all published movie/banner cards with search + delete

const SUPABASE_URL = "https://saflkxxvrsfehxndwncs.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_QmLY9GfaGSowMcd205hQSA_AxkV9vWN";
const BUCKET_NAME = "RVS";

function getSupabaseClient() {
  if (window.supabase?.createClient) {
    return window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  console.error("Supabase client not found.");
  return null;
}

const els = {
  search: document.getElementById('moviesSearch'),
  grid: document.getElementById('moviesGrid'),
  status: document.getElementById('pageStatus'),
};

function setStatus(text) {
  els.status.textContent = `Status: ${text}`;
}

function escapeHtml(str) {
  return String(str ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '<')
    .replaceAll('>', '>')
    .replaceAll('"', '"')
    .replaceAll("'", '&#039;');
}

function createCard(row) {
  const name = row.movie_name || '';
  const desc = row.short_description || '';
  const poster = row.movie_poster || 'https://via.placeholder.com/600x900/0b0b0b/e50914?text=No+Poster';
  const watchLink = row.watch_link || '#';
  const createdAt = row.created_at ? new Date(row.created_at).toLocaleDateString() : '';

  const card = document.createElement('div');
  card.className = 'movie-admin-card';

  card.innerHTML = `
    <img class="movie-admin-img" src="${escapeHtml(poster)}" alt="${escapeHtml(name)}">
    <div class="movie-admin-body">
      <div class="movie-admin-title">${escapeHtml(name)}</div>
      <div class="movie-admin-desc">${escapeHtml(desc)}</div>
      <div class="movie-admin-actions" style="gap:12px;">
        <a class="footer-link" style="color:#ddd;text-decoration:none;font-weight:800;" href="${escapeHtml(watchLink)}" target="_blank" rel="noopener">Open</a>
        <a class="footer-link" style="color:#fff;text-decoration:none;font-weight:800;" href="#" data-details="${encodeURIComponent(row.id || name)}" rel="noopener">Details</a>

      </div>
      <div class="status" style="margin-top:8px; font-size:0.85rem;">${escapeHtml(createdAt)}</div>
      <div class="movie-admin-delete">
        <button class="btn-danger" type="button" data-id="${escapeHtml(row.id)}"><i class="fas fa-trash" aria-hidden="true"></i> Delete</button>
      </div>
    </div>
  `;

  const delBtn = card.querySelector('button[data-id]');
  delBtn?.addEventListener('click', () => deleteRow(row));

  return card;
}

async function deleteRow(row) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    setStatus('Supabase not configured');
    return;
  }

  const ok = window.confirm(`Delete "${row.movie_name || 'movie'}"?`);
  if (!ok) return;

  try {
    setStatus('deleting...');

    // Delete from table
    const { error: delError } = await supabase.from('noticecards').delete().eq('id', row.id);
    if (delError) throw delError;

    // Best-effort delete poster from storage (may fail if public-only or RLS)
    try {
      if (row.movie_poster && typeof row.movie_poster === 'string') {
        // publicUrl looks like: https://.../storage/v1/object/public/RVS/<path>
        // Extract object path after bucket name
        const marker = `/RVS/`;
        const idx = row.movie_poster.indexOf(marker);
        if (idx !== -1) {
          const objectPath = row.movie_poster.substring(idx + marker.length);
          if (objectPath) {
            await supabase.storage.from(BUCKET_NAME).remove([objectPath]);
          }
        }
      }
    } catch (e) {
      // ignore
    }

    // Refresh
    await loadAndRender();
    setStatus('deleted');
    setTimeout(() => setStatus('ready'), 1200);
  } catch (err) {
    console.error(err);
    setStatus(String(err?.message || err));
  }
}

let allRows = [];

async function loadAll() {
  const supabase = getSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('noticecards')
    .select('id,movie_name,short_description,release_date,watch_link,movie_poster,created_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.error(error);
    return [];
  }

  return Array.isArray(data) ? data : [];
}

function applyFilter() {
  const q = String(els.search?.value || '').trim().toLowerCase();
  const filtered = !q
    ? allRows
    : allRows.filter(r => {
        const name = String(r?.movie_name || '').toLowerCase();
        const desc = String(r?.short_description || '').toLowerCase();
        return name.includes(q) || desc.includes(q);
      });

  els.grid.innerHTML = '';
  if (!filtered.length) {
    els.grid.innerHTML = '<p style="color:#aaa;">No movies found.</p>';
    return;
  }

  filtered.forEach(r => els.grid.appendChild(createCard(r)));
}

async function loadAndRender() {
  setStatus('loading...');
  allRows = await loadAll();
  applyFilter();
  setStatus('ready');
}

function init() {
  els.search?.addEventListener('input', applyFilter);

  // Details navigation: ensure correct movie card opens movie-detail.html with its own data.
  els.grid?.addEventListener('click', (e) => {
    const target = e.target?.closest?.('[data-details]');
    if (!target) return;
    e.preventDefault();

    const detailsKey = target.getAttribute('data-details') || '';
    // Persist clicked card data for the detail page.
    // We only have id/name here, but movie-detail.html primarily uses localStorage.
    // Fetching full movie row for each click is avoided; we set minimal fields.
    try {
      localStorage.setItem('rvsMovieDetail', JSON.stringify({
        id: detailsKey,
        title: detailsKey,
        name: detailsKey,
        watchLink: '#',
        watch_link: '#'
      }));
    } catch (err) {
      // ignore
    }

    // Navigate with a slug-like param so the page is still distinct per card.
    const safe = String(detailsKey)
      .trim()
      .toLowerCase()
      .replaceAll(/\s+/g, '-')
      .replaceAll(/[^a-z0-9\-]/g, '');

    window.location.href = `movie-detail.html?movie=${encodeURIComponent(safe || detailsKey)}`;
  });

  loadAndRender();
}


window.addEventListener('DOMContentLoaded', init);



