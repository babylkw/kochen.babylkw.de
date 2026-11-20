"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, BookOpen, CalendarDays, ShoppingBasket, Heart, Bookmark, ChefHat, Clock3, CookingPot, Grid2X2, Plus, Search, Soup, Sparkles, Users, X, Utensils, Croissant, IceCreamBowl, Salad, Wheat, ClipboardPaste, Sun, CircleCheck } from "lucide-react";
import { categories, examples, type Recipe, type RecipeInput } from "../lib/recipes";
import { parseRecipe } from "../lib/import-recipe";

import { Modal, Picture } from "../components/kochbuch-ui";
import { Planner, Groceries, MealDialog, type MealDraft } from "../components/planung";
import { dateKey, monday } from "../lib/kitchen";
import { useDeviceBook } from "../components/use-device-book";
import { BackupDialog } from "../components/sicherung";

const featured = examples.find(r => r.id === "ofenpasta")!;
const categoryIcons = { Hauptgerichte: Utensils, Suppen: Soup, Frühstück: Croissant, Desserts: IceCreamBowl, Beilagen: Wheat, Salate: Salad, Sonstiges: CookingPot };

const importPlaceholder = "Linsensuppe mit Möhren\n4 Portionen · 30 Minuten · Suppen\n\nZutaten\n200 g rote Linsen\n…\n\nZubereitung\n1. Gemüse klein schneiden.\n…";

function Brand() {
  return <span className="brand"><span className="brandicon"><CookingPot size={30} strokeWidth={1.65}/></span><span><i>Julia</i> Kochstudio</span></span>;
}
function Meta({ recipe, portions = false }: { recipe: Recipe | RecipeInput; portions?: boolean }) {
  return <span className="meta">{recipe.minutes && <span><Clock3/> {recipe.minutes} Min.</span>}{recipe.difficulty && <span><ChefHat/> {recipe.difficulty}</span>}{portions && recipe.portions && <span><Users/> {recipe.portions} {recipe.portions === 1 ? "Portion" : "Portionen"}</span>}</span>;
}
function ImportModal({ close, saved, save }: { close: () => void; saved: (r: Recipe) => void; save: (draft:RecipeInput)=>Promise<Recipe> }) {
  const [raw,setRaw] = useState(""); const [error,setError] = useState("");
  const [draft,setDraft] = useState<RecipeInput | null>(null); const [busy,setBusy] = useState(false);
  const [imageUrl,setImageUrl]=useState("");
  const [photoBusy,setPhotoBusy]=useState(false);
  async function loadPhoto(file?:File){
    setError("");setImageUrl("");if(!file)return;setPhotoBusy(true);
    let url="";
    try{
      url=URL.createObjectURL(file);const img=new Image();img.src=url;await img.decode();
      const canvas=document.createElement("canvas"), factor=Math.min(1,900/Math.max(img.width,img.height));
      canvas.width=Math.max(1,Math.round(img.width*factor));canvas.height=Math.max(1,Math.round(img.height*factor));
      const ctx=canvas.getContext("2d");if(!ctx)throw Error();ctx.fillStyle="#fff";ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);
      let photo=canvas.toDataURL("image/jpeg",.78);
      if(photo.length>360000)photo=canvas.toDataURL("image/jpeg",.5);
      if(photo.length>360000)throw Error();setImageUrl(photo);
    }catch{setError("Dieses Bild lässt sich nicht einlesen. Bitte ein JPG, PNG oder WebP auswählen.");}
    finally{if(url)URL.revokeObjectURL(url);setPhotoBusy(false);}
  }
  function preview() { try { setDraft({...parseRecipe(raw),...(imageUrl?{imageUrl}:{})}); setError(""); } catch(e) { setError((e as Error).message); } }
  async function submit() {
    if (!draft || busy) return; setBusy(true); setError("");
    try {
      saved(await save(draft));
    } catch(e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  return <Modal title={draft ? "Rezept prüfen" : "Rezept hinzufügen"} close={() => { if(!busy) close(); }}>
    {draft ? <><h3>{draft.title}</h3><Meta recipe={draft} portions/><span className="import-category">{draft.category}</span><h4>Zutaten</h4><ul>{draft.ingredients.map((s,i)=><li key={i}>{s}</li>)}</ul><h4>Zubereitung</h4><ol>{draft.steps.map((s,i)=><li key={i}>{s}</li>)}</ol></> :
      <>
      <label className="fieldlabel" htmlFor="einfügen"><ClipboardPaste size={18}/> Rezepttext einfügen</label><p className="hint">Füge ein Rezept aus ChatGPT oder Gemini mit Titel, Zutaten und Zubereitung ein. Setze jede Zutat und jeden Schritt in eine eigene Zeile. Dieses Rezept wird auf deinem Gerät gespeichert.</p>
      <textarea id="einfügen" value={raw} onChange={e => {setRaw(e.target.value);setError("");}} placeholder={importPlaceholder} maxLength={160000} rows={8}/><label className="upload-label">Gerichtfoto hinzufügen <small>(optional)</small><input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>void loadPhoto(e.target.files?.[0])}/></label>{imageUrl && <img className="upload-thumb" src={imageUrl} alt="Ausgewähltes Gerichtfoto"/>}</>}
    {error && <p role="alert" className="error">{error}</p>}
    <div className="modal-actions">{draft && <button className="secondary" disabled={busy} onClick={()=>{setDraft(null);setError("");}}>Text bearbeiten</button>}<button className="primary" disabled={busy || photoBusy || !raw.trim()} onClick={draft ? submit : preview}>{draft ? (busy ? "Wird gespeichert …" : "Rezept speichern") : "Vorschau anzeigen"}</button></div>
  </Modal>;
}

