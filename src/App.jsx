import React,{useMemo,useState} from "react";
import Plot from "react-plotly.js";

const demoCSV=`Hours_Studied,Practice_Tests,Attendance,Final_Score
1,1,60,35
2,2,65,40
3,2,70,46
4,3,72,50
5,4,75,58
6,4,78,61
7,5,80,68
8,6,83,74
9,6,88,79
10,7,92,89
2,1,62,38
4,2,68,47
6,5,81,65
8,5,85,72
3,3,71,49
7,6,86,73
9,7,90,84
5,3,76,56
1,2,58,33
10,8,95,94`;
function parseCSV(text){
 const lines=text.replace(/^\uFEFF/,"").split(/\r?\n/).filter(x=>x.trim());
 if(lines.length<3) throw Error("CSV needs a header and at least two data rows.");
 const parseLine=line=>{let out=[],v="",q=false;for(let i=0;i<line.length;i++){let c=line[i];if(c==='"'){if(q&&line[i+1]==='"'){v+='"';i++;}else q=!q;}else if(c===","&&!q){out.push(v.trim());v="";}else v+=c;}out.push(v.trim());return out;};
 const headers=parseLine(lines[0]);const rows=lines.slice(1).map(parseLine).filter(r=>r.some(v=>v!==""));
 return {headers,rows};
}
function solve(A,b){A=A.map((r,i)=>[...r,b[i]]);let n=b.length;for(let i=0;i<n;i++){let p=i;for(let r=i+1;r<n;r++)if(Math.abs(A[r][i])>Math.abs(A[p][i]))p=r;[A[i],A[p]]=[A[p],A[i]];if(Math.abs(A[i][i])<1e-10)A[i][i]+=1e-8;let d=A[i][i];for(let j=i;j<=n;j++)A[i][j]/=d;for(let r=0;r<n;r++)if(r!==i){let f=A[r][i];for(let j=i;j<=n;j++)A[r][j]-=f*A[i][j];}}return A.map(r=>r[n]);}
function fitModel(X,y,kind,alpha=1){let p=X[0].length,w=Array(p).fill(0);
 if(kind!=="Lasso Regression"){let A=Array.from({length:p},()=>Array(p).fill(0)),b=Array(p).fill(0);for(let i=0;i<X.length;i++)for(let j=0;j<p;j++){b[j]+=X[i][j]*y[i];for(let k=0;k<p;k++)A[j][k]+=X[i][j]*X[i][k];}for(let j=1;j<p;j++)A[j][j]+=kind==="Ridge Regression"?alpha:1e-8;return solve(A,b);}
 // Coordinate descent with intercept unpenalized; standardized features are supplied.
 for(let epoch=0;epoch<1200;epoch++){let maxChange=0;for(let j=0;j<p;j++){let rho=0,norm=0;for(let i=0;i<X.length;i++){let pred=0;for(let k=0;k<p;k++)if(k!==j)pred+=X[i][k]*w[k];rho+=X[i][j]*(y[i]-pred);norm+=X[i][j]**2;}let next=j===0?rho/(norm||1):(Math.sign(rho)*Math.max(0,Math.abs(rho)-alpha))/(norm||1);maxChange=Math.max(maxChange,Math.abs(next-w[j]));w[j]=next;}if(maxChange<1e-7)break;}return w;
}
function metrics(y,p){let mean=y.reduce((a,b)=>a+b,0)/y.length;let mae=0,mse=0,ss=0,tot=0;for(let i=0;i<y.length;i++){mae+=Math.abs(y[i]-p[i]);mse+=(y[i]-p[i])**2;ss+=(y[i]-p[i])**2;tot+=(y[i]-mean)**2;}mse/=y.length;return {MAE:mae/y.length,MSE:mse,RMSE:Math.sqrt(mse),R2:tot===0?0:1-ss/tot};}
const models=["Linear Regression","Ridge Regression","Lasso Regression"];
function App(){
 const [csv,setCsv]=useState(demoCSV),[fileName,setFileName]=useState("student_performance_demo.csv"),[headers,setHeaders]=useState(parseCSV(demoCSV).headers),[rows,setRows]=useState(parseCSV(demoCSV).rows);
 const [target,setTarget]=useState("Final_Score"),[features,setFeatures]=useState(["Hours_Studied","Practice_Tests","Attendance"]),[alpha,setAlpha]=useState(1),[split,setSplit]=useState(80),[results,setResults]=useState(null),[error,setError]=useState("");
 const loadText=(text,name)=>{try{let d=parseCSV(text);let numeric=d.headers.filter((h,j)=>d.rows.filter(r=>r[j]!==undefined&&r[j]!=="").length>0&&d.rows.filter(r=>r[j]!==undefined&&r[j]!=="").every(r=>Number.isFinite(Number(r[j]))));if(numeric.length<2)throw Error("Need at least two numeric columns (features and target).");setCsv(text);setFileName(name);setHeaders(d.headers);setRows(d.rows);setTarget(numeric[numeric.length-1]);setFeatures(numeric.filter(h=>h!==numeric[numeric.length-1]).slice(0,Math.min(4,numeric.length-1)));setResults(null);setError("");}catch(e){setError(e.message)}};
 const numericHeaders=useMemo(()=>headers.filter(h=>{let j=headers.indexOf(h),vals=rows.map(r=>r[j]).filter(v=>v!==undefined&&v!=="");return vals.length>0&&vals.every(v=>Number.isFinite(Number(v)));}),[headers,rows]);
 const dataSummary=useMemo(()=>({n:rows.length,cols:headers.length,missing:rows.reduce((n,r)=>n+headers.filter((_,i)=>r[i]===undefined||r[i]==="").length,0)}),[rows,headers]);
 function runAnalysis(){try{setError("");setResults(null);if(!numericHeaders.includes(target))throw Error("Choose a numeric target column.");const selectedFeatures=features.filter(f=>f!==target&&numericHeaders.includes(f));if(!selectedFeatures.length)throw Error("Select at least one numeric feature column.");const clean=rows.map(r=>{let obj={};headers.forEach((h,i)=>obj[h]=r[i]);return obj;}).filter(o=>[target,...selectedFeatures].every(k=>o[k]!==undefined&&o[k]!==""&&Number.isFinite(Number(o[k]))));if(clean.length<6)throw Error(`Only ${clean.length} complete rows are available. At least 6 numeric rows are needed.`);const rawX=clean.map(o=>selectedFeatures.map(f=>Number(o[f]))),y=clean.map(o=>Number(o[target]));let ids=clean.map((_,i)=>i); // deterministic shuffle for reproducible results
 for(let i=ids.length-1;i>0;i--){let j=(i*17+13)%(i+1);[ids[i],ids[j]]=[ids[j],ids[i]];}
 const nTrain=Math.max(3,Math.min(clean.length-2,Math.floor(clean.length*split/100))),train=ids.slice(0,nTrain),test=ids.slice(nTrain);
 const means=features.map((_,j)=>train.reduce((s,i)=>s+rawX[i][j],0)/train.length),stds=features.map((_,j)=>Math.sqrt(train.reduce((s,i)=>s+(rawX[i][j]-means[j])**2,0)/train.length)||1);
 const X=rawX.map(r=>[1,...r.map((v,j)=>(v-means[j])/stds[j])]),xt=train.map(i=>X[i]),yt=train.map(i=>y[i]),xv=test.map(i=>X[i]),yv=test.map(i=>y[i]);
 const out=models.map(name=>{let w=fitModel(xt,yt,name,alpha),pred=xv.map(r=>r.reduce((s,v,j)=>s+v*w[j],0)),m=metrics(yv,pred);return {name,w,pred,metrics:m,residuals:yv.map((v,i)=>v-pred[i])};});
 setResults({out,actual:yv,features:selectedFeatures,target,nTrain,nTest:test.length,rows:clean.length,allY:y,allX:rawX,alpha});
 }catch(e){setResults(null);setError(e instanceof Error?e.message:"Analysis could not be completed. Check your data and selections.")}}
 const best=results?results.out.reduce((a,b)=>b.metrics.R2>a.metrics.R2?b:a):null;
 const plotBase={paper_bgcolor:"rgba(0,0,0,0)",plot_bgcolor:"rgba(0,0,0,0)",font:{color:"#d8e2f1",family:"Inter, sans-serif"},margin:{l:52,r:20,t:42,b:48},autosize:true};
 const plot=(title,data,layout={})=><Plot data={data} layout={{...plotBase,title:{text:title,font:{size:15}},...layout}} config={{responsive:true,displaylogo:false}} style={{width:"100%",height:"330px"}} useResizeHandler/>;
 return <div className="app"><header className="topbar"><div className="brandmark">R<span>↗</span></div><div><div className="eyebrow">DATA SCIENCE WORKBENCH</div><h1>RegressLab <span>Studio</span></h1></div><div className="top-right"><span className="live-dot"/> LOCAL ANALYSIS <b>v1.0</b></div></header>
 <main><section className="intro"><div><div className="eyebrow">IALM · EXPERIMENT 02</div><h2>Compare models.<br/><em>Find the best fit.</em></h2><p>Explore datasets, train three regression techniques, and inspect prediction quality with interactive visual analytics.</p></div><div className="intro-card"><div className="mini-label">ACTIVE WORKSPACE</div><strong>{fileName}</strong><div className="stats"><span><b>{dataSummary.n}</b> rows</span><span><b>{dataSummary.cols}</b> columns</span><span><b>{dataSummary.missing}</b> missing</span></div></div></section>
 <div className="layout"><aside className="sidebar"><section className="panel"><div className="panel-head"><span className="step">01</span><div><h3>Dataset source</h3><p>Load a sample or your own CSV</p></div></div><label className="upload"><input type="file" accept=".csv,text/csv" onChange={e=>{let f=e.target.files?.[0];if(f){let reader=new FileReader();reader.onload=()=>loadText(String(reader.result),f.name);reader.onerror=()=>setError("Could not read this file. Please choose a readable CSV.");reader.readAsText(f);}e.target.value=""}}/><span className="upload-icon">↑</span><b>Upload CSV dataset</b><small>Click to browse · .csv only</small></label><button className="ghost full" onClick={()=>loadText(demoCSV,"student_performance_demo.csv")}>↻ Restore demo dataset</button><div className="file-pill">▤ {fileName}</div></section>
 <section className="panel"><div className="panel-head"><span className="step">02</span><div><h3>Configure variables</h3><p>Choose inputs and output</p></div></div><label className="field-label">TARGET / DEPENDENT VARIABLE</label><select value={target} onChange={e=>{const nextTarget=e.target.value;setTarget(nextTarget);setFeatures(prev=>[...prev.filter(f=>f!==nextTarget),...(numericHeaders.includes(target)&&target!==nextTarget&&!prev.includes(target)?[target]:[])]);setResults(null);setError("")}}>{numericHeaders.map(h=><option key={h}>{h}</option>)}</select><label className="field-label">FEATURES / INDEPENDENT VARIABLES</label><div className="feature-list">{numericHeaders.filter(h=>h!==target).map(h=><label className="check" key={h}><input type="checkbox" checked={features.includes(h)} onChange={e=>{setFeatures(prev=>e.target.checked?[...prev,h]:prev.filter(x=>x!==h));setResults(null)}}/><span>{h}</span></label>)}</div><label className="field-label range-label">TRAINING DATA <b>{split}%</b></label><input type="range" min="60" max="90" step="5" value={split} onChange={e=>{setSplit(+e.target.value);setResults(null)}}/><div className="range-ends"><span>60% train</span><span>90% train</span></div><label className="field-label range-label">REGULARIZATION STRENGTH <b>α = {alpha}</b></label><input type="range" min="0.01" max="10" step="0.01" value={alpha} onChange={e=>{setAlpha(+e.target.value);setResults(null)}}/><small className="muted">Applies to Ridge and Lasso; features are standardized.</small><button className="primary full" onClick={runAnalysis}>▶ Run model comparison</button>{error&&<div className="error">{error}</div>}</section>
 <section className="panel method-panel"><div className="mini-label">MODELS IN THIS RUN</div>{models.map((m,i)=><div className="model-row" key={m}><span className={"model-dot m"+i}/><div><b>{m}</b><small>{["Ordinary least squares baseline","L2 penalty · shrinks coefficients","L1 penalty · can zero coefficients"][i]}</small></div></div>)}</section></aside>
 <section className="workspace"><div className="section-title"><div><div className="eyebrow">ANALYSIS OVERVIEW</div><h3>Model performance</h3></div><span className="status">{results?"● ANALYSIS COMPLETE":"○ AWAITING RUN"}</span></div>
 <div className="metric-grid">{["MAE","MSE","RMSE","R²"].map((m,i)=>{let val=best?best.metrics[m==="R²"?"R2":m]:null;return <div className="metric-card" key={m}><div className="metric-top"><span>{m}</span><span className="metric-icon">{["↕","∑","√","R²"][i]}</span></div><strong>{val===null?"—":val.toLocaleString(undefined,{maximumFractionDigits:4})}</strong><small>{best?`Best R² model: ${best.name}`:["Mean absolute error","Mean squared error","Root mean squared error","Coefficient of determination"][i]}</small></div>})}</div>
 {results&&<div className="winner"><div className="winner-icon">✦</div><div><small>TOP MODEL BY TEST R²</small><h3>{best.name}</h3><p>R² {best.metrics.R2.toFixed(4)} · evaluated on {results.nTest} held-out rows</p></div><div className="winner-score">{(best.metrics.R2*100).toFixed(1)}<small>% R²</small></div></div>}
 <div className="chart-section"><div className="chart-head"><div><h3>Evaluation dashboard</h3><p>Test-set metrics and diagnostic plots</p></div><span className="chart-count">{results?"6 VISUALS":"READY WHEN YOU ARE"}</span></div>
 {!results?<div className="empty"><div className="empty-art">⌁</div><h3>Your analysis appears here</h3><p>Upload a dataset, select the target and features, then run the comparison to generate metrics and plots.</p><div className="empty-steps"><span>01 · Select data</span><span>02 · Fit models</span><span>03 · Compare results</span></div></div>:<>
 <div className="table-wrap"><table><thead><tr><th>MODEL</th><th>MAE ↓</th><th>MSE ↓</th><th>RMSE ↓</th><th>R² ↑</th><th>RANK</th></tr></thead><tbody>{[...results.out].sort((a,b)=>b.metrics.R2-a.metrics.R2).map((r,i)=><tr key={r.name}><td><span className={"model-dot m"+models.indexOf(r.name)}/>{r.name}</td><td>{r.metrics.MAE.toFixed(4)}</td><td>{r.metrics.MSE.toFixed(4)}</td><td>{r.metrics.RMSE.toFixed(4)}</td><td className="r2">{r.metrics.R2.toFixed(4)}</td><td><span className={i===0?"rank best-rank":"rank"}>{i===0?"BEST":`#${i+1}`}</span></td></tr>)}</tbody></table></div>
 <div className="charts-grid">{plot("Test metrics · R² score",[{x:results.out.map(r=>r.name),y:results.out.map(r=>r.metrics.R2),type:"bar",marker:{color:["#42d6b2","#7c8cff","#ffb86b"]},text:results.out.map(r=>r.metrics.R2.toFixed(3)),textposition:"outside"}],{yaxis:{title:"R² score",gridcolor:"#253247"}})}
 {plot("Actual vs predicted · best model",[{x:results.actual,y:best.pred,mode:"markers",type:"scatter",name:"Predictions",marker:{size:9,color:"#42d6b2",opacity:.85}},{x:[Math.min(...results.actual,...best.pred),Math.max(...results.actual,...best.pred)],y:[Math.min(...results.actual,...best.pred),Math.max(...results.actual,...best.pred)],mode:"lines",type:"scatter",name:"Ideal fit",line:{dash:"dash",color:"#ffb86b"}}],{xaxis:{title:"Actual"},yaxis:{title:"Predicted",gridcolor:"#253247"}})}
 {plot("Residuals · best model",[{x:best.pred,y:best.residuals,mode:"markers",type:"scatter",marker:{size:8,color:"#7c8cff"},name:"Residuals"},{x:[Math.min(...best.pred),Math.max(...best.pred)],y:[0,0],mode:"lines",type:"scatter",line:{dash:"dash",color:"#ffb86b"},name:"Zero error"}],{xaxis:{title:"Predicted value"},yaxis:{title:"Residual (actual − predicted)",gridcolor:"#253247"}})}
 {plot("Error metrics comparison",[{x:results.out.map(r=>r.name),y:results.out.map(r=>r.metrics.MAE),type:"bar",name:"MAE",marker:{color:"#42d6b2"}},{x:results.out.map(r=>r.name),y:results.out.map(r=>r.metrics.RMSE),type:"bar",name:"RMSE",marker:{color:"#7c8cff"}}],{barmode:"group",yaxis:{title:"Error (lower is better)",gridcolor:"#253247"}})}
 {plot("Feature relationship · first selected feature",[{x:results.allX.map(r=>r[0]),y:results.allY,mode:"markers",type:"scatter",name:"Observations",marker:{color:"#7c8cff",size:8,opacity:.8}}],{xaxis:{title:results.features[0]},yaxis:{title:results.target,gridcolor:"#253247"}})}
 {plot("Residual distribution · best model",[{x:best.residuals,type:"histogram",nbinsx:12,marker:{color:"#ffb86b"},name:"Residual frequency"}],{xaxis:{title:"Residual"},yaxis:{title:"Frequency",gridcolor:"#253247"}})}
 </div>
 <div className="observation"><h4>◈ Auto-generated observations</h4><p><b>{best.name}</b> ranks first by test-set R². For a useful comparison, also inspect MAE and RMSE (lower is better) and check whether residuals are randomly scattered around zero. Negative R² means the model performs worse than predicting the test-set mean.</p><p className="muted">Training rows: {results.nTrain} · Test rows: {results.nTest} · Complete numeric rows used: {results.rows} · Target: {results.target}</p><button className="ghost" onClick={()=>{let text="Model,MAE,MSE,RMSE,R2\n"+results.out.map(r=>`${r.name},${r.metrics.MAE},${r.metrics.MSE},${r.metrics.RMSE},${r.metrics.R2}`).join("\n");let a=document.createElement("a");a.href=URL.createObjectURL(new Blob([text],{type:"text/csv"}));a.download="regression_model_metrics.csv";a.click();URL.revokeObjectURL(a.href)}}>↓ Export metrics CSV</button></div>
 </>}
 </div></section></div><footer><span>REGRESSLAB STUDIO</span><span>IALM · Comparative Analysis of Regression Techniques</span><span>Built for exploration, not a substitute for domain validation.</span></footer></main></div>
}
export default App;
