from core.timetable_parser import parse_timetable_pdf
import sys

res = parse_timetable_pdf(r'c:\Users\ADMIN\Downloads\Telegram Desktop\IARE - Day Time Table - DEAN_PG.pdf')
print('Parsed classes count:', len(res['classes']))
print('Branches found:', res['metadata']['branches'])
total_theory = 0
total_lab = 0
for cls in res['classes']:
    for p, entry in cls['periods'].items():
        if entry:
            if entry['is_lab']: total_lab += 1
            else: total_theory += 1
print(f'Total periods with classes: Theory={total_theory}, Lab={total_lab}')

print('\nSample Class 1:', res['classes'][0]['class_name'])
for p, entry in res['classes'][0]['periods'].items():
    if entry:
        print(f"  P{p}: {entry['course_code']} - {entry['course_name']} | {entry['faculty_name']} | Room {entry['room']}")
