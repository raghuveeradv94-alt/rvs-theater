// Hero banner upload page logic (herobanner table)

const SUPABASE_URL = "https://saflkxxvrsfehxndwncs.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_QmLY9GfaGSowMcd205hQSA_AxkV9vWN";
const BUCKET_NAME = "RVS"; // expected storage bucket

function getSupabaseClient() {
  if (window.supabase?.createClient) {
    return window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  console.error("Supabase client not found. Include @supabase/supabase-js via CDN.");
  return null;
}

const els = {
  form: document.getElementById('bannerForm'),
  status: document.getElementById('formStatus'),
  publishBtn: document.getElementById('publishBtn'),

  movieName: document.getElementById('movieName'),
  description: document.getElementById('description'),
  watchLink: document.getElementById('watchLink'),
  posterInput: document.getElementById('posterInput'),

  previewPoster: document.getElementById('previewPoster'),
  previewTitle: document.getElementById('previewTitle'),
  previewDesc: document.getElementById('previewDesc'),
};

function setStatus(text) {
  els.status.textContent = `Status: ${text}`;
}

function slugify(input) {
  return String(input || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-]/g, '');
}

function updatePreviewFromForm() {
  els.previewTitle.textContent = els.movieName.value?.trim() || 'Movie name';
  els.previewDesc.textContent = els.description.value?.trim() || 'Description will appear here.';
}

function wirePreview() {
  [els.movieName, els.description].forEach(el => el?.addEventListener('input', updatePreviewFromForm));

  els.posterInput?.addEventListener('change', () => {
    const file = els.posterInput.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      els.previewPoster.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

async function uploadPosterToSupabase(posterFile, suggestedName) {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase client not available');

  const ext = posterFile.name?.includes('.') ? posterFile.name.split('.').pop() : 'jpg';
  const fileName = `${suggestedName}-${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(fileName, posterFile, {
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) throw uploadError;

  const res = supabase.storage.from(BUCKET_NAME).getPublicUrl(fileName);
  const publicUrl = res?.data?.publicUrl;

  return publicUrl || res;
}

function extractMovieNameForSlug() {
  return slugify(els.movieName.value) || 'hero-banner';
}

async function publishHeroBanner(e) {
  e.preventDefault();

  const supabase = getSupabaseClient();
  if (!supabase) {
    setStatus('Supabase not configured');
    return;
  }

  const movieName = els.movieName.value.trim();
  const shortDescription = els.description.value.trim();
  const watchLink = els.watchLink.value.trim();
  const posterFile = els.posterInput.files?.[0];

  if (!movieName || !shortDescription || !watchLink || !posterFile) {
    setStatus('please fill all fields');
    return;
  }

  els.publishBtn.disabled = true;
  setStatus('uploading...');

  try {
    const slug = extractMovieNameForSlug();
    const posterUrl = await uploadPosterToSupabase(posterFile, slug);

    // herobanner table columns already created:
    // movie_name, created_at, short_description, watch_link
    // If the poster URL column exists, it should be named `movie_poster` or `poster_url`.
    // We try `movie_poster` to match existing naming in the app.
    const payload = {
      movie_name: movieName,
      short_description: shortDescription,
      watch_link: watchLink,
      movie_poster: posterUrl,
    };

    const { error: insertError } = await supabase.from('herobanner').insert(payload);
    if (insertError) throw insertError;

    setStatus('published');

    els.form.reset();
    els.previewPoster.src = 'https://via.placeholder.com/600x900/0b0b0b/e50914?text=Banner';
    els.previewTitle.textContent = 'Movie name';
    els.previewDesc.textContent = 'Description will appear here.';
  } catch (err) {
    console.error(err);
    setStatus(String(err?.message || err));
  } finally {
    els.publishBtn.disabled = false;
  }
}

function init() {
  wirePreview();
  updatePreviewFromForm();
  els.form?.addEventListener('submit', publishHeroBanner);
}

window.addEventListener('DOMContentLoaded', init);

