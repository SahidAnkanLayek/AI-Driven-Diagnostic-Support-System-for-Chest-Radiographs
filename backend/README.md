# Chest X-Ray Classifier Backend

FastAPI backend for chest X-ray classification using DenseNet-121 with Grad-CAM explainability.

## Features

- **Model**: DenseNet-121 with ImageNet initialization (14-class multi-label)
- **Labels**: NIH ChestX-ray14 dataset (Atelectasis, Cardiomegaly, Effusion, etc.)
- **Explainability**: Grad-CAM heatmap visualization
- **Device**: Automatic CUDA detection (falls back to CPU)

## Setup

### 1. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Run the Server

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

The API will be available at `http://localhost:8000`

## API Documentation

### Endpoints

#### `GET /`
Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "model": "DenseNet-121",
  "labels": 14
}
```

#### `POST /predict`
Predict chest X-ray findings with Grad-CAM visualization.

**Request:**
- Content-Type: `multipart/form-data`
- Body: `file` (image file - JPEG, PNG)

**Response:**
```json
{
  "labels": ["Atelectasis", "Cardiomegaly", ...],
  "scores": [0.123, 0.456, ...],
  "top_label": "Pneumonia",
  "top_score": 0.89,
  "heatmap_png_base64": "iVBORw0KGgo..."
}
```

### Example cURL Request

```bash
curl -X POST "http://localhost:8000/predict" \
  -F "file=@path/to/chest_xray.jpg"
```

## Development

### Project Structure

```
backend/
├── main.py              # FastAPI application
├── requirements.txt     # Python dependencies
└── README.md           # This file
```

### Model Details

- **Architecture**: DenseNet-121
- **Input Size**: 224×224 RGB
- **Normalization**: ImageNet mean/std
- **Output**: 14 sigmoid probabilities (multi-label)
- **Weights**: ImageNet1K_V1 (pretrained)

### Adding Medical Weights

To use trained medical weights instead of ImageNet:

```python
# In main.py, after model creation:
model.load_state_dict(torch.load('path/to/medical_weights.pth'))
```

## Troubleshooting

### CUDA Out of Memory
If you encounter CUDA memory issues, the model will automatically fall back to CPU.

### Slow First Request
The first prediction may be slow due to model initialization. Subsequent requests will be faster.

### CORS Errors
If you're running the frontend on a different port, update the `allow_origins` in `main.py`.
