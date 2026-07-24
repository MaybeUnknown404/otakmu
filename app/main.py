import os
from fastapi import FastAPI, Query, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from app.scraper import (
    get_home_data, search_anime, get_anime_detail, get_episode_detail,
    get_anime_list, get_schedule, get_genre_list, get_anime_by_genre
)

app = FastAPI(
    title="Otakudesu Ad-Free API & Web App",
    description="Clean, ad-free streaming & anime parser for Otakudesu",
    version="1.0.0"
)

# API Endpoints
@app.get("/api/home")
async def api_home():
    try:
        data = await get_home_data()
        return {"status": "success", "data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/anime-list")
async def api_anime_list():
    try:
        data = await get_anime_list()
        return {"status": "success", "data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/schedule")
async def api_schedule():
    try:
        data = await get_schedule()
        return {"status": "success", "data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/genres")
async def api_genres():
    try:
        data = await get_genre_list()
        return {"status": "success", "data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/genres/{slug}")
async def api_anime_by_genre(slug: str):
    try:
        data = await get_anime_by_genre(slug)
        return {"status": "success", "data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/search")
async def api_search(q: str = Query(..., min_length=1)):
    try:
        data = await search_anime(q)
        return {"status": "success", "data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/anime/{slug}")
async def api_anime_detail(slug: str):
    try:
        data = await get_anime_detail(slug)
        if not data:
            raise HTTPException(status_code=404, detail="Anime not found")
        return {"status": "success", "data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/episode/{slug}")
async def api_episode_detail(slug: str):
    try:
        data = await get_episode_detail(slug)
        if not data:
            raise HTTPException(status_code=404, detail="Episode not found")
        return {"status": "success", "data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Mount static files
static_dir = os.path.join(os.path.dirname(__file__), "static")
if os.path.exists(static_dir):
    app.mount("/static", StaticFiles(directory=static_dir), name="static")

@app.get("/")
async def root():
    index_path = os.path.join(static_dir, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"message": "Otakudesu Ad-Free API is Running"}
