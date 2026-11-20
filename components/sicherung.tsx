import { useState } from "react";
import { Download, Upload } from "lucide-react";
import { dateKey } from "../lib/kitchen";
import { parseBackup, readOrUpdate, serializeBackup, type DeviceBook } from "../lib/device-book";
import { Modal } from "./kochbuch-ui";

export function BackupDialog({close,restore,done}:{close:()=>void;restore:(data:DeviceBook)=>Promise<void>;done:()=>void}) {
  const [incoming,setIncoming]=useState<DeviceBook|null>(null);
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);
  async function download() {
    setError(""); setBusy(true);
    try {
      const current=await readOrUpdate();
      const url=URL.createObjectURL(new Blob([serializeBackup(current)],{type:"application/json"}));
      const a=document.createElement("a");a.href=url;a.download="Julia-Kochstudio-"+dateKey(new Date())+".json";
      document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
    } catch { setError("Die Sicherung konnte nicht erstellt werden."); }
    finally {setBusy(false);}
  }
  return <Modal title="Kochbuch sichern" close={()=>{if(!busy)close();}}>
    <p className="hint">Eigene Rezepte, Favoriten, Wochenplan und Einkaufshäkchen liegen in diesem Browser. Mit einer Sicherungsdatei kannst du sie auf ein anderes Gerät mitnehmen.</p>
    <div className="backup-tools"><button className="primary" disabled={busy} onClick={()=>void download()}><Download/> Sicherung herunterladen</button>
    <label className="upload-label"><span><Upload size={18}/> Sicherung einlesen</span><input type="file" accept=".json,application/json" disabled={busy} onChange={async e=>{const f=e.target.files?.[0];setIncoming(null);setError("");if(!f)return;setBusy(true);try{setIncoming(parseBackup(await f.text()));}catch(err){setError((err as Error).message);}finally{setBusy(false);}}}/></label></div>
    {incoming && <><p className="hint">Die Datei enthält {incoming.recipes.length} eigene Rezepte und {incoming.kitchen.meals.length} Planeinträge. Beim Zusammenführen werden fehlende Einträge ergänzt. Vorhandene Einträge behalten ihre Fassung.</p><div className="modal-actions"><button className="primary" disabled={busy} onClick={async()=>{setBusy(true);try{await restore(incoming);done();}catch(err){setError((err as Error).message);}finally{setBusy(false);}}}>Daten zusammenführen</button></div></>}
    {error && <p role="alert" className="error">{error}</p>}
  </Modal>;
}
