FROM runpod/pytorch:2.1.0-py3.10-cuda11.8.0-devel-ubuntu22.04

WORKDIR /app

RUN apt-get update && apt-get install -y \
    git wget ffmpeg libsm6 libxext6 libgl1 libglib2.0-0 unzip \
    && rm -rf /var/lib/apt/lists/*

# Clone SadTalker at a pinned commit for reproducibility
RUN git clone https://github.com/OpenTalker/SadTalker.git && \
    cd SadTalker && git checkout 3f9ca7b

WORKDIR /app/SadTalker

# Install PyTorch first (large, separate layer for better caching)
RUN pip install --no-cache-dir \
    torch==2.0.1 torchvision==0.15.2 torchaudio==2.0.2 \
    --index-url https://download.pytorch.org/whl/cu118

# Install SadTalker requirements
RUN pip install --no-cache-dir -r requirements.txt

# Install RunPod SDK + AWS SDK for R2 uploads
RUN pip install --no-cache-dir runpod boto3 requests

# ── Pretrained models (baked in → fast cold start, ~5GB image) ───────────────

# SadTalker checkpoints
RUN mkdir -p checkpoints \
 && wget -nv -O checkpoints/mapping_00109-model.pth.tar "https://github.com/OpenTalker/SadTalker/releases/download/v0.0.2-rc/mapping_00109-model.pth.tar" \
 && wget -nv -O checkpoints/mapping_00229-model.pth.tar "https://github.com/OpenTalker/SadTalker/releases/download/v0.0.2-rc/mapping_00229-model.pth.tar" \
 && wget -nv -O checkpoints/SadTalker_V0.0.2_256.safetensors "https://github.com/OpenTalker/SadTalker/releases/download/v0.0.2-rc/SadTalker_V0.0.2_256.safetensors" \
 && wget -nv -O checkpoints/SadTalker_V0.0.2_512.safetensors "https://github.com/OpenTalker/SadTalker/releases/download/v0.0.2-rc/SadTalker_V0.0.2_512.safetensors"

# GFPGAN weights (face enhancer)
RUN mkdir -p gfpgan/weights \
 && wget -nv -O gfpgan/weights/alignment_WFLW_4HG.pth "https://github.com/xinntao/facexlib/releases/download/v0.1.0/alignment_WFLW_4HG.pth" \
 && wget -nv -O gfpgan/weights/detection_Resnet50_Final.pth "https://github.com/xinntao/facexlib/releases/download/v0.1.0/detection_Resnet50_Final.pth" \
 && wget -nv -O gfpgan/weights/GFPGANv1.4.pth "https://github.com/TencentARC/GFPGAN/releases/download/v1.3.0/GFPGANv1.4.pth" \
 && wget -nv -O gfpgan/weights/parsing_parsenet.pth "https://github.com/xinntao/facexlib/releases/download/v0.2.2/parsing_parsenet.pth"

COPY handler.py .

# Sanity check: python imports work
RUN python -c "import runpod, boto3, torch; print('torch:', torch.__version__, '| CUDA:', torch.cuda.is_available())"

CMD ["python", "-u", "handler.py"]
