// Notice upload page logic

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
  form: document.getElementById('noticeForm'),
  status: document.getElementById('formStatus'),
  publishBtn: document.getElementById('publishBtn'),

  movieName: document.getElementById('movieName'),
  shortDescription: document.getElementById('shortDescription'),
  releaseDate: document.getElementById('releaseDate'),
  watchLink: document.getElementById('watchLink'),
  posterInput: document.getElementById('posterInput'),

  previewPoster: document.getElementById('previewPoster'),
  previewTitle: document.getElementById('previewTitle'),
  previewDesc: document.getElementById('previewDesc'),
  previewRelease: document.getElementById('previewRelease'),
  previewWatch: document.getElementById('previewWatch'),
};

function setStatus(text) {
  els.status.textContent = `Status: ${text}`;
}

function formatDateForMeta(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });
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
  els.previewDesc.textContent = els.shortDescription.value?.trim() || 'Short description will appear here.';
  els.previewRelease.textContent = els.releaseDate.value ? formatDateForMeta(els.releaseDate.value) : 'Release date';
  els.previewWatch.textContent = els.watchLink.value?.trim() ? els.watchLink.value.trim() : 'Watch link';
}

function wirePreview() {
  const inputs = [els.movieName, els.shortDescription, els.releaseDate, els.watchLink];
  inputs.forEach(i => i.addEventListener('input', updatePreviewFromForm));

  els.posterInput.addEventListener('change', () => {
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

  const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(fileName);
  // NOTE: @supabase/supabase-js v2 returns { data: { publicUrl } }? but to be safe:
  const publicUrl = data?.publicUrl || supabase.storage.from(BUCKET_NAME).getPublicUrl(fileName).data.publicUrl;
  return publicUrl || data;
}

function extractMovieNameForSlug() {
  return slugify(els.movieName.value) || 'movie';
}

async function publishNotice(e) {
  e.preventDefault();

  const supabase = getSupabaseClient();
  if (!supabase) {
    setStatus('Supabase not configured');
    return;
  }

  const movieName = els.movieName.value.trim();
  const shortDescription = els.shortDescription.value.trim();
  const releaseDate = els.releaseDate.value;
  const watchLink = els.watchLink.value.trim();
  const posterFile = els.posterInput.files?.[0];

  if (!movieName || !shortDescription || !releaseDate || !watchLink || !posterFile) {
    setStatus('please fill all fields');
    return;
  }

  els.publishBtn.disabled = true;
  setStatus('uploading...');

  try {
    const slug = extractMovieNameForSlug();

    // 1) upload poster
    const posterUrl = await uploadPosterToSupabase(posterFile, slug);

    // 2) insert into noticecards
    // Match public index.js expectations:
    // select('movie_name,short_description,release_date,wach_link,movie_poster')
    const payload = {
      movie_name: movieName,
      short_description: shortDescription,
      release_date: releaseDate,
      watch_link: watchLink,
      movie_poster: posterUrl,
    };

    const { error: insertError } = await supabase.from('noticecards').insert(payload);
    if (insertError) throw insertError;

    setStatus('published');
    els.form.reset();
    // reset preview to defaults
    els.previewPoster.src = 'https://via.placeholder.com/600x900/0b0b0b/e50914?text=Poster';
    els.previewTitle.textContent = 'Movie name';
    els.previewDesc.textContent = 'Short description will appear here.';
    els.previewRelease.textContent = 'Release date';
    els.previewWatch.textContent = 'Watch link';

    // optional: redirect back
    // window.location.href = 'admin.html';
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
  els.form.addEventListener('submit', publishNotice);
}

window.addEventListener('DOMContentLoaded', init);

