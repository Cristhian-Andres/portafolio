import { FadeInWhenVisible } from "@/components/motion/FadeInWhenVisible";

const K = "text-accent font-semibold";
const S = "text-accent-2";
const C = "text-muted italic";

export function SqlCard() {
  return (
    <FadeInWhenVisible className="min-w-0">
      <figure
        className="min-w-0 overflow-hidden rounded-2xl border border-border bg-surface shadow-xl shadow-accent-solid/10"
        aria-label="Consulta SQL que resume mi perfil"
      >
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
          <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
          <span className="h-3 w-3 rounded-full bg-[#28c840]" />
          <span className="ml-3 font-mono text-xs text-muted">sobre_mi.sql</span>
        </div>
        <pre className="overflow-x-auto p-5 font-mono text-[13px] leading-7 text-foreground">
          <code>
            <span className={K}>SELECT</span> decisiones_con_evidencia{"\n"}
            <span className={K}>FROM</span>   datos_crudos d{"\n"}
            <span className={K}>JOIN</span>   modelo_dimensional m{"\n"}
            {"  "}
            <span className={K}>ON</span> m.fuente = d.fuente{"\n"}
            <span className={K}>WHERE</span>  m.metrica_validada = <span className={S}>TRUE</span>
            {"\n"}
            <span className={K}>AND</span>    gobernanza = <span className={S}>&apos;única fuente de verdad&apos;</span>;{"\n\n"}
            <span className={C}>-- 1 fila · Alegra · BigQuery + Redshift</span>
          </code>
        </pre>
      </figure>
    </FadeInWhenVisible>
  );
}