function RecipeDetail({ recipe, bookmarked, toggle, back, plan, shop }: { recipe: Recipe; bookmarked: boolean; toggle: () => void; back: () => void; plan:()=>void; shop:()=>void }) {
  const [checks,setChecks] = useState<Set<number>>(new Set());
  function check(index: number) { setChecks(prev => { const next = new Set(prev); if (next.has(index)) next.delete(index); else next.add(index); return next; }); }
  return <main className="frame detail"><button className="back" onClick={back}><ArrowLeft/> Zurück</button>
    <div className="detail-head"><div className="detail-photo"><Picture recipe={recipe}/></div><div><span className="eyebrow">{recipe.category}</span><h1>{recipe.title}</h1><Meta recipe={recipe} portions/>
    <div className="detail-actions"><button className="primary" onClick={plan}><CalendarDays/> Einplanen</button><button className="secondary" onClick={shop}><ShoppingBasket/> Einkaufsliste</button><button className={"secondary "+(bookmarked?"marked":"")} onClick={toggle} aria-pressed={bookmarked}><Bookmark/>{bookmarked ? "Gemerkt" : "Merken"}</button></div></div></div>
    <div className="recipe-columns"><section className="ingredient-box"><h2>Zutaten</h2>{recipe.portions && <p className="hint">Für {recipe.portions} {recipe.portions === 1 ? "Portion" : "Portionen"}</p>}
    <ul>{recipe.ingredients.map((s,i)=><li key={i}><label className={checks.has(i)?"checked":""}><input type="checkbox" checked={checks.has(i)} onChange={()=>check(i)}/><span>{s}</span></label></li>)}</ul></section>
    <section className="method"><h2>Zubereitung</h2><ol>{recipe.steps.map((s,i)=><li key={i}><span className="stepno" aria-hidden="true">{i+1}</span><p>{s}</p></li>)}</ol></section></div>
  </main>;
}

