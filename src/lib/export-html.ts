/**
 * Generates a fully self-contained standalone HTML file for a calculator.
 * No external dependencies — works offline, embeds in iframes.
 */

import type { CalculatorDefinition } from "@/types/calculator";

function escHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ─── Embedded CSS ─────────────────────────────────────────────────────────────

const CSS = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f8f9fa;color:#111;min-height:100vh;padding:2rem 1rem}
.container{max-width:560px;margin:0 auto}
.header{margin-bottom:1.5rem}
.title{font-size:1.375rem;font-weight:700;letter-spacing:-0.01em}
.description{color:#6b7280;font-size:0.875rem;margin-top:0.375rem;line-height:1.5}
.fields{display:flex;flex-direction:column;gap:1rem}
.field{display:flex;flex-direction:column;gap:0.3rem}
label{font-size:0.875rem;font-weight:500;color:#374151}
.input-row{display:flex;gap:0.5rem}
input[type=number],select{width:100%;padding:0.5rem 0.75rem;border:1px solid #d1d5db;border-radius:0.5rem;font-size:0.9375rem;background:#fff;color:#111;outline:none;transition:border-color .15s}
input[type=number]:focus,select:focus{border-color:#6366f1;box-shadow:0 0 0 2px rgba(99,102,241,.15)}
.unit-select{width:5.5rem;flex-shrink:0}
.error-msg{font-size:0.75rem;color:#dc2626}
.divider{border:none;border-top:1px solid #e5e7eb;margin:1.25rem 0}
.outputs{display:flex;flex-direction:column;gap:0.625rem}
.output-card{background:#fff;border:1px solid #e5e7eb;border-radius:0.75rem;padding:0.75rem 1rem;display:flex;align-items:center;justify-content:space-between}
.output-label{font-size:0.875rem;color:#6b7280;font-weight:500}
.output-value-row{display:flex;align-items:center;gap:0.5rem}
.output-value{font-size:1.25rem;font-weight:600;font-variant-numeric:tabular-nums}
.output-unit{font-size:0.8125rem;color:#9ca3af}
.report{margin-top:1rem;background:#eff6ff;border:1px solid #bfdbfe;border-radius:0.75rem;padding:0.875rem 1rem}
.report p{font-size:0.9rem;line-height:1.55;color:#1e40af}
`;

// ─── Embedded vanilla JS: formula evaluator + renderer ───────────────────────

const INLINE_JS = `
// ── Mini formula evaluator ──────────────────────────────────────────────────
function calcEval(expr, vars) {
  var pos = 0;
  var tokens = tokenize(expr);
  function tokenize(s) {
    var toks = [], i = 0;
    while (i < s.length) {
      if (/\\s/.test(s[i])) { i++; continue; }
      if (/\\d/.test(s[i]) || (s[i]==='.' && /\\d/.test(s[i+1]||''))) {
        var n=''; while(i<s.length&&/[\\d.]/.test(s[i]))n+=s[i++];
        if(s[i]==='e'||s[i]==='E'){n+=s[i++];if(s[i]==='+'||s[i]==='-')n+=s[i++];while(i<s.length&&/\\d/.test(s[i]))n+=s[i++];}
        toks.push({t:'n',v:parseFloat(n)}); continue;
      }
      if (/[a-zA-Z_]/.test(s[i])) {
        var id=''; while(i<s.length&&/[a-zA-Z_0-9]/.test(s[i]))id+=s[i++];
        toks.push({t:'id',v:id}); continue;
      }
      if (s[i]==="'"||s[i]==='"') {
        var q=s[i++],str=''; while(i<s.length&&s[i]!==q)str+=s[i++]; i++;
        toks.push({t:'s',v:str}); continue;
      }
      var ops=['>=','<=','==','!=','&&','||'];
      var found=false;
      for(var k=0;k<ops.length;k++){if(s.slice(i,i+ops[k].length)===ops[k]){toks.push({t:'op',v:ops[k]});i+=ops[k].length;found=true;break;}}
      if(!found)toks.push({t:'op',v:s[i++]});
    }
    return toks;
  }
  var fns={IF:function(c,a,b){return c?a:b},sqrt:Math.sqrt,ln:Math.log,log:Math.log,abs:Math.abs,
    round:function(x,n){return n!=null?Math.round(x*Math.pow(10,n))/Math.pow(10,n):Math.round(x)},
    floor:Math.floor,ceil:Math.ceil,min:Math.min,max:Math.max,pow:Math.pow};
  function peek(){return tokens[pos];}
  function consume(){return tokens[pos++];}
  function match(v){if(peek()&&peek().v===v){return consume();}return null;}
  function parseExpr(){return parseTernary();}
  function parseTernary(){
    var l=parseOr();
    if(match('?')){var a=parseOr();match(':');var b=parseTernary();return l?a:b;}
    return l;
  }
  function parseOr(){
    var l=parseAnd();
    while(peek()&&(peek().v==='OR'||peek().v==='or'||peek().v==='||')){consume();var r=parseAnd();l=(l||r)?1:0;}
    return l;
  }
  function parseAnd(){
    var l=parseCmp();
    while(peek()&&(peek().v==='AND'||peek().v==='and'||peek().v==='&&')){consume();var r=parseCmp();l=(l&&r)?1:0;}
    return l;
  }
  function parseCmp(){
    var l=parseAdd();
    var cops=['==','!=','>=','<=','>','<'];
    while(peek()&&cops.indexOf(peek().v)>=0){
      var op=consume().v,r=parseAdd();
      if(op==='==')l=l==r?1:0; else if(op==='!=')l=l!=r?1:0;
      else if(op==='>')l=l>r?1:0; else if(op==='>=')l=l>=r?1:0;
      else if(op==='<')l=l<r?1:0; else if(op==='<=')l=l<=r?1:0;
    }
    return l;
  }
  function parseAdd(){
    var l=parseMul();
    while(peek()&&(peek().v==='+'||peek().v==='-')){var op=consume().v,r=parseMul();l=op==='+'?l+r:l-r;}
    return l;
  }
  function parseMul(){
    var l=parsePow();
    while(peek()&&(peek().v==='*'||peek().v==='/')){var op=consume().v,r=parsePow();l=op==='*'?l*r:l/r;}
    return l;
  }
  function parsePow(){
    var b=parseUnary();
    if(peek()&&peek().v==='^'){consume();var e=parsePow();return Math.pow(b,e);}
    return b;
  }
  function parseUnary(){if(peek()&&peek().v==='-'){consume();return -parsePrimary();}return parsePrimary();}
  function parsePrimary(){
    var t=peek();
    if(!t)throw new Error('Unexpected end');
    if(t.t==='n'){consume();return t.v;}
    if(t.t==='s'){consume();return t.v;}
    if(t.t==='op'&&t.v==='('){consume();var v=parseExpr();match(')');return v;}
    if(t.t==='id'){
      consume();
      if(peek()&&peek().v==='('){
        consume();var args=[];
        while(!(peek()&&peek().v===')')){args.push(parseExpr());match(',');}
        match(')');
        var fn=fns[t.v];
        if(typeof fn==='function')return fn.apply(null,args);
        throw new Error('Unknown function: '+t.v);
      }
      if(t.v in vars)return vars[t.v];
      if(t.v in fns)return fns[t.v];
      throw new Error('Unknown variable: '+t.v);
    }
    throw new Error('Unexpected token: '+JSON.stringify(t));
  }
  return parseExpr();
}

// ── Unit helpers ──────────────────────────────────────────────────────────────
function toBase(val,unitLabel,units){var u=units.find(function(x){return x.label===unitLabel;});return u?val*u.factor:val;}
function fromBase(val,unitLabel,units){var u=units.find(function(x){return x.label===unitLabel;});return u?val/u.factor:val;}

// ── State ─────────────────────────────────────────────────────────────────────
var _def, _inputVals={}, _inputUnits={}, _dropVals={}, _outUnits={};

// ── Compute ───────────────────────────────────────────────────────────────────
function compute(){
  var scope={};
  _def.inputs.forEach(function(inp){
    if(inp.type==='numeric'){
      var raw=_inputVals[inp.id];
      if(raw===undefined||isNaN(raw))return;
      var unit=_inputUnits[inp.id]||(inp.units&&inp.units[0]&&inp.units[0].label)||'';
      scope[inp.id]=inp.units&&inp.units.length?toBase(raw,unit,inp.units):raw;
    } else if(inp.type==='dropdown'){
      scope[inp.id]=_dropVals[inp.id]!==undefined?_dropVals[inp.id]:inp.options[0].value;
    }
  });
  var outVals={};
  _def.outputs.forEach(function(out){
    if(out.type!=='numeric')return;
    try{
      var v=calcEval(out.formula,Object.assign({},scope,outVals));
      outVals[out.id]=v; scope[out.id]=v;
    } catch(e){ outVals[out.id]=NaN; }
  });

  // Update output DOM
  _def.outputs.forEach(function(out){
    if(out.hidden)return;
    var el=document.getElementById('out-'+out.id);
    if(!el)return;
    var raw=outVals[out.id];
    var selUnit=_outUnits[out.id]||(out.units&&out.units[0]&&out.units[0].label)||'';
    var disp=(!isNaN(raw)&&out.units&&out.units.length)?fromBase(raw,selUnit,out.units):raw;
    var prec=out.precision!=null?out.precision:2;
    el.textContent=isNaN(raw)?'—':Number(disp).toFixed(prec);
  });

  // Report
  var reportEl=document.getElementById('calc-report');
  if(reportEl&&_def.report){
    try{
      var key=String(calcEval(_def.report.formula,Object.assign({},scope,outVals))).replace(/^['"]+|['"]+$/g,'');
      var variant=_def.report.variants.find(function(v){return v.id===key;});
      if(variant){
        var text=variant.template.replace(/\\{(\\w+)\\}/g,function(_,id){
          var v=outVals[id];return isNaN(v)?'—':Number(v).toFixed(2);
        });
        reportEl.style.display='';
        reportEl.querySelector('p').textContent=text;
      } else { reportEl.style.display='none'; }
    } catch(e){ reportEl.style.display='none'; }
  }
}

// ── Build UI ──────────────────────────────────────────────────────────────────
function init(def){
  _def=def;
  var root=document.getElementById('calculator');

  // Inputs
  var fieldsDiv=document.createElement('div'); fieldsDiv.className='fields';
  def.inputs.forEach(function(inp){
    var fieldDiv=document.createElement('div'); fieldDiv.className='field';
    var lbl=document.createElement('label'); lbl.textContent=inp.label; lbl.htmlFor='f-'+inp.id;
    fieldDiv.appendChild(lbl);

    if(inp.type==='numeric'){
      var row=document.createElement('div'); row.className='input-row';
      var input=document.createElement('input'); input.type='number'; input.id='f-'+inp.id;
      if(inp.placeholder)input.placeholder=inp.placeholder;
      if(inp.min!=null)input.min=inp.min; if(inp.max!=null)input.max=inp.max;
      _inputUnits[inp.id]=(inp.defaultUnit||(inp.units&&inp.units[0]&&inp.units[0].label)||'');
      input.addEventListener('input',function(){
        _inputVals[inp.id]=this.value===''?undefined:parseFloat(this.value); compute();
      });
      row.appendChild(input);
      if(inp.units&&inp.units.length>1){
        var sel=document.createElement('select'); sel.className='unit-select';
        inp.units.forEach(function(u){
          var opt=document.createElement('option'); opt.value=u.label; opt.textContent=u.label;
          if(u.label===_inputUnits[inp.id])opt.selected=true;
          sel.appendChild(opt);
        });
        sel.addEventListener('change',function(){_inputUnits[inp.id]=this.value; compute();});
        row.appendChild(sel);
      }
      fieldDiv.appendChild(row);
    } else if(inp.type==='dropdown'){
      var sel=document.createElement('select'); sel.id='f-'+inp.id;
      _dropVals[inp.id]=inp.defaultValue!=null?inp.defaultValue:inp.options[0].value;
      inp.options.forEach(function(opt){
        var o=document.createElement('option'); o.value=opt.value; o.textContent=opt.label;
        if(opt.value===_dropVals[inp.id])o.selected=true;
        sel.appendChild(o);
      });
      sel.addEventListener('change',function(){_dropVals[inp.id]=parseFloat(this.value); compute();});
      fieldDiv.appendChild(sel);
    }
    fieldsDiv.appendChild(fieldDiv);
  });
  root.appendChild(fieldsDiv);

  // Divider
  var hr=document.createElement('hr'); hr.className='divider'; root.appendChild(hr);

  // Outputs
  var outsDiv=document.createElement('div'); outsDiv.className='outputs';
  def.outputs.forEach(function(out){
    if(out.hidden)return;
    var card=document.createElement('div'); card.className='output-card';
    var lbl=document.createElement('span'); lbl.className='output-label'; lbl.textContent=out.label;
    card.appendChild(lbl);
    var valRow=document.createElement('div'); valRow.className='output-value-row';
    var valEl=document.createElement('span'); valEl.className='output-value'; valEl.id='out-'+out.id; valEl.textContent='—';
    valRow.appendChild(valEl);
    if(out.units&&out.units.length>1){
      _outUnits[out.id]=(out.defaultUnit||out.units[0].label);
      var usel=document.createElement('select'); usel.style.width='auto'; usel.style.padding='0.2rem 0.4rem';
      out.units.forEach(function(u){
        var o=document.createElement('option'); o.value=u.label; o.textContent=u.label;
        if(u.label===_outUnits[out.id])o.selected=true; usel.appendChild(o);
      });
      usel.addEventListener('change',function(){_outUnits[out.id]=this.value; compute();});
      valRow.appendChild(usel);
    } else if(out.defaultUnit){
      var uspan=document.createElement('span'); uspan.className='output-unit'; uspan.textContent=out.defaultUnit;
      valRow.appendChild(uspan);
    }
    card.appendChild(valRow);
    outsDiv.appendChild(card);
  });
  root.appendChild(outsDiv);

  // Report container (hidden until active)
  if(def.report){
    var rep=document.createElement('div'); rep.className='report'; rep.id='calc-report'; rep.style.display='none';
    var rp=document.createElement('p'); rep.appendChild(rp); root.appendChild(rep);
  }

  compute();
}
`;

// ─── Main export function ─────────────────────────────────────────────────────

export function generateHtml(calc: CalculatorDefinition): string {
  const title = escHtml(calc.name);
  const description = calc.description ? `<p class="description">${escHtml(calc.description)}</p>` : "";
  // Escape </script> inside JSON so it can't break out of the <script> block
  const calcJson = JSON.stringify(calc, null, 2).replace(/<\/script>/gi, "<\\/script>");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>${CSS}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="title">${title}</h1>
      ${description}
    </div>
    <div id="calculator"></div>
  </div>
  <script>
${INLINE_JS}
var CALC = ${calcJson};
init(CALC);
  </script>
</body>
</html>`;
}
