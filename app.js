const TYPE_BY_CATEGORY={"美国综合新闻":"新闻","国际新闻":"新闻","财经市场":"财经","交易所与市场":"财经","宏观政策原声":"政策/经济","公司事件":"公司/财报","投资教育":"投资教育"};
const REGION_BY_ID={bbc:"英国",reuters:"英国",ft:"英国","tsmc-ir":"中国台湾","asml-ir":"荷兰","baba-ir":"中国","jd-ir":"中国","pdd-ir":"中国","baidu-ir":"中国","nio-ir":"中国"};
const NEWS_TYPE_ORDER=["新闻","财经","政策/经济","公司/财报","投资教育","其他"];
const NEWS_REGION_ORDER=["美国","英国","加拿大","德国","新加坡","日本","韩国","泰国","中国","中国台湾","荷兰","其他"];
const ENT_TYPE_ORDER=["电影","电视剧","综艺","动漫","纪录片","少儿","音乐","电视直播","体育","文化"];
const ENT_REGION_ORDER=["全球","美国","英国","加拿大","德国","德国/法国","法国","新加坡","日本","韩国","泰国","中国","中国香港/亚洲","中国香港","中国台湾","澳大利亚","印度"];
const ENT_ACCESS_ORDER=["免费","注册免费","部分免费","订阅"];
const TITLES={home:"首页",search:"全局搜索",domestic:"国内收看",news:"新闻与财经",entertainment:"娱乐视频",picker:"今天看什么",favorites:"我的收藏",help:"安装与说明"};
const state={news:[],entertainment:[],view:"home",previousView:"home",newsType:"",newsRegion:"",entType:"",entRegion:"",entAccess:"",favorites:new Set(),recent:[]};
const $=id=>document.getElementById(id);

function safeLoad(key,fallback){try{const value=JSON.parse(localStorage.getItem(key));return value??fallback}catch{return fallback}}
function saveLocal(){try{localStorage.setItem("gv-favorites",JSON.stringify([...state.favorites]));localStorage.setItem("gv-recent",JSON.stringify(state.recent))}catch{}}
function escapeHtml(value=""){return String(value).replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]))}
function toast(message){const el=$("toast");el.textContent=message;el.classList.add("show");clearTimeout(window.__toast);window.__toast=setTimeout(()=>el.classList.remove("show"),2300)}
function initials(name){return name.replace(/[^A-Za-z0-9\u4e00-\u9fff]/g,"").slice(0,2).toUpperCase()||"GV"}

function normalizeNews(items){return items.map(item=>({...item,_key:`n:${item.id}`,type:item.type||TYPE_BY_CATEGORY[item.category]||"其他",region:item.region||REGION_BY_ID[item.id]||"美国",sourceKind:"news"}))}
function normalizeEntertainment(items){return items.map(item=>({...item,_key:`e:${item.id}`,sourceKind:"entertainment"}))}
function allSources(){return [...state.news,...state.entertainment]}
function findSource(key){return allSources().find(item=>item._key===key)}

function setView(name,{preserveSearch=false}={}){
  if(name!=="search") state.previousView=name;
  state.view=name;
  document.querySelectorAll(".view").forEach(el=>el.classList.toggle("active",el.id===`${name}View`));
  document.querySelectorAll(".bottom-nav button").forEach(el=>el.classList.toggle("active",el.dataset.view===name));
  $("pageTitle").textContent=TITLES[name]||"全球视频";
  if(!preserveSearch&&name!=="search") $("globalSearch").value="";
  if(name==="news") renderNews();
  if(name==="entertainment") renderEntertainment();
  if(name==="domestic") renderDomestic();
  if(name==="favorites") renderFavorites();
  if(name==="home") renderHome();
  window.scrollTo({top:0,behavior:"instant"});
}

