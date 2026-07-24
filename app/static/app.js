document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const logoBtn = document.getElementById('logoBtn');
  const searchForm = document.getElementById('searchForm');
  const searchInput = document.getElementById('searchInput');
  const mainContent = document.getElementById('mainContent');
  const sidebarGenreGrid = document.getElementById('sidebarGenreGrid');

  // Nav Links
  const navHome = document.getElementById('navHome');
  const navAnimeList = document.getElementById('navAnimeList');
  const navSchedule = document.getElementById('navSchedule');
  const navOngoing = document.getElementById('navOngoing');
  const navComplete = document.getElementById('navComplete');
  const navGenres = document.getElementById('navGenres');
  const navLinks = [navHome, navAnimeList, navSchedule, navOngoing, navComplete, navGenres];

  // App State Cache
  let homeCache = null;
  let animeListCache = null;
  let scheduleCache = null;
  let genresCache = null;

  // Initialize
  initApp();

  function initApp() {
    setupEventListeners();
    loadSidebarGenres();
    renderHomeView();
  }

  function setupEventListeners() {
    logoBtn.addEventListener('click', (e) => {
      e.preventDefault();
      setActiveNav(navHome);
      renderHomeView();
    });

    navHome.addEventListener('click', () => {
      setActiveNav(navHome);
      renderHomeView();
    });

    navAnimeList.addEventListener('click', () => {
      setActiveNav(navAnimeList);
      renderAnimeListView();
    });

    navSchedule.addEventListener('click', () => {
      setActiveNav(navSchedule);
      renderScheduleView();
    });

    navOngoing.addEventListener('click', () => {
      setActiveNav(navOngoing);
      renderHomeView('ongoing');
    });

    navComplete.addEventListener('click', () => {
      setActiveNav(navComplete);
      renderHomeView('complete');
    });

    navGenres.addEventListener('click', () => {
      setActiveNav(navGenres);
      renderGenresView();
    });

    searchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const q = searchInput.value.trim();
      if (q) {
        setActiveNav(null);
        renderSearchView(q);
      }
    });
  }

  function setActiveNav(activeLink) {
    navLinks.forEach(link => {
      if (link) link.classList.toggle('active', link === activeLink);
    });
  }

  // --- SIDEBAR GENRES ---
  async function loadSidebarGenres() {
    try {
      if (!genresCache) {
        const res = await fetch('/api/genres');
        const data = await res.json();
        if (data.status === 'success') {
          genresCache = data.data;
        }
      }
      if (genresCache && sidebarGenreGrid) {
        sidebarGenreGrid.innerHTML = genresCache.map(g => `
          <a class="genre-btn" onclick="appLoadGenre('${g.slug}', '${escapeHtml(g.name)}')">${escapeHtml(g.name)}</a>
        `).join('');
      }
    } catch (err) {
      console.error("Failed to load sidebar genres:", err);
    }
  }

  // --- HOME VIEW ---
  async function renderHomeView(focusSection = null) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    renderSkeletons("Memuat Halaman Utama Otakudesu...");

    try {
      if (!homeCache) {
        const res = await fetch('/api/home');
        const result = await res.json();
        if (result.status === 'success') {
          homeCache = result.data;
        }
      }

      if (!homeCache) {
        mainContent.innerHTML = `<div class="box-section"><div class="box-body">Gagal memuat data Otakudesu. Silakan coba lagi.</div></div>`;
        return;
      }

      const ongoing = homeCache.ongoing || [];
      const complete = homeCache.complete || [];

      let html = '';

      if (focusSection !== 'complete') {
        html += `
          <div class="box-section" id="sectionOngoing">
            <div class="box-header">
              <span>ON-GOING ANIME</span>
              <span style="font-size: 0.8rem; font-weight: normal; text-transform: none;">Rilis Terbaru</span>
            </div>
            <div class="box-body">
              <div class="anime-post-grid">
                ${ongoing.map(item => renderPostCard(item)).join('')}
              </div>
            </div>
          </div>
        `;
      }

      if (focusSection !== 'ongoing') {
        html += `
          <div class="box-section" id="sectionComplete">
            <div class="box-header">
              <span>COMPLETE ANIME</span>
              <span style="font-size: 0.8rem; font-weight: normal; text-transform: none;">Anime Tamat</span>
            </div>
            <div class="box-body">
              <div class="anime-post-grid">
                ${complete.map(item => renderPostCard(item)).join('')}
              </div>
            </div>
          </div>
        `;
      }

      mainContent.innerHTML = html;
    } catch (err) {
      console.error(err);
      mainContent.innerHTML = `<div class="box-section"><div class="box-body">Terjadi kesalahan koneksi.</div></div>`;
    }
  }

  // --- ANIME LIST VIEW (A-Z) ---
  async function renderAnimeListView() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    renderSkeletons("Memuat Daftar Anime A-Z...");

    try {
      if (!animeListCache) {
        const res = await fetch('/api/anime-list');
        const result = await res.json();
        if (result.status === 'success') {
          animeListCache = result.data;
        }
      }

      if (!animeListCache) {
        mainContent.innerHTML = `<div class="box-section"><div class="box-body">Gagal memuat daftar anime.</div></div>`;
        return;
      }

      const groups = animeListCache;
      const letters = groups.map(g => g.letter);

      let html = `
        <div class="box-section">
          <div class="box-header">DAFTAR ANIME (A-Z)</div>
          <div class="box-body">
            <div class="alphabet-bar">
              ${letters.map(l => `<button class="letter-btn" onclick="scrollToLetter('${l}')">${l}</button>`).join('')}
            </div>

            <div class="az-content-wrap">
              ${groups.map(group => `
                <div class="az-group-block" id="letter-${group.letter}">
                  <div class="az-letter-header">${group.letter}</div>
                  <ul class="az-anime-ul">
                    ${group.list.map(anime => `
                      <li class="az-anime-li">
                        <a onclick="appLoadDetail('${anime.slug}')">${escapeHtml(anime.title)}</a>
                      </li>
                    `).join('')}
                  </ul>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      `;

      mainContent.innerHTML = html;
    } catch (err) {
      console.error(err);
    }
  }

  window.scrollToLetter = function(letter) {
    const el = document.getElementById(`letter-${letter}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // --- SCHEDULE VIEW ---
  async function renderScheduleView() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    renderSkeletons("Memuat Jadwal Rilis...");

    try {
      if (!scheduleCache) {
        const res = await fetch('/api/schedule');
        const result = await res.json();
        if (result.status === 'success') {
          scheduleCache = result.data;
        }
      }

      if (!scheduleCache) {
        mainContent.innerHTML = `<div class="box-section"><div class="box-body">Gagal memuat jadwal rilis.</div></div>`;
        return;
      }

      let html = `
        <div class="box-section">
          <div class="box-header">JADWAL RILIS ANIME MINGGUAN</div>
          <div class="box-body">
            <div class="schedule-grid">
              ${scheduleCache.map(day => `
                <div class="schedule-day-card">
                  <div class="schedule-day-title">🗓️ ${escapeHtml(day.day)}</div>
                  <ul class="schedule-anime-ul">
                    ${day.anime && day.anime.length > 0 
                      ? day.anime.map(a => `
                          <li class="schedule-anime-li">
                            <a onclick="appLoadDetail('${a.slug}')">${escapeHtml(a.title)}</a>
                          </li>
                        `).join('')
                      : '<li style="color: var(--otaku-text-muted); padding: 0.5rem 0;">Tidak ada rilis anime hari ini.</li>'
                    }
                  </ul>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      `;

      mainContent.innerHTML = html;
    } catch (err) {
      console.error(err);
    }
  }

  // --- GENRES VIEW ---
  async function renderGenresView() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    renderSkeletons("Memuat Daftar Genre...");

    try {
      if (!genresCache) {
        const res = await fetch('/api/genres');
        const data = await res.json();
        if (data.status === 'success') {
          genresCache = data.data;
        }
      }

      let html = `
        <div class="box-section">
          <div class="box-header">GENRE LIST ANIME</div>
          <div class="box-body">
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 0.75rem;">
              ${genresCache.map(g => `
                <a class="genre-btn" style="padding: 0.75rem; font-size: 0.9rem;" onclick="appLoadGenre('${g.slug}', '${escapeHtml(g.name)}')">
                  🏷️ ${escapeHtml(g.name)}
                </a>
              `).join('')}
            </div>
          </div>
        </div>
      `;

      mainContent.innerHTML = html;
    } catch (err) {
      console.error(err);
    }
  }

  // --- ANIME BY GENRE ---
  window.appLoadGenre = async function(slug, name) {
    setActiveNav(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    renderSkeletons(`Memuat Genre: ${name}...`);

    try {
      const res = await fetch(`/api/genres/${slug}`);
      const result = await res.json();

      if (result.status === 'success') {
        const items = result.data || [];
        let html = `
          <div class="box-section">
            <div class="box-header">GENRE: ${escapeHtml(name).toUpperCase()} (${items.length} ANIME)</div>
            <div class="box-body">
              ${items.length > 0 
                ? `<div class="anime-post-grid">
                    ${items.map(item => renderPostCard(item)).join('')}
                   </div>`
                : `<p style="color: var(--otaku-text-muted);">Tidak ada anime untuk genre ini.</p>`
              }
            </div>
          </div>
        `;
        mainContent.innerHTML = html;
      }
    } catch (err) {
      console.error(err);
    }
  };

  // --- SEARCH VIEW ---
  async function renderSearchView(query) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    renderSkeletons(`Mencari Anime: "${query}"...`);

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const result = await res.json();

      if (result.status === 'success') {
        const items = result.data || [];
        let html = `
          <div class="box-section">
            <div class="box-header">HASIL PENCARIAN: "${escapeHtml(query)}" (${items.length})</div>
            <div class="box-body">
              ${items.length > 0 
                ? `<div class="anime-post-grid">
                    ${items.map(item => renderPostCard(item)).join('')}
                   </div>`
                : `<p style="color: var(--otaku-text-muted);">Anime dengan kata kunci "${escapeHtml(query)}" tidak ditemukan.</p>`
              }
            </div>
          </div>
        `;
        mainContent.innerHTML = html;
      }
    } catch (err) {
      console.error(err);
    }
  }

  // --- ANIME DETAIL VIEW ---
  window.appLoadDetail = async function(slug) {
    setActiveNav(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    renderSkeletons("Memuat Detail Anime...");

    try {
      const res = await fetch(`/api/anime/${slug}`);
      const result = await res.json();

      if (result.status === 'success') {
        const anime = result.data;
        renderAnimeDetail(anime);
      } else {
        mainContent.innerHTML = `<button class="back-navigation-btn" onclick="appGoHome()">← Kembali</button><div class="box-section"><div class="box-body">Gagal memuat detail anime.</div></div>`;
      }
    } catch (err) {
      console.error(err);
    }
  };

  function renderAnimeDetail(anime) {
    const infoRows = [
      { label: "Judul", val: anime.title },
      { label: "Japanese", val: anime.japanese },
      { label: "Skor", val: anime.score ? `★ ${anime.score}` : '' },
      { label: "Produser", val: anime.producer },
      { label: "Tipe", val: anime.type },
      { label: "Status", val: anime.status },
      { label: "Total Episode", val: anime.total_episodes },
      { label: "Durasi", val: anime.duration },
      { label: "Tanggal Rilis", val: anime.release_date },
      { label: "Studio", val: anime.studio },
      { label: "Genre", val: anime.genres ? anime.genres.join(', ') : '' }
    ].filter(r => r.val && r.val.trim() !== '');

    let html = `
      <button class="back-navigation-btn" onclick="appGoHome()">← Kembali ke Daftar Anime</button>

      <div class="box-section">
        <div class="box-header">${escapeHtml(anime.title)}</div>
        <div class="box-body">
          <div class="detail-container">
            
            <div class="detail-top-card">
              <img class="detail-poster-img" src="${anime.thumb || 'https://via.placeholder.com/200x280?text=No+Poster'}" alt="${escapeHtml(anime.title)}">
              <table class="detail-info-table">
                <tbody>
                  ${infoRows.map(r => `
                    <tr>
                      <td class="info-label">${escapeHtml(r.label)}</td>
                      <td>: ${escapeHtml(r.val)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>

            ${anime.synopsis ? `
              <div class="synopsis-card">
                <div class="synopsis-title">SINOPSIS</div>
                <p>${escapeHtml(anime.synopsis)}</p>
              </div>
            ` : ''}

            <div class="episode-list-box">
              <div class="ep-list-header">DAFTAR EPISODE (${anime.episodes ? anime.episodes.length : 0})</div>
              <ul class="ep-ul">
                ${anime.episodes && anime.episodes.length > 0 
                  ? anime.episodes.map(ep => `
                      <li class="ep-li" onclick="appLoadEpisode('${ep.slug}')">
                        <a class="ep-link">▶ ${escapeHtml(ep.title)}</a>
                        <span class="ep-date">${escapeHtml(ep.date)}</span>
                      </li>
                    `).join('')
                  : '<li style="padding: 1rem; color: var(--otaku-text-muted);">Belum ada episode tersedia.</li>'
                }
              </ul>
            </div>

          </div>
        </div>
      </div>
    `;

    mainContent.innerHTML = html;
  }

  // --- EPISODE PLAYER VIEW ---
  window.appLoadEpisode = async function(slug) {
    setActiveNav(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    renderSkeletons("Memuat Player Streaming...");

    try {
      const res = await fetch(`/api/episode/${slug}`);
      const result = await res.json();

      if (result.status === 'success') {
        renderEpisodePlayer(result.data);
      } else {
        mainContent.innerHTML = `<button class="back-navigation-btn" onclick="appGoHome()">← Kembali</button><div class="box-section"><div class="box-body">Gagal memuat episode.</div></div>`;
      }
    } catch (err) {
      console.error(err);
    }
  };

  function renderEpisodePlayer(ep) {
    const hasStream = ep.stream_url && ep.stream_url.trim() !== '';

    let html = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.5rem;">
        <button class="back-navigation-btn" style="margin-bottom: 0;" onclick="appLoadDetail('${ep.anime_slug}')">← Kembali ke Detail Anime</button>
        <span style="font-size: 0.8rem; color: var(--otaku-accent-yellow); font-weight: bold;">🛡️ Ad-Free Player Protection Active</span>
      </div>

      <div class="box-section">
        <div class="box-header">${escapeHtml(ep.title)}</div>
        <div class="box-body">

          <!-- Video Player -->
          ${hasStream 
            ? `<div class="player-box">
                <iframe id="videoPlayerIframe" src="${ep.stream_url}" allowfullscreen sandbox="allow-scripts allow-same-origin allow-forms"></iframe>
               </div>`
            : `<div style="background: #2a1515; border: 1px solid var(--otaku-red); padding: 1.25rem; border-radius: var(--radius-sm); color: #ff8888; text-align: center; margin-bottom: 1rem;">
                ⚠️ Pemutar video tidak langsung tersedia. Gunakan opsi download di bawah.
               </div>`
          }

          <!-- Navigation & Mirrors Buttons -->
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 1.25rem;">
            <div style="display: flex; gap: 0.5rem;">
              ${ep.prev_slug ? `<button class="mirror-btn" onclick="appLoadEpisode('${ep.prev_slug}')">⏮ Episode Sebelumnya</button>` : ''}
              ${ep.next_slug ? `<button class="mirror-btn" onclick="appLoadEpisode('${ep.next_slug}')">Episode Selanjutnya ⏭</button>` : ''}
            </div>
          </div>

          <!-- Download Links Card -->
          ${ep.downloads && ep.downloads.length > 0 ? `
            <div class="download-card">
              <div class="box-header" style="background: #222; font-size: 0.95rem; margin: -1.25rem -1.25rem 1.25rem -1.25rem;">
                📥 LINK DOWNLOAD (BEBAS IKLAN POP-UP & JUDIRAW)
              </div>

              ${ep.downloads.map(group => `
                <div class="download-group">
                  <div class="dl-q-title">🎬 ${escapeHtml(group.quality)} ${group.size ? `(${escapeHtml(group.size)})` : ''}</div>
                  <div class="dl-links-flex">
                    ${group.links.map(link => `
                      <a class="dl-btn" href="${link.url}" target="_blank" rel="noopener noreferrer">
                        ⬇ ${escapeHtml(link.name)}
                      </a>
                    `).join('')}
                  </div>
                </div>
              `).join('')}
            </div>
          ` : ''}

        </div>
      </div>
    `;

    mainContent.innerHTML = html;
  }

  // --- UTILS ---
  window.appGoHome = function() {
    setActiveNav(navHome);
    renderHomeView();
  };

  function renderPostCard(item) {
    const slug = item.slug || '';
    const title = escapeHtml(item.title || '');
    const thumb = item.thumb || 'https://via.placeholder.com/200x280?text=No+Poster';
    const ep = escapeHtml(item.episode || 'Sub Indo');
    const rating = escapeHtml(item.day_or_rating || item.rating || '');
    const date = escapeHtml(item.release_date || '');

    return `
      <div class="detpost" onclick="appLoadDetail('${slug}')">
        <div class="thumb-wrap">
          <img src="${thumb}" alt="${title}" loading="lazy">
          ${ep ? `<span class="badge-epz">${ep}</span>` : ''}
          ${rating ? `<span class="badge-rating">${rating}</span>` : ''}
          ${date ? `<span class="badge-date">${date}</span>` : ''}
        </div>
        <div class="post-title">${title}</div>
      </div>
    `;
  }

  function renderSkeletons(message = "Loading...") {
    mainContent.innerHTML = `
      <div class="box-section">
        <div class="box-header">${escapeHtml(message)}</div>
        <div class="box-body">
          <div class="anime-post-grid">
            ${Array(12).fill(0).map(() => `<div class="detpost skeleton-box" style="height: 260px;"></div>`).join('')}
          </div>
        </div>
      </div>
    `;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
});
