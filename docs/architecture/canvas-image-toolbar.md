# Canvas Image Toolbar

`WP-5.7-image-toolbar` restores the image-node action surface in the rewrite canvas: crop, upscale, background removal, expand, text editing, comparison, and 3D generation.

The toolbar emits typed `ImageToolbarCommand` values and maintains the legacy 2K/4K upscale selection. It deliberately does not implement any media transformation; `WP-5.8` and later packages own those workflows and their durable AI job handoff.
