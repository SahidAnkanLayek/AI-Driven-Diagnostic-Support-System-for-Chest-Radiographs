# Chest X-Ray AI Diagnosis System



## What technologies are used for this project?

This project is built with:

**Frontend:**
- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- React Router
- TanStack Query

**Backend:**
- FastAPI (Python)
- PyTorch & torchvision
- DenseNet-121 (ImageNet pretrained)
- Grad-CAM (pytorch-grad-cam)
- OpenCV & Pillow



## Features

- **AI Diagnosis**: 14-class multi-label classification (NIH ChestX-ray14)
- **Explainability**: Grad-CAM heatmap showing focus areas
- **Real-time**: Local inference with no cloud dependencies
- **User Management**: Authentication and session handling
- **Reports**: Generate and view PDF diagnostic reports

## API Documentation

When the backend is running, visit:
- Interactive API docs: `http://localhost:8000/docs`
- Alternative docs: `http://localhost:8000/redoc`

## Security Note

⚠️ **Important**: Never commit `.env` or `.env.local` files to version control. Use `.env.local.example` as a template.

If you've accidentally committed secrets:
1. Rotate all API keys immediately
2. Remove them from git history
3. Update `.gitignore` to prevent future commits

## How can I deploy this project?





