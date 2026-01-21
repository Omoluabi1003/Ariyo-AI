const fs = require('fs');
const path = require('path');

const readFile = (relativePath) =>
  fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');

const extractBlock = (content, selector) => {
  const pattern = new RegExp(`${selector}\\s*\\{([\\s\\S]*?)\\}`, 'm');
  const match = content.match(pattern);
  if (!match) {
    throw new Error(`Missing ${selector} block`);
  }
  return match[1];
};

describe('watermark styling', () => {
  test('index.css uses subtle watermark typography', () => {
    const css = readFile('index.css');
    const watermarkBlock = extractBlock(css, '\\.watermark');

    expect(watermarkBlock).toContain("font-family: 'Montserrat', sans-serif;");
    expect(watermarkBlock).toContain('font-weight: 400;');
    expect(watermarkBlock).toContain('letter-spacing: 0.03em;');
    expect(watermarkBlock).toContain('color: var(--watermark-color);');
    expect(watermarkBlock).toContain('opacity: var(--watermark-opacity);');
    expect(watermarkBlock).toContain('text-shadow: var(--watermark-shadow);');
    expect(watermarkBlock).toContain('-webkit-text-stroke: var(--watermark-stroke);');

    const lightBlock = extractBlock(css, 'body\\[data-theme="light"\\]');
    expect(lightBlock).toContain('--watermark-opacity: 0.2;');
    expect(lightBlock).toContain('--watermark-color: rgba(0, 0, 0, 0.55);');
    expect(lightBlock).toContain('--watermark-shadow: 0 1px 2px rgba(255, 255, 255, 0.25);');
  });

  test('main.html mirrors subtle watermark styling', () => {
    const html = readFile('main.html');
    const watermarkBlock = extractBlock(html, '\\.watermark');

    expect(watermarkBlock).toContain("font-family: 'Montserrat', sans-serif;");
    expect(watermarkBlock).toContain('font-weight: 400;');
    expect(watermarkBlock).toContain('letter-spacing: 0.03em;');
    expect(watermarkBlock).toContain('color: var(--watermark-color);');
    expect(watermarkBlock).toContain('opacity: var(--watermark-opacity);');
    expect(watermarkBlock).toContain('text-shadow: var(--watermark-shadow);');
    expect(watermarkBlock).toContain('-webkit-text-stroke: var(--watermark-stroke);');

    const lightBlock = extractBlock(html, 'body\\[data-theme="light"\\]');
    expect(lightBlock).toContain('--watermark-opacity: 0.2;');
    expect(lightBlock).toContain('--watermark-color: rgba(0, 0, 0, 0.55);');
    expect(lightBlock).toContain('--watermark-shadow: 0 1px 2px rgba(255, 255, 255, 0.25);');
  });
});
