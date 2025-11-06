from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
import torch
import torch.nn as nn
from torchvision import models, transforms
from pytorch_grad_cam import GradCAM
from pytorch_grad_cam.utils.model_targets import ClassifierOutputTarget
from pytorch_grad_cam.utils.image import show_cam_on_image
import numpy as np
import io
import base64
import cv2

app = FastAPI(title="Chest X-Ray Classifier API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:8080"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

LABELS = [
    "Atelectasis", "Cardiomegaly", "Effusion", "Infiltration",
    "Mass", "Nodule", "Pneumonia", "Pneumothorax",
    "Consolidation", "Edema", "Emphysema", "Fibrosis",
    "Pleural_Thickening", "Hernia"
]

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print(f"Using device: {device}")

transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
])

def create_model():
    model = models.densenet121(weights=models.DenseNet121_Weights.IMAGENET1K_V1)
    num_features = model.classifier.in_features
    model.classifier = nn.Linear(num_features, 14)
    model = model.to(device)
    model.eval()
    return model

model = create_model()
target_layer = model.features[-1]
cam = GradCAM(model=model, target_layers=[target_layer])

def preprocess_image(image):
    if image.mode != "RGB":
        image = image.convert("RGB")

    image_resized = image.resize((224, 224))
    rgb_img = np.array(image_resized) / 255.0
    input_tensor = transform(image_resized).unsqueeze(0).to(device)

    return input_tensor, rgb_img

def generate_gradcam(input_tensor, rgb_img, class_idx):
    grayscale_cam = cam(input_tensor=input_tensor, targets=[ClassifierOutputTarget(class_idx)])
    grayscale_cam = grayscale_cam[0]
    visualization = show_cam_on_image(rgb_img, grayscale_cam, use_rgb=True)

    _, buffer = cv2.imencode(".png", cv2.cvtColor(visualization, cv2.COLOR_RGB2BGR))
    return base64.b64encode(buffer).decode("utf-8")

@app.get("/")
async def root():
    return {"status": "healthy", "model": "DenseNet-121", "labels": len(LABELS)}

@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    try:
        image = Image.open(io.BytesIO(await file.read()))
        input_tensor, rgb_img = preprocess_image(image)

        with torch.no_grad():
            logits = model(input_tensor)
            scores = torch.sigmoid(logits).cpu().numpy()[0]

        top_idx = int(np.argmax(scores))
        heatmap = generate_gradcam(input_tensor, rgb_img, top_idx)

        return {
            "labels": LABELS,
            "scores": [float(s) for s in scores],
            "top_label": LABELS[top_idx],
            "top_score": float(scores[top_idx]),
            "heatmap_png_base64": heatmap
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
