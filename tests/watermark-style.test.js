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
    expect(watermarkBlock).toContain('letter-spacing: 0.02em;');
    expect(watermarkBlock).toContain('color: rgba(255, 255, 255, 0.035);');
    expect(watermarkBlock).toContain('text-shadow: none;');

    const lightBlock = extractBlock(css, 'body\\[data-theme="light"\\] \\.watermark');
    expect(lightBlock).toContain('color: rgba(15, 23, 42, 0.035);');
    expect(lightBlock).toContain('text-shadow: none;');
  });

  test('main.html mirrors subtle watermark styling', () => {
    const html = readFile('main.html');
    const watermarkBlock = extractBlock(html, '\\.watermark');

    expect(watermarkBlock).toContain("font-family: 'Montserrat', sans-serif;");
    expect(watermarkBlock).toContain('font-weight: 400;');
    expect(watermarkBlock).toContain('letter-spacing: 0.02em;');
    expect(watermarkBlock).toContain('color: rgba(255, 255, 255, 0.035);');
    expect(watermarkBlock).toContain('text-shadow: none;');

    const lightBlock = extractBlock(html, 'body\\[data-theme="light"\\] \\.watermark');
    expect(lightBlock).toContain('color: rgba(15, 23, 42, 0.035);');
    expect(lightBlock).toContain('text-shadow: none;');
  });
});
