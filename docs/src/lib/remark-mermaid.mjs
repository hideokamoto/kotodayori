/**
 * Convert ```mermaid fenced code blocks into a raw `<pre class="mermaid">`
 * element. This runs before Expressive Code, so Mermaid diagrams are left
 * untouched by the syntax-highlighting pipeline and can be rendered on the
 * client by Mermaid.js instead of being shown as plain code.
 */
export function remarkMermaid() {
  return (tree) => {
    visit(tree);
  };
}

function visit(node) {
  if (!node || typeof node !== 'object') return;
  if (node.type === 'code' && node.lang === 'mermaid') {
    const escaped = node.value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    node.type = 'html';
    node.value = `<pre class="mermaid">${escaped}</pre>`;
    delete node.lang;
    delete node.meta;
    return;
  }
  if (Array.isArray(node.children)) {
    for (const child of node.children) visit(child);
  }
}

export default remarkMermaid;
