import fs from "node:fs/promises";
import { Workbook, SpreadsheetFile } from "@oai/artifact-tool";

const outDir = "/Users/jonasschroder/Desktop/ai_sports_prediction/outputs/business_plan_2026";
const qaDir = "/Users/jonasschroder/Desktop/ai_sports_prediction/artifacts/business_plan_2026/qa_xlsx";
await fs.mkdir(outDir, { recursive: true });
await fs.mkdir(qaDir, { recursive: true });

const wb = Workbook.create();
const sheetNames = ["Summary","Assumptions","Monthly_Pess","Monthly_Real","Monthly_Opt","Annual_5Y","Unit_Economics","Sensitivity","Checks","Sources"];
for (const n of sheetNames) wb.worksheets.add(n);
wb.comments.setSelf({ displayName: "Jonas Schröder" });

const C = {
  navy: "#12263A", blue: "#1F5A7A", cyan: "#DDEFF5", pale: "#F3F7F9",
  green: "#2E7D5B", red: "#B54747", amber: "#B7791F", gray: "#68737D",
  border: "#CBD5DC", white: "#FFFFFF", black: "#17212B", input: "#1E4DB7", link: "#16834B"
};
const scenarios = {
  Pessimistisch: { key:"Pess", cust:[5,15,25,35,45], pv:[25000,60000,100000,150000,200000], rpm:2.5, mix:[.80,.18,.02], annualShare:.20, churn:.03, renewal:.70, dataPct:0, support:0, marketing:150, cashCac:600, fullCac:1500, fixedY:[15000,18000,22000], payrollY:[0,0,12000], capexY:[0,1000,1000] },
  Realistisch: { key:"Real", cust:[15,50,100,170,260], pv:[75000,250000,500000,900000,1500000], rpm:5, mix:[.65,.30,.05], annualShare:.35, churn:.02, renewal:.80, dataPct:0, support:0, marketing:300, cashCac:250, fullCac:750, fixedY:[18000,27000,40000], payrollY:[30000,132000,190000], capexY:[3000,8000,12000] },
  Optimistisch: { key:"Opt", cust:[30,100,220,400,650], pv:[150000,700000,1500000,3000000,5000000], rpm:8, mix:[.55,.35,.10], annualShare:.50, churn:.01, renewal:.90, dataPct:0, support:0, marketing:600, cashCac:100, fullCac:350, fixedY:[30000,55000,90000], payrollY:[132000,260000,450000], capexY:[8000,20000,40000] }
};
const common = {
  startDate: new Date("2026-08-01T00:00:00Z"), starter:49, growth:149, enterprise:499,
  starterAnnual:539, growthAnnual:1639, paymentPct:0, adContentPct:0,
  aws:80, sportsApi:10, softwareAdmin:120, accounting:200, insurance:150, legal:75,
  setup:[1500,1200,1000], capexM3:1200, depreciationMonths:36, initialCash:2000,
  founderLaborMonthly: 2*10*4.33*60, priceGrowth:.03, taxMunich:[.32975,.32975,.3192,.30865,.2981],
  taxGruenwald:[.24225,.24225,.2317,.22115,.2106]
};
const currencyFmt = "€#,##0;[Red]-€#,##0;–";
const currency1Fmt = "€#,##0.0;[Red]-€#,##0.0;–";
const pctFmt = "0.0%";
const countFmt = "#,##0";

