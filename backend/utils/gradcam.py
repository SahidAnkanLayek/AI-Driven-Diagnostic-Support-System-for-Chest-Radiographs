import torch
import numpy as np
import cv2
import base64
from pytorch_grad_cam import GradCAM
from pytorch_grad_cam.utils.model_targets import ClassifierOutputTarget
from pytorch_grad_cam.utils.image import show_cam_on_image


class GradCAMGenerator:
    def __init__(self, model, device):
        self.model = model
        self.device = device
        self.target_layer = model.features[-1]
        self.cam = GradCAM(model=model, target_layers=[self.target_layer])

    def generate(self, input_tensor, rgb_img, class_idx):
        grayscale_cam = self.cam(
            input_tensor=input_tensor,
            targets=[ClassifierOutputTarget(class_idx)]
        )
        grayscale_cam = grayscale_cam[0]
        visualization = show_cam_on_image(rgb_img, grayscale_cam, use_rgb=True)

        _, buffer = cv2.imencode(".png", cv2.cvtColor(visualization, cv2.COLOR_RGB2BGR))
        return base64.b64encode(buffer).decode("utf-8")
