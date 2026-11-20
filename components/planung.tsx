"use client";
import { useEffect, useState } from "react";
import { CalendarDays, Check, ChevronLeft, ChevronRight, ListChecks, Pencil, Plus, ShoppingBasket, Trash2 } from "lucide-react";
import { dateKey, dateLabel, daysFrom, monday, shoppingItems, type Meal } from "../lib/kitchen";
import type { Recipe } from "../lib/recipes";
import { Modal, Picture } from "./kochbuch-ui";
import type { useDeviceBook } from "./use-device-book";
type Model = ReturnType<typeof useDeviceBook>;
export function WeekPicker({week,onWeek}:{week:string;onWeek:(s:string)=>void}){
  const end=daysFrom(week,6);
  return <div className="week-picker"><button aria-label="Vorherige Woche" onClick={()=>onWeek(daysFrom(week,-7))}><ChevronLeft/></button><span>{dateLabel(week,{day:"numeric",month:"short"})} – {dateLabel(end,{day:"numeric",month:"short",year:"numeric"})}</span><button aria-label="Nächste Woche" onClick={()=>onWeek(daysFrom(week,7))}><ChevronRight/></button></div>;
}
function LoadNotice({model}:{model:Model}){
  return model.error ? <div className="sync-alert" role="alert">{model.error} <button onClick={()=>void model.refresh()}>Erneut laden</button></div> : !model.ready ? <p className="hint" role="status">Wird geladen …</p>:null;
}
export type MealDraft={date:string;recipeId?:string;id?:string;servings?:number};
export function MealDialog({draft,model,recipes,close,onSave}:{draft:MealDraft;model:Model;recipes:Recipe[];close:()=>void;onSave:(day:string)=>void}){
  const [day,setDay]=useState(draft.date),[id,setId]=useState(draft.recipeId||""),[servings,setServings]=useState(String(draft.servings??recipes.find(r=>r.id===draft.recipeId)?.portions??1));
  const recipe=recipes.find(r=>r.id===id);
  const [entryId]=useState(()=>draft.id||crypto.randomUUID());
  const [localError,setLocalError]=useState("");
  async function save(e:React.FormEvent){
    e.preventDefault();if(!recipe)return;
    const meal:Meal={id:entryId,date:day,recipeId:id,servings:Number(servings)};
    if(await model.change({op:"save",meal}))onSave(day);else setLocalError("Der Eintrag konnte nicht gespeichert werden. Bitte erneut versuchen.");
  }
  return <Modal title={draft.id?"Eintrag bearbeiten":"Rezept einplanen"} close={()=>{if(!model.busy)close();}}>
    <form className="plan-form" onSubmit={save}>
      <label>Rezept<select autoFocus={!id} required value={id} onChange={e=>{setId(e.target.value);setServings(String(recipes.find(r=>r.id===e.target.value)?.portions||1));}}><option value="">Rezept auswählen</option>{recipes.map(r=><option key={r.id} value={r.id}>{r.title}</option>)}</select></label>
      <div className="form-pair"><label>Tag<input type="date" value={day} required onChange={e=>setDay(e.target.value)}/></label><label>{recipe && !recipe.portions?"Rezeptmengen":"Portionen"}<input type="number" required min="1" max="150" value={servings} onChange={e=>setServings(e.target.value)}/></label></div>
      {(localError || model.error) && <p className="error" role="alert">{model.error||localError}</p>}
      <div className="modal-actions">{draft.id&&<button type="button" className="text-btn danger" disabled={model.busy} onClick={async()=>{if(await model.change({op:"remove",id:draft.id!}))close();}}><Trash2/> Entfernen</button>}<button className="primary" disabled={!recipe||model.busy}><Check/> {model.busy?"Speichert …":"Im Wochenplan speichern"}</button></div>
    </form>
  </Modal>;
}
export function Planner({model,recipes,week,setWeek,edit,open,shop}:{model:Model;recipes:Recipe[];week:string;setWeek:(s:string)=>void;edit:(d:MealDraft)=>void;open:(id:string)=>void;shop:()=>void}){
  const today=dateKey(new Date());
  return <main className="frame workspace"><div className="workspace-head"><div><span className="workspace-icon"><CalendarDays/></span><h1>Unser Wochenplan</h1></div><button className="primary" onClick={shop}><ShoppingBasket/> Wocheneinkauf</button></div>
    <div className="week-toolbar"><WeekPicker week={week} onWeek={setWeek}/>{week!==monday()&&<button className="text-btn" onClick={()=>setWeek(monday())}>Diese Woche</button>}</div>
    <LoadNotice model={model}/>{model.ready && <div className="week-sheet">{Array.from({length:7},(_,i)=>{
      const day=daysFrom(week,i),meals=model.state.meals.filter(m=>m.date===day).sort((a,b)=>a.id.localeCompare(b.id));
      return <section className={"day-row "+(day===today?"is-today":"")} key={day}><div className="day-name"><strong>{dateLabel(day,{weekday:"long"})}</strong><span>{dateLabel(day,{day:"numeric",month:"long"})}{day===today?" · Heute":""}</span></div>
        <div className="day-meals">{meals.map(m=>{const r=recipes.find(x=>x.id===m.recipeId);return <div key={m.id} className="planned-dish"><button className="meal-open" onClick={()=>open(m.recipeId)}>{r&&<span className="meal-thumb"><Picture recipe={r}/></span>}<span><b>{r?.title||"Gespeichertes Rezept"}</b><small>{m.servings} {r?.portions?(m.servings===1?"Portion":"Portionen"):(m.servings===1?"Rezeptmenge":"Rezeptmengen")}</small></span></button><button className="icon-btn" aria-label={"Eintrag bearbeiten: "+(r?.title||"Rezept")} onClick={()=>edit(m)}><Pencil/></button></div>;})}
          <button className="plan-add" aria-label={"Gericht für "+dateLabel(day,{weekday:"long"})+" einplanen"} onClick={()=>edit({date:day})}><Plus/>{meals.length?"Weiteres Gericht":"Gericht einplanen"}</button></div></section>;
    })}</div>}</main>;
}
export function Groceries({model,recipes,week,setWeek,chosen,choose,planner}:{model:Model;recipes:Recipe[];week:string;setWeek:(s:string)=>void;chosen:string;choose:(id:string)=>void;planner:()=>void}){
  const recipe=recipes.find(r=>r.id===chosen);
  const [servings,setServings]=useState(recipe?.portions||1);
  useEffect(()=>setServings(recipe?.portions||1),[recipe?.id,recipe?.portions]);
  const end=daysFrom(week,6);
  const meals=model.state.meals.filter(m=>m.date>=week && m.date<=end);
  const choices=chosen?(recipe?[{recipe,servings}]:[]):meals.flatMap(m=>{const r=recipes.find(r=>r.id===m.recipeId);return r?[{recipe:r,servings:m.servings}]:[];});
  const missingRecipes=!chosen && choices.length!==meals.length;
  const scope=chosen?"rezept/"+chosen:"woche/"+week;
  const items=shoppingItems(choices).map(x=>({...x,key:scope+"/"+x.key}));
  const checked=items.filter(x=>model.state.checks.includes(x.key)).length;
  return <main className="frame workspace"><div className="workspace-head"><div><span className="workspace-icon"><ShoppingBasket/></span><h1>Einkaufsliste</h1></div></div>
    <div className="list-tools"><label className="select-label">Einkauf für<select value={chosen} onChange={e=>choose(e.target.value)}><option value="">Den Wochenplan</option><optgroup label="Ein einzelnes Gericht">{recipes.map(r=><option key={r.id} value={r.id}>{r.title}</option>)}</optgroup></select></label>
    {chosen?<label className="select-label">{recipe?.portions?"Portionen":"Rezeptmengen"}<input type="number" min="1" max="150" value={servings||""} onChange={e=>setServings(Math.min(150,Math.max(0,Math.floor(Number(e.target.value)))))} onBlur={()=>{if(!servings)setServings(1);}}/></label>:<WeekPicker week={week} onWeek={setWeek}/>}</div>
    <LoadNotice model={model}/>{missingRecipes && <p className="error" role="status">Ein geplantes Rezept wird noch geladen. Die Liste erscheint, sobald alle Zutaten vorliegen.</p>}
    {model.ready && !missingRecipes && (items.length ? <section className="shopping-sheet"><div className="sheet-head"><h2>{recipe?.title||"Wocheneinkauf"}</h2><span aria-live="polite">{checked} von {items.length} erledigt</span></div><ul>{items.map(item=><li key={item.key}><label className={model.state.checks.includes(item.key)?"done":""}><input type="checkbox" disabled={model.busy||!!model.error} checked={model.state.checks.includes(item.key)} onChange={e=>void model.change({op:"check",key:item.key,checked:e.target.checked})}/><span>{item.name}</span><strong>{item.quantity}</strong></label></li>)}</ul></section>:<div className="empty panel"><ListChecks/><h3>{chosen?"Rezept auswählen":"Diese Woche ist noch frei"}</h3><p>{chosen?"Wähle ein Gericht für deine Einkaufsliste.":"Sobald du ein Gericht einplanst, stehen seine Zutaten hier."}</p>{!chosen&&<button className="secondary" onClick={planner}><CalendarDays/> Zum Wochenplan</button>}</div>)}
  </main>;
}