function monthDate(i){ const d=new Date(common.startDate); d.setUTCMonth(d.getUTCMonth()+i); return d; }
function interpMonth(m, end12, end24){ if(m<=2) return 0; if(m<=12) return end12*(m-2)/10; return end12+(end24-end12)*(m-12)/12; }
function blendedMrr(s, year=1){ return (common.starter*s.mix[0]+common.growth*s.mix[1]+common.enterprise*s.mix[2]) * Math.pow(1+common.priceGrowth,year-1); }
function modelScenario(s){
  const months=[]; let cash=common.initialCash, nol=0, minCash=cash; const newHistory=[];
  for(let m=1;m<=24;m++){
    const active=interpMonth(m,s.cust[0],s.cust[1]);
    const prev=m===1?0:months[m-2].active;
    const churned=prev*s.churn;
    const added=Math.max(0,active-prev+churned); newHistory.push(added);
    const pageviews=m<=12 ? 8000+(s.pv[0]-8000)*(m-1)/11 : s.pv[0]+(s.pv[1]-s.pv[0])*(m-12)/12;
    const mrr=blendedMrr(s,1);
    const subRevenue=active*mrr;
    const adRevenue=pageviews/1000*s.rpm;
    const revenue=subRevenue+adRevenue;
    const variable=subRevenue*(s.dataPct+common.paymentPct)+active*s.support+adRevenue*common.adContentPct;
    const fixed=common.aws+common.sportsApi+common.softwareAdmin+common.accounting+(m>=2?common.insurance:0)+common.legal+s.marketing;
    const oneTime=m<=3?common.setup[m-1]:0;
    const ebitda=revenue-variable-fixed-oneTime;
    const da=(m>=3?common.capexM3/common.depreciationMonths:0);
    const ebit=ebitda-da;
    const taxable=Math.max(0,ebit-nol);
    const tax=taxable*common.taxMunich[m<=17?0:1];
    nol=Math.max(0,nol-ebit);
    const netIncome=ebit-tax;
    const annualNew=added*s.annualShare;
    const monthlyCash=active*(1-s.annualShare)*mrr;
    const annualCash=annualNew*11*mrr;
    const renewBase=m>12?newHistory[m-13]:0;
    const renewalCash=renewBase*s.annualShare*s.renewal*11*mrr;
    const receipts=monthlyCash+annualCash+renewalCash+adRevenue;
    const capex=m===3?common.capexM3:0;
    const netCf=receipts-variable-fixed-oneTime-tax-capex;
    const begCash=cash; cash+=netCf; minCash=Math.min(minCash,cash);
    months.push({m,date:monthDate(m-1),active,added,churned,pageviews,mrr,subRevenue,adRevenue,revenue,variable,fixed,oneTime,ebitda,da,ebit,taxable,tax,nol,netIncome,receipts,capex,netCf,begCash,endCash:cash,deferred:receipts-revenue,founderLabor:common.founderLaborMonthly,economicEbitda:ebitda-common.founderLaborMonthly,arr:active*mrr*12});
  }
  const years=[]; let prevEndCust=0, prevEndPv=8000, annualNol=0, endCash=common.initialCash;
  for(let y=1;y<=5;y++){
    if(y<=2){
      const ms=months.slice((y-1)*12,y*12); const sum=k=>ms.reduce((a,x)=>a+x[k],0);
      const revenue=sum("revenue"), variable=sum("variable"), fixed=sum("fixed")+sum("oneTime"), ebitda=sum("ebitda"), da=sum("da"), ebit=sum("ebit"), tax=sum("tax"), capex=sum("capex"), netCf=sum("netCf");
      endCash=ms.at(-1).endCash; annualNol=ms.at(-1).nol;
      years.push({year:y,endCust:s.cust[y-1],avgCust:sum("active")/12,endPv:s.pv[y-1],revenue,subRevenue:sum("subRevenue"),adRevenue:sum("adRevenue"),variable,fixed,payroll:0,ebitda,da,ebit,tax,netIncome:ebit-tax,capex,netCf,endCash,nol:annualNol});
    } else {
      const endCust=s.cust[y-1], endPv=s.pv[y-1], avgCust=(s.cust[y-2]+endCust)/2, avgPv=(s.pv[y-2]+endPv)/2;
      const mrr=blendedMrr(s,y), subRevenue=avgCust*mrr*12, adRevenue=avgPv/1000*s.rpm*12, revenue=subRevenue+adRevenue;
      const variable=subRevenue*(s.dataPct+common.paymentPct)+avgCust*s.support*12+adRevenue*common.adContentPct;
      const fixed=s.fixedY[y-3], payroll=s.payrollY[y-3], ebitda=revenue-variable-fixed-payroll;
      const da=(y===3?8:0)*common.capexM3/common.depreciationMonths; const ebit=ebitda-da;
      const taxable=Math.max(0,ebit-annualNol), tax=taxable*common.taxMunich[y-1]; annualNol=Math.max(0,annualNol-ebit);
      const capex=s.capexY[y-3], netCf=ebitda-tax-capex; endCash+=netCf;
      years.push({year:y,endCust,avgCust,endPv,revenue,subRevenue,adRevenue,variable,fixed,payroll,ebitda,da,ebit,tax,netIncome:ebit-tax,capex,netCf,endCash,nol:annualNol});
    }
    prevEndCust=s.cust[y-1]; prevEndPv=s.pv[y-1];
  }
  const mrr=blendedMrr(s,1), contributionPerCustomer=mrr*(1-s.dataPct-common.paymentPct)-s.support;
  const gm=contributionPerCustomer/mrr, ltv=s.churn>0?contributionPerCustomer/s.churn:null;
  const monthlyFixed=common.aws+common.sportsApi+common.softwareAdmin+common.accounting+common.insurance+common.legal+s.marketing;
  return { months, years, minCash, fundingNeed:Math.max(0,-minCash), unit:{mrr,gm,ltv,cashCac:s.cashCac,fullCac:s.fullCac,cashPayback:s.cashCac/contributionPerCustomer,fullPayback:s.fullCac/contributionPerCustomer,ltvCash:ltv/s.cashCac,ltvFull:ltv/s.fullCac,breakEvenCustomers:monthlyFixed/contributionPerCustomer,contributionPerCustomer} };
}
const models=Object.fromEntries(Object.entries(scenarios).map(([n,s])=>[n,modelScenario(s)]));

