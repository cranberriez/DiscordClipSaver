from tortoise import Tortoise
from .config import TORTOISE_ORM


async def init_db(generate_schemas: bool = False) -> None:
    await Tortoise.init(config=TORTOISE_ORM)
    if generate_schemas:
        await Tortoise.generate_schemas(safe=True)


async def close_db() -> None:
    await Tortoise.close_connections()