function chip(label,value,active,kind){return `<button class="chip${active?' active':''}" data-filter-kind="${kind}" data-filter-value="${escapeHtml(value)}">${escapeHtml(label)}</button>`}
function renderFilters(){
  $("newsTypeFilters").innerHTML=chip("全部","",!state.newsType,"newsType")+NEWS_TYPE_ORDER.filter(v=>state.news.some(i=>i.type===v)).map(v=>chip(v,v,state.newsType===v,"newsType")).join("");
  $("newsRegionFilters").innerHTML=chip("全部","",!state.newsRegion,"newsRegion")+NEWS_REGION_ORDER.filter(v=>state.news.some(i=>i.region===v)).map(v=>chip(v,v,state.newsRegion===v,"newsRegion")).join("");
  $("entTypeFilters").innerHTML=chip("全部","",!state.entType,"entType")+ENT_TYPE_ORDER.filter(v=>state.entertainment.some(i=>i.types.includes(v))).map(v=>chip(v,v,state.entType===v,"entType")).join("");
  $("entRegionFilters").innerHTML=chip("全部","",!state.entRegion,"entRegion")+ENT_REGION_ORDER.filter(v=>state.entertainment.some(i=>i.region===v)).map(v=>chip(v,v,state.entRegion===v,"entRegion")).join("");
  $("entAccessFilters").innerHTML=chip("全部","",!state.entAccess,"entAccess")+ENT_ACCESS_ORDER.filter(v=>state.entertainment.some(i=>i.access===v)).map(v=>chip(v,v,state.entAccess===v,"entAccess")).join("");
  document.querySelectorAll("[data-filter-kind]").forEach(button=>button.addEventListener("click",()=>{
    state[button.dataset.filterKind]=button.dataset.filterValue;
    renderFilters();
    button.dataset.filterKind.startsWith("news")?renderNews():renderEntertainment();
  }));
}

function sourceCard(item){
  const favorite=state.favorites.has(item._key);
  const isEnt=item.sourceKind==="entertainment";
  const domesticTag=item.domestic?`<span class="tag domestic">国内收看</span>`:"";
  const tags=isEnt
    ? `${domesticTag}<span class="tag region">${escapeHtml(item.region)}</span><span class="tag access">${escapeHtml(item.access)}</span>${item.types.slice(0,3).map(v=>`<span class="tag">${escapeHtml(v)}</span>`).join("")}`
    : `${domesticTag}<span class="tag region">${escapeHtml(item.region)}</span><span class="tag">${escapeHtml(item.type)}</span><span class="tag">${escapeHtml(item.kind||item.category)}</span>`;
  const availability=isEnt?`<div class="availability">${escapeHtml(item.availability)}</div>`:"";
  return `<article class="source-card" data-key="${escapeHtml(item._key)}">
    <div class="card-head"><div class="source-icon">${escapeHtml(initials(item.name))}</div><div class="card-name"><h3>${escapeHtml(item.name)}</h3><div class="card-meta">${tags}</div></div><button class="favorite-button${favorite?' active':''}" data-favorite="${escapeHtml(item._key)}" aria-label="收藏">★</button></div>
    <p>${escapeHtml(item.description)}</p>${availability}
    <div class="card-actions"><a class="open-button" data-open="${escapeHtml(item._key)}" href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">打开官方源 ↗</a><button class="share-button" data-share="${escapeHtml(item._key)}">分享</button></div>
  </article>`;
}

function bindCardActions(root=document){
  root.querySelectorAll("[data-favorite]").forEach(button=>button.addEventListener("click",()=>toggleFavorite(button.dataset.favorite)));
  root.querySelectorAll("[data-open]").forEach(link=>link.addEventListener("click",()=>recordRecent(link.dataset.open)));
  root.querySelectorAll("[data-share]").forEach(button=>button.addEventListener("click",()=>shareSource(button.dataset.share)));
}
function renderCards(target,items,empty){target.classList.toggle("empty-state",!items.length);target.innerHTML=items.length?items.map(sourceCard).join(""):empty;bindCardActions(target)}