function baseSheet(name, title, subtitle=""){
  const sh=wb.worksheets.getItem(name); sh.showGridLines=false;
  sh.getRange("A1:J1").merge(); sh.getRange("A1").values=[[title]];
  sh.getRange("A1:J1").format={fill:C.navy,font:{bold:true,color:C.white,size:18},rowHeight:32,verticalAlignment:"center"};
  if(subtitle){ sh.getRange("A2:J2").merge(); sh.getRange("A2").values=[[subtitle]]; sh.getRange("A2:J2").format={fill:C.pale,font:{color:C.gray,italic:true,size:10},rowHeight:26,wrapText:true}; }
  sh.freezePanes.freezeRows(subtitle?3:2); return sh;
}
function section(r){ r.format={fill:C.blue,font:{bold:true,color:C.white},rowHeight:22}; }
function header(r){ r.format={fill:C.cyan,font:{bold:true,color:C.navy},borders:{preset:"all",style:"thin",color:C.border},horizontalAlignment:"center",verticalAlignment:"center",wrapText:true}; }
function body(r){ r.format={borders:{preset:"all",style:"thin",color:C.border},font:{color:C.black,size:10},verticalAlignment:"center"}; }
function note(r){ r.format={fill:C.pale,font:{color:C.gray,italic:true,size:9},wrapText:true}; }
function setWidths(sh, map){ for(const [col,w] of Object.entries(map)) sh.getRange(`${col}:${col}`).format.columnWidth=w; }

// Assumptions
{
  const sh=baseSheet("Assumptions","Annahmen & Modellparameter","Blaue Schrift = editierbare Annahme. Alle Werte sind Schätzungen, sofern nicht ausdrücklich als Quelle benannt.");
  const hdr=["Parameter","Einheit","Pessimistisch","Realistisch","Optimistisch","Herleitung / Status"];
  sh.getRange("A4:F4").values=[hdr]; header(sh.getRange("A4:F4"));
  const rows=[
    ["Starter Preis monatlich","€/Monat",49,49,49,"Festgelegtes Preismodell"],
    ["Growth Preis monatlich","€/Monat",149,149,149,"Festgelegtes Preismodell"],
    ["Enterprise Arbeitswert","€/Monat",499,499,499,"Schätzung; durch Angebote validieren"],
    ["Kunden Ende M12","Anzahl",5,15,30,"Szenarioannahme"],
    ["Kunden Ende M24","Anzahl",15,50,100,"Szenarioannahme"],
    ["Kunden Ende Jahr 3","Anzahl",25,100,220,"Szenarioannahme"],
    ["Kunden Ende Jahr 4","Anzahl",35,170,400,"Szenarioannahme"],
    ["Kunden Ende Jahr 5","Anzahl",45,260,650,"Szenarioannahme"],
    ["Pageviews Ende M12","PV/Monat",25000,75000,150000,"Schätzung; Event-Traffic nicht extrapoliert"],
    ["Pageviews Ende M24","PV/Monat",60000,250000,700000,"Schätzung"],
    ["Pageviews Ende Jahr 5","PV/Monat",200000,1500000,5000000,"Schätzung"],
    ["Netto-Werbe-RPM","€/1.000 PV",2.5,5,8,"Bandbreite; realen Fill Rate/eCPM testen"],
    ["Mix Starter","%",.80,.65,.55,"Schätzung"],
    ["Mix Growth","%",.18,.30,.35,"Schätzung"],
    ["Mix Enterprise","%",.02,.05,.10,"Schätzung"],
    ["Jährliche Vorauszahlung","%",.20,.35,.50,"Schätzung"],
    ["Monatlicher Logo-Churn","%",.03,.02,.01,"Schätzung nach Mindestlaufzeit"],
    ["Jahresverlängerung","%",.70,.80,.90,"Schätzung"],
    ["Variable Daten-/LLM-Kosten","% Abo-Umsatz",0,0,0,"Keine volumenabhängigen Kosten im Planbereich; API/Cloud stufenfix"],
    ["Variabler Supportaufwand","€/Kunde/Monat",0,0,0,"Founder-/Personalzeit wird als fixe Personalressource geplant"],
    ["Cash-CAC","€/Neukunde",600,250,100,"Schätzung; Founder-Outreach"],
    ["Vollkosten-CAC","€/Neukunde",1500,750,350,"inkl. Gründerzeit; Schätzung"],
    ["Marketingbudget M1–M24","€/Monat",150,300,600,"Schätzung"],
    ["Gründerarbeit Schattenkosten","€/Monat",common.founderLaborMonthly,common.founderLaborMonthly,common.founderLaborMonthly,"2 × 10 h/Woche × 4,33 × 60 €"],
    ["Startliquidität","€",2000,2000,2000,"Angabe der Gründer"],
    ["Steuerquote München 2026/27","%",.32975,.32975,.32975,"KSt+Soli+GewSt; Modellbasis"],
  ];
  sh.getRange(`A5:F${4+rows.length}`).values=rows; body(sh.getRange(`A5:F${4+rows.length}`));
  sh.getRange(`C5:E${4+rows.length}`).format.font={color:C.input};
  for(let r=5;r<=4+rows.length;r++){
    const unit=rows[r-5][1];
    if(unit.includes("%")) sh.getRange(`C${r}:E${r}`).format.numberFormat=pctFmt;
    else if(unit.includes("€")) sh.getRange(`C${r}:E${r}`).format.numberFormat=currency1Fmt;
    else sh.getRange(`C${r}:E${r}`).format.numberFormat=countFmt;
  }
  sh.getRange("A33:F33").merge(); sh.getRange("A33").values=[["Wesentliche Modellgrenzen: keine validierten zahlenden Kunden, unbekannte Conversion/Churn/RPM, Gründergehälter in M1–M24 = 0 € Cash, Steuerbasis München. AWS, Sportdaten-API und LLM-Betrieb werden als fixe bzw. stufenfixe Kosten geplant; variable Kosten = 0 € innerhalb des geplanten Nutzungsbereichs."]]; note(sh.getRange("A33:F33")); sh.getRange("A33:F33").format.rowHeight=48;
  setWidths(sh,{A:30,B:18,C:16,D:16,E:16,F:52});
}

