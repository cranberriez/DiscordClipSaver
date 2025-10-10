from fastapi import FastAPI

# ----- FastAPI app -----
api = FastAPI(title="Discord Bot API", version="0.1.0")

@api.get("/health")
async def health():
    return {"status": "ok"}