function renderNews(){
  const items=state.news.filter(i=>(!state.newsType||i.type===state.newsType)&&(!state.newsRegion||i.region===state.newsRegion));
  $("newsResultCount").textContent=items.length;renderCards($("newsGrid"),items,"没有匹配的新闻来源。");
}
function renderEntertainment(){
  const items=state.entertainment.filter(i=>(!state.entType||i.types.includes(state.entType))&&(!state.entRegion||i.region===state.entRegion)&&(!state.entAccess||i.access===state.entAccess));
  $("entResultCount").textContent=items.length;renderCards($("entertainmentGrid"),items,"没有匹配的娱乐平台。");
}
function renderDomestic(){
  const news=state.news.filter(item=>item.domestic);
  const entertainment=state.entertainment.filter(item=>item.domestic);
  $("domesticNewsCount").textContent=news.length;
  $("domesticEntCount").textContent=entertainment.length;
  renderCards($("domesticNewsGrid"),news,"暂时没有已确认的国内新闻与财经来源。");
  renderCards($("domesticEntGrid"),entertainment,"暂时没有已确认的国内娱乐平台。");
}
function renderSearch(){
  const query=$("globalSearch").value.trim().toLowerCase();
  if(!query){setView(state.previousView||"home");return}
  const items=allSources().filter(item=>{
    const extra=item.sourceKind==="entertainment"?`${item.types.join(" ")} ${item.access} ${item.availability}`:`${item.type} ${item.category} ${item.kind}`;
    return `${item.name} ${item.description} ${item.region} ${extra}`.toLowerCase().includes(query);
  });
  state.view="search";document.querySelectorAll(".view").forEach(el=>el.classList.toggle("active",el.id==="searchView"));document.querySelectorAll(".bottom-nav button").forEach(el=>el.classList.remove("active"));$("pageTitle").textContent="全局搜索";
  $("searchSummary").textContent=`“${query}”找到 ${items.length} 个结果。`;
  renderCards($("searchGrid"),items,"没有匹配结果，请尝试国家、平台或内容类型。");
}

function toggleFavorite(key){state.favorites.has(key)?state.favorites.delete(key):state.favorites.add(key);saveLocal();updateCounts();if(state.view==="favorites")renderFavorites();else if(state.view==="news")renderNews();else if(state.view==="entertainment")renderEntertainment();else if(state.view==="domestic")renderDomestic();else if(state.view==="search")renderSearch();toast(state.favorites.has(key)?"已加入收藏":"已取消收藏")}
function recordRecent(key){const item=findSource(key);if(!item)return;state.recent=[key,...state.recent.filter(v=>v!==key)].slice(0,12);saveLocal();renderHome()}
async function shareSource(key){const item=findSource(key);if(!item)return;try{if(navigator.share)await navigator.share({title:item.name,text:item.description,url:item.url});else{await navigator.clipboard.writeText(item.url);toast("链接已复制")}}catch(error){if(error.name!=="AbortError")toast("暂时无法分享")}}

function renderHome(){
  $("newsCount").textContent=state.news.length;$("entertainmentCount").textContent=state.entertainment.length;$("domesticCount").textContent=allSources().filter(item=>item.domestic).length;updateCounts();
  const items=state.recent.map(findSource).filter(Boolean).slice(0,6);const list=$("recentList");
  list.classList.toggle("empty-state",!items.length);list.innerHTML=items.length?items.map(item=>`<a class="compact-item" data-open="${escapeHtml(item._key)}" href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer"><span>${escapeHtml(initials(item.name))}</span><div><b>${escapeHtml(item.name)}</b><small>${escapeHtml(item.region)} · ${escapeHtml(item.sourceKind==="news"?item.type:item.types.slice(0,2).join("/"))}</small></div></a>`).join(""):"还没有浏览记录。";
  list.querySelectorAll("[data-open]").forEach(link=>link.addEventListener("click",()=>recordRecent(link.dataset.open)));
}
function updateCounts(){$("favoriteCount").textContent=state.favorites.size}
function renderFavorites(){const items=[...state.favorites].map(findSource).filter(Boolean);renderCards($("favoritesGrid"),items,"还没有收藏。点击来源卡片右上角的星标即可添加。");updateCounts()}