// Monthly sheets
const monthlyRows=[
  "Aktive B2B-Kunden","Neukunden brutto","Abgewanderte Kunden","Pageviews","Blended MRR/Kunde","Abo-Umsatz","Werbeumsatz","Gesamtumsatz","Variable Kosten","Rohertrag","Bruttomarge","Fixkosten","Einmalkosten","EBITDA","EBITDA-Marge","Abschreibungen","EBIT","Steueraufwand","Jahresfehlbetrag/-überschuss","Cash-Eingänge","Investitionen","Netto-Cashflow","Anfangsliquidität","Endliquidität","Veränderung Deferred Revenue","Gründerarbeit (Schattenkosten)","Ökonomisches EBITDA","ARR Run-rate"
];
for(const [scenarioName,s] of Object.entries(scenarios)){
  const sh=baseSheet(`Monthly_${s.key}`,`Monatsplanung M1–M24 · ${scenarioName}`,"Planstart August 2026. Gesetzliche GuV ohne Gründergehälter; ökonomisches EBITDA zeigt die Opportunitätskosten der Gründerarbeit.");
  sh.getRange("A4:Y4").values=[["Kennzahl",...models[scenarioName].months.map(x=>x.date)]]; header(sh.getRange("A4:Y4")); sh.getRange("B4:Y4").format.numberFormat="mmm yy";
  sh.getRange("A5:A32").values=monthlyRows.map(x=>[x]); body(sh.getRange("A5:Y32"));
  const keys=["active","added","churned","pageviews","mrr","subRevenue","adRevenue","revenue","variable",null,null,"fixed","oneTime","ebitda",null,"da","ebit","tax","netIncome","receipts","capex","netCf","begCash","endCash","deferred","founderLabor","economicEbitda","arr"];
  for(let ri=0;ri<keys.length;ri++){
    const row=5+ri;
    if(keys[ri]) sh.getRange(`B${row}:Y${row}`).values=[models[scenarioName].months.map(x=>x[keys[ri]])];
  }
  sh.getRange("B14:Y14").formulas=[models[scenarioName].months.map((_,i)=>`=${String.fromCharCode(66+i)}12-${String.fromCharCode(66+i)}13`)];
  sh.getRange("B15:Y15").formulas=[models[scenarioName].months.map((_,i)=>`=IF(${String.fromCharCode(66+i)}12=0,0,${String.fromCharCode(66+i)}14/${String.fromCharCode(66+i)}12)`)]
  sh.getRange("B19:Y19").formulas=[models[scenarioName].months.map((_,i)=>`=${String.fromCharCode(66+i)}12-${String.fromCharCode(66+i)}13-${String.fromCharCode(66+i)}16-${String.fromCharCode(66+i)}17`)];
  sh.getRange("B20:Y20").formulas=[models[scenarioName].months.map((_,i)=>`=IF(${String.fromCharCode(66+i)}12=0,0,${String.fromCharCode(66+i)}19/${String.fromCharCode(66+i)}12)`)]
  for(const r of [9,10,11,12,13,14,16,17,19,21,22,23,24,25,26,27,28,29,30,31,32]) sh.getRange(`B${r}:Y${r}`).format.numberFormat=currencyFmt;
  for(const r of [5,6,7,8]) sh.getRange(`B${r}:Y${r}`).format.numberFormat=countFmt;
  for(const r of [15,20]) sh.getRange(`B${r}:Y${r}`).format.numberFormat=pctFmt;
  for(const r of [14,19,25,32]) sh.getRange(`A${r}:Y${r}`).format.fill=C.cyan;
  sh.getRange("A34:Y34").merge(); sh.getRange("A34").values=[[`Maximaler rechnerischer Liquiditätsbedarf dieses Szenarios: ${Math.ceil(models[scenarioName].fundingNeed/1000)*1000} €. Negative Liquidität bedeutet Finanzierungslücke; keine automatische Kreditlinie modelliert.`]]; note(sh.getRange("A34:Y34"));
  sh.freezePanes.freezeColumns(1); setWidths(sh,{A:31}); sh.getRange("B:Y").format.columnWidth=12;
}

