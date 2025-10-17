"""
Enhanced logging configuration for the worker
Uses shared logger with colors and custom levels
"""
import os
from shared.logger import setup_logging, get_logger

# Setup enhanced logging with colors
log_level = os.getenv("LOG_LEVEL", "INFO")
setup_logging(level=log_level, use_colors=True)

# Get logger for worker module (can be imported by other worker modules)
logger = get_logger(__name__)
