"""Reproduce the reviewed PFOA/PFOS subset from the pinned official EPA ZIP.

Usage: python scripts/data/build-epa-snapshot.py /path/to/ucmr5-occurrence-data.zip
The committed snapshot holds the manually reviewed directory crosswalk and source
metadata. Only its records are regenerated; no database connection is used.
"""
import csv
import hashlib
import io
import json
import sys
import zipfile
from datetime import datetime
from pathlib import Path

target = Path(__file__).resolve().parents[2] / 'src/data/epa-ucmr5.json'
snapshot = json.loads(target.read_text(encoding='utf-8'))
archive = Path(sys.argv[1])
if hashlib.sha256(archive.read_bytes()).hexdigest() != snapshot['sha256']:
    raise ValueError('EPA archive differs from the reviewed release. Review before updating.')
systems = {system['pwsid']: system['name'] for u in snapshot['utilities'] for system in u['systems']}
records = {pwsid: [] for pwsid in systems}
keys = set()
with zipfile.ZipFile(archive) as z:
    with io.TextIOWrapper(z.open('UCMR5_All.txt'), encoding='cp1252', newline=None) as f:
        for r in csv.DictReader(f, delimiter='\t'):
            pid = r['PWSID']
            if pid not in systems or r['Contaminant'] not in ('PFOA', 'PFOS'):
                continue
            assert r['PWSName'] == systems[pid], 'System name changed'
            assert r['Units'] == 'µg/L' and r['SamplePointType'] == 'EP'
            sign = r['AnalyticalResultsSign']
            value = float(r['AnalyticalResultValue']) if r['AnalyticalResultValue'] else None
            assert (sign == '<' and value is None) or (sign == '=' and value is not None and value >= float(r['MRL']))
            key = '|'.join(r[k] for k in ('PWSID', 'FacilityID', 'SamplePointID', 'CollectionDate', 'SampleID', 'Contaminant', 'MethodID'))
            assert key not in keys, 'Duplicate analytical result'
            keys.add(key)
            records[pid].append({'recordId': key, 'pwsid': pid, 'contaminant': r['Contaminant'],
                'date': datetime.strptime(r['CollectionDate'], '%m/%d/%Y').strftime('%Y-%m-%d'),
                'value': value, 'qualifier': sign, 'reportingLimit': float(r['MRL']), 'unit': r['Units'],
                'facilityId': r['FacilityID'], 'facilityName': r['FacilityName'],
                'samplePointId': r['SamplePointID'], 'sampleId': r['SampleID'], 'method': r['MethodID']})
for utility in snapshot['utilities']:
    rows = [row for s in utility['systems'] for row in records[s['pwsid']]]
    assert rows, 'No results for reviewed utility'
    utility['records'] = sorted(rows, key=lambda r: (r['date'], r['recordId']), reverse=True)
target.write_text(json.dumps(snapshot, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
print(f'Reproduced {len(keys)} results across {len(snapshot["utilities"])} utilities.')
