import { describe, expect, it } from 'vitest';
import { parseFigmaUrl } from '@/src/figma/link';

describe('parseFigmaUrl', () => {
  it('parses design links with node-id', () => {
    expect(parseFigmaUrl('https://www.figma.com/design/AbC123/My-File?node-id=12-34&t=x')).toEqual({
      fileKey: 'AbC123',
      nodeId: '12:34',
    });
  });
  it('parses legacy file links without node', () => {
    expect(parseFigmaUrl('https://www.figma.com/file/XYZ/Name')).toEqual({ fileKey: 'XYZ' });
  });
  it('parses branch links', () => {
    expect(parseFigmaUrl('https://www.figma.com/design/MAIN/branch/BR1/Name')).toEqual({ fileKey: 'MAIN', branchKey: 'BR1' });
  });
  it('rejects non-figma and non-https links', () => {
    expect(parseFigmaUrl('https://evil.com/design/AbC')).toBeNull();
    expect(parseFigmaUrl('https://figma.com.evil.com/design/AbC')).toBeNull();
    expect(parseFigmaUrl('http://www.figma.com/design/AbC')).toBeNull();
    expect(parseFigmaUrl('not a url')).toBeNull();
  });
  it('ignores malformed node ids', () => {
    expect(parseFigmaUrl('https://www.figma.com/design/AbC/N?node-id=<script>')).toEqual({ fileKey: 'AbC' });
  });
});
