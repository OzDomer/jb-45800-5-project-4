class DeterministicJobError(Exception):
    """A failure retrying can never fix -- the job gets marked failed and
    its queue message gets deleted. Anything else (connectivity, timeouts)
    is treated as transient and left on the queue for redelivery."""


class JobRowNotFoundError(DeterministicJobError):
    pass


class ImageNotFoundError(DeterministicJobError):
    pass


class InvalidImageError(DeterministicJobError):
    pass
