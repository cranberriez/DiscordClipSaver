"""
Message processing module
"""
from worker.message.message_handler import MessageHandler
from worker.message.batch_processor import BatchMessageProcessor
from worker.message.batch_context import BatchContext
from worker.message.batch_operations import BatchDatabaseOperations

# New utilities (available but not required)
from worker.message import utils
from worker.message import validators
from worker.message import clip_metadata

__all__ = [
    'MessageHandler',
    'BatchMessageProcessor',
    'BatchContext',
    'BatchDatabaseOperations',
    'utils',
    'validators',
    'clip_metadata',
]
