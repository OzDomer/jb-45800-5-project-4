from io import BytesIO

import torch
from torch import nn
from PIL import Image, UnidentifiedImageError
from torchvision import models, transforms

from ..config import app_config
from ..errors import InvalidImageError
from ..logger import logger

_model = None
_transform = None
_class_names = None


def load_model() -> None:
    """Load the checkpoint ONCE at worker startup -- reloading it per job is
    the classic inference-worker performance mistake."""
    global _model, _transform, _class_names

    device = torch.device("cpu")
    checkpoint = torch.load(
        app_config["model"]["path"], map_location=device, weights_only=True)

    # Rebuild the EXACT training-time architecture, then load the weights.
    model = models.resnet18(weights=None)
    model.fc = nn.Sequential(
        nn.Linear(model.fc.in_features, int(checkpoint["hidden"])),
        nn.ReLU(),
        nn.Linear(int(checkpoint["hidden"]), len(checkpoint["class_names"])),
    )
    model.load_state_dict(checkpoint["model_state_dict"])
    model.eval()

    # Same preprocessing the model was validated with (stored in the checkpoint).
    image_size = int(checkpoint.get("image_size", 224))
    _transform = transforms.Compose([
        transforms.Resize(int(image_size * 256 / 224)),
        transforms.CenterCrop(image_size),
        transforms.ToTensor(),
        transforms.Normalize(checkpoint.get("mean", [0.485, 0.456, 0.406]),
                             checkpoint.get("std", [0.229, 0.224, 0.225])),
    ])

    _model = model
    _class_names = checkpoint["class_names"]
    logger.info(
        f"Model loaded: classes {', '.join(_class_names)} "
        f"(best val accuracy at training time: "
        f"{checkpoint.get('best_val_accuracy', 0):.2%})")


def predict(image_bytes: bytes) -> tuple[str, float, dict]:
    if _model is None:
        raise RuntimeError("predictor.load_model() was not called at startup")

    try:
        with Image.open(BytesIO(image_bytes)) as image:
            tensor = _transform(image.convert("RGB")).unsqueeze(0)
    except (UnidentifiedImageError, OSError) as error:
        raise InvalidImageError(
            "The uploaded bytes are not a decodable image") from error

    with torch.inference_mode():
        probabilities = torch.softmax(_model(tensor), dim=1)[0]

    confidence, index = probabilities.max(0)
    ranked = {name: round(float(probabilities[i]), 4)
              for i, name in enumerate(_class_names)}
    return _class_names[int(index)], float(confidence), ranked