export default function Home() {
  const kitchen=useDeviceBook();
  const [backupOpen,setBackupOpen]=useState(false);
  const [week,setWeek]=useState(()=>monday());
  const [mealDraft,setMealDraft]=useState<MealDraft|null>(null);
  const recipes = [...kitchen.book.recipes, ...examples];
  const [view,setView] = useState("buch"); const [category,setCategory] = useState("Alle"); const [query,setQuery] = useState("");
  const favorites = kitchen.book.favorites; const [importOpen,setImportOpen] = useState(false);
  const [notice,setNotice] = useState("");
  const failed=!!kitchen.error, loaded=kitchen.ready;
  const [returnView,setReturnView] = useState("buch");
  useEffect(() => {
    const change = () => { setView(location.hash.slice(1) || "buch"); window.scrollTo(0,0); };
    change(); window.addEventListener("hashchange",change);
    return ()=>window.removeEventListener("hashchange",change);
  },[]);
  useEffect(() => { if(!notice) return; const timer=setTimeout(()=>setNotice(""),3200); return ()=>clearTimeout(timer); },[notice]);
  function navigate(v: string) { location.hash = v; }
  function tab(v: string) { setQuery("");setCategory("Alle");setReturnView(v);navigate(v); }
  function toggle(id:string) { void kitchen.toggleFavorite(id).catch(e=>setNotice(e.message)); }
  const onlyFavorites = view === "favoriten";
  const pool = onlyFavorites ? recipes.filter(r=>favorites.includes(r.id)) : recipes;
  const group = (["Alle",...categories.filter(c=>pool.some(r=>r.category===c))]);
  const activeCategory = group.includes(category) ? category : "Alle";
  const normalize = (s: string) => s.toLocaleLowerCase("de").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/ß/g,"ss");
  const filtered=pool.filter(r=>(activeCategory==="Alle" || r.category===activeCategory) && normalize([r.title, ...r.ingredients].join(" ")).includes(normalize(query.trim())));
  const detailId = view.startsWith("rezept/") ? view.slice(7) : null; const detail=recipes.find(r=>r.id===detailId);
  const openRecipe = (id: string) => { setReturnView(view);navigate("rezept/"+id); };
  const statusBlock = failed && <div className="sync-alert" role="alert">{kitchen.error} <button onClick={()=>void kitchen.refresh()}>Erneut laden</button></div>;
  return <>
    <header><div className="frame hdr"><a href="#buch" onClick={e=>{e.preventDefault();tab("buch");}} className="home-link" aria-label="Julia Kochstudio – Rezeptbuch"><Brand/></a>
    <nav aria-label="Hauptnavigation">{[
      {key:"buch",label:"Rezeptbuch",Icon:BookOpen,active:!["wochenplan","einkauf"].includes(view.split("/")[0])},
      {key:"wochenplan",label:"Wochenplan",Icon:CalendarDays,active:view==="wochenplan"},
      {key:"einkauf",label:"Einkaufsliste",Icon:ShoppingBasket,active:view.startsWith("einkauf")},
    ].map(({key,label,Icon,active})=><button key={key} className={active?"nav-active":""} aria-current={active?"page":undefined} onClick={()=>tab(key)}><Icon/>{label}</button>)}</nav>
    <button className="primary add-btn" onClick={()=>setImportOpen(true)}><Plus/> <span>Rezept hinzufügen</span></button></div></header>
    {detail ? <RecipeDetail key={detail.id} recipe={detail} bookmarked={favorites.includes(detail.id)} toggle={()=>toggle(detail.id)} back={()=>navigate(returnView)} plan={()=>setMealDraft({date:dateKey(new Date()),recipeId:detail.id})} shop={()=>navigate("einkauf/"+detail.id)}/> :
      detailId ? <main className="frame empty"><h1>{!loaded ? "Rezept wird geladen …" : failed ? "Rezeptbuch gerade nicht erreichbar" : "Rezept nicht gefunden"}</h1>{statusBlock}<button className="secondary" onClick={()=>tab("buch")}>Zum Rezeptbuch</button></main> :
      view==="wochenplan" ? <Planner model={kitchen} recipes={recipes} week={week} setWeek={setWeek} edit={setMealDraft} open={openRecipe} shop={()=>navigate("einkauf")}/> :
      view.startsWith("einkauf") ? <Groceries model={kitchen} recipes={recipes} week={week} setWeek={setWeek} chosen={view.split("/")[1]||""} choose={id=>navigate("einkauf"+(id?"/"+id:""))} planner={()=>navigate("wochenplan")}/> :
      <main className="frame collection">
        {!onlyFavorites && featured && <section className="hero" aria-labelledby="hero-title">
          <img className="hero-image" src="./bilder/ofentomaten-titel.webp" fetchPriority="high" alt="Rigatoni mit gerösteten Tomaten, Parmesan und Basilikum"/><div className="hero-shade"></div>
          <div className="hero-copy"><span className="hero-label"><Sun/>Rezept der Woche</span><h1 id="hero-title">Pasta mit<br/><em>Ofentomaten</em></h1><p className="hero-desc">Geröstete Kirschtomaten, frisches Basilikum und ein Hauch Parmesan.</p><Meta recipe={featured} portions/><button className="hero-button" onClick={()=>openRecipe(featured.id)}><BookOpen/> Rezept ansehen</button></div></section>}
        <section className="catalog" aria-label={onlyFavorites?"Favoriten":"Rezeptsammlung"}>
        <div className="catalog-top"><div><h2>{onlyFavorites?"Meine Favoriten":"Unsere Rezepte"}<span className="recipe-count" aria-label={pool.length+" Rezepte"}>{pool.length}</span></h2></div>
          <div className="collection-tools"><button className={"favorite-filter "+(onlyFavorites?"active":"")} aria-pressed={onlyFavorites} onClick={()=>tab(onlyFavorites?"buch":"favoriten")}><Heart/> Favoriten</button><label className="search"><Search/><input type="search" placeholder="Rezepte suchen …" aria-label="Rezepte oder Zutaten suchen" value={query} onChange={e=>setQuery(e.target.value)}/></label></div></div>
        {!!pool.length && <div className="filters" aria-label="Rezeptkategorien">{group.map(c=>{const Icon = c==="Alle"?Grid2X2:categoryIcons[c as Recipe["category"]];return <button aria-pressed={c===activeCategory} className={c===activeCategory?"selected":""} key={c} onClick={()=>setCategory(c)}><Icon/>{c==="Alle"?"Alle Rezepte":c}</button>;})}</div>}
        {statusBlock}
        <div className="cards">{filtered.map(r=><article className="card" key={r.id}><a href={"#rezept/"+r.id} onClick={()=>setReturnView(onlyFavorites?"favoriten":"buch")} className="card-link"><div className="card-photo"><Picture recipe={r}/></div><div className="card-body"><div className="card-category">{r.category}</div><h3>{r.title}</h3><Meta recipe={r}/></div></a>
        <button className={"bookmark "+(favorites.includes(r.id)?"marked":"")} onClick={()=>toggle(r.id)} aria-label={(favorites.includes(r.id)?"Aus Favoriten entfernen: ":"Als Favorit merken: ")+r.title} aria-pressed={favorites.includes(r.id)}><Bookmark/></button></article>)}</div>
        {!filtered.length && <div className="empty">{onlyFavorites && !pool.length ? <><Bookmark/><h3>Deine Lieblingsrezepte haben hier Platz.</h3><p>Tippe auf das Lesezeichen einer Rezeptkachel, um sie auf diesem iPad zu merken.</p><button className="secondary" onClick={()=>tab("buch")}>Rezepte entdecken</button></> : <><Search/><h3>Kein passendes Rezept gefunden</h3><p>Probiere einen anderen Suchbegriff oder zeige wieder alle Rezepte an.</p><button className="secondary" onClick={()=>{setQuery("");setCategory("Alle");}}>Filter zurücksetzen</button></>}</div>}
        </section></main>}
    <footer className="frame backup-footer"><button className="text-btn" onClick={()=>setBackupOpen(true)}>Kochbuch sichern oder übertragen</button></footer>
    {backupOpen && <BackupDialog close={()=>setBackupOpen(false)} restore={kitchen.restore} done={()=>{setBackupOpen(false);setNotice("Sicherung übernommen");}}/>}
    {mealDraft && <MealDialog draft={mealDraft} model={kitchen} recipes={recipes} close={()=>setMealDraft(null)} onSave={d=>{setMealDraft(null);setWeek(monday(d));navigate("wochenplan");setNotice("Gericht eingeplant");}}/>}
    {importOpen && <ImportModal close={()=>setImportOpen(false)} save={kitchen.saveRecipe} saved={r=>{setImportOpen(false);setNotice("Rezept gespeichert");setReturnView("buch");navigate("rezept/"+r.id);}}/>}
    {notice && <div className="toast" role="status"><CircleCheck/>{notice}</div>}
  </>;
}
