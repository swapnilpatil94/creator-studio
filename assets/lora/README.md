# LoRA files (not in git)
Used by the Z-Image Turbo painter in tools/flux/klein.mjs. Copy both into ~/DrawThingsModels as well (the CLI loads them from there).
- realism.safetensors: https://huggingface.co/suayptalha/Z-Image-Turbo-Realism-LoRA (pytorch_lora_weights.safetensors), Apache 2.0, weight 0.8
- eyes.safetensors: https://huggingface.co/bdsqlsz/qinglong_DetailedEyes_Z-Image (qinglong_detailedeye_z-image.safetensors), Apache 2.0, weight 0.7
- technicolor.safetensors (tested, not used: no visible gain): https://huggingface.co/renderartist/Technically-Color-Z-Image-Turbo
Base model: draw-things-cli models ensure --model z_image_turbo_1.0_q6p.ckpt (Z-Image Turbo, Apache 2.0).
