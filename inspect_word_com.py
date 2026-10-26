import win32com.client
import os

word = win32com.client.Dispatch('Word.Application')
word.Visible = False

try:
    for fname in ['B.Tech Theory classes Day time table(Sat).doc', 'B.Tech Laboratories Day time table (Sat).doc']:
        p = os.path.abspath(os.path.join('referencefiles', fname))
        doc = word.Documents.Open(p)
        print('==================== ' + fname + ' ====================')
        for i in range(1, 6):
            para = doc.Paragraphs(i)
            txt = para.Range.Text.strip().replace('\r', '')
            fnt = para.Range.Font
            # Alignment: 0=wdAlignParagraphLeft, 1=wdAlignParagraphCenter, 2=wdAlignParagraphRight
            f_info = f'Font={fnt.Name}, Size={fnt.Size}, Bold={fnt.Bold}, Color={fnt.Color}, Align={para.Alignment}'
            print(f'P{i}: "{txt}" -> {f_info}')
        doc.Close()
finally:
    word.Quit()
