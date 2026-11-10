import json, random, copy
SRC='/root/.claude/uploads/82bac697-ac65-5b48-91f8-130e44cef883/12b59f3c-di_questions.json'
KEY='/mnt/user-data/outputs/di_answer_key_v2.json'
d=json.load(open(SRC)); key=json.load(open(KEY))['key']
def kans(p,n):
    qs=key[p]
    e=next((e for e in qs if str(e['n'])==str(n)),None)
    return e
ok=lambda v: v not in (None,'','–','-')
units=[]; passages={}
for p in d['papers']:
    pid=str(p['paper']).zfill(2)
    for it in p['items']:
        if it['type']=='MSR':
            qs=[]
            ids=[q['n'] for q in it['questions']]
            set_key=f"p{pid}_msr{ids[0]}"
            passages[set_key]={'title':it.get('title'),'tabs':it.get('tabs',[]),'images':it.get('images',[])}
            for q in it['questions']:
                k=kans(pid,q['n'])
                qs.append({'pid':pid,'src':q,'key':k,'set':set_key})
            units.append({'set':set_key,'items':qs,'ok':all(ok(x['key']['answer']) for x in qs)})
        else:
            k=kans(pid,it['n'])
            units.append({'set':None,'items':[{'pid':pid,'src':it,'key':k,'set':None}],'ok':ok(k['answer'])})
usable=[u for u in units if u['ok']]
sets=[u for u in usable if u['set']]
singles=[u for u in usable if not u['set']]
rng=random.Random(2026)
rng.shuffle(sets); rng.shuffle(singles)
NT=30; SIZE=20
tests=[[] for _ in range(NT)]
for s in sets:
    cands=[t for t in range(NT) if len(tests[t])+len(s['items'])<=SIZE]
    t=max(cands,key=lambda t:(SIZE-len(tests[t])-len(s['items']), -t))
    tests[t].append(s)
si=0
for t in range(NT):
    while sum(len(u['items']) for u in tests[t])<SIZE:
        tests[t].append(singles[si]); si+=1
    rng.shuffle(tests[t])
    # keep sets contiguous already (units)
print('singles used',si,'of',len(singles),'sets',len(sets))
out={'series':'Preptician Data Insights','tests':[]}
used_ids=set()
for ti,units_t in enumerate(tests):
    qs=[]; n=0
    for u in units_t:
        for it in u['items']:
            n+=1; src=it['src']; k=it['key']
            q={'n':n,'section':'DI','type':src['type'],'paper':it['pid'],'sourceN':src.get('n'),
               'stem':src.get('stem'),'statements':src.get('statements'),'options':src.get('options'),
               'images':src.get('images') or [],'passageId':it['set'],'answer':k['answer'],
               'answerSource':k.get('source')}
            if src['type']=='MSR':
                q['stem']=src.get('stem'); 
            qs.append(q)
    out['tests'].append({'id':201+ti,'name':f'GMAT Data Insights – Test {ti+1}','durationMinutes':45,
        'passages':{},'questions':qs})
# attach passages used
used=set(q['passageId'] for t in out['tests'] for q in t['questions'] if q['passageId'])
for t in out['tests']:
    t['passages']={q['passageId']:passages[q['passageId']] for q in t['questions'] if q['passageId']}
json.dump(out,open('/home/claude/di_build/di_tests.json','w'),ensure_ascii=False,indent=1)
# validation
allq=[q for t in out['tests'] for q in t['questions']]
print('tests',len(out['tests']),'sizes',set(len(t['questions']) for t in out['tests']))
print('total q',len(allq),'missing answers',sum(1 for q in allq if not ok(q['answer'])))
print('source mix',{s:sum(1 for q in allq if q['answerSource']==s) for s in set(q['answerSource'] for q in allq)})
print('msr sets intact:', all(len(set(q['n'] for q in t['questions'] if q['passageId']==p))== len([1 for q in t['questions'] if q['passageId']==p]) for t in out['tests'] for p in t['passages']))
