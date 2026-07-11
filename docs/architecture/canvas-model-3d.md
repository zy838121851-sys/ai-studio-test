# Canvas Model 3D

`WP-5.9-model-3d` adds a persistent `model` canvas node and a React preview boundary that loads Three.js only when a model node is rendered.

The preview attempts GLB/GLTF loading and retains visible fallback geometry if the source is unavailable. Three.js and GLTFLoader remain separate build chunks; image and non-model canvas routes do not eagerly import them. The existing image-toolbar 3D entry remains isolated from image-transform jobs until a production 3D provider is configured.
