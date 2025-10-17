"""
Enhanced logging configuration with colors and custom levels
"""
import logging
import logging.config
from typing import Optional

try:
    import colorlog
    COLORLOG_AVAILABLE = True
except ImportError:
    COLORLOG_AVAILABLE = False

# Define custom VERBOSE level (between INFO=20 and DEBUG=10)
VERBOSE = 15
logging.addLevelName(VERBOSE, "VERBOSE")

def verbose(self, message, *args, **kwargs):
    """Log a message with VERBOSE level"""
    if self.isEnabledFor(VERBOSE):
        self._log(VERBOSE, message, args, **kwargs)

# Add verbose method to Logger class
logging.Logger.verbose = verbose


def setup_logging(level: str = "INFO", use_colors: bool = True) -> None:
    """
    Setup enhanced logging with colors and custom format
    
    Args:
        level: Logging level (DEBUG, VERBOSE, INFO, WARNING, ERROR, CRITICAL)
        use_colors: Enable colored output (requires colorlog)
    """
    # Convert level string to logging constant
    level_map = {
        "DEBUG": logging.DEBUG,
        "VERBOSE": VERBOSE,
        "INFO": logging.INFO,
        "WARNING": logging.WARNING,
        "ERROR": logging.ERROR,
        "CRITICAL": logging.CRITICAL,
    }
    log_level = level_map.get(level.upper(), logging.INFO)
    
    # Choose formatter based on colorlog availability
    if use_colors and COLORLOG_AVAILABLE:
        # Colored formatter
        formatter = colorlog.ColoredFormatter(
            fmt="%(asctime)s %(log_color)s[%(levelname)-8s]%(reset)s %(cyan)s%(funcName)s%(reset)s: %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
            log_colors={
                'DEBUG': 'blue',
                'VERBOSE': 'cyan',
                'INFO': 'green',
                'WARNING': 'yellow',
                'ERROR': 'red',
                'CRITICAL': 'red,bg_white',
            },
            secondary_log_colors={},
            style='%'
        )
    else:
        # Plain formatter (fallback)
        formatter = logging.Formatter(
            fmt="%(asctime)s [%(levelname)-8s] %(funcName)s: %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S"
        )
    
    # Configure handler
    handler = logging.StreamHandler()
    handler.setFormatter(formatter)
    
    # Configure root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)
    root_logger.handlers = []  # Clear existing handlers
    root_logger.addHandler(handler)
    
    # Set specific levels for third-party libraries to reduce noise
    logging.getLogger("discord").setLevel(logging.INFO)
    logging.getLogger("discord.gateway").setLevel(logging.WARNING)  # Reduce gateway noise
    logging.getLogger("discord.client").setLevel(logging.WARNING)  # Reduce client noise
    logging.getLogger("uvicorn").setLevel(logging.INFO)
    logging.getLogger("uvicorn.error").setLevel(logging.INFO)
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)  # Reduce access log noise


def get_logger(name: str) -> logging.Logger:
    """
    Get a logger instance with the given name
    
    Args:
        name: Logger name (usually __name__)
        
    Returns:
        Logger instance with enhanced capabilities
    """
    return logging.getLogger(name)


# Logging configuration dict (for compatibility with existing code)
def get_log_config(level: str = "INFO") -> dict:
    """
    Get logging configuration dict for logging.config.dictConfig
    
    Args:
        level: Logging level (DEBUG, VERBOSE, INFO, WARNING, ERROR, CRITICAL)
        
    Returns:
        Logging configuration dictionary
    """
    level_map = {
        "DEBUG": logging.DEBUG,
        "VERBOSE": VERBOSE,
        "INFO": logging.INFO,
        "WARNING": logging.WARNING,
        "ERROR": logging.ERROR,
        "CRITICAL": logging.CRITICAL,
    }
    log_level = level_map.get(level.upper(), logging.INFO)
    
    # Determine if we should use colored formatter
    use_colors = COLORLOG_AVAILABLE
    
    if use_colors:
        formatter_class = "colorlog.ColoredFormatter"
        formatter_config = {
            "()": formatter_class,
            "format": "%(asctime)s %(log_color)s[%(levelname)-8s]%(reset)s %(cyan)s%(funcName)s%(reset)s: %(message)s",
            "datefmt": "%Y-%m-%d %H:%M:%S",
            "log_colors": {
                'DEBUG': 'blue',
                'VERBOSE': 'cyan',
                'INFO': 'green',
                'WARNING': 'yellow',
                'ERROR': 'red',
                'CRITICAL': 'red,bg_white',
            }
        }
    else:
        formatter_config = {
            "format": "%(asctime)s [%(levelname)-8s] %(funcName)s: %(message)s",
            "datefmt": "%Y-%m-%d %H:%M:%S"
        }
    
    return {
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {
            "default": formatter_config,
        },
        "handlers": {
            "console": {
                "class": "logging.StreamHandler",
                "formatter": "default",
            },
        },
        "root": {
            "level": log_level,
            "handlers": ["console"],
        },
        "loggers": {
            "discord": {
                "level": logging.INFO,
                "propagate": True,
            },
            "discord.gateway": {
                "level": logging.WARNING,
                "propagate": True,
            },
            "discord.client": {
                "level": logging.WARNING,
                "propagate": True,
            },
            "uvicorn": {
                "level": logging.INFO,
                "propagate": True,
            },
            "uvicorn.access": {
                "level": logging.WARNING,
                "propagate": True,
            },
        },
    }
