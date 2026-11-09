'use strict';
/* GTS Dörtyol – Excel modelini uygulama içinde hesaplar (SDT, 01.11.2026).
   xlsx içindeki formüller ayrıştırılır, kullanıcının girdiği hücreler değiştirilir, bütün çalışma kitabı yeniden hesaplanır.
   Desteklenen işlevler modelde kullanılanlardır; desteklenmeyen işlev görülürse hata verilir (sessizce yanlış hesaplamaz). */
const zlib = require('zlib');

/* ---------- hata değerleri ---------- */
class XErr { constructor(c) { this.c = c; } toString() { return this.c; } }
const E = { NA: new XErr('#N/A'), VAL: new XErr('#VALUE!'), DIV: new XErr('#DIV/0!'), REF: new XErr('#REF!'), NUM: new XErr('#NUM!'), NAME: new XErr('#NAME?') };
const isErr = (v) => v instanceof XErr;
/* boş hücre */
const BOS = { bos: true };
/* 2B dizi (aralık) */
class Arr { constructor(r, c, v) { this.r = r; this.c = c; this.v = v; } at(i, j) { return this.v[i * this.c + j]; } }

/* ---------- xml ---------- */
const xmlCoz = (s) => s.replace(/&(lt|gt|amp|quot|apos|#\d+|#x[0-9a-f]+);/gi, (m, k) => k === 'lt' ? '<' : k === 'gt' ? '>' : k === 'amp' ? '&' : k === 'quot' ? '"' : k === 'apos' ? "'" : k[1] === 'x' || k[1] === 'X' ? String.fromCodePoint(parseInt(k.slice(2), 16)) : String.fromCodePoint(+k.slice(1)));
const kolNo = (s) => { let c = 0; for (const ch of s) c = c * 26 + ch.charCodeAt(0) - 64; return c - 1; };

/* ---------- formül ayrıştırıcı ---------- */
function tokenize(f) {
  const T = []; let i = 0;
  while (i < f.length) {
    const ch = f[i];
    if (ch === ' ' || ch === '\n') { i++; continue; }
    if (ch === '"') { let j = i + 1, s = ''; for (;;) { if (f[j] === '"') { if (f[j + 1] === '"') { s += '"'; j += 2; continue; } break; } s += f[j++]; if (j > f.length) throw new Error('kapanmayan metin'); } T.push({ t: 'str', v: s }); i = j + 1; continue; }
    // tam sütun aralığı (paket 85: SUMIFS(Musteri_Gunluk!$H:$H; …)) – r2 = −1: sayfanın kullanılan son satırı
    const mk = /^(?:([A-Za-z_][\w.]*)!)?\$?([A-Z]{1,3}):\$?([A-Z]{1,3})(?![\w(])/.exec(f.slice(i));
    if (mk && !/^[A-Za-z_][\w.]*\(/.test(f.slice(i))) { T.push({ t: 'ref', sh: mk[1] || null, r1: 0, c1: kolNo(mk[2]), r2: -1, c2: kolNo(mk[3]) }); i += mk[0].length; continue; }
    const m3 = /^(?:([A-Za-z_][\w.]*)!)?(\$?)([A-Z]{1,3})(\$?)(\d+)(?::(\$?)([A-Z]{1,3})(\$?)(\d+))?/.exec(f.slice(i));
    if (m3 && !/^[A-Za-z_][\w.]*\(/.test(f.slice(i))) {
      // hücre ya da aralık (önünde işlev adı olmayan)
      const ref = { t: 'ref', sh: m3[1] || null, r1: +m3[5] - 1, c1: kolNo(m3[3]) };
      if (m3[7]) { ref.r2 = +m3[9] - 1; ref.c2 = kolNo(m3[7]); } else { ref.r2 = ref.r1; ref.c2 = ref.c1; }
      T.push(ref); i += m3[0].length; continue;
    }
    const mn = /^\d+(\.\d+)?([eE][+-]?\d+)?/.exec(f.slice(i)); if (mn) { T.push({ t: 'num', v: Number(mn[0]) }); i += mn[0].length; continue; }
    const mf = /^([A-Za-z_][\w.]*)\(/.exec(f.slice(i)); if (mf) { T.push({ t: 'fn', v: mf[1].toUpperCase().replace(/^_XLFN\.(_XLWS\.)?/, '') }); i += mf[0].length; continue; }
    const mb = /^(TRUE|FALSE)\b/i.exec(f.slice(i)); if (mb) { T.push({ t: 'bool', v: mb[1].toUpperCase() === 'TRUE' }); i += mb[0].length; continue; }
    const mo = /^(<>|<=|>=|[-+*/^&=<>%(),;])/.exec(f.slice(i)); if (mo) { T.push({ t: 'op', v: mo[1] === ';' ? ',' : mo[1] }); i += mo[0].length; continue; }
    throw new Error('Formül çözülemedi: ' + f.slice(i, i + 20));
  }
  return T;
}
function parse(f) {
  const T = tokenize(f); let p = 0;
  const pk = () => T[p], al = () => T[p++];
  const bek = (v) => { const t = al(); if (!t || t.t !== 'op' || t.v !== v) throw new Error('Beklenen ' + v + ' – ' + f); };
  const PR = { '=': 1, '<>': 1, '<': 1, '>': 1, '<=': 1, '>=': 1, '&': 2, '+': 3, '-': 3, '*': 4, '/': 4, '^': 5 };
  function ifade(min) {
    let sol = tekli();
    for (;;) { const t = pk(); if (!t || t.t !== 'op' || !(t.v in PR) || PR[t.v] < min) break; al(); const sag = ifade(PR[t.v] + (t.v === '^' ? 0 : 1)); sol = { k: 'bin', o: t.v, a: sol, b: sag }; }
    return sol;
  }
  function tekli() {
    const t = pk();
    if (t && t.t === 'op' && (t.v === '-' || t.v === '+')) { al(); const a = tekli(); return t.v === '-' ? { k: 'neg', a } : a; }
    let a = birincil();
    while (pk() && pk().t === 'op' && pk().v === '%') { al(); a = { k: 'bin', o: '/', a, b: { k: 'num', v: 100 } }; }
    return a;
  }
  function birincil() {
    const t = al(); if (!t) throw new Error('Eksik formül: ' + f);
    if (t.t === 'num') return { k: 'num', v: t.v };
    if (t.t === 'str') return { k: 'str', v: t.v };
    if (t.t === 'bool') return { k: 'bool', v: t.v };
    if (t.t === 'ref') return { k: 'ref', sh: t.sh, r1: t.r1, c1: t.c1, r2: t.r2, c2: t.c2 };
    if (t.t === 'fn') { const args = []; if (!(pk().t === 'op' && pk().v === ')')) { for (;;) { if (pk().t === 'op' && (pk().v === ',' || pk().v === ')')) args.push({ k: 'bosarg' }); else args.push(ifade(1)); const s = al(); if (s.v === ')') break; if (s.v !== ',') throw new Error('Beklenen , – ' + f); } } else al(); return { k: 'fn', n: t.v, args }; }
    if (t.t === 'op' && t.v === '(') { const a = ifade(1); bek(')'); return a; }
    throw new Error('Beklenmeyen ' + JSON.stringify(t) + ' – ' + f);
  }
  const a = ifade(1); if (p < T.length) throw new Error('Fazla parça – ' + f); return a;
}

/* ---------- tarih ---------- */
const EP = Date.UTC(1899, 11, 30);
/* LibreOffice yaklaşık eşitlik ve toplama (rtl::math::approxEqual / approxAdd) */
const EPS = Math.pow(2, -48);
const yakl = (r, a, b) => (Math.sign(a) !== Math.sign(b) && Math.abs(r) <= Math.max(Math.abs(a), Math.abs(b)) * EPS) ? 0 : r;
const serial = (y, m, d) => (Date.UTC(y, m - 1, d) - EP) / 864e5;
const tarihOf = (s) => new Date(EP + Math.floor(s) * 864e5);

/* ---------- çalışma kitabı ---------- */
function zipAc(buf) {
  let e = -1; for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) if (buf.readUInt32LE(i) === 0x06054b50) { e = i; break; }
  if (e < 0) throw new Error('xlsx okunamadı');
  const n = buf.readUInt16LE(e + 10), cd = buf.readUInt32LE(e + 16), g = {};
  for (let i = 0, p = cd; i < n; i++) { const met = buf.readUInt16LE(p + 10), cs = buf.readUInt32LE(p + 20), fl = buf.readUInt16LE(p + 28), xl = buf.readUInt16LE(p + 30), kl = buf.readUInt16LE(p + 32), lo = buf.readUInt32LE(p + 42), ad = buf.toString('utf8', p + 46, p + 46 + fl);
    g[ad] = { met, cs, lo }; p += 46 + fl + xl + kl; }
  return (ad) => { const x = g[ad]; if (!x) return null; const v = x.lo + 30 + buf.readUInt16LE(x.lo + 26) + buf.readUInt16LE(x.lo + 28), ham = buf.subarray(v, v + x.cs); return (x.met === 8 ? zlib.inflateRawSync(ham) : Buffer.from(ham)).toString('utf8'); };
}

function kitapAc(buf) {
  const al = zipAc(buf);
  const ss = []; const sx = al('xl/sharedStrings.xml');
  if (sx) for (const m of sx.matchAll(/<si>([\s\S]*?)<\/si>/g)) ss.push(xmlCoz([...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join('')));
  const rel = {}; for (const m of al('xl/_rels/workbook.xml.rels').matchAll(/<Relationship\b([^>]*)\/?>/g)) { const id = /Id="([^"]+)"/.exec(m[1]), t = /Target="([^"]+)"/.exec(m[1]); if (id && t) rel[id[1]] = 'xl/' + t[1].replace(/^\/?xl\//, ''); }
  const sh = []; for (const m of al('xl/workbook.xml').matchAll(/<sheet\b([^>]*)\/?>/g)) { const ad = /name="([^"]+)"/.exec(m[1]), id = /r:id="([^"]+)"/.exec(m[1]); sh.push({ ad: xmlCoz(ad[1]), yol: rel[id[1]] }); }
  const S = {};
  for (const s of sh) {
    const x = al(s.yol), cells = new Map(); let maxR = 0, maxC = 0;
    for (const cm of x.matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const at = cm[1], ref = /\br="([A-Z]+)(\d+)"/.exec(at); if (!ref) continue;
      const r = +ref[2] - 1, c = kolNo(ref[1]), t = (/\bt="(\w+)"/.exec(at) || [])[1], body = cm[2] || '';
      const fm = /<f[^>]*>([\s\S]*?)<\/f>/.exec(body), vm = /<v>([\s\S]*?)<\/v>/.exec(body);
      let v = BOS;
      if (vm) v = t === 's' ? ss[+vm[1]] : t === 'str' ? xmlCoz(vm[1]) : t === 'b' ? vm[1] === '1' : t === 'e' ? new XErr(vm[1]) : Number(vm[1]);
      else if (t === 'inlineStr') { const is = /<is>([\s\S]*?)<\/is>/.exec(body); v = is ? xmlCoz([...is[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((q) => q[1]).join('')) : ''; }
      if (!fm && v === BOS) continue;
      cells.set(r * 16384 + c, { v, f: fm ? xmlCoz(fm[1]) : null });
      if (r > maxR) maxR = r; if (c > maxC) maxC = c;
    }
    const dv = []; for (const m of x.matchAll(/<dataValidation\b([^>]*)>([\s\S]*?)<\/dataValidation>/g)) { const at = (k) => { const q = new RegExp('\\b' + k + '="([^"]*)"').exec(m[1]); return q ? xmlCoz(q[1]) : null; };
      const f1 = /<formula1>([\s\S]*?)<\/formula1>/.exec(m[2]), f2 = /<formula2>([\s\S]*?)<\/formula2>/.exec(m[2]);
      dv.push({ sqref: at('sqref') || '', tip: at('type'), bos: at('allowBlank') === 'true' || at('allowBlank') === '1', hata: at('error'), f1: f1 ? xmlCoz(f1[1]) : null, f2: f2 ? xmlCoz(f2[1]) : null }); }
    S[s.ad] = { ad: s.ad, cells, maxR, maxC, dv };
  }
  return S;
}

/* ---------- hesap motoru ---------- */
function motor(S) {
  const memo = new Map(), girdi = new Map(), derle = new Map(), aralikOnb = new Map(), matchOnb = new Map();
  let sira = 0;
  const key = (sh, r, c) => sh + '|' + (r * 16384 + c);
  function hucre(sh, r, c) {
    const k = key(sh, r, c);
    if (girdi.has(k)) return girdi.get(k);
    if (memo.has(k)) { const v = memo.get(k); if (v === HESAPLANIYOR) throw new Error('Döngüsel başvuru: ' + sh + '!' + adres(r, c)); return v; }
    const S0 = S[sh]; if (!S0) throw new Error('Sayfa yok: ' + sh);
    const x = S0.cells.get(r * 16384 + c); if (!x) return BOS;
    if (!x.f) return x.v;
    memo.set(k, HESAPLANIYOR);
    let fn = derle.get(k); if (!fn) { const ast = parse(x.f); fn = (ctx) => ev(ast, ctx); derle.set(k, fn); }
    let v; try { v = fn({ sh, r, c }); } catch (e) { memo.delete(k); throw e; }
    if (v instanceof Arr) v = v.r && v.c ? v.at(0, 0) : E.VAL;
    if (v === BOS) v = 0;
    memo.set(k, v); sira++; return v;
  }
  const HESAPLANIYOR = {};
  const adres = (r, c) => { let s = '', n = c + 1; while (n) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s + (r + 1); };
  function aralik(sh, r1, c1, r2, c2) {
    if (r2 === -1) r2 = S[sh] ? S[sh].maxR : 0;   // tam sütun
    const k = sh + '|' + r1 + ',' + c1 + ',' + r2 + ',' + c2; let a = aralikOnb.get(k); if (a) return a;
    const R = r2 - r1 + 1, C = c2 - c1 + 1, v = new Array(R * C);
    for (let i = 0; i < R; i++) for (let j = 0; j < C; j++) v[i * C + j] = hucre(sh, r1 + i, c1 + j);
    a = new Arr(R, C, v); a.k = k; aralikOnb.set(k, a); return a;
  }
  /* ---- dönüşümler ---- */
  const num = (v) => { if (typeof v === 'number') return v; if (v === BOS || v === '') return 0; if (typeof v === 'boolean') return v ? 1 : 0; if (isErr(v)) return v; if (typeof v === 'string') { const n = Number(v.replace(',', '.')); return v.trim() !== '' && isFinite(n) ? n : E.VAL; } return E.VAL; };
  const str = (v) => { if (v === BOS) return ''; if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE'; if (typeof v === 'number') return fmtGenel(v); return String(v); };
  const fmtGenel = (n) => { if (Number.isInteger(n)) return String(n); let s = String(+n.toPrecision(15)); return s; };
  const bool = (v) => { if (typeof v === 'boolean') return v; if (typeof v === 'number') return v !== 0; if (v === BOS || v === '') return false; if (isErr(v)) return v; if (typeof v === 'string') { const u = v.toUpperCase(); if (u === 'TRUE') return true; if (u === 'FALSE') return false; } return E.VAL; };
  const skaler = (v) => v instanceof Arr ? (v.r && v.c ? v.at(0, 0) : E.VAL) : v;
  function cmp(a, b) { // −1/0/1, Excel sırası: sayı < metin < mantıksal; boş ↔ 0 ya da ""
    if (a === BOS) a = typeof b === 'string' ? '' : typeof b === 'boolean' ? false : 0;
    if (b === BOS) b = typeof a === 'string' ? '' : typeof a === 'boolean' ? false : 0;
    const ta = typeof a === 'number' ? 0 : typeof a === 'string' ? 1 : 2, tb = typeof b === 'number' ? 0 : typeof b === 'string' ? 1 : 2;
    if (ta !== tb) return ta < tb ? -1 : 1;
    if (ta === 1) { const x = a.toLowerCase(), y = b.toLowerCase(); return x < y ? -1 : x > y ? 1 : 0; }
    const x = +a, y = +b; if (x === y || Math.abs(x - y) <= Math.max(Math.abs(x), Math.abs(y)) * EPS) return 0; return x < y ? -1 : 1;
  }
  function ikili(o, a, b) {
    if (a instanceof Arr || b instanceof Arr) {
      const A = a instanceof Arr ? a : null, B = b instanceof Arr ? b : null, R = Math.max(A ? A.r : 1, B ? B.r : 1), C = Math.max(A ? A.c : 1, B ? B.c : 1), v = new Array(R * C);
      const g = (X, x, i, j) => X ? X.at(X.r === 1 ? 0 : i, X.c === 1 ? 0 : j) : x;
      for (let i = 0; i < R; i++) for (let j = 0; j < C; j++) v[i * C + j] = ikili(o, g(A, a, i, j), g(B, b, i, j));
      return new Arr(R, C, v);
    }
    if (isErr(a)) return a; if (isErr(b)) return b;
    switch (o) {
      case '&': return str(a) + str(b);
      case '=': return cmp(a, b) === 0; case '<>': return cmp(a, b) !== 0;
      case '<': return cmp(a, b) < 0; case '>': return cmp(a, b) > 0; case '<=': return cmp(a, b) <= 0; case '>=': return cmp(a, b) >= 0;
    }
    const x = num(a), y = num(b); if (isErr(x)) return x; if (isErr(y)) return y;
    switch (o) { case '+': return yakl(x + y, x, y); case '-': return yakl(x - y, x, -y); case '*': return x * y; case '/': return y === 0 ? E.DIV : x / y; case '^': return Math.pow(x, y); }
    throw new Error('işleç ' + o);
  }
  /* ---- ölçüt (SUMIFS vb.) ---- */
  function olcut(cr) {
    cr = skaler(cr);
    if (typeof cr === 'number') return (v) => typeof v === 'number' && v === cr;
    if (typeof cr === 'boolean') return (v) => v === cr;
    const s = str(cr); const m = /^(<>|<=|>=|=|<|>)?(.*)$/s.exec(s); const op = m[1] || '=', rest = m[2];
    const n = rest.trim() !== '' && isFinite(Number(rest)) ? Number(rest) : null;
    // Excel ölçütte sayıyı 15 anlamlı basamakla karşılaştırır ("<="&AX: kargo sınırına tam denk gelen kümülatif ton; paket 104)
    if (n !== null) return (v) => { if (typeof v !== 'number') return op === '<>' ? true : false; v = +v.toPrecision(15); switch (op) { case '=': return v === n; case '<>': return v !== n; case '<': return v < n; case '>': return v > n; case '<=': return v <= n; case '>=': return v >= n; } };
    const t = rest.toLowerCase(), wild = /[*?]/.test(t), re = wild ? new RegExp('^' + t.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$', 's') : null;
    const eq = (v) => { if (v === BOS) return t === ''; if (typeof v !== 'string') return false; const x = v.toLowerCase(); return re ? re.test(x) : x === t; };
    if (op === '=') return eq; if (op === '<>') return (v) => !eq(v);
    return (v) => { if (typeof v !== 'string') return false; const c = cmp(v.toLowerCase(), t); return op === '<' ? c < 0 : op === '>' ? c > 0 : op === '<=' ? c <= 0 : c >= 0; };
  }
  function ifsMaske(ciftler) {
    let mask = null;
    for (const [rng, cr] of ciftler) { if (!(rng instanceof Arr)) throw new Error('Ölçüt aralığı değil'); const f = olcut(cr), n = rng.v.length; if (!mask) mask = new Array(n).fill(true); for (let i = 0; i < n; i++) if (mask[i] && !f(rng.v[i])) mask[i] = false; }
    return mask;
  }
  const duz = (args) => { const out = []; for (const a of args) { if (a instanceof Arr) { for (const x of a.v) if (typeof x === 'number') out.push(x); else if (isErr(x)) out.push(x); } else if (a !== BOS) out.push(a); } return out; };
  const yuvarla = (x, d) => { const m = Math.pow(10, d); const y = Math.abs(x) * m; const r = Math.round(y + 1e-9 * Math.max(1, y)); return Math.sign(x) * r / m; };
  function textFmt(v, f) {
    if (isErr(v)) return v; if (typeof v !== 'number') return str(v);
    if (/^dd\.mm(\.yy(yy)?)?$/i.test(f)) { const d = tarihOf(v); const p = (n) => String(n).padStart(2, '0'); return p(d.getUTCDate()) + '.' + p(d.getUTCMonth() + 1) + (f.length > 5 ? '.' + (f.length > 8 ? d.getUTCFullYear() : String(d.getUTCFullYear()).slice(2)) : ''); }
    if (f.includes(';')) { const P = f.split(';'); const sec = v > 0 ? P[0] : v < 0 ? (P[1] ?? P[0]) : (P[2] ?? P[0]); return textFmt(v < 0 && P[1] !== undefined ? -v : v, sec); }
    const lm = /^([^#0]*)((?:#,##)?0(?:\.0+)?%?)(.*)$/.exec(f); if (lm && (lm[1] || lm[3])) { const q = (t) => t.replace(/"/g, '').replace(/\\(.)/g, '$1'); return q(lm[1]) + textFmt(v, lm[2]) + q(lm[3]); }
    const m = /^(#,##)?0(\.(0+))?(%)?$/.exec(f);
    if (m) { let x = m[4] ? v * 100 : v; const dec = m[3] ? m[3].length : 0; let s = yuvarla(x, dec).toFixed(dec); if (m[1]) { const [a, b] = s.split('.'); s = a.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (b ? '.' + b : ''); } return s + (m[4] ? '%' : ''); }
    return fmtGenel(v);
  }
  /* ---- değerlendirme ---- */
  function ev(n, ctx) {
    switch (n.k) {
      case 'num': return n.v; case 'str': return n.v; case 'bool': return n.v; case 'bosarg': return BOS;
      case 'neg': { const a = ev(n.a, ctx); if (a instanceof Arr) return ikili('*', a, -1); const x = num(a); return isErr(x) ? x : -x; }
      case 'ref': { const sh = n.sh || ctx.sh; if (n.r1 === n.r2 && n.c1 === n.c2 && n.r2 !== -1) return hucre(sh, n.r1, n.c1); return aralik(sh, n.r1, n.c1, n.r2, n.c2); }
      case 'bin': return ikili(n.o, ev(n.a, ctx), ev(n.b, ctx));
      case 'fn': return fn(n, ctx);
    }
    throw new Error('düğüm ' + n.k);
  }
  const ref = (n, ctx) => n.k === 'ref' ? { sh: n.sh || ctx.sh, r1: n.r1, c1: n.c1, r2: n.r2, c2: n.c2 } : null;
  function fn(n, ctx) {
    const A = n.args, rg = (i) => { const q = A[i]; if (q.k === 'ref') { const sh = q.sh || ctx.sh; return aralik(sh, q.r1, q.c1, q.r2, q.c2); } const v = ev(q, ctx); return v instanceof Arr ? v : new Arr(1, 1, [v]); }, e = (i) => ev(A[i], ctx), es = (i) => skaler(ev(A[i], ctx)), nm = (i) => num(es(i));
    switch (n.n) {
      case 'IF': { const c = bool(es(0)); if (isErr(c)) return c; return c ? (A.length > 1 ? e(1) : true) : (A.length > 2 ? e(2) : false); }
      case 'IFERROR': { let v; try { v = es(0); } catch (x) { throw x; } return isErr(v) ? e(1) : v; }
      case 'ISNUMBER': { if (A[0].k === 'fn') { const a0 = e(0); if (a0 instanceof Arr) return new Arr(a0.r, a0.c, a0.v.map((x) => typeof x === 'number')); return typeof a0 === 'number'; } const v = es(0); return typeof v === 'number'; }   // paket 83: ISNUMBER(MATCH(dizi; …)) dizi döner
      case 'NOT': { const b = bool(es(0)); return isErr(b) ? b : !b; }
      case 'AND': case 'OR': { let r = n.n === 'AND'; for (let i = 0; i < A.length; i++) { const v = e(i); const L = v instanceof Arr ? v.v.filter((x) => x !== BOS && typeof x !== 'string') : [v]; for (const x of L) { const b = bool(x); if (isErr(b)) return b; if (n.n === 'AND') r = r && b; else r = r || b; } } return r; }
      case 'CHOOSE': { const i = nm(0); if (isErr(i)) return i; const k = Math.floor(i); if (k < 1 || k >= A.length) return E.VAL; return e(k); }
      case 'INDEX': { const a = rg(0); if (!(a instanceof Arr)) return a; let r = A.length > 1 && A[1].k !== 'bosarg' ? nm(1) : 0, c = A.length > 2 && A[2].k !== 'bosarg' ? nm(2) : 0; if (isErr(r)) return r; if (isErr(c)) return c;
        r = Math.floor(r); c = Math.floor(c); if (A.length === 2 && a.r === 1) { c = r; r = 1; } if (r === 0 && c === 0) return a; if (a.c === 1 && c === 0) c = 1; if (a.r === 1 && r === 0) r = 1;
        if (r < 1 || r > a.r || c < 1 || c > a.c) return E.REF; return a.at(r - 1, c - 1); }
      case 'MATCH': { if (A[0].k !== 'fn' && A[0].k !== 'sayi' && A[0].k !== 'metin') { const v0 = e(0); if (v0 instanceof Arr && (v0.r > 1 || v0.c > 1)) { const a = rg(1); if (!(a instanceof Arr)) return E.NA; const t = A.length > 2 ? nm(2) : 1; if (t !== 0) return E.VAL;   // paket 83: MATCH(aralık; aralık; 0) SUMPRODUCT içinde dizi
          const L = a.v, m = new Map(); for (let i = L.length - 1; i >= 0; i--) { const x = L[i]; if (typeof x === 'number') m.set(x, i + 1); else if (typeof x === 'string') m.set('s' + x.toLowerCase(), i + 1); }
          return new Arr(v0.r, v0.c, v0.v.map((x) => { const k = typeof x === 'string' ? 's' + x.toLowerCase() : x; const r = m.get(k); return r === undefined ? E.NA : r; })); } }
        const v = es(0), a = rg(1); if (isErr(v)) return v; const t = A.length > 2 ? nm(2) : 1; if (!(a instanceof Arr)) return E.NA; const L = a.v;
        if (t === 0) { if (a.k && (typeof v === 'number' || typeof v === 'string')) { let m = matchOnb.get(a.k); if (!m) { m = new Map(); for (let i = L.length - 1; i >= 0; i--) { const x = L[i]; m.set(typeof x === 'string' ? 's' + x.toLowerCase() : typeof x === 'number' ? 'n' + x : 'o' + String(x), i); } matchOnb.set(a.k, m); } const i = m.get(typeof v === 'string' ? 's' + v.toLowerCase() : 'n' + v); return i === undefined ? E.NA : i + 1; }
          for (let i = 0; i < L.length; i++) if (cmp(L[i], v) === 0 && L[i] !== BOS) return i + 1; return E.NA; }
        if (t > 0) { let lo = 0, hi = L.length - 1, res = -1; while (lo <= hi) { const mid = (lo + hi) >> 1; const x = L[mid]; if (x === BOS || cmp(x, v) <= 0) { if (x !== BOS) res = mid; lo = mid + 1; } else hi = mid - 1; } return res < 0 ? E.NA : res + 1; }
        { let res = -1; for (let i = 0; i < L.length; i++) { if (cmp(L[i], v) >= 0) res = i; else break; } return res < 0 ? E.NA : res + 1; } }
      case 'DATE': { const y = nm(0), m = nm(1), d = nm(2); for (const x of [y, m, d]) if (isErr(x)) return x; return serial(Math.floor(y), Math.floor(m), Math.floor(d)); }
      case 'YEAR': case 'MONTH': case 'DAY': { const tf = (x) => { const d = tarihOf(x); return n.n === 'YEAR' ? d.getUTCFullYear() : n.n === 'MONTH' ? d.getUTCMonth() + 1 : d.getUTCDate(); };
        const a0 = e(0); if (a0 instanceof Arr) return ikiliF(a0, 0, (x) => tf(x)); const x = nm(0); if (isErr(x)) return x; return tf(x); }
      case 'WEEKDAY': { const t = A.length > 1 ? nm(1) : 1, wd = (x) => { if (isErr(x)) return x; const w = tarihOf(x).getUTCDay(); return t === 2 ? (w === 0 ? 7 : w) : t === 3 ? (w === 0 ? 6 : w - 1) : w + 1; };
        const a0 = e(0); if (a0 instanceof Arr && (a0.r > 1 || a0.c > 1)) return new Arr(a0.r, a0.c, a0.v.map((x) => (typeof x === 'number' ? wd(x) : isErr(x) ? x : E.VAL))); const x = nm(0); return wd(x); }   // paket 83: SUMPRODUCT içinde aralık
      case 'EOMONTH': { const x = nm(0), m = nm(1); if (isErr(x)) return x; if (isErr(m)) return m; const d = tarihOf(x); return serial(d.getUTCFullYear(), d.getUTCMonth() + 1 + Math.trunc(m) + 1, 0); }
      case 'ROW': { if (!A.length) return ctx.r + 1; const r = ref(A[0], ctx); return r ? r.r1 + 1 : E.VAL; }
      case 'MAX': case 'MIN': { const L = duz(A.map((_, i) => e(i))); let r = null; for (const x of L) { const v = num(x); if (isErr(v)) return v; r = r === null ? v : n.n === 'MAX' ? Math.max(r, v) : Math.min(r, v); } return r === null ? 0 : r; }
      case 'SUM': { let s = 0; for (const x of duz(A.map((_, i) => e(i)))) { const v = num(x); if (isErr(v)) return v; s += v; } return s; }
      case 'AVERAGE': { let s = 0, k = 0; for (const x of duz(A.map((_, i) => e(i)))) { const v = num(x); if (isErr(v)) return v; s += v; k++; } return k ? s / k : E.DIV; }
      case 'ABS': { const a0 = e(0); if (a0 instanceof Arr) return ikiliF(a0, 0, (x) => Math.abs(x)); const x = num(a0); return isErr(x) ? x : Math.abs(x); }
      case 'INT': { const a = e(0); if (a instanceof Arr) return ikiliF(a, 0, (x) => Math.floor(x)); const x = num(a); return isErr(x) ? x : Math.floor(x); }
      case 'MOD': { const a = e(0), b = e(1); if (a instanceof Arr || b instanceof Arr) return ikiliF(a, b, (x, y) => y === 0 ? E.DIV : x - y * Math.floor(x / y)); const x = num(a), y = num(b); if (isErr(x)) return x; if (isErr(y)) return y; return y === 0 ? E.DIV : x - y * Math.floor(x / y); }
      case 'ROUND': case 'ROUNDUP': { const x = nm(0), d = A.length > 1 ? nm(1) : 0; if (isErr(x)) return x; if (isErr(d)) return d; if (n.n === 'ROUND') return yuvarla(x, d); const m = Math.pow(10, d); return Math.sign(x) * Math.ceil(Math.abs(x) * m - 1e-9) / m; }
      case 'TEXT': return textFmt(es(0), str(es(1)));
      case 'SUMIFS': case 'AVERAGEIFS': case 'COUNTIFS': case 'MAXIFS': {
        const bas = n.n === 'COUNTIFS' ? 0 : 1, hedef = bas ? rg(0) : null, cf = []; for (let i = bas; i < A.length; i += 2) cf.push([rg(i), e(i + 1)]);
        const mask = ifsMaske(cf); if (n.n === 'COUNTIFS') return mask.filter(Boolean).length;
        let s = 0, k = 0, mx = null; for (let i = 0; i < mask.length; i++) if (mask[i]) { const v = hedef.v[i]; if (typeof v === 'number') { s += v; k++; mx = mx === null ? v : Math.max(mx, v); } else if (isErr(v)) return v; }
        return n.n === 'SUMIFS' ? s : n.n === 'MAXIFS' ? (mx === null ? 0 : mx) : (k ? s / k : E.DIV); }
      case 'COUNTIF': { const mask = ifsMaske([[rg(0), e(1)]]); return mask.filter(Boolean).length; }
      case 'AVERAGEIF': { const rng = rg(0), mask = ifsMaske([[rng, e(1)]]), h = A.length > 2 ? rg(2) : rng; let s = 0, k = 0; for (let i = 0; i < mask.length; i++) if (mask[i]) { const v = h.v[i]; if (typeof v === 'number') { s += v; k++; } } return k ? s / k : E.DIV; }
      case 'SUMPRODUCT': { const L = A.map((_, i) => e(i)); const Ar = L.map((x) => x instanceof Arr ? x : new Arr(1, 1, [x])); const n0 = Ar[0].v.length; if (Ar.some((x) => x.v.length !== n0)) return E.VAL;
        let s = 0; for (let i = 0; i < n0; i++) { let p = 1; for (const X of Ar) { const v = X.v[i]; if (isErr(v)) return v; p *= typeof v === 'number' ? v : typeof v === 'boolean' ? (v ? 1 : 0) : 0; } s += p; } return s; }
      /* ---- genişletilmiş işlevler (03.11.2026: paket 76 modelinde SQRT; PDM'nin olası kullanımları için yaygın işlevler) ---- */
      case 'SQRT': case 'EXP': case 'LN': case 'LOG10': case 'SIGN': case 'TRUNC': case 'EVEN': case 'ODD': {
        const f = { SQRT: (x) => x < 0 ? E.NUM : Math.sqrt(x), EXP: Math.exp, LN: (x) => x <= 0 ? E.NUM : Math.log(x), LOG10: (x) => x <= 0 ? E.NUM : Math.log10(x), SIGN: Math.sign,
          TRUNC: (x) => Math.trunc(x), EVEN: (x) => { const c = Math.ceil(Math.abs(x) / 2) * 2; return Math.sign(x) * c; }, ODD: (x) => { let c = Math.ceil(Math.abs(x)); if (c % 2 === 0) c++; return (x < 0 ? -1 : 1) * c; } }[n.n];
        if (n.n === 'TRUNC' && A.length > 1) { const x = nm(0), d = nm(1); if (isErr(x)) return x; if (isErr(d)) return d; const m = Math.pow(10, Math.trunc(d)); return Math.trunc(x * m) / m; }
        const a0 = e(0); if (a0 instanceof Arr) return ikiliF(a0, 0, (x) => f(x)); const x = num(a0); return isErr(x) ? x : f(x); }
      case 'POWER': { const a = e(0), b = e(1); if (a instanceof Arr || b instanceof Arr) return ikiliF(a, b, (x, y) => Math.pow(x, y)); const x = num(a), y = num(b); if (isErr(x)) return x; if (isErr(y)) return y; const r = Math.pow(x, y); return isFinite(r) ? r : E.NUM; }
      case 'LOG': { const x = nm(0), b = A.length > 1 ? nm(1) : 10; if (isErr(x)) return x; if (isErr(b)) return b; return x <= 0 || b <= 0 || b === 1 ? E.NUM : Math.log(x) / Math.log(b); }
      case 'PI': return Math.PI;
      case 'ROUNDDOWN': { const x = nm(0), d = A.length > 1 ? nm(1) : 0; if (isErr(x)) return x; if (isErr(d)) return d; const m = Math.pow(10, d); return Math.sign(x) * Math.floor(Math.abs(x) * m + 1e-9) / m; }
      case 'CEILING': case 'CEILING.MATH': case 'FLOOR': case 'FLOOR.MATH': case 'MROUND': { const x = nm(0); if (isErr(x)) return x; let k = A.length > 1 ? nm(1) : (x < 0 && /MATH/.test(n.n) ? -1 : 1); if (isErr(k)) return k; if (/MATH/.test(n.n)) k = Math.abs(k) || 1; if (k === 0) return 0;
        if (n.n === 'MROUND') return Math.sign(x) !== Math.sign(k) && x !== 0 ? E.NUM : yuvarla(x / k, 0) * k; const up = /^CEILING/.test(n.n); const q = x / k; return (up ? Math.ceil(q - 1e-12) : Math.floor(q + 1e-12)) * k; }
      case 'SUMSQ': { let t = 0; for (const x of duz(A.map((_, i) => e(i)))) { if (isErr(x)) return x; if (typeof x === 'number') t += x * x; } return t; }   // paket 78: baz riski 1σ
      case 'PRODUCT': { let p = 1, k = 0; for (const x of duz(A.map((_, i) => e(i)))) { const v = num(x); if (isErr(v)) return v; p *= v; k++; } return k ? p : 0; }
      case 'COUNT': { let k = 0; for (let i = 0; i < A.length; i++) { const v = e(i); if (v instanceof Arr) { for (const x of v.v) if (typeof x === 'number') k++; } else if (typeof v === 'number') k++; } return k; }
      case 'COUNTA': { let k = 0; for (let i = 0; i < A.length; i++) { const v = e(i); if (v instanceof Arr) { for (const x of v.v) if (x !== BOS) k++; } else if (v !== BOS) k++; } return k; }
      case 'COUNTBLANK': { const a = rg(0); return a.v.filter((x) => x === BOS || x === '').length; }
      case 'MEDIAN': case 'STDEV': case 'STDEV.S': case 'STDEV.P': case 'STDEVP': case 'VAR': case 'VAR.S': case 'VAR.P': case 'VARP': {
        const L = []; for (const x of duz(A.map((_, i) => e(i)))) { const v = num(x); if (isErr(v)) return v; L.push(v); } if (!L.length) return E.DIV;
        if (n.n === 'MEDIAN') { L.sort((a, b) => a - b); const m = L.length >> 1; return L.length % 2 ? L[m] : (L[m - 1] + L[m]) / 2; }
        const pop = /\.P$|P$/.test(n.n) && n.n !== 'STDEV' && n.n !== 'VAR' && n.n !== 'STDEV.S' && n.n !== 'VAR.S', mu = L.reduce((a, b) => a + b, 0) / L.length, ss = L.reduce((a, b) => a + (b - mu) ** 2, 0), d = pop ? L.length : L.length - 1; if (d <= 0) return E.DIV;
        const va = ss / d; return /^VAR/.test(n.n) ? va : Math.sqrt(va); }
      case 'LARGE': case 'SMALL': { const L = []; for (const x of duz([e(0)])) { const v = num(x); if (!isErr(v)) L.push(v); } const k = nm(1); if (isErr(k)) return k; const i = Math.ceil(k) - 1; if (i < 0 || i >= L.length) return E.NUM; L.sort((a, b) => n.n === 'LARGE' ? b - a : a - b); return L[i]; }
      case 'PERCENTILE': case 'PERCENTILE.INC': case 'QUARTILE': case 'QUARTILE.INC': { const L = []; for (const x of duz([e(0)])) { const v = num(x); if (!isErr(v)) L.push(v); } if (!L.length) return E.NUM; let p = nm(1); if (isErr(p)) return p; if (/^QUARTILE/.test(n.n)) p = p / 4; if (p < 0 || p > 1) return E.NUM;
        L.sort((a, b) => a - b); const h = (L.length - 1) * p, lo = Math.floor(h); return lo + 1 < L.length ? L[lo] + (h - lo) * (L[lo + 1] - L[lo]) : L[lo]; }
      case 'MINIFS': { const h = rg(0), cf = []; for (let i = 1; i < A.length; i += 2) cf.push([rg(i), e(i + 1)]); const mask = ifsMaske(cf); let mn = null; for (let i = 0; i < mask.length; i++) if (mask[i]) { const v = h.v[i]; if (typeof v === 'number') mn = mn === null ? v : Math.min(mn, v); else if (isErr(v)) return v; } return mn === null ? 0 : mn; }
      case 'SUMIF': { const rng = rg(0), mask = ifsMaske([[rng, e(1)]]), h = A.length > 2 ? rg(2) : rng; let s = 0; for (let i = 0; i < mask.length; i++) if (mask[i]) { const v = h.v[i]; if (typeof v === 'number') s += v; else if (isErr(v)) return v; } return s; }
      case 'IFNA': { const v = es(0); return isErr(v) && v.c === '#N/A' ? e(1) : v; }
      case 'NA': return E.NA;
      case 'IFS': { for (let i = 0; i + 1 < A.length; i += 2) { const c = bool(es(i)); if (isErr(c)) return c; if (c) return e(i + 1); } return E.NA; }
      case 'SWITCH': { const v = es(0); let i = 1; for (; i + 1 < A.length; i += 2) { const k = es(i); if (cmp(v, k) === 0) return e(i + 1); } return i < A.length ? e(i) : E.NA; }
      case 'XOR': { let c = 0; for (let i = 0; i < A.length; i++) { const v = e(i); const L = v instanceof Arr ? v.v.filter((x) => x !== BOS && typeof x !== 'string') : [v]; for (const x of L) { const b = bool(x); if (isErr(b)) return b; if (b) c++; } } return c % 2 === 1; }
      case 'TRUE': return true; case 'FALSE': return false;
      case 'ISBLANK': { const v = es(0); return v === BOS; } case 'ISERROR': { const v = es(0); return isErr(v); } case 'ISERR': { const v = es(0); return isErr(v) && v.c !== '#N/A'; } case 'ISNA': { const v = es(0); return isErr(v) && v.c === '#N/A'; }
      case 'ISTEXT': { const v = es(0); return typeof v === 'string'; } case 'ISLOGICAL': { const v = es(0); return typeof v === 'boolean'; } case 'ISNONTEXT': { const v = es(0); return typeof v !== 'string'; }
      case 'ISEVEN': case 'ISODD': { const x = nm(0); if (isErr(x)) return x; const t = Math.trunc(x) % 2 === 0; return n.n === 'ISEVEN' ? t : !t; }
      case 'LEN': { const v = es(0); return isErr(v) ? v : str(v).length; }
      case 'LEFT': case 'RIGHT': { const v = es(0); if (isErr(v)) return v; const k = A.length > 1 ? nm(1) : 1; if (isErr(k)) return k; const t = str(v); return n.n === 'LEFT' ? t.slice(0, k) : (k <= 0 ? '' : t.slice(-k)); }
      case 'MID': { const v = es(0), a = nm(1), k = nm(2); if (isErr(v)) return v; if (isErr(a)) return a; if (isErr(k)) return k; return str(v).substr(a - 1, k); }
      case 'UPPER': case 'LOWER': case 'TRIM': { const v = es(0); if (isErr(v)) return v; const t = str(v); return n.n === 'UPPER' ? t.toLocaleUpperCase('tr-TR') : n.n === 'LOWER' ? t.toLocaleLowerCase('tr-TR') : t.trim().replace(/\s+/g, ' '); }
      case 'CONCATENATE': case 'CONCAT': { let t = ''; for (let i = 0; i < A.length; i++) { const v = e(i); if (v instanceof Arr) { for (const x of v.v) { if (isErr(x)) return x; if (x !== BOS) t += str(x); } } else { if (isErr(v)) return v; if (v !== BOS) t += str(v); } } return t; }
      case 'VALUE': { const v = es(0); if (typeof v === 'number') return v; const x = Number(str(v).trim()); return isFinite(x) ? x : E.VAL; }
      case 'N': { const v = es(0); return typeof v === 'number' ? v : typeof v === 'boolean' ? (v ? 1 : 0) : 0; }
      case 'EDATE': { const x = nm(0), m = nm(1); if (isErr(x)) return x; if (isErr(m)) return m; const d = tarihOf(x), y = d.getUTCFullYear(), mo = d.getUTCMonth() + Math.trunc(m), son = new Date(Date.UTC(y, mo + 1, 0)).getUTCDate(); return serial(y, mo + 1, Math.min(d.getUTCDate(), son)); }
      // WORKDAY / NETWORKDAYS (paket 83: Kargolar fiyatlama dönemi, Tatiller sayfası; Cmt–Paz tatil)
      case 'WORKDAY': { const x = nm(0), g = nm(1); if (isErr(x)) return x; if (isErr(g)) return g; const T = new Set(); if (A.length > 2) for (const h of duz([e(2)])) { if (isErr(h)) return h; if (typeof h === 'number') T.add(Math.floor(h)); }
        let d = Math.floor(x), k = Math.trunc(g); const ad = k < 0 ? -1 : 1, is = (v) => { const w = tarihOf(v).getUTCDay(); return w !== 0 && w !== 6 && !T.has(v); }; while (k !== 0) { d += ad; if (is(d)) k -= ad; } return d; }
      case 'NETWORKDAYS': { const a = nm(0), b = nm(1); if (isErr(a)) return a; if (isErr(b)) return b; const T = new Set(); if (A.length > 2) for (const h of duz([e(2)])) if (typeof h === 'number') T.add(Math.floor(h));
        let s0 = Math.floor(Math.min(a, b)), s1 = Math.floor(Math.max(a, b)), n = 0; for (let d = s0; d <= s1; d++) { const w = tarihOf(d).getUTCDay(); if (w !== 0 && w !== 6 && !T.has(d)) n++; } return a <= b ? n : -n; }
      case 'DAYS': { const a = nm(0), b = nm(1); if (isErr(a)) return a; if (isErr(b)) return b; return Math.floor(a) - Math.floor(b); }
      case 'YEARFRAC': { const a = nm(0), b = nm(1); if (isErr(a)) return a; if (isErr(b)) return b; const t = A.length > 2 ? nm(2) : 0; return Math.abs(b - a) / (t === 3 ? 365 : t === 2 ? 360 : 365.25); }
      case 'VLOOKUP': case 'HLOOKUP': { const v = es(0), a = rg(1), k = nm(2); if (isErr(v)) return v; if (isErr(k)) return k; const tam = A.length > 3 ? !bool(es(3)) : false, V = n.n === 'VLOOKUP';
        const say = V ? a.r : a.c, at = (i, j) => V ? a.at(i, j) : a.at(j, i); if (k < 1 || k > (V ? a.c : a.r)) return E.REF; let h = -1;
        if (tam) { for (let i = 0; i < say; i++) if (cmp(at(i, 0), v) === 0 && at(i, 0) !== BOS) { h = i; break; } } else { for (let i = 0; i < say; i++) { const x = at(i, 0); if (x === BOS) continue; if (cmp(x, v) <= 0) h = i; else break; } }
        return h < 0 ? E.NA : at(h, k - 1); }
      case 'XLOOKUP': { const v = es(0), a = rg(1), b = rg(2); if (isErr(v)) return v; for (let i = 0; i < a.v.length; i++) if (cmp(a.v[i], v) === 0 && a.v[i] !== BOS) return b.v.length === a.v.length ? b.v[i] : (b.r === a.r ? b.at(i, 0) : b.at(0, i)); return A.length > 3 ? e(3) : E.NA; }
      case 'NORM.S.DIST': case 'NORMSDIST': { const z = nm(0); if (isErr(z)) return z; const kum = A.length > 1 ? bool(es(1)) : true; return kum ? normCdf(z) : Math.exp(-z * z / 2) / Math.sqrt(2 * Math.PI); }
      case 'NORM.DIST': case 'NORMDIST': { const x = nm(0), m = nm(1), sd = nm(2); for (const q of [x, m, sd]) if (isErr(q)) return q; if (sd <= 0) return E.NUM; const z = (x - m) / sd, kum = bool(es(3)); return kum ? normCdf(z) : Math.exp(-z * z / 2) / (sd * Math.sqrt(2 * Math.PI)); }
      case 'NORM.S.INV': case 'NORMSINV': { const p = nm(0); if (isErr(p)) return p; return p <= 0 || p >= 1 ? E.NUM : normInv(p); }
      case 'NORM.INV': case 'NORMINV': { const p = nm(0), m = nm(1), sd = nm(2); for (const q of [p, m, sd]) if (isErr(q)) return q; return p <= 0 || p >= 1 || sd <= 0 ? E.NUM : m + sd * normInv(p); }
    }
    throw new Error('Desteklenmeyen Excel işlevi: ' + n.n);
  }
  function normCdf(z) { const t = 1 / (1 + 0.2316419 * Math.abs(z)), d = 0.3989422804014327 * Math.exp(-z * z / 2), p = d * t * (0.31938153 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429)))); return z >= 0 ? 1 - p : p; }
  function normInv(p) { const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239], b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572], c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783], d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416], pl = 0.02425;
    if (p < pl) { const q = Math.sqrt(-2 * Math.log(p)); return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
    if (p > 1 - pl) { const q = Math.sqrt(-2 * Math.log(1 - p)); return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
    const q = p - 0.5, r = q * q; return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1); }
  function ikiliF(a, b, f) { const A = a instanceof Arr ? a : null, B = b instanceof Arr ? b : null, R = Math.max(A ? A.r : 1, B ? B.r : 1), C = Math.max(A ? A.c : 1, B ? B.c : 1), v = new Array(R * C);
    for (let i = 0; i < R; i++) for (let j = 0; j < C; j++) { const x = num(A ? A.at(A.r === 1 ? 0 : i, A.c === 1 ? 0 : j) : a), y = num(B ? B.at(B.r === 1 ? 0 : i, B.c === 1 ? 0 : j) : b); v[i * C + j] = isErr(x) ? x : isErr(y) ? y : f(x, y); } return new Arr(R, C, v); }

  return {
    ayarla(sh, adr, v) { const m = /^([A-Z]+)(\d+)$/.exec(adr); girdi.set(key(sh, +m[2] - 1, kolNo(m[1])), v); },
    hepsi() { // satır sırasıyla (derin özyinelemeyi azaltır)
      const shs = Object.keys(S), maxR = Math.max(...shs.map((s) => S[s].maxR));
      for (let r = 0; r <= maxR; r++) for (const s of shs) { const S0 = S[s]; if (r > S0.maxR) continue; for (let c = 0; c <= S0.maxC; c++) { const x = S0.cells.get(r * 16384 + c); if (x && x.f) hucre(s, r, c); } }
      return sira;
    },
    deger: (sh, r, c) => { const v = hucre(sh, r, c); return v === BOS ? null : isErr(v) ? null : v; },
    hamDeger: hucre, BOS, isErr
  };
}

/* Yeniden hesaplanmış değerlerle sayfa satırları (gts_pipeline'ın beklediği biçim: 1 tabanlı satır → hücre dizisi) */
function hesapla(buf, girdiler = {}) {
  const S = kitapAc(buf), M = motor(S);
  for (const [k, v] of Object.entries(girdiler)) { const [sh, adr] = k.split('!'); if (S[sh]) M.ayarla(sh, adr, v); }
  const n = M.hepsi();
  const cache = {};
  return {
    sayfalar: Object.keys(S), formul: n,
    dogrulama(sh, adr) { const m = /^([A-Z]+)(\d+)$/.exec(adr), r = +m[2], c = kolNo(m[1]); if (!S[sh]) return null;
      for (const d of S[sh].dv || []) for (const ar of d.sqref.split(/\s+/)) { const q = /^([A-Z]+)(\d+)(?::([A-Z]+)(\d+))?$/.exec(ar); if (!q) continue; const c1 = kolNo(q[1]), r1 = +q[2], c2 = q[3] ? kolNo(q[3]) : c1, r2 = q[4] ? +q[4] : r1;
        if (r >= r1 && r <= r2 && c >= c1 && c <= c2) { const o = { tip: d.tip, bos: d.bos, hata: d.hata };
          if (d.tip === 'list' && d.f1 && /^".*"$/.test(d.f1)) o.liste = d.f1.slice(1, -1).split(',');
          else if (d.tip === 'whole' || d.tip === 'decimal') { o.min = Number(d.f1); o.max = d.f2 != null ? Number(d.f2) : null; }
          return o; } }
      return null; },
    formulMu(sh, adr) { const m = /^([A-Z]+)(\d+)$/.exec(adr), x = S[sh] && S[sh].cells.get((+m[2] - 1) * 16384 + kolNo(m[1])); return !!(x && x.f); },
    formulMetni(sh, adr) { const m = /^([A-Z]+)(\d+)$/.exec(adr), x = S[sh] && S[sh].cells.get((+m[2] - 1) * 16384 + kolNo(m[1])); return x && x.f ? String(x.f) : null; },
    orijinal(sh, adr) { const m = /^([A-Z]+)(\d+)$/.exec(adr), x = S[sh] && S[sh].cells.get((+m[2] - 1) * 16384 + kolNo(m[1])); return x && x.v !== BOS && !isErr(x.v) ? x.v : null; },
    sayfa(ad) {
      if (cache[ad]) return cache[ad]; const S0 = S[ad]; if (!S0) throw new Error('Excel modelinde "' + ad + '" sayfası yok.');
      const rows = []; for (const [k] of S0.cells) { const r = Math.floor(k / 16384), c = k % 16384; (rows[r + 1] = rows[r + 1] || [])[c] = M.deger(ad, r, c); }
      for (let i = 0; i < rows.length; i++) if (rows[i]) for (let j = 0; j < rows[i].length; j++) if (rows[i][j] === undefined) rows[i][j] = null;
      return (cache[ad] = rows);
    },
    /* doğrulama: kayıtlı (önbellek) değerlerle karşılaştır */
    karsilastir(tol = 1e-6) { const out = []; let n0 = 0;
      for (const [ad, S0] of Object.entries(S)) for (const [k, x] of S0.cells) { if (!x.f) continue; n0++; const r = Math.floor(k / 16384), c = k % 16384, v = M.hamDeger(ad, r, c), w = x.v;
        const ok = (typeof w === 'number' && typeof v === 'number') ? Math.abs(v - w) <= tol * Math.max(1, Math.abs(w)) : (w === BOS ? (v === '' || v === 0 || v === BOS) : isErr(w) ? isErr(v) : (typeof w === 'boolean' && typeof v === 'number') ? (w ? 1 : 0) === v : String(w) === String(isErr(v) ? v.c : v));
        if (!ok) out.push([ad, k, x.f, w, v]); }
      return { formul: n0, fark: out }; }
  };
}
module.exports = { hesapla, kitapAc, parse };
