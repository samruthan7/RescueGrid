const test = require('node:test');
const assert = require('node:assert/strict');
const { calculatePriority, rankIncidents } = require('../priority');

test('priority factors use final severity, capped people, waiting and category', () => {
  const p = calculatePriority({ status: 'Reported', severity: 'Low', severityOverride: 'High', peopleAffected: 80, category: 'Fire Emergency', createdAt: '2026-01-01T00:00:00Z' }, new Date('2026-01-01T00:10:00Z'));
  assert.deepEqual(p.breakdown.map(x => x.points), [70, 25, 5, 10]);
  assert.equal(p.score, 110); assert.equal(p.label, 'High');
});
test('waiting time caps at 30 and resolved is always zero', () => {
  const old = { status: 'Assigned', createdAt: '2020-01-01T00:00:00Z' };
  assert.equal(calculatePriority(old, new Date()).breakdown[2].points, 30);
  assert.equal(calculatePriority({ ...old, status: 'Resolved' }).score, 0);
});
test('threshold boundaries are inclusive', () => {
  const cases = [
    [49.99,'Low','Low',50,4.99], [50,'Medium','Low',50,5],
    [89.99,'Medium','High',19.98,0], [90,'High','High',20,0],
    [129.99,'High','Critical',39.98,0], [130,'Critical','Critical',40,0]
  ];
  for (const [score, label, severity, peopleAffected, waitingPoints] of cases) {
    const p = calculatePriority({ severity, peopleAffected, category: 'Fire Emergency', createdAt: '2026-01-01T00:00:00Z' }, new Date(Date.parse('2026-01-01T00:00:00Z') + waitingPoints * 120000));
    assert.equal(p.label, label);
  }
});
test('priority ties put older reports first', () => {
  const ranked=rankIncidents([
    {id:'new',status:'Reported',severity:'Low',peopleAffected:0,category:'Other',createdAt:'2026-01-01T00:10:00Z'},
    {id:'old',status:'Reported',severity:'Low',peopleAffected:0,category:'Other',createdAt:'2026-01-01T00:01:00Z'}
  ],new Date('2026-01-01T00:10:00Z'));
  assert.deepEqual(ranked.map(x=>x.id),['old','new']);
});
