# Canvas Editor Commands

`WP-5.10-keyboard-stack` centralizes clipboard, duplicate, delete, alignment, stacking, and node-order operations in the framework-independent Canvas Engine.

The React adapter resolves keyboard input only while the canvas owns focus. Inputs, selects, textareas, and contenteditable text nodes retain native editing behavior. The internal clipboard clones serializable canvas nodes and assigns new IDs on paste.
