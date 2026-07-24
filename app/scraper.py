import re
import httpx
from bs4 import BeautifulSoup

BASE_URL = "https://otakudesu.blog"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
    "Referer": BASE_URL
}

# Domain & kata kunci iklan yang diblokir demi keamanan
BLOCKED_KEYWORDS = [
    "slot", "judi", "gacor", "poker", "casino", "togel", "pragmatic", 
    "maxwin", "zeus", "888", "18+", "dewaslot", "sbobet", "bet"
]

def clean_url_slug(url: str, prefix: str = "") -> str:
    """Mengubah URL lengkap Otakudesu menjadi slug saja."""
    if not url:
        return ""
    url = url.rstrip("/")
    slug = url.split("/")[-1]
    return slug

def is_ad_link(url: str, text: str = "") -> bool:
    """Mengecek apakah URL atau teks mengandung kata kunci iklan judi/18+."""
    check_str = (url + " " + text).lower()
    return any(keyword in check_str for keyword in BLOCKED_KEYWORDS)

async def get_home_data():
    """Mengambil anime On-Going dan Complete dari halaman depan Otakudesu."""
    async with httpx.AsyncClient(timeout=15.0, headers=HEADERS, follow_redirects=True) as client:
        res = await client.get(BASE_URL)
        soup = BeautifulSoup(res.text, "lxml")

        ongoing_list = []
        complete_list = []

        # Otakudesu merender section dalam .rapi
        for rapi in soup.select(".rapi"):
            header_el = rapi.select_one(".rheading, .headbar, h1, h2, h3")
            header_text = header_el.get_text(strip=True).lower() if header_el else ""

            is_complete_section = "complete" in header_text

            for post in rapi.select(".detpost"):
                link_el = post.select_one(".thumb a[href]")
                if not link_el:
                    continue

                href = link_el["href"]
                title_el = post.select_one(".jdlflm") or post.select_one(".thumb img[alt]")
                title = title_el.get_text(strip=True) if title_el else ""
                if not title and link_el.get("title"):
                    title = link_el["title"]

                if not title or is_ad_link(href, title):
                    continue

                thumb_el = post.select_one(".thumb img")
                eps_el = post.select_one(".epz")
                day_el = post.select_one(".epztipe")
                date_el = post.select_one(".newnime")

                item_data = {
                    "title": title,
                    "slug": clean_url_slug(href),
                    "episode": eps_el.get_text(strip=True) if eps_el else "",
                    "day_or_rating": day_el.get_text(strip=True) if day_el else "",
                    "release_date": date_el.get_text(strip=True) if date_el else "",
                    "thumb": thumb_el.get("src", "") if thumb_el else ""
                }

                if is_complete_section:
                    complete_list.append(item_data)
                else:
                    ongoing_list.append(item_data)

        # Fallback jika rapi tidak ditemukan, coba selector sekunder
        if not ongoing_list and not complete_list:
            for item in soup.select(".venst .detlists") or soup.select(".venst li"):
                link_el = item.find("a", href=True)
                title_el = item.find("h2") or link_el
                thumb_el = item.find("img")
                eps_el = item.find("div", class_="epz") or item.find("span", class_="epz")
                date_el = item.find("div", class_="newime") or item.find("span", class_="newime")

                if link_el and title_el:
                    title = title_el.get_text(strip=True)
                    link = link_el["href"]
                    if not is_ad_link(link, title):
                        ongoing_list.append({
                            "title": title,
                            "slug": clean_url_slug(link),
                            "episode": eps_el.get_text(strip=True) if eps_el else "",
                            "release_day": date_el.get_text(strip=True) if date_el else "",
                            "thumb": thumb_el.get("src", "") if thumb_el else ""
                        })

        return {
            "ongoing": ongoing_list[:25],
            "complete": complete_list[:25]
        }

async def search_anime(query: str):
    """Mencari anime berdasarkan kata kunci."""
    search_url = f"{BASE_URL}/?s={query}&post_type=anime"
    async with httpx.AsyncClient(timeout=15.0, headers=HEADERS, follow_redirects=True) as client:
        res = await client.get(search_url)
        soup = BeautifulSoup(res.text, "lxml")

        results = []
        for li in soup.select("ul.chivsrc li, ul.chlist li, ul.chshli li"):
            a_tag = li.find("a", href=True)
            if not a_tag:
                continue
            
            href = a_tag["href"]
            title = a_tag.get_text(strip=True)
            
            if is_ad_link(href, title):
                continue

            thumb = li.find("img")
            genres = [g.get_text(strip=True) for g in li.select(".set a, a[href*='/genres/']")]
            set_divs = [div.get_text(strip=True) for div in li.select(".set")]
            status_text = " | ".join(set_divs) if set_divs else ""
            
            results.append({
                "title": title,
                "slug": clean_url_slug(href),
                "thumb": thumb.get("src", "") if thumb else "",
                "genres": genres,
                "status": status_text
            })

        return results

