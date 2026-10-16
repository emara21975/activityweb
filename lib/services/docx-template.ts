import JSZip from "jszip";

/**
 * Minimal engine for filling an existing .docx template in place.
 *
 * The original Word file is kept byte-for-byte except for the spots we touch,
 * so headers, footers, fonts, colours and borders stay identical to the
 * template the school provided. Elements are located structurally
 * (table → row → cell) or by a shape's `wp:docPr` id.
 */

interface Range {
  start: number;
  end: number;
}

const EMU_PER_INCH = 914400;
const IMAGE_REL_TYPE = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image";

const MIME_BY_EXT: Record<string, string> = {
  png: "image/png",
  jpeg: "image/jpeg",
  gif: "image/gif",
  bmp: "image/bmp",
};

export interface TemplateImage {
  data: Buffer;
  ext: "png" | "jpeg" | "gif" | "bmp";
  width: number;
  height: number;
}

export function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Top-level `<w:tag>` elements inside [from, to), ignoring nested ones of the same tag. */
function findElements(xml: string, tag: string, from: number, to: number): Range[] {
  const open = `<${tag}`;
  const close = `</${tag}>`;
  const result: Range[] = [];
  let depth = 0;
  let start = -1;
  let i = from;

  while (i < to) {
    const nextOpen = xml.indexOf(open, i);
    const nextClose = xml.indexOf(close, i);
    if (nextOpen === -1 && nextClose === -1) break;

    if (nextOpen !== -1 && (nextClose === -1 || nextOpen < nextClose) && nextOpen < to) {
      const after = xml[nextOpen + open.length];
      if (after !== " " && after !== ">" && after !== "/") {
        // A different tag sharing the prefix (e.g. <w:tblPr> for <w:tbl>)
        i = nextOpen + open.length;
        continue;
      }
      const tagEnd = xml.indexOf(">", nextOpen);
      const selfClosing = xml[tagEnd - 1] === "/";
      if (selfClosing) {
        if (depth === 0) result.push({ start: nextOpen, end: tagEnd + 1 });
        i = tagEnd + 1;
        continue;
      }
      if (depth === 0) start = nextOpen;
      depth++;
      i = tagEnd + 1;
    } else if (nextClose !== -1 && nextClose < to) {
      depth--;
      if (depth === 0 && start !== -1) {
        result.push({ start, end: nextClose + close.length });
        start = -1;
      }
      i = nextClose + close.length;
    } else {
      break;
    }
  }

  return result;
}

function extractFirst(xml: string, tag: string): string | null {
  const ranges = findElements(xml, tag, 0, xml.length);
  return ranges.length ? xml.slice(ranges[0].start, ranges[0].end) : null;
}

/** Run properties to use for new text: the first real run's, else the paragraph mark's. */
function pickRunProps(paragraph: string): string {
  const pPr = extractFirst(paragraph, "w:pPr") ?? "";
  const afterPPr = paragraph.slice(paragraph.indexOf(pPr) + pPr.length);
  const firstRun = findElements(afterPPr, "w:r", 0, afterPPr.length)[0];
  if (firstRun) {
    const runRPr = extractFirst(afterPPr.slice(firstRun.start, firstRun.end), "w:rPr");
    if (runRPr) return runRPr;
  }
  const markRPr = extractFirst(pPr, "w:rPr");
  return markRPr ? markRPr.replace(/<w:(ins|del|moveFrom|moveTo)\b[^>]*\/>/g, "") : "";
}

function buildRun(rPr: string, text: string): string {
  return `<w:r>${rPr}<w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r>`;
}

function paragraphOpenTag(paragraph: string): string {
  return paragraph.slice(0, paragraph.indexOf(">") + 1);
}

export class DocxTemplate {
  private zip: JSZip;
  xml = "";
  private rels = "";
  private contentTypes = "";
  private nextRelId = 9000;
  private nextDocPrId = 7700000;

  private constructor(zip: JSZip) {
    this.zip = zip;
  }

