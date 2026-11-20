"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import type { Recipe } from "../lib/recipes";

export function Modal({title,close,children}:{title:string;close:()=>void;children:ReactNode}){
  const ref=useRef<HTMLDialogElement>(null);
  useEffect(()=>{
    const el=ref.current;el?.showModal();const old=document.body.style.overflow;document.body.style.overflow="hidden";
    return ()=>{document.body.style.overflow=old;el?.close();};
  },[]);
  return <dialog aria-labelledby="modal-title" ref={ref} onCancel={e=>{e.preventDefault();close();}} onClick={e=>{if(e.target===e.currentTarget)close();}}>
    <div className="modal-inner"><button className="close-icon" aria-label="Schließen" onClick={close}><X/></button><h2 id="modal-title">{title}</h2>{children}</div>
  </dialog>;
}
const illustrations:Record<Recipe["category"],string>={Hauptgerichte:"ofenpasta",Suppen:"moehrensuppe",Frühstück:"pfannkuchen",Desserts:"apfelcrumble",Beilagen:"ofengemuese",Salate:"ofengemuese",Sonstiges:"ofengemuese"};
export function Picture({recipe}:{recipe:Recipe}){
  const [broken,setBroken]=useState(false);
  const photo=recipe.imageUrl || (recipe.photo?"./bilder/"+recipe.photo+".webp":"");
  const fallback=broken || !photo;
  return <><img src={fallback ? "./bilder/"+illustrations[recipe.category]+".webp":photo} alt={fallback?"Beispielbild für "+recipe.category:recipe.title} onError={()=>setBroken(true)} loading="lazy" referrerPolicy="no-referrer"/>{fallback && <span className="sample-image">Beispielbild</span>}</>;
}
