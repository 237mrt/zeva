import fs from 'node:fs';
import path from 'node:path';
import PDFDocument from 'pdfkit';

interface PDFKitFontInternal {
  name: string;
  family?: string;
  font: {
    layout(text: string): { glyphs: Array<{ id: number }> };
  };
}

type PDFDocumentWithFont = InstanceType<typeof PDFDocument> & {
  _font: PDFKitFontInternal;
};

const fontsDir = path.resolve('src/assets/fonts');
const regularPath = path.join(fontsDir, 'NotoSans-Regular.ttf');
const boldPath = path.join(fontsDir, 'NotoSans-Bold.ttf');

console.log('--- FONT VERIFICATION ---');

const files = [
  { name: 'NotoSans-Regular.ttf', path: regularPath },
  { name: 'NotoSans-Bold.ttf', path: boldPath }
];

const turkishChars = ['ç', 'Ç', 'ğ', 'Ğ', 'ı', 'İ', 'ö', 'Ö', 'ş', 'Ş', 'ü', 'Ü'];
const testPhrases = [
  'Çağrı Şen Tekstil',
  'Ütü Şişme Çocuk Önlüğü',
  'İşlem öğleden önce tamamlanacak.'
];

async function verify() {
  for (const file of files) {
    if (!fs.existsSync(file.path)) {
      console.error(`ERROR: File does not exist: ${file.path}`);
      process.exit(1);
    }
    const stat = fs.statSync(file.path);
    const buf = fs.readFileSync(file.path);
    const magicHex = buf.subarray(0, 4).toString('hex');
    
    // TTF magic: 00010000 or OTTO (4f54544f) or true (74727565)
    const isTTF = magicHex === '00010000' || magicHex === '4f54544f' || magicHex === '74727565';
    console.log(`File: ${file.name}`);
    console.log(`  Size: ${stat.size} bytes`);
    console.log(`  Magic header: 0x${magicHex}`);
    console.log(`  Valid TTF/OTF Header: ${isTTF ? 'YES' : 'NO'}`);

    if (!isTTF) {
      console.error(`ERROR: ${file.name} is not a valid TTF/OTF binary!`);
      process.exit(1);
    }

    // Create PDFKit document to test glyph encoding & layout with fontkit
    const doc = new PDFDocument({ size: 'A4' });
    doc.registerFont('TestFont', file.path);
    doc.font('TestFont');

    // Check glyph coverage using fontkit underlying object in pdfkit font registration
    const fontObj = (doc as unknown as PDFDocumentWithFont)._font;
    console.log(`  Font PostScript Name: ${fontObj.name}`);
    console.log(`  Font Family: ${fontObj.family ?? 'N/A'}`);
    
    // Test each Turkish character for glyph existence in fontkit font
    const fontKitFont = fontObj.font;
    let allGlyphsPresent = true;
    const missingGlyphs: string[] = [];
    
    for (const char of turkishChars) {
      const run = fontKitFont.layout(char);
      const glyph = run.glyphs[0];
      if (!glyph || glyph.id === 0) { // glyph id 0 is .notdef
        allGlyphsPresent = false;
        missingGlyphs.push(char);
      }
    }

    if (allGlyphsPresent) {
      console.log(`  Turkish Glyph Support: PASSED (all ${turkishChars.join(' ')} mapped)`);
    } else {
      console.error(`  Turkish Glyph Support: FAILED (missing: ${missingGlyphs.join(' ')})`);
      process.exit(1);
    }

    // Test rendering sample texts to PDF buffer
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    
    for (const phrase of testPhrases) {
      doc.text(phrase);
    }

    await new Promise<void>((resolve) => {
      doc.on('end', () => resolve());
      doc.end();
    });

    const pdfBuf = Buffer.concat(chunks);
    console.log(`  PDF Generation Test: PASSED (Output size: ${pdfBuf.length} bytes, magic: ${pdfBuf.subarray(0, 4).toString()})`);
  }

  console.log('--- ALL FONT VERIFICATIONS SUCCESSFUL ---');
}

verify().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
