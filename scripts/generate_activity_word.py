import sys
import json
import os
import zipfile
import xml.etree.ElementTree as ET
from datetime import datetime

ET.register_namespace('w', 'http://schemas.openxmlformats.org/wordprocessingml/2006/main')
ET.register_namespace('r', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships')
ET.register_namespace('a', 'http://schemas.openxmlformats.org/drawingml/2006/main')
ET.register_namespace('wps', 'http://schemas.microsoft.com/office/word/2010/wordprocessingShape')
ET.register_namespace('v', 'urn:schemas-microsoft-com:vml')
ET.register_namespace('o', 'urn:schemas-microsoft-com:office:office')
ET.register_namespace('mc', 'http://schemas.openxmlformats.org/markup-compatibility/2006')

ns = {
    'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
    'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
    'a': 'http://schemas.openxmlformats.org/drawingml/2006/main',
    'wps': 'http://schemas.microsoft.com/office/word/2010/wordprocessingShape',
    'v': 'urn:schemas-microsoft-com:vml',
    'rel': 'http://schemas.openxmlformats.org/package/2006/relationships',
}

def set_cell_text(tc, text, bold=False):
    # Clear any extra paragraphs
    all_p = list(tc.findall('w:p', ns))
    if len(all_p) > 1:
        for extra_p in all_p[1:]:
            tc.remove(extra_p)
    p = tc.find('w:p', ns)
    if p is None:
        p = ET.SubElement(tc, '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}p')
    
    # Remove all old runs in the paragraph
    for old_r in list(p.findall('w:r', ns)):
        p.remove(old_r)

    # Set RTL paragraph properties
    pPr = p.find('w:pPr', ns)
    if pPr is None:
        pPr = ET.SubElement(p, '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}pPr')
    if pPr.find('w:bidi', ns) is None:
        ET.SubElement(pPr, '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}bidi')
    
    # Create single clean run with Cairo font
    r = ET.SubElement(p, '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}r')
    rPr = ET.SubElement(r, '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}rPr')
    rFonts = ET.SubElement(rPr, '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}rFonts')
    rFonts.set('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}cs', 'Cairo')
    if bold:
        ET.SubElement(rPr, '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}b')
    t = ET.SubElement(r, '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t')
    t.text = str(text) if text is not None else ''

def get_arabic_day_name(date_str):
    try:
        dt = datetime.fromisoformat(str(date_str).split('T')[0])
        days_ar = ['الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت', 'الأحد']
        return days_ar[dt.weekday()]
    except Exception:
        return '—'

def format_activity_type(selected_type, other_text=''):
    types = ['خطة معتمدة', 'مناسبة', 'هوية وطنية', 'قيم تربوية', 'تعميم', 'أخرى']
    parts = []
    for t in types:
        if t == selected_type:
            parts.append(f'[✔] {t}')
        else:
            parts.append(f'[  ] {t}')
    if other_text:
        parts[-1] += f' ({other_text})'
    return '   '.join(parts)

def format_activation_method(selected_method, other_text=''):
    methods = ['إذاعة', 'طابور', 'ورشة', 'معرض', 'مسابقة', 'فعالية', 'أخرى']
    parts = []
    for m in methods:
        if m == selected_method:
            parts.append(f'[✔] {m}')
        else:
            parts.append(f'[  ] {m}')
    if other_text:
        parts[-1] += f' ({other_text})'
    return '   '.join(parts)

def generate_doc(template_path, output_path, data):
    with zipfile.ZipFile(template_path, 'r') as zin:
        doc_xml = zin.read('word/document.xml')
        rels_xml = zin.read('word/_rels/document.xml.rels')
        all_files = {item.filename: zin.read(item.filename) for item in zin.infolist()}

        root = ET.fromstring(doc_xml)
        rels_root = ET.fromstring(rels_xml)
        
        body = root.find('w:body', ns)
        children = list(body)
        tables = root.findall('.//w:tbl', ns)
        
        # 1. Populate Table 0 (Official Report Table)
        if tables:
            tbl = tables[0]
            rows = tbl.findall('.//w:tr', ns)
            
            # Row 0: School Name
            if len(rows) > 0:
                c = rows[0].findall('.//w:tc', ns)
                if len(c) > 1: set_cell_text(c[1], data.get('school_name', 'مدرسة عبد الله بن علي المسند الثانوية للبنين'), bold=True)
            
            # Row 1: Day & Date
            if len(rows) > 1:
                c = rows[1].findall('.//w:tc', ns)
                day_name = data.get('day_name') or get_arabic_day_name(data.get('activity_date', ''))
                date_str = str(data.get('activity_date', '')).split('T')[0]
                if len(c) > 1: set_cell_text(c[1], day_name, bold=True)
                if len(c) > 3: set_cell_text(c[3], date_str, bold=True)
            
            # Row 2: Activity Title
            if len(rows) > 2:
                c = rows[2].findall('.//w:tc', ns)
                if len(c) > 1: set_cell_text(c[1], data.get('name', '—'), bold=True)
            
            # Row 3: Activity Type (Checkboxes)
            if len(rows) > 3:
                c = rows[3].findall('.//w:tc', ns)
                type_str = format_activity_type(data.get('activity_type', 'خطة معتمدة'), data.get('activity_type_other', ''))
                if len(c) > 1: set_cell_text(c[1], type_str)
            
            # Row 4: Target Group & Participants Counts
            if len(rows) > 4:
                c = rows[4].findall('.//w:tc', ns)
                if len(c) > 1: set_cell_text(c[1], data.get('target_group', 'جميع طلاب المدرسة'))
                if len(c) > 3:
                    total = data.get('total_participants', 0)
                    qat = data.get('qatari_count', 0)
                    non_qat = data.get('non_qatari_count', 0)
                    part_str = f"الإجمالي: ({total})   |   قطري: ({qat})   |   غير قطري: ({non_qat})"
                    set_cell_text(c[3], part_str, bold=True)
            
            # Row 5: Responsible Department & External Entity
            if len(rows) > 5:
                c = rows[5].findall('.//w:tc', ns)
                if len(c) > 1: set_cell_text(c[1], data.get('responsible_department', 'قسم الأنشطة'))
                if len(c) > 3:
                    ext_entity = data.get('external_entity', '—')
                    ext_honored = data.get('external_honored', False)
                    parent_part = data.get('parent_participation', False)
                    honored_mark = '[✔] تم تكريمها' if ext_honored else '[  ] لم يتم تكريمها'
                    parent_mark = '[✔] مشاركة ولي الأمر' if parent_part else '[  ] مشاركة ولي الأمر'
                    ext_str = f"{ext_entity}   ({honored_mark}   |   {parent_mark})"
                    set_cell_text(c[3], ext_str)
            
            # Row 6: Activation Method (Checkboxes)
            if len(rows) > 6:
                c = rows[6].findall('.//w:tc', ns)
                method_str = format_activation_method(data.get('activation_method', 'فعالية'), data.get('activation_method_other', ''))
                if len(c) > 1: set_cell_text(c[1], method_str)
            
            # Row 7 & 8: Objectives (Cell 0)
            if len(rows) > 8:
                c = rows[8].findall('.//w:tc', ns)
                if len(c) > 0: set_cell_text(c[0], data.get('objectives', 'تنمية معارف ومهارات الطلاب القيادية والإبداعية'))
            
            # Row 9: Execution Steps (Cell 0)
            if len(rows) > 9:
                c = rows[9].findall('.//w:tc', ns)
                if len(c) > 0: set_cell_text(c[0], data.get('execution_steps', '1. الإعداد والتنسيق المسبق للفعالية\n2. تنفيذ البرنامج بحضور الطلاب المستهدفين\n3. التقييم والتوثيق الميداني'))
            
            # Row 10: Safety Measures (Cell 0)
            if len(rows) > 10:
                c = rows[10].findall('.//w:tc', ns)
                if len(c) > 0: set_cell_text(c[0], data.get('safety_measures', 'الالتزام التام بإجراءات السلامة المعتمدة وتوفير الإشراف الميداني الكامل'))
            
            # Row 11 & 12: Student Satisfaction (Rating 1 to 5)
            sat_score = int(data.get('student_satisfaction', 5))
            if len(rows) > 12:
                c = rows[12].findall('.//w:tc', ns)
                for idx, score_val in enumerate([5, 4, 3, 2, 1]):
                    if idx < len(c):
                        set_cell_text(c[idx], '✔' if sat_score == score_val else '', bold=True)
            
            # Row 13 & 14: Activity Quality (Rating 1 to 5)
            qual_score = int(data.get('activity_quality', 5))
            if len(rows) > 14:
                c = rows[14].findall('.//w:tc', ns)
                for idx, score_val in enumerate([5, 4, 3, 2, 1]):
                    if idx < len(c):
                        set_cell_text(c[idx], '✔' if qual_score == score_val else '', bold=True)
            
            # Row 15: Recommendations (Cell 0)
            if len(rows) > 15:
                c = rows[15].findall('.//w:tc', ns)
                if len(c) > 0: set_cell_text(c[0], data.get('recommendations', 'مواصلة تنظيم الفعاليات وتكريم الطلاب المتميزين'))

        # 2. Embed Activity Documentation Photos into the 4 Frames (Page 2)
        photos = data.get('photos', [])
        new_media = {}

        # Locate the 4 shape frames (in Child 16 and Child 25)
        wsps = []
        rects = []
        for c_idx in [16, 25]:
            if c_idx < len(children):
                c = children[c_idx]
                for wsp in c.findall('.//{http://schemas.microsoft.com/office/word/2010/wordprocessingShape}wsp'):
                    wsps.append(wsp)
                for rect in c.findall('.//{urn:schemas-microsoft-com:vml}rect'):
                    rects.append(rect)

        for idx in range(min(4, len(photos))):
            photo_info = photos[idx]
            p_path = photo_info if isinstance(photo_info, str) else photo_info.get('path', '')
            if not p_path or not os.path.exists(p_path):
                continue
            
            try:
                with open(p_path, 'rb') as pf:
                    img_bytes = pf.read()
            except Exception as e:
                print(f"Warning: Failed to read photo {p_path}: {e}")
                continue

            ext = os.path.splitext(p_path)[1].lower()
            if not ext: ext = '.jpg'
            media_name = f'act_photo_{idx + 1}{ext}'
            media_zip_path = f'word/media/{media_name}'
            new_media[media_zip_path] = img_bytes

            rel_id = f'rIdActPhoto{idx + 1}'

            # Add Relationship to rels_root
            rel_elem = ET.SubElement(rels_root, '{http://schemas.openxmlformats.org/package/2006/relationships}Relationship')
            rel_elem.set('Id', rel_id)
            rel_elem.set('Type', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/image')
            rel_elem.set('Target', f'media/{media_name}')

            # Add DrawingML blipFill into wsp
            if idx < len(wsps):
                wsp = wsps[idx]
                spPr = wsp.find('{http://schemas.microsoft.com/office/word/2010/wordprocessingShape}spPr')
                if spPr is not None:
                    bf = ET.Element('{http://schemas.openxmlformats.org/drawingml/2006/main}blipFill')
                    blip = ET.SubElement(bf, '{http://schemas.openxmlformats.org/drawingml/2006/main}blip')
                    blip.set('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}embed', rel_id)
                    blip.set('cstate', 'print')
                    stretch = ET.SubElement(bf, '{http://schemas.openxmlformats.org/drawingml/2006/main}stretch')
                    ET.SubElement(stretch, '{http://schemas.openxmlformats.org/drawingml/2006/main}fillRect')

                    ln = spPr.find('{http://schemas.openxmlformats.org/drawingml/2006/main}ln')
                    if ln is not None:
                        idx_ln = list(spPr).index(ln)
                        spPr.insert(idx_ln, bf)
                    else:
                        spPr.append(bf)

            # Add VML imagedata & fill to rect
            if idx < len(rects):
                rect = rects[idx]
                fill = rect.find('{urn:schemas-microsoft-com:vml}fill')
                if fill is None:
                    fill = ET.SubElement(rect, '{urn:schemas-microsoft-com:vml}fill')
                fill.set('type', 'frame')
                fill.set('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id', rel_id)

                imagedata = rect.find('{urn:schemas-microsoft-com:vml}imagedata')
                if imagedata is None:
                    imagedata = ET.SubElement(rect, '{urn:schemas-microsoft-com:vml}imagedata')
                imagedata.set('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id', rel_id)

        # 3. Write Output docx
        with zipfile.ZipFile(output_path, 'w', zipfile.ZIP_DEFLATED) as zout:
            for filename, content in all_files.items():
                if filename == 'word/document.xml':
                    zout.writestr(filename, ET.tostring(root, encoding='utf-8', xml_declaration=True))
                elif filename == 'word/_rels/document.xml.rels':
                    zout.writestr(filename, ET.tostring(rels_root, encoding='utf-8', xml_declaration=True))
                else:
                    zout.writestr(filename, content)
            for media_path, media_content in new_media.items():
                zout.writestr(media_path, media_content)

        print(f"Generated {output_path} successfully with {len(new_media)} embedded photos")

if __name__ == '__main__':
    if len(sys.argv) < 4:
        print("Usage: python generate_activity_word.py <template_docx> <output_docx> <json_data_path_or_string>")
        sys.exit(1)
    
    template_path = sys.argv[1]
    output_path = sys.argv[2]
    json_arg = sys.argv[3]
    
    if os.path.exists(json_arg):
        with open(json_arg, 'r', encoding='utf-8') as f:
            data = json.load(f)
    else:
        data = json.loads(json_arg)
        
    generate_doc(template_path, output_path, data)
