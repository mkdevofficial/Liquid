/**
 * Liquid Cross-Platform Renderer Abstraction
 *
 * Defines the renderer contract for targeting DOM (web) and Native Android Views.
 */

export const OP_CREATE_NODE = 1;
export const OP_CREATE_TEXT = 2;
export const OP_SET_PROP = 3;
export const OP_SET_STYLE = 4;
export const OP_SET_TEXT = 5;
export const OP_INSERT = 6;
export const OP_REMOVE = 7;
export const OP_LISTEN = 8;
export const OP_UNLISTEN = 9;

export const TYPE_VIEW = 1;     // LiquidFlexLayout (ViewGroup)
export const TYPE_TEXT = 2;     // LiquidTextView
export const TYPE_IMAGE = 3;    // LiquidImageView
export const TYPE_INPUT = 4;    // LiquidEditText
export const TYPE_BUTTON = 5;   // LiquidButton
export const TYPE_SCROLL = 6;   // LiquidScrollView

export const TAG_TO_PRIMITIVE = {
  view: TYPE_VIEW,
  div: TYPE_VIEW,
  section: TYPE_VIEW,
  header: TYPE_VIEW,
  footer: TYPE_VIEW,
  main: TYPE_VIEW,
  nav: TYPE_VIEW,
  aside: TYPE_VIEW,
  article: TYPE_VIEW,

  text: TYPE_TEXT,
  span: TYPE_TEXT,
  p: TYPE_TEXT,
  h1: TYPE_TEXT,
  h2: TYPE_TEXT,
  h3: TYPE_TEXT,
  h4: TYPE_TEXT,
  h5: TYPE_TEXT,
  h6: TYPE_TEXT,
  label: TYPE_TEXT,
  b: TYPE_TEXT,
  strong: TYPE_TEXT,
  i: TYPE_TEXT,
  em: TYPE_TEXT,
  small: TYPE_TEXT,
  a: TYPE_TEXT,

  image: TYPE_IMAGE,
  img: TYPE_IMAGE,

  input: TYPE_INPUT,
  textarea: TYPE_INPUT,

  button: TYPE_BUTTON,

  scroll: TYPE_SCROLL
};

/**
 * Base Renderer interface.
 */
export class Renderer {
  createNode(type, props = {}) {
    throw new Error('Renderer.createNode() must be implemented');
  }

  createText(text = '') {
    throw new Error('Renderer.createText() must be implemented');
  }

  setProp(node, name, value) {
    throw new Error('Renderer.setProp() must be implemented');
  }

  setStyle(node, styleObject) {
    throw new Error('Renderer.setStyle() must be implemented');
  }

  setText(node, text) {
    throw new Error('Renderer.setText() must be implemented');
  }

  insert(parent, child, anchor = null) {
    throw new Error('Renderer.insert() must be implemented');
  }

  remove(node) {
    throw new Error('Renderer.remove() must be implemented');
  }

  listen(node, event, handler, modifiers = []) {
    throw new Error('Renderer.listen() must be implemented');
  }

  unlisten(node, event, handler) {
    throw new Error('Renderer.unlisten() must be implemented');
  }

  batch(fn) {
    return fn();
  }

  flush() {}
}

let activeRenderer = null;

export function getRenderer() {
  return activeRenderer;
}

export function setRenderer(renderer) {
  activeRenderer = renderer;
}