async def get_anime_detail(slug: str):
    """Mengambil informasi detail anime dan daftar episodenya."""
    url = f"{BASE_URL}/anime/{slug}/"
    async with httpx.AsyncClient(timeout=15.0, headers=HEADERS, follow_redirects=True) as client:
        res = await client.get(url)
        if res.status_code != 200:
            return None
        
        soup = BeautifulSoup(res.text, "lxml")

        info_dict = {}
        for p in soup.select(".infozingle p, .fotoanime .infozin p"):
            text = p.get_text(strip=True)
            if ":" in text:
                key, val = text.split(":", 1)
                info_dict[key.strip().lower()] = val.strip()

        title = soup.find("h1") or soup.find("div", class_="posttle")
        thumb = soup.select_one(".fotoanime img, .postcontent img")
        synopsis_el = soup.select_one(".sinopc, .desc, .entry-content p")

        episodes = []
        for li in soup.select(".episodelist ul li"):
            a_tag = li.find("a", href=True)
            date_tag = li.find("span", class_="zee-tgl")
            if a_tag:
                ep_href = a_tag["href"]
                ep_title = a_tag.get_text(strip=True)
                if not is_ad_link(ep_href, ep_title):
                    episodes.append({
                        "title": ep_title,
                        "slug": clean_url_slug(ep_href),
                        "date": date_tag.get_text(strip=True) if date_tag else ""
                    })

        return {
            "title": title.get_text(strip=True) if title else slug,
            "thumb": thumb.get("src", "") if thumb else "",
            "japanese": info_dict.get("japanese", info_dict.get("judul", "")),
            "score": info_dict.get("skor", info_dict.get("score", "")),
            "producer": info_dict.get("produser", ""),
            "type": info_dict.get("tipe", ""),
            "status": info_dict.get("status", ""),
            "total_episodes": info_dict.get("total episode", ""),
            "duration": info_dict.get("durasi", ""),
            "release_date": info_dict.get("tanggal rilis", ""),
            "studio": info_dict.get("studio", ""),
            "genres": [g.get_text(strip=True) for g in soup.select(".infozingle a[href*='/genres/'], .fotoanime a[href*='/genres/']")],
            "synopsis": synopsis_el.get_text(strip=True) if synopsis_el else "",
            "episodes": episodes
        }

async def get_episode_detail(slug: str):
    """Mengambil player video dan link download tanpa iklan."""
    url = f"{BASE_URL}/episode/{slug}/"
    async with httpx.AsyncClient(timeout=15.0, headers=HEADERS, follow_redirects=True) as client:
        res = await client.get(url)
        if res.status_code != 200:
            return None
        
        soup = BeautifulSoup(res.text, "lxml")

        title = soup.find("h1") or soup.find("div", class_="posttle")
        
        # Navigation
        prev_slug = ""
        next_slug = ""
        see_all_slug = ""
        
        for a in soup.select(".flabel a[href*='/episode/'], .flabel a[href*='/anime/'], .navigation a"):
            href = a.get("href", "")
            text = a.get_text(strip=True).lower()
            if "prev" in text or "prev" in href:
                prev_slug = clean_url_slug(href)
            elif "next" in text or "next" in href:
                next_slug = clean_url_slug(href)
            elif "/anime/" in href:
                see_all_slug = clean_url_slug(href)

        # Mirror player iframe
        iframe = soup.select_one(".responsive-embed-stream iframe, .player-embed iframe, #embed_holder iframe, .stream-area iframe, iframe")
        stream_url = iframe.get("src", "") if iframe else ""

        # High-definition download links & qualities
        download_qualities = []
        for ul in soup.select(".download ul li"):
            quality_text = ul.find("strong") or ul.find("b")
            size_text = ul.find("i") or ""
            links = []
            
            for a in ul.find_all("a", href=True):
                dl_name = a.get_text(strip=True)
                dl_url = a["href"]
                if not is_ad_link(dl_url, dl_name):
                    links.append({
                        "name": dl_name,
                        "url": dl_url
                    })
            
            if links:
                download_qualities.append({
                    "quality": quality_text.get_text(strip=True) if quality_text else "Download",
                    "size": size_text.get_text(strip=True) if hasattr(size_text, "get_text") else str(size_text),
                    "links": links
                })

        return {
            "title": title.get_text(strip=True) if title else slug,
            "prev_slug": prev_slug,
            "next_slug": next_slug,
            "anime_slug": see_all_slug,
            "stream_url": stream_url,
            "downloads": download_qualities
        }

