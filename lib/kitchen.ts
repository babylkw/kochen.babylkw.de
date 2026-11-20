import type { Recipe } from "./recipes";

export type Meal = { id: string; date: string; recipeId: string; servings: number };
export type Kitchen = { meals: Meal[]; checks: string[] };
export type Change = { op: "save"; meal: Meal } | { op: "remove"; id: string } | { op: "check"; key: string; checked: boolean };

export function dateKey(date: Date) {
  return [date.getFullYear(), String(date.getMonth()+1).padStart(2,"0"), String(date.getDate()).padStart(2,"0")].join("-");
}
export function daysFrom(key: string, offset: number) {
  const date = new Date(key+"T12:00:00");
  date.setDate(date.getDate()+offset);
  return dateKey(date);
}
export function monday(key = dateKey(new Date())) {
  return daysFrom(key, -((new Date(key+"T12:00:00").getDay()+6)%7));
}
export function dateLabel(key: string, format: Intl.DateTimeFormatOptions) {
  return new Date(key+"T12:00:00").toLocaleDateString("de-DE",format);
}
export function afterChange(state: Kitchen, change: Change): Kitchen {
  if(change.op==="check") {
    const checks = state.checks.filter(key=>key!==change.key);
    if(change.checked) checks.push(change.key);
    return { ...state,checks };
  }
  if(change.op==="remove") return { ...state,meals:state.meals.filter(meal=>meal.id!==change.id) };
  return { ...state,meals:[...state.meals.filter(meal=>meal.id!==change.meal.id),change.meal] };
}

const fractions: Record<string,string> = { "½":"1/2","¼":"1/4","¾":"3/4","⅓":"1/3","⅔":"2/3","⅛":"1/8" };
const units: Record<string,[string,number]> = {
  kg:["g",1000],g:["g",1],mg:["g",0.001],l:["ml",1000],cl:["ml",10],dl:["ml",100],ml:["ml",1],
  el:["EL",1],tl:["TL",1],prise:["Prise",1],prisen:["Prise",1],bund:["Bund",1],handvoll:["Handvoll",1],
  dose:["Dose",1],dosen:["Dose",1],packung:["Packung",1],packungen:["Packung",1],stück:["Stück",1],
};
const numberFormat = new Intl.NumberFormat("de-DE",{maximumFractionDigits:2});
export function ingredientAmount(line: string, factor: number) {
  const text = line.trim().replace(/(\d)([½¼¾⅓⅔⅛])/g,"$1 $2").replace(/[½¼¾⅓⅔⅛]/g,x=>fractions[x]);
  const match = text.match(/^(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:[.,]\d+)?)(?![\d/.,])\s*(.+)$/);
  if(!match || /^\s*[-–—]|^\s*bis\b/i.test(match[2])) return {name:line.trim(),unit:"×",amount:factor,raw:true};
  const toNumber=(s:string)=>s.split(/\s+/).reduce((sum,v)=>{const [n,d]=v.replace(",",".").split("/").map(Number);return sum+n/(d??1);},0);
  const rest = match[2].trim();
  const unitMatch = rest.match(/^(\p{L}+)\.?\s+(.+)$/u);
  const unit = unitMatch && units[unitMatch[1].toLocaleLowerCase("de")];
  const amount = toNumber(match[1])*factor*(unit?unit[1]:1);
  if(!Number.isFinite(amount)) return {name:line.trim(),unit:"×",amount:factor,raw:true};
  return {name:unit && unitMatch ? unitMatch[2] : rest,unit:unit ? unit[0] : "",amount,raw:false};
}
const names:Record<string,string>={zwiebeln:"zwiebel",knoblauchzehen:"knoblauchzehe",möhren:"möhre",kartoffeln:"kartoffel",eier:"ei",limetten:"limette",zitronen:"zitrone",zucchini:"zucchini",tomaten:"tomate"};
export function shoppingItems(choices:{recipe:Recipe;servings:number}[]) {
  const items = new Map<string,ReturnType<typeof ingredientAmount>>();
  for(const {recipe,servings} of choices) for(const line of recipe.ingredients) {
    const item=ingredientAmount(line,servings/(recipe.portions||1));
    const norm=item.name.normalize("NFKC").trim().toLocaleLowerCase("de").replace(/\s+/g," ");
    const key=JSON.stringify([names[norm]??norm,item.unit,item.raw]);
    const prior=items.get(key);
    if(prior) prior.amount+=item.amount; else items.set(key,item);
  }
  return [...items.entries()].map(([key,item])=>{
    let {amount,unit}=item;
    if((unit==="g" || unit==="ml") && amount>=1000){unit=unit==="g"?"kg":"l";amount/=1000;}
    if(amount!==1) unit=({Dose:"Dosen",Prise:"Prisen",Packung:"Packungen"} as Record<string,string>)[unit]??unit;
    const quantity=item.raw && Math.abs(amount-1)<1e-8 ? "" : [numberFormat.format(amount),unit].filter(Boolean).join(" ");
    let name=item.name;
    if(!item.raw && !unit && amount>1) name=({Zwiebel:"Zwiebeln",Knoblauchzehe:"Knoblauchzehen",Möhre:"Möhren",Kartoffel:"Kartoffeln",Ei:"Eier",Limette:"Limetten",Zitrone:"Zitronen"} as Record<string,string>)[name]??name;
    return {key:JSON.stringify([key,Math.round(item.amount*10000)]),name,quantity};
  });
}
