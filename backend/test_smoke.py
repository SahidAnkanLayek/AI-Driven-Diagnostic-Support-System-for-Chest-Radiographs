"""
Smoke tests for the FastAPI backend.
Run with: pytest test_smoke.py -v
"""

import pytest
from fastapi.testclient import TestClient
from main import app
from PIL import Image
import io

client = TestClient(app)


def test_health_check():
    """Test the root health check endpoint."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["model"] == "DenseNet-121"
    assert data["labels"] == 14


def test_predict_no_file():
    """Test /predict returns 422 when no file is provided."""
    response = client.post("/predict")
    assert response.status_code == 422


def test_predict_invalid_file():
    """Test /predict returns 400 for non-image file."""
    response = client.post(
        "/predict",
        files={"file": ("test.txt", b"not an image", "text/plain")}
    )
    assert response.status_code == 400
    assert "image" in response.json()["detail"].lower()


def test_predict_valid_image():
    """Test /predict returns 200 and correct structure for valid image."""
    # Create a dummy 224x224 RGB image
    img = Image.new('RGB', (224, 224), color='gray')
    img_bytes = io.BytesIO()
    img.save(img_bytes, format='PNG')
    img_bytes.seek(0)
    
    response = client.post(
        "/predict",
        files={"file": ("test.png", img_bytes, "image/png")}
    )
    
    assert response.status_code == 200
    data = response.json()
    
    # Check response structure
    assert "labels" in data
    assert "scores" in data
    assert "top_label" in data
    assert "top_score" in data
    assert "heatmap_png_base64" in data
    
    # Check data types and lengths
    assert len(data["labels"]) == 14
    assert len(data["scores"]) == 14
    assert isinstance(data["top_label"], str)
    assert isinstance(data["top_score"], float)
    assert 0 <= data["top_score"] <= 1
    assert len(data["heatmap_png_base64"]) > 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