async def get_anime_list():
    """Mengambil daftar seluruh anime (A-Z) dari Otakudesu."""
    async with httpx.AsyncClient(timeout=15.0, headers=HEADERS, follow_redirects=True) as client:
        res = await client.get(f"{BASE_URL}/anime-list/")
        soup = BeautifulSoup(res.text, "lxml")
        
        alphabet_map = {}
        for a in soup.select("a[href*='/anime/']"):
            title = a.get_text(strip=True)
            href = a.get("href", "")
            if title and href:
                slug = clean_url_slug(href)
                first_char = title[0].upper()
                letter_key = first_char if first_char.isalpha() else "#"
                if letter_key not in alphabet_map:
                    alphabet_map[letter_key] = []
                alphabet_map[letter_key].append({
                    "title": title,
                    "slug": slug
                })
        
        sorted_keys = sorted(alphabet_map.keys(), key=lambda k: (k != "#", k))
        groups = [{"letter": k, "list": alphabet_map[k]} for k in sorted_keys]
        return groups

async def get_schedule():
    """Mengambil jadwal rilis mingguan anime dari Otakudesu."""
    async with httpx.AsyncClient(timeout=15.0, headers=HEADERS, follow_redirects=True) as client:
        res = await client.get(f"{BASE_URL}/jadwal-rilis/")
        soup = BeautifulSoup(res.text, "lxml")
        
        schedule = []
        days_order = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"]
        
        for h in soup.find_all(["h2", "h3", "h4"]):
            heading_text = h.get_text(strip=True)
            if any(day.lower() in heading_text.lower() for day in days_order):
                nxt = h.find_next_sibling()
                items = []
                if nxt and nxt.name == "ul":
                    for a in nxt.select("li a[href*='/anime/']"):
                        title = a.get_text(strip=True)
                        href = a.get("href", "")
                        if title and href:
                            items.append({
                                "title": title,
                                "slug": clean_url_slug(href)
                            })
                schedule.append({
                    "day": heading_text,
                    "anime": items
                })
        return schedule

async def get_genre_list():
    """Mengambil daftar seluruh genre anime dari Otakudesu."""
    async with httpx.AsyncClient(timeout=15.0, headers=HEADERS, follow_redirects=True) as client:
        res = await client.get(f"{BASE_URL}/genre-list/")
        soup = BeautifulSoup(res.text, "lxml")
        
        genres = []
        for a in soup.select(".genres li a, .genrelist li a, .genrelist a, a[href*='/genres/']"):
            href = a.get("href", "")
            name = a.get_text(strip=True)
            if "/genres/" in href and name and not is_ad_link(href, name):
                genres.append({
                    "name": name,
                    "slug": clean_url_slug(href)
                })
        return genres

async def get_anime_by_genre(genre_slug: str):
    """Mengambil daftar anime berdasarkan genre tertentu."""
    async with httpx.AsyncClient(timeout=15.0, headers=HEADERS, follow_redirects=True) as client:
        res = await client.get(f"{BASE_URL}/genres/{genre_slug}/")
        soup = BeautifulSoup(res.text, "lxml")
        
        results = []
        for col in soup.select(".col-anime, .detpost, .col-md-4"):
            link_el = col.select_one("a[href*='/anime/']")
            title_el = col.select_one(".col-anime-title a, .jdlflm, h2") or link_el
            thumb_el = col.select_one("img")
            eps_el = col.select_one(".col-anime-eps, .epz")
            rating_el = col.select_one(".col-anime-rating, .epztipe")
            studio_el = col.select_one(".col-anime-studio")
            
            if link_el and title_el:
                title = title_el.get_text(strip=True)
                href = link_el["href"]
                if not is_ad_link(href, title):
                    results.append({
                        "title": title,
                        "slug": clean_url_slug(href),
                        "thumb": thumb_el.get("src", "") if thumb_el else "",
                        "episode": eps_el.get_text(strip=True) if eps_el else "",
                        "rating": rating_el.get_text(strip=True) if rating_el else "",
                        "studio": studio_el.get_text(strip=True) if studio_el else ""
                    })
        return results


