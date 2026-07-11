# Canvas Image Transform Jobs

`WP-5.8-crop-upscale-expand` introduces typed image transformation job routing for crop, upscale, background removal, expansion, and image text editing.

Transform jobs carry a source image node ID. On completion, the service replaces that node's media URL instead of replacing the entire canvas document. The development provider supports deterministic test execution; the APIMART provider fails closed until a transform-capable provider is configured.
