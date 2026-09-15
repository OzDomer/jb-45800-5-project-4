import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)

logger = logging.getLogger("inference")


def log_error(message: str, error: Exception) -> None:
    logger.error(message, exc_info=error)
