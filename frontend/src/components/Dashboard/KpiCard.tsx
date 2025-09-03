export default function KpiCard({title, value}:{title:string, value:string|number}){
    return <div className="card"><div className="text-slate-500 text-sm">{title}</div><div className="text-2xl font-bold mt-2">{value}</div></div>
}