// Annual model
{
  const sh=baseSheet("Annual_5Y","Fünfjahresplanung · Szenarien","Jahre 1–2 aus Monatsmodell; Jahre 3–5 jährliche operative Hochrechnung. Steuerbasis: München, nominale Satzsenkung berücksichtigt.");
  let r=4;
  for(const [scenarioName,m] of Object.entries(models)){
    sh.getRange(`A${r}:F${r}`).merge(); sh.getRange(`A${r}`).values=[[scenarioName]]; section(sh.getRange(`A${r}:F${r}`)); r++;
    sh.getRange(`A${r}:F${r}`).values=[["Kennzahl","Jahr 1","Jahr 2","Jahr 3","Jahr 4","Jahr 5"]]; header(sh.getRange(`A${r}:F${r}`)); r++;
    const metrics=[
      ["Kunden Jahresende","endCust",countFmt],["Ø aktive Kunden","avgCust",countFmt],["Pageviews Monatsende","endPv",countFmt],
      ["Abo-Umsatz","subRevenue",currencyFmt],["Werbeumsatz","adRevenue",currencyFmt],["Gesamtumsatz","revenue",currencyFmt],
      ["Variable Kosten","variable",currencyFmt],["Fixkosten inkl. Einmalaufwand","fixed",currencyFmt],["Personalaufwand cash","payroll",currencyFmt],
      ["EBITDA","ebitda",currencyFmt],["EBITDA-Marge",null,pctFmt],["EBIT","ebit",currencyFmt],["Steuern","tax",currencyFmt],
      ["Jahresergebnis","netIncome",currencyFmt],["Investitionen","capex",currencyFmt],["Netto-Cashflow","netCf",currencyFmt],["Endliquidität","endCash",currencyFmt]
    ];
    for(const [label,key,fmt] of metrics){
      sh.getRange(`A${r}`).values=[[label]];
      if(key) sh.getRange(`B${r}:F${r}`).values=[m.years.map(y=>y[key])];
      else sh.getRange(`B${r}:F${r}`).formulas=[m.years.map((_,i)=>{const c=String.fromCharCode(66+i); return `=IF(${c}${r-5}=0,0,${c}${r-1}/${c}${r-5})`;})];
      sh.getRange(`B${r}:F${r}`).format.numberFormat=fmt; r++;
    }
    body(sh.getRange(`A${r-metrics.length}:F${r-1}`));
    sh.getRange(`A${r-12}:F${r-12}`).format.fill=C.cyan; // total revenue
    sh.getRange(`A${r-8}:F${r-8}`).format.fill=C.cyan; // EBITDA
    sh.getRange(`A${r-1}:F${r-1}`).format.fill=C.cyan; // liquidity
    r+=2;
  }
  setWidths(sh,{A:35,B:17,C:17,D:17,E:17,F:17});
}

// Unit economics
{
  const sh=baseSheet("Unit_Economics","Unit Economics · Widget-SaaS","Ausgewiesen auf Basis des Blended-MRR und der Szenarioannahmen. LTV ist eine vereinfachte, noch nicht empirisch validierte Modellgröße.");
  sh.getRange("A4:D4").values=[["Kennzahl","Pessimistisch","Realistisch","Optimistisch"]]; header(sh.getRange("A4:D4"));
  const metrics=[
    ["Blended MRR/Kunde","mrr",currency1Fmt],["Deckungsbeitrag/Kunde/Monat","contributionPerCustomer",currency1Fmt],["Deckungsbeitragsmarge","gm",pctFmt],
    ["Cash-CAC","cashCac",currencyFmt],["Vollkosten-CAC","fullCac",currencyFmt],["LTV (vereinfachtes Churn-Modell)","ltv",currencyFmt],
    ["LTV/Cash-CAC","ltvCash","0.0x"],["LTV/Vollkosten-CAC","ltvFull","0.0x"],["Cash-CAC Payback","cashPayback","0.0 \"Monate\""],
    ["Vollkosten-CAC Payback","fullPayback","0.0 \"Monate\""],["Cash Break-even Kunden (ohne Ads)","breakEvenCustomers","0.0"]
  ];
  let r=5; for(const [label,key,fmt] of metrics){ sh.getRange(`A${r}:D${r}`).values=[[label,...Object.values(models).map(m=>m.unit[key])]]; sh.getRange(`B${r}:D${r}`).format.numberFormat=fmt; r++; }
  body(sh.getRange(`A5:D${r-1}`));
  sh.getRange("A18:D18").merge(); sh.getRange("A18").values=[["Warnhinweis: Die modellierte Deckungsbeitragsmarge von 100% gilt nur innerhalb der aktuellen API-/Cloud-Kontingente. Vor belastbarer Verwendung sind Lasttests, Anbieterlimits, 3–5 zahlende Designpartner, Kohorten-Churn und tatsächlich gemessene Akquisitionsstunden erforderlich."]]; note(sh.getRange("A18:D18")); sh.getRange("A18:D18").format.rowHeight=68;
  setWidths(sh,{A:42,B:18,C:18,D:18});
}

