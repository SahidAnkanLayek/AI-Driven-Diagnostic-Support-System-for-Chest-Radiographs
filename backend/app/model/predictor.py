import torch
import numpy as np
from torchvision import transforms
from PIL import Image
from .loader import get_model_loader


class Predictor:
    def __init__(self):
        self.loader = get_model_loader()
        self.model = self.loader.model
        self.device = self.loader.device
        self.labels = self.loader.labels
        self.transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
        ])

    def preprocess_image(self, image):
        if image.mode != "RGB":
            image = image.convert("RGB")

        image_resized = image.resize((224, 224))
        rgb_img = np.array(image_resized) / 255.0
        input_tensor = self.transform(image_resized).unsqueeze(0).to(self.device)

        return input_tensor, rgb_img

    def predict(self, image):
        input_tensor, rgb_img = self.preprocess_image(image)

        with torch.no_grad():
            logits = self.model(input_tensor)
            scores = torch.sigmoid(logits).cpu().numpy()[0]

        top_idx = int(np.argmax(scores))
        predictions = {
            "labels": self.labels,
            "scores": [float(s) for s in scores],
            "top_label": self.labels[top_idx],
            "top_score": float(scores[top_idx]),
            "top_idx": top_idx
        }

        return input_tensor, rgb_img, predictions
