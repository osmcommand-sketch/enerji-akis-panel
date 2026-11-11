import openpyxl,json,sys
wb=openpyxl.load_workbook(sys.argv[1],read_only=True,data_only=True)
ws=wb['Gunluk']; rows=[]
for r in ws.iter_rows(min_row=1,max_row=6,values_only=True): print([ (i,v) for i,v in enumerate(r) if v is not None and 49<=i<=56])
for r in ws.iter_rows(min_row=2,values_only=True):
    if r[49] is None or not isinstance(r[49],(int,float)): continue
    rows.append([r[49],r[50],r[51],r[52]])
json.dump(rows,open(sys.argv[2],'w')); print(len(rows), rows[:3])
