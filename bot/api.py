from fastapi import FastAPI, HTTPException
from typing import Optional, Dict
from pydantic import BaseModel

# ----- In-memory message store -----
# Maps Discord message IDs to their content (and some light metadata).
class StoredMessage(BaseModel):
    id: int
    author_id: int
    channel_id: int
    content: str

MESSAGES: Dict[int, StoredMessage] = {}

# ----- FastAPI app -----
api = FastAPI(title="Discord Message API", version="0.1.0")

@api.get("/messages/{message_id}", response_model=StoredMessage)
async def get_message(message_id: int):
    msg: Optional[StoredMessage] = MESSAGES.get(message_id)
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
    return msg