// Sensitivity
{
  const sh=baseSheet("Sensitivity","Sensitivitätsanalyse · realistisches Szenario","Y5-EBITDA bei Kunden- und Preis/ARPA-Abweichungen; darunter Werbeumsatz pro Monat bei Pageview- und RPM-Kombinationen.");
  const base=models.Realistisch.years[4];
  sh.getRange("A4:F4").values=[["Y5 EBITDA (€)","ARPA 80%","ARPA 90%","ARPA 100%","ARPA 110%","ARPA 120%"]]; header(sh.getRange("A4:F4"));
  const custMult=[.5,.75,1,1.25,1.5], arpaMult=[.8,.9,1,1.1,1.2];
  const table=custMult.map(cm=>[`Kunden ${Math.round(cm*100)}%`,...arpaMult.map(am=>{
    const newSub=base.subRevenue*cm*am, newVar=(newSub*(scenarios.Realistisch.dataPct+common.paymentPct)+(base.avgCust*cm)*scenarios.Realistisch.support*12+base.adRevenue*common.adContentPct);
    return newSub+base.adRevenue-newVar-base.fixed-base.payroll;
  })]);
  sh.getRange("A5:F9").values=table; body(sh.getRange("A5:F9")); sh.getRange("B5:F9").format.numberFormat=currencyFmt;
  sh.getRange("A12:F12").values=[["Werbeumsatz €/Monat","RPM €2,50","RPM €4","RPM €5","RPM €6","RPM €8"]]; header(sh.getRange("A12:F12"));
  const pvs=[100000,250000,500000,1000000,1500000], rpms=[2.5,4,5,6,8];
  sh.getRange("A13:F17").values=pvs.map(pv=>[`${(pv/1000).toFixed(0)}k PV`,...rpms.map(r=>pv/1000*r)]); body(sh.getRange("A13:F17")); sh.getRange("B13:F17").format.numberFormat=currencyFmt;
  sh.getRange("B5:F9").conditionalFormats.add("colorScale",{colors:[C.red,"#FFF4CC",C.green],thresholds:["min","50%","max"]});
  setWidths(sh,{A:25,B:18,C:18,D:18,E:18,F:18});
}

// Summary
{
  const sh=baseSheet("Summary","AI Sports Prediction · Finanzmodell 2026–2031","Interne Planung für Gründer, Steuerberatung und Versicherungen · Stand 20.07.2026 · Beträge netto, sofern nicht anders angegeben.");
  sh.getRange("A4:F4").values=[["KPI","Pessimistisch","Realistisch","Optimistisch","Einheit","Einordnung"]]; header(sh.getRange("A4:F4"));
  const rows=[
    ["Umsatz Jahr 1",...Object.values(models).map(m=>m.years[0].revenue),"€","Markteintritt"],
    ["Umsatz Jahr 3",...Object.values(models).map(m=>m.years[2].revenue),"€","frühe Skalierung"],
    ["Umsatz Jahr 5",...Object.values(models).map(m=>m.years[4].revenue),"€","Szenariobandbreite"],
    ["EBITDA Jahr 5",...Object.values(models).map(m=>m.years[4].ebitda),"€","vor Gründer-Opp.-Kosten"],
    ["Endkunden Jahr 5",...Object.values(models).map(m=>m.years[4].endCust),"Anzahl","B2B Widgets"],
    ["Max. Liquiditätslücke M1–M24",...Object.values(models).map(m=>m.fundingNeed),"€","bei 2.000 € Startcash"],
    ["LTV/Vollkosten-CAC",...Object.values(models).map(m=>m.unit.ltvFull),"x","noch unvalidiert"],
    ["Vollkosten-CAC Payback",...Object.values(models).map(m=>m.unit.fullPayback),"Monate","noch unvalidiert"]
  ];
  sh.getRange("A5:F12").values=rows; body(sh.getRange("A5:F12"));
  for(const r of [5,6,7,8,10]) sh.getRange(`B${r}:D${r}`).format.numberFormat=currencyFmt;
  sh.getRange("B9:D9").format.numberFormat=countFmt; sh.getRange("B11:D11").format.numberFormat="0.0x"; sh.getRange("B12:D12").format.numberFormat="0.0";
  sh.getRange("A15:F15").merge(); sh.getRange("A15").values=[["Entscheidungsvorlage"]]; section(sh.getRange("A15:F15"));
  sh.getRange("A16:F20").values=[
    ["Status","CONDITIONAL GO","","","","Bootstrapped Validierungsphase; noch nicht investorenreif im Sinne einer Eigenkapitalrunde."],
    ["90-Tage-Ziel","3–5 zahlende Designpartner","","","","Keine kostenlosen Absichtserklärungen als Ersatz."],
    ["Liquidität","15–25 T€ Reserve empfohlen","","","","2 T€ Stamm-/Startkapital ist für den Risikopuffer zu knapp."],
    ["Hauptbeweis","Messbare Prognosegüte + Retention","","","","Preprint-Status und Ergebnisse unabhängig dokumentieren."],
    ["Stop-/Pivot-Signal","<2 zahlende Kunden nach 90 Tagen","","","","Positionierung, Preis oder Zielsegment neu testen."]
  ]; body(sh.getRange("A16:F20")); sh.getRange("B16:B20").format.font={bold:true,color:C.blue};
  const chartData=[["Jahr",...Object.keys(models)]];
  for(let y=0;y<5;y++) chartData.push([`J${y+1}`,...Object.values(models).map(m=>m.years[y].revenue)]);
  sh.getRange("H4:K9").values=chartData; sh.getRange("H4:K4").format.numberFormat="@";
  const chart=sh.charts.add("line",sh.getRange("H4:K9")); chart.setPosition("H11","N27"); chart.title="Umsatzentwicklung nach Szenario (€)"; chart.hasLegend=true;
  setWidths(sh,{A:29,B:21,C:21,D:21,E:14,F:44,G:3,H:16,I:16,J:16,K:16});
}