  static async load(buffer: Buffer): Promise<DocxTemplate> {
    const tpl = new DocxTemplate(await JSZip.loadAsync(buffer));
    tpl.xml = await tpl.zip.file("word/document.xml")!.async("string");
    tpl.rels = await tpl.zip.file("word/_rels/document.xml.rels")!.async("string");
    tpl.contentTypes = await tpl.zip.file("[Content_Types].xml")!.async("string");
    return tpl;
  }

  async toBuffer(): Promise<Buffer> {
    this.zip.file("word/document.xml", this.xml);
    this.zip.file("word/_rels/document.xml.rels", this.rels);
    this.zip.file("[Content_Types].xml", this.contentTypes);
    return this.zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
  }

  // ---------------------------------------------------------------- structure

  private body(): Range {
    const start = this.xml.indexOf("<w:body>");
    return { start, end: this.xml.indexOf("</w:body>") };
  }

  private table(t: number): Range {
    const b = this.body();
    const tables = findElements(this.xml, "w:tbl", b.start, b.end);
    if (!tables[t]) throw new Error(`Template table ${t} not found`);
    return tables[t];
  }

  private row(t: number, r: number): Range {
    const tbl = this.table(t);
    const rows = findElements(this.xml, "w:tr", tbl.start, tbl.end);
    if (!rows[r]) throw new Error(`Template row ${t}/${r} not found`);
    return rows[r];
  }

  rowCount(t: number): number {
    const tbl = this.table(t);
    return findElements(this.xml, "w:tr", tbl.start, tbl.end).length;
  }

  private cell(t: number, r: number, c: number): Range {
    const tr = this.row(t, r);
    const cells = findElements(this.xml, "w:tc", tr.start, tr.end);
    if (!cells[c]) throw new Error(`Template cell ${t}/${r}/${c} not found`);
    return cells[c];
  }

  private splice(range: Range, replacement: string) {
    this.xml = this.xml.slice(0, range.start) + replacement + this.xml.slice(range.end);
  }

  /** Duplicate row `r` of table `t` (inserted right after it). */
  cloneRow(t: number, r: number) {
    const tr = this.row(t, r);
    const rowXml = this.xml.slice(tr.start, tr.end).replace(/ w14:paraId="[^"]*"/g, "").replace(/ w14:textId="[^"]*"/g, "");
    this.xml = this.xml.slice(0, tr.end) + rowXml + this.xml.slice(tr.end);
  }

  // --------------------------------------------------------------------- text

  /**
   * Replace the content of a cell with text, keeping the cell's own paragraph
   * and run formatting. Each line becomes its own paragraph (so bullets and
   * numbering defined on the template paragraph apply to every line).
   */
  setCellText(t: number, r: number, c: number, text: string | null | undefined) {
    const value = (text ?? "").toString();
    if (!value.trim()) return;
    const tc = this.cell(t, r, c);
    const paragraphs = findElements(this.xml, "w:p", tc.start, tc.end);
    if (!paragraphs.length) return;

    const first = this.xml.slice(paragraphs[0].start, paragraphs[0].end);
    const pPr = extractFirst(first, "w:pPr") ?? "";
    const rPr = pickRunProps(first);
    const open = paragraphOpenTag(first).replace(/ w14:paraId="[^"]*"/, "").replace(/ w14:textId="[^"]*"/, "");

    const lines = value.replace(/\r\n/g, "\n").split("\n").map((l) => l.trim()).filter(Boolean);
    const newParagraphs = lines.map((line) => `${open}${pPr}${buildRun(rPr, line)}</w:p>`).join("");

    // Replace all top-level paragraphs of the cell with the new ones
    const last = paragraphs[paragraphs.length - 1];
    this.splice({ start: paragraphs[0].start, end: last.end }, newParagraphs);
  }

