from fastapi import APIRouter, File, UploadFile, HTTPException
from PIL import Image
import io
from app.model import Predictor
from utils.gradcam import GradCAMGenerator
from utils.report import ReportGenerator
from app.model.loader import get_model_loader

router = APIRouter(prefix="/api", tags=["predictions"])

predictor = Predictor()
model_loader = get_model_loader()
gradcam_gen = GradCAMGenerator(model_loader.model, model_loader.device)
report_gen = ReportGenerator()


@router.post("/predict")
async def predict(file: UploadFile = File(...)):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    try:
        image = Image.open(io.BytesIO(await file.read()))
        input_tensor, rgb_img, predictions = predictor.predict(image)

        heatmap_base64 = gradcam_gen.generate(
            input_tensor,
            rgb_img,
            predictions['top_idx']
        )

        pdf_bytes = report_gen.generate_pdf(predictions, heatmap_base64)

        return {
            "labels": predictions['labels'],
            "scores": predictions['scores'],
            "top_label": predictions['top_label'],
            "top_score": predictions['top_score'],
            "heatmap_png_base64": heatmap_base64,
            "pdf_base64": pdf_bytes.hex()
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")


@router.get("/health")
async def health():
    return {
        "status": "healthy",
        "model": "DenseNet-121",
        "labels": len(model_loader.labels)
    }