// Checks
{
  const sh=baseSheet("Checks","Modellprüfungen","Alle Prüfpunkte müssen PASS ergeben. Wertevergleich erfolgt auf dem intern berechneten Modellstand.");
  sh.getRange("A4:D4").values=[["Prüfung","Pessimistisch","Realistisch","Optimistisch"]]; header(sh.getRange("A4:D4"));
  const checks=[
    ["Planmix = 100%",...Object.values(scenarios).map(s=>Math.abs(s.mix.reduce((a,b)=>a+b,0)-1)<1e-9?"PASS":"FEHLER")],
    ["Umsatz = Abo + Werbung",...Object.values(models).map(m=>m.months.every(x=>Math.abs(x.revenue-x.subRevenue-x.adRevenue)<.01)?"PASS":"FEHLER")],
    ["Endliquidität roll-forward",...Object.values(models).map(m=>m.months.every(x=>Math.abs(x.endCash-x.begCash-x.netCf)<.01)?"PASS":"FEHLER")],
    ["EBITDA-Rechnung",...Object.values(models).map(m=>m.months.every(x=>Math.abs(x.ebitda-(x.revenue-x.variable-x.fixed-x.oneTime))<.01)?"PASS":"FEHLER")],
    ["Keine negativen Kundenzahlen",...Object.values(models).map(m=>m.months.every(x=>x.active>=0)?"PASS":"FEHLER")],
    ["J1/J2 aus Monatswerten",...Object.values(models).map(m=>Math.abs(m.years[0].revenue-m.months.slice(0,12).reduce((a,x)=>a+x.revenue,0))<.01?"PASS":"FEHLER")]
  ];
  sh.getRange("A5:D10").values=checks; body(sh.getRange("A5:D10")); sh.getRange("B5:D10").conditionalFormats.add("containsText",{text:"PASS",format:{fill:"#DDF2E8",font:{color:C.green,bold:true}}});
  setWidths(sh,{A:42,B:18,C:18,D:18});
}