  /** Append text at the end of the first paragraph in a cell that contains `marker`. */
  appendToParagraph(t: number, r: number, c: number, marker: string, text: string) {
    if (!text.trim()) return;
    const tc = this.cell(t, r, c);
    const paragraph = findElements(this.xml, "w:p", tc.start, tc.end).find((p) =>
      this.xml.slice(p.start, p.end).replace(/<[^>]+>/g, "").includes(marker)
    );
    if (!paragraph) return;
    // Match the formatting of the label's run (the last one), not the checkbox's
    const runs = findElements(this.xml, "w:r", paragraph.start, paragraph.end);
    const lastRun = runs[runs.length - 1];
    const rPr = lastRun
      ? extractFirst(this.xml.slice(lastRun.start, lastRun.end), "w:rPr") ?? ""
      : pickRunProps(this.xml.slice(paragraph.start, paragraph.end));
    const insertAt = paragraph.end - "</w:p>".length;
    this.xml = this.xml.slice(0, insertAt) + buildRun(rPr, ` ${text} `) + this.xml.slice(insertAt);
  }

  /**
   * Write text inside a "( … )" blank: inserted right after the run holding the
   * opening parenthesis, in the first paragraph of the cell containing `marker`.
   */
  fillParentheses(t: number, r: number, c: number, marker: string, text: string) {
    if (!text.trim()) return;
    const tc = this.cell(t, r, c);
    const paragraph = findElements(this.xml, "w:p", tc.start, tc.end).find((p) =>
      this.xml.slice(p.start, p.end).replace(/<[^>]+>/g, "").includes(marker)
    );
    if (!paragraph) return;
    const runs = findElements(this.xml, "w:r", paragraph.start, paragraph.end);
    const openRun = runs.find((run) => /<w:t[^>]*>[^<]*\(/.test(this.xml.slice(run.start, run.end)));
    if (!openRun) {
      this.appendToParagraph(t, r, c, marker, text);
      return;
    }
    const rPr = extractFirst(this.xml.slice(openRun.start, openRun.end), "w:rPr") ?? "";
    this.xml = this.xml.slice(0, openRun.end) + buildRun(rPr, ` ${text} `) + this.xml.slice(openRun.end);
  }

  /** Replace the first occurrence of a literal text in the document body. */
  replaceText(search: string, replacement: string) {
    const idx = this.xml.indexOf(escapeXml(search));
    if (idx === -1) return;
    this.xml = this.xml.slice(0, idx) + escapeXml(replacement) + this.xml.slice(idx + escapeXml(search).length);
  }

  // --------------------------------------------------------------- checkboxes

  /** Tick a Word content-control checkbox (☐ → ☒) found in the given cell. */
  checkContentControl(t: number, r: number, c: number) {
    const tc = this.cell(t, r, c);
    let cellXml = this.xml.slice(tc.start, tc.end);
    if (!cellXml.includes("<w14:checkbox>")) return;
    cellXml = cellXml.replace('<w14:checked w14:val="0"/>', '<w14:checked w14:val="1"/>').replace("<w:t>☐</w:t>", "<w:t>☒</w:t>");
    this.splice(tc, cellXml);
  }

  /**
   * Draw a ✔ on top of a floating box (shape or picture) identified by its
   * `wp:docPr` id. The overlay is anchored exactly like the box itself.
   */
  overlayCheckMark(docPrId: string) {
    const docPrIdx = this.xml.indexOf(`<wp:docPr id="${docPrId}"`);
    if (docPrIdx === -1) return;
    const anchorStart = this.xml.lastIndexOf("<wp:anchor", docPrIdx);
    const anchor = this.xml.slice(anchorStart, docPrIdx);

    const posH = anchor.match(/<wp:positionH relativeFrom="(\w+)"><wp:posOffset>(-?\d+)<\/wp:posOffset>/);
    const posV = anchor.match(/<wp:positionV relativeFrom="(\w+)"><wp:posOffset>(-?\d+)<\/wp:posOffset>/);
    const extent = anchor.match(/<wp:extent cx="(\d+)" cy="(\d+)"\/>/);
    if (!posH || !posV || !extent) return;

    // Insert after the run that holds the box so paragraph-relative offsets match
    const runEnd = this.xml.indexOf("</w:r>", docPrIdx) + "</w:r>".length;
    const id = this.nextDocPrId++;
    const [cx, cy] = [extent[1], extent[2]];

    const overlay =
      `<w:r><mc:AlternateContent><mc:Choice Requires="wps"><w:drawing>` +
      `<wp:anchor distT="0" distB="0" distL="0" distR="0" simplePos="0" relativeHeight="251900000" behindDoc="0" locked="0" layoutInCell="1" allowOverlap="1">` +
      `<wp:simplePos x="0" y="0"/>` +
      `<wp:positionH relativeFrom="${posH[1]}"><wp:posOffset>${posH[2]}</wp:posOffset></wp:positionH>` +
      `<wp:positionV relativeFrom="${posV[1]}"><wp:posOffset>${posV[2]}</wp:posOffset></wp:positionV>` +
      `<wp:extent cx="${cx}" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:wrapNone/>` +
      `<wp:docPr id="${id}" name="check ${id}"/><wp:cNvGraphicFramePr/>` +
      `<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">` +
      `<a:graphicData uri="http://schemas.microsoft.com/office/word/2010/wordprocessingShape"><wps:wsp>` +
      `<wps:cNvSpPr txBox="1"/>` +
      `<wps:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/><a:ln><a:noFill/></a:ln></wps:spPr>` +
      `<wps:txbx><w:txbxContent><w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="center"/></w:pPr>` +
      `<w:r><w:rPr><w:rFonts w:ascii="Segoe UI Symbol" w:hAnsi="Segoe UI Symbol" w:cs="Segoe UI Symbol"/><w:b/><w:color w:val="000000"/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t>✔</w:t></w:r>` +
      `</w:p></w:txbxContent></wps:txbx>` +
      `<wps:bodyPr rot="0" vert="horz" wrap="none" lIns="0" tIns="0" rIns="0" bIns="0" anchor="ctr" anchorCtr="1"><a:noAutofit/></wps:bodyPr>` +
      `</wps:wsp></a:graphicData></a:graphic></wp:anchor></w:drawing></mc:Choice></mc:AlternateContent></w:r>`;

    this.xml = this.xml.slice(0, runEnd) + overlay + this.xml.slice(runEnd);
  }

  // ------------------------------------------------------------------- images

  private addImagePart(image: TemplateImage): string {
    const relId = `rIdTpl${this.nextRelId++}`;
    const target = `media/tpl_photo_${relId}.${image.ext}`;
    this.zip.file(`word/${target}`, image.data);
    this.rels = this.rels.replace(
      "</Relationships>",
      `<Relationship Id="${relId}" Type="${IMAGE_REL_TYPE}" Target="${target}"/></Relationships>`
    );
    if (!this.contentTypes.includes(`Extension="${image.ext}"`)) {
      this.contentTypes = this.contentTypes.replace(
        "<Override",
        `<Default Extension="${image.ext}" ContentType="${MIME_BY_EXT[image.ext]}"/><Override`
      );
    }
    return relId;
  }

  /** Fill a floating rectangle (photo frame) with a picture, cropped to cover it. */
  fillShapeWithImage(docPrId: string, image: TemplateImage) {
    const docPrIdx = this.xml.indexOf(`<wp:docPr id="${docPrId}"`);
    if (docPrIdx === -1) return;
    const spPrStart = this.xml.indexOf("<wps:spPr>", docPrIdx);
    const spPrEnd = this.xml.indexOf("</wps:spPr>", spPrStart);
    const spPr = this.xml.slice(spPrStart, spPrEnd);
    const ext = spPr.match(/<a:ext cx="(\d+)" cy="(\d+)"\/>/);
    if (!ext) return;

    const relId = this.addImagePart(image);
    const frameRatio = Number(ext[1]) / Number(ext[2]);
    const imageRatio = image.width / image.height;
    let srcRect = "<a:srcRect/>";
    if (imageRatio > frameRatio) {
      const crop = Math.round(((1 - frameRatio / imageRatio) / 2) * 100000);
      srcRect = `<a:srcRect l="${crop}" r="${crop}"/>`;
    } else if (imageRatio < frameRatio) {
      const crop = Math.round(((1 - imageRatio / frameRatio) / 2) * 100000);
      srcRect = `<a:srcRect t="${crop}" b="${crop}"/>`;
    }
    const blipFill = `<a:blipFill rotWithShape="1"><a:blip r:embed="${relId}"/>${srcRect}<a:stretch><a:fillRect/></a:stretch></a:blipFill>`;

    const newSpPr = spPr
      .replace(/<a:solidFill>(?:(?!<\/a:solidFill>).)*<\/a:solidFill>(?=<a:ln)/, "")
      .replace(/<a:noFill\/>(?=<a:ln)/, "")
      .replace("</a:prstGeom>", `</a:prstGeom>${blipFill}`);
    this.xml = this.xml.slice(0, spPrStart) + newSpPr + this.xml.slice(spPrEnd);
  }

  /** Place an inline picture in a table cell, scaled to fit the given box (inches). */
  setCellImage(t: number, r: number, c: number, image: TemplateImage, maxWidthIn: number, maxHeightIn: number) {
    const tc = this.cell(t, r, c);
    const paragraph = findElements(this.xml, "w:p", tc.start, tc.end)[0];
    if (!paragraph) return;

    const relId = this.addImagePart(image);
    const scale = Math.min(maxWidthIn / image.width, maxHeightIn / image.height);
    const cx = Math.round(image.width * scale * EMU_PER_INCH);
    const cy = Math.round(image.height * scale * EMU_PER_INCH);
    const id = this.nextDocPrId++;

    const run =
      `<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0">` +
      `<wp:extent cx="${cx}" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/>` +
      `<wp:docPr id="${id}" name="photo ${id}"/>` +
      `<wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr>` +
      `<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">` +
      `<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">` +
      `<pic:nvPicPr><pic:cNvPr id="0" name="photo ${id}"/><pic:cNvPicPr/></pic:nvPicPr>` +
      `<pic:blipFill><a:blip r:embed="${relId}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>` +
      `<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>` +
      `</pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`;

    const insertAt = paragraph.end - "</w:p>".length;
    this.xml = this.xml.slice(0, insertAt) + run + this.xml.slice(insertAt);
  }
}

/** Read image dimensions from the file header; returns null for formats Word can't embed. */
export function readTemplateImage(data: Buffer): TemplateImage | null {
  // PNG
  if (data.length > 24 && data.readUInt32BE(0) === 0x89504e47) {
    return { data, ext: "png", width: data.readUInt32BE(16), height: data.readUInt32BE(20) };
  }
  // GIF
  if (data.length > 10 && data.toString("ascii", 0, 3) === "GIF") {
    return { data, ext: "gif", width: data.readUInt16LE(6), height: data.readUInt16LE(8) };
  }
  // BMP
  if (data.length > 26 && data.toString("ascii", 0, 2) === "BM") {
    return { data, ext: "bmp", width: data.readInt32LE(18), height: Math.abs(data.readInt32LE(22)) };
  }
  // JPEG: walk segments until a SOFn marker
  if (data.length > 4 && data[0] === 0xff && data[1] === 0xd8) {
    let offset = 2;
    while (offset + 9 < data.length) {
      if (data[offset] !== 0xff) {
        offset++;
        continue;
      }
      const marker = data[offset + 1];
      const length = data.readUInt16BE(offset + 2);
      const isSof = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
      if (isSof) {
        return { data, ext: "jpeg", height: data.readUInt16BE(offset + 5), width: data.readUInt16BE(offset + 7) };
      }
      offset += 2 + length;
    }
  }
  return null;
}
