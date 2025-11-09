import torch
import torch.nn as nn
from torchvision import models

LABELS = [
    "Atelectasis", "Cardiomegaly", "Effusion", "Infiltration",
    "Mass", "Nodule", "Pneumonia", "Pneumothorax",
    "Consolidation", "Edema", "Emphysema", "Fibrosis",
    "Pleural_Thickening", "Hernia"
]

class ModelLoader:
    _instance = None
    _model = None
    _device = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(ModelLoader, cls).__new__(cls)
            cls._instance._initialize()
        return cls._instance

    def _initialize(self):
        self._device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        print(f"Using device: {self._device}")
        self._model = self._create_model()

    def _create_model(self):
        model = models.densenet121(weights=models.DenseNet121_Weights.IMAGENET1K_V1)
        num_features = model.classifier.in_features
        model.classifier = nn.Linear(num_features, len(LABELS))
        model = model.to(self._device)
        model.eval()
        return model

    @property
    def model(self):
        return self._model

    @property
    def device(self):
        return self._device

    @property
    def labels(self):
        return LABELS


def get_model_loader():
    return ModelLoader()