// Sources
{
  const sh=baseSheet("Sources","Quellen & Evidenzstatus","Primärquellen bevorzugt. Gründerangaben und Modellannahmen sind als solche gekennzeichnet.");
  sh.getRange("A4:D4").values=[["Thema","Quelle / Aussage","URL","Status"]]; header(sh.getRange("A4:D4"));
  const src=[
    ["Planungsstandard","SBA: 5-Jahres-Prognose; erstes Jahr monatlich/vierteljährlich","https://www.sba.gov/business-guide/plan-your-business/write-your-business-plan?showAll=true","Primärquelle"],
    ["Digitalwerbung Europa","IAB Europe AdEx 2025: 131 Mrd. €, +10,5%","https://iabeurope.eu/knowledge_hub/iab-europe-adex-benchmark-2025-report/","Branchenverband"],
    ["Deutschland Werbung","OVK/BVDW Prognose 2026: >8 Mrd. € Display/Video","https://www.bvdw.org/news-und-publikationen/ovk-prognose-digitaler-werbemarkt-waechst-auf-ueber-acht-milliarden-euro/","Branchenverband"],
    ["Publisher-Basis","Eurostat: 76.328 EU Publishing-Unternehmen; DE 5.374 (2023 prov.)","https://ec.europa.eu/eurostat/web/products-eurostat-news/w/ddn-20250502-1","Primärquelle"],
    ["Online News","70% der EU-Internetnutzer konsumierten 2024 Online-News","https://ec.europa.eu/eurostat/web/products-eurostat-news/w/ddn-20250710-2","Primärquelle"],
    ["Wettbewerb","Sportmonks Widgets ab 59 €/Monat jährlich","https://www.sportmonks.com/football-api/football-widgets/","Anbieterquelle"],
    ["Werbeerlöse","Google AdSense Revenue Share","https://support.google.com/adsense/answer/180195?hl=de","Anbieterquelle"],
    ["KI-Regulierung","EU AI Act Transparenzleitlinien ab 02.08.2026","https://digital-strategy.ec.europa.eu/en/news/commission-publishes-guidelines-transparency-obligations-providers-and-deployers-certain-ai-systems","EU-Kommission"],
    ["Steuern München","Gewerbesteuerhebesatz München 490%","https://stadt.muenchen.de/infos/hebesaetze-gewerbesteuer-grundsteuer.html","Primärquelle"],
    ["Körperschaftsteuer","KStG §23: stufenweise Satzsenkung","https://www.gesetze-im-internet.de/kstg_1977/__23.html","Gesetz"],
    ["Traction Web","11.06.–19.07.: 69.919 Pageviews, 36.066 Sessions, 13.669 aktive Nutzer, 2:22 min Ø Interaktion","IMG_2240–IMG_2244 (Google Analytics Screenshots)","Screenshotbeleg; Property/Export noch zu archivieren"],
    ["Medienresonanz","Tagesschau-Video „Kann KI WM-Spiele tippen?“: 7,7 Mio. Aufrufe im Screenshot","IMG_2238 / IMG_2239","Screenshotbeleg; Plattformlink/Datum archivieren"],
    ["Forschung","Paper eingereicht und öffentlich archiviert","URL/Identifier folgt","Gründerangabe – zu belegen"]
  ];
  sh.getRange(`A5:D${4+src.length}`).values=src; body(sh.getRange(`A5:D${4+src.length}`)); sh.getRange(`C5:C${4+src.length}`).format.font={color:C.link}; sh.getRange(`A5:D${4+src.length}`).format.wrapText=true;
  setWidths(sh,{A:24,B:55,C:78,D:25});
}

// Global polish and comments
for(const name of sheetNames){ const sh=wb.worksheets.getItem(name); const used=sh.getUsedRange(); used.format.font={name:"Calibri",size:10,color:C.black}; sh.getRange("A1:J1").format.font={name:"Calibri",size:18,bold:true,color:C.white}; }
wb.comments.addThread({cell:wb.worksheets.getItem("Assumptions").getRange("D30")},"Quelle/Herleitung: München 490% Gewerbesteuerhebesatz; KStG §23; SolZG §4. Steuerquote ist eine Modellnäherung und durch Steuerberatung zu bestätigen.");
wb.comments.addThread({cell:wb.worksheets.getItem("Assumptions").getRange("D16")},"Quelle/Herleitung: IAB Europe, BVDW/OVK und Google AdSense zeigen Marktgröße bzw. Revenue-Share, nicht den erzielbaren RPM. Der RPM ist eine explizite Modellannahme.");

const summary={generatedAt:"2026-07-20",common,scenarios:{}};
for(const [n,m] of Object.entries(models)) summary.scenarios[n]={fundingNeed:m.fundingNeed,minCash:m.minCash,unit:m.unit,years:m.years,months:m.months.map(x=>({...x,date:x.date.toISOString().slice(0,10)}))};
await fs.writeFile(`${outDir}/financial_summary.json`,JSON.stringify(summary,null,2));
const xlsx=await SpreadsheetFile.exportXlsx(wb); await xlsx.save(`${outDir}/AI_Sports_Prediction_Finanzmodell_2026.xlsx`);

const inspect1=await wb.inspect({kind:"table",range:"Summary!A1:F20",include:"values,formulas",tableMaxRows:22,tableMaxCols:8,maxChars:8000});
const inspect2=await wb.inspect({kind:"match",searchTerm:"#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",options:{useRegex:true,maxResults:200},summary:"formula errors",maxChars:4000});
await fs.writeFile(`${qaDir}/inspect_summary.ndjson`,inspect1.ndjson+"\n"+inspect2.ndjson);
for(const name of sheetNames){ const blob=await wb.render({sheetName:name,autoCrop:"all",scale:1,format:"png"}); await fs.writeFile(`${qaDir}/${name}.png`,new Uint8Array(await blob.arrayBuffer())); }
console.log(JSON.stringify({xlsx:`${outDir}/AI_Sports_Prediction_Finanzmodell_2026.xlsx`,funding:Object.fromEntries(Object.entries(models).map(([n,m])=>[n,Math.round(m.fundingNeed)])),y5:Object.fromEntries(Object.entries(models).map(([n,m])=>[n,{revenue:Math.round(m.years[4].revenue),ebitda:Math.round(m.years[4].ebitda),cash:Math.round(m.years[4].endCash)}]))},null,2));