function populatePicker(){
  $("pickerType").insertAdjacentHTML("beforeend",ENT_TYPE_ORDER.filter(v=>state.entertainment.some(i=>i.types.includes(v))).map(v=>`<option>${escapeHtml(v)}</option>`).join(""));
  $("pickerRegion").insertAdjacentHTML("beforeend",ENT_REGION_ORDER.filter(v=>state.entertainment.some(i=>i.region===v)).map(v=>`<option>${escapeHtml(v)}</option>`).join(""));
  $("pickerAccess").insertAdjacentHTML("beforeend",ENT_ACCESS_ORDER.map(v=>`<option>${escapeHtml(v)}</option>`).join(""));
}
function runPicker(event){
  event.preventDefault();const type=$("pickerType").value,region=$("pickerRegion").value,access=$("pickerAccess").value,mood=$("pickerMood").value;
  let candidates=state.entertainment.filter(i=>(!type||i.types.includes(type))&&(!region||i.region===region)&&(!access||i.access===access));
  const moodTypes={relax:["综艺","电影","音乐"],learn:["纪录片","文化"],family:["少儿","纪录片","电影"],energy:["综艺","体育","音乐"]}[mood];
  candidates.sort((a,b)=>Number(moodTypes.some(t=>b.types.includes(t)))-Number(moodTypes.some(t=>a.types.includes(t))));
  if(candidates.length>3){const top=candidates.slice(0,Math.min(candidates.length,12));candidates=[...top].sort(()=>Math.random()-.5).slice(0,3)}
  const target=$("pickerResult");target.classList.toggle("empty-state",!candidates.length);target.innerHTML=candidates.length?candidates.map(item=>`<article class="pick-card"><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.description)}<br>${escapeHtml(item.availability)}</p><a data-open="${escapeHtml(item._key)}" href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">打开官方平台 ↗</a></article>`).join(""):"当前组合没有匹配平台，请放宽地区或观看方式。";
  target.querySelectorAll("[data-open]").forEach(link=>link.addEventListener("click",()=>recordRecent(link.dataset.open)));
}

function clearNews(){state.newsType="";state.newsRegion="";renderFilters();renderNews()}
function clearEntertainment(){state.entType="";state.entRegion="";state.entAccess="";renderFilters();renderEntertainment()}
function quickOpen(button){const view=button.dataset.quickView,type=button.dataset.quickType;if(view==="news"){state.newsType=type;state.newsRegion=type==="财经"?"美国":""}else{state.entType=type}renderFilters();setView(view)}

let deferredInstall=null;
window.addEventListener("beforeinstallprompt",event=>{event.preventDefault();deferredInstall=event;$("installButton").hidden=false});
$("installButton").addEventListener("click",async()=>{if(deferredInstall){deferredInstall.prompt();await deferredInstall.userChoice;deferredInstall=null;$("installButton").hidden=true}else setView("help")});

async function init(){
  state.favorites=new Set(safeLoad("gv-favorites",[]));state.recent=safeLoad("gv-recent",[]);
  try{
    const [newsResponse,entResponse]=await Promise.all([fetch("./sources.json"),fetch("./entertainment_sources.json")]);
    if(!newsResponse.ok||!entResponse.ok)throw new Error("目录文件读取失败");
    state.news=normalizeNews(await newsResponse.json());state.entertainment=normalizeEntertainment(await entResponse.json());
    renderFilters();populatePicker();renderHome();renderNews();renderEntertainment();renderDomestic();
  }catch(error){document.querySelector("main").innerHTML=`<div class="notice-card"><h2>目录读取失败</h2><p>${escapeHtml(error.message)}。请通过 HTTPS 网站访问，不要直接双击本地 HTML。</p></div>`}
  if("serviceWorker" in navigator)navigator.serviceWorker.register("./sw.js").catch(()=>{});
}

document.querySelectorAll(".bottom-nav [data-view]").forEach(button=>button.addEventListener("click",()=>setView(button.dataset.view)));
document.querySelectorAll("[data-goto]").forEach(button=>button.addEventListener("click",()=>setView(button.dataset.goto)));
document.querySelectorAll("[data-quick-view]").forEach(button=>button.addEventListener("click",()=>quickOpen(button)));
$("globalSearch").addEventListener("input",renderSearch);
$("clearNewsFilters").addEventListener("click",clearNews);$("clearEntFilters").addEventListener("click",clearEntertainment);
$("clearRecent").addEventListener("click",()=>{state.recent=[];saveLocal();renderHome();toast("最近记录已清除")});
$("pickerForm").addEventListener("submit",runPicker);
init();
