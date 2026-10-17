"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { signOutAdmin } from "@/app/admin/entrar/actions";
import { categories } from "@/lib/content";
import type { AdminRun, AdminSource } from "@/lib/news/source-admin";

type Settings = { enabled: boolean; frequency_minutes: number; max_age_hours: number };
type SourceTest = { ok: boolean; message: string; found: number; recent: number; newest: string | null; samples: Array<{ title: string; publishedAt: string | null; url: string }> };
type SourceForm = {
  name: string; site_url: string; kind: "rss" | "sitemap" | "manual"; feed_url: string; path_prefix: string; source_type: "editorial" | "official";
  language: "pt-BR" | "en"; default_category: string; enabled: boolean; use_images: boolean; max_items: number; notes: string;
};

const emptyForm: SourceForm = {
  name: "", site_url: "", kind: "rss", feed_url: "", path_prefix: "", source_type: "editorial", language: "pt-BR",
  default_category: "Tecnologia", enabled: true, use_images: true, max_items: 30, notes: "",
};
const frequencyLabels: Record<number, string> = { 60: "A cada hora", 120: "A cada 2 horas", 180: "A cada 3 horas", 360: "A cada 6 horas", 720: "A cada 12 horas", 1440: "Uma vez por dia" };
const ageOptions = [12, 24, 48, 72, 120, 168];
const statusLabels: Record<string, string> = { ok: "Com notícias novas", empty: "Sem novidades", error: "Falhou", blocked: "Acesso não permitido", manual: "Cadastro manual" };
const runStatusLabels: Record<AdminRun["status"], string> = { running: "Em andamento", completed: "Concluída", partial: "Concluída com falhas", failed: "Falhou" };
const triggerLabels: Record<string, string> = { schedule: "Agendada", manual: "Manual (painel)", cron: "Agendador externo" };

function formatDate(value: string | null) {
  if (!value) return "nunca";
  return new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" });
}

function formFromSource(source: AdminSource): SourceForm {
  return {
    name: source.name, site_url: source.site_url, kind: source.kind, feed_url: source.feed_url ?? "", path_prefix: source.path_prefix ?? "",
    source_type: source.source_type, language: source.language, default_category: source.default_category, enabled: source.enabled,
    use_images: source.use_images, max_items: source.max_items, notes: source.notes ?? "",
  };
}

async function requestJson(url: string, init?: RequestInit) {
  const response = await fetch(url, { cache: "no-store", ...init, headers: init?.body ? { "Content-Type": "application/json" } : undefined });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error ?? "Não foi possível concluir a ação.");
  return data;
}

function SourceFields({ form, setForm, idPrefix }: { form: SourceForm; setForm: (form: SourceForm) => void; idPrefix: string }) {
  const update = <K extends keyof SourceForm>(key: K, value: SourceForm[K]) => setForm({ ...form, [key]: value });
  return <>
    <div className="form-two">
      <div><label htmlFor={`${idPrefix}-name`}>Nome da fonte</label><input id={`${idPrefix}-name`} value={form.name} onChange={(event) => update("name", event.target.value)} required minLength={2} maxLength={80} /></div>
      <div><label htmlFor={`${idPrefix}-site`}>Site (https)</label><input id={`${idPrefix}-site`} type="url" value={form.site_url} onChange={(event) => update("site_url", event.target.value)} required placeholder="https://…" /></div>
    </div>
    <div className="form-two">
      <div><label htmlFor={`${idPrefix}-kind`}>Como coletar</label><select id={`${idPrefix}-kind`} value={form.kind} onChange={(event) => update("kind", event.target.value as SourceForm["kind"])}>
        <option value="rss">Feed RSS/Atom</option><option value="sitemap">Sitemap público + metadados</option><option value="manual">Sem coleta automática (cadastro manual)</option>
      </select></div>
      {form.kind !== "manual" ? <div><label htmlFor={`${idPrefix}-feed`}>{form.kind === "sitemap" ? "URL do sitemap" : "URL do feed"}</label><input id={`${idPrefix}-feed`} type="url" value={form.feed_url} onChange={(event) => update("feed_url", event.target.value)} required placeholder="https://…" /></div> : <div />}
    </div>
    {form.kind === "sitemap" && <><label htmlFor={`${idPrefix}-prefix`}>Prefixo das URLs de notícia</label><input id={`${idPrefix}-prefix`} type="url" value={form.path_prefix} onChange={(event) => update("path_prefix", event.target.value)} required placeholder="https://site.com/news/" /></>}
    <div className="form-two">
      <div><label htmlFor={`${idPrefix}-type`}>Tipo de conteúdo</label><select id={`${idPrefix}-type`} value={form.source_type} onChange={(event) => update("source_type", event.target.value as SourceForm["source_type"])}><option value="editorial">Reportagem independente</option><option value="official">Anúncio oficial da empresa</option></select></div>
      <div><label htmlFor={`${idPrefix}-lang`}>Idioma</label><select id={`${idPrefix}-lang`} value={form.language} onChange={(event) => update("language", event.target.value as SourceForm["language"])}><option value="pt-BR">Português (Brasil)</option><option value="en">Inglês</option></select></div>
    </div>
    <div className="form-two">
      <div><label htmlFor={`${idPrefix}-category`}>Categoria padrão</label><select id={`${idPrefix}-category`} value={form.default_category} onChange={(event) => update("default_category", event.target.value)}>{categories.map((item) => <option key={item.slug} value={item.name}>{item.name}</option>)}</select></div>
      <div><label htmlFor={`${idPrefix}-max`}>Máximo de itens por coleta</label><input id={`${idPrefix}-max`} type="number" min={1} max={60} value={form.max_items} onChange={(event) => update("max_items", Number(event.target.value))} /></div>
    </div>
    <label htmlFor={`${idPrefix}-notes`}>Observações (ex.: por que não há coleta automática, alternativa sugerida)</label>
    <textarea id={`${idPrefix}-notes`} rows={2} maxLength={600} value={form.notes} onChange={(event) => update("notes", event.target.value)} />
    <div className="col-checks">
      <label><input type="checkbox" checked={form.enabled} onChange={(event) => update("enabled", event.target.checked)} /> Coleta ativa</label>
      <label><input type="checkbox" checked={form.use_images} onChange={(event) => update("use_images", event.target.checked)} /> Usar a imagem divulgada no feed (com crédito)</label>
    </div>
  </>;
}

export function CollectorAdmin({ email }: { email: string }) {
  const [sources, setSources] = useState<AdminSource[]>([]);
  const [runs, setRuns] = useState<AdminRun[]>([]);
  const [settings, setSettings] = useState<Settings>({ enabled: true, frequency_minutes: 60, max_age_hours: 72 });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [running, setRunning] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<SourceForm>(emptyForm);
  const [busy, setBusy] = useState<string | null>(null);
  const [tests, setTests] = useState<Record<string, SourceTest | { error: string }>>({});
  const [manual, setManual] = useState({ sourceId: "", title: "", summary: "", sourceUrl: "", publishedAt: "", category: "Tecnologia", imageUrl: "" });
  const [manualMessage, setManualMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const reload = useCallback(async () => {
    setLoadError("");
    try {
      const data = await requestJson("/api/admin/sources");
      setSources(data.sources); setRuns(data.runs); setSettings(data.settings);
    } catch (reason) { setLoadError(reason instanceof Error ? reason.message : "Não foi possível carregar as fontes."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void reload(); }, [reload]);

  async function runNow() {
    setRunning(true); setMessage(null);
    try {
      const data = await requestJson("/api/admin/import", { method: "POST" });
      setMessage({ tone: data.status === "failed" ? "error" : "ok", text: data.message ?? `${data.articlesAdded} notícia(s) nova(s).` });
      await reload();
    } catch (reason) { setMessage({ tone: "error", text: reason instanceof Error ? reason.message : "A coleta falhou." }); }
    finally { setRunning(false); }
  }

  async function saveSettings(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingSettings(true); setMessage(null);
    try {
      await requestJson("/api/admin/collector", { method: "PATCH", body: JSON.stringify(settings) });
      setMessage({ tone: "ok", text: "Configuração da coleta salva." });
    } catch (reason) { setMessage({ tone: "error", text: reason instanceof Error ? reason.message : "Não foi possível salvar." }); }
    finally { setSavingSettings(false); }
  }

  async function toggleSource(source: AdminSource) {
    setBusy(source.id); setMessage(null);
    try {
      await requestJson(`/api/admin/sources/${source.id}`, { method: "PATCH", body: JSON.stringify({ enabled: !source.enabled }) });
      setMessage({ tone: "ok", text: `${source.name}: coleta ${source.enabled ? "desativada" : "ativada"}.` });
      await reload();
    } catch (reason) { setMessage({ tone: "error", text: reason instanceof Error ? reason.message : "Não foi possível alterar a fonte." }); }
    finally { setBusy(null); }
  }

  async function testOne(source: AdminSource) {
    setBusy(source.id);
    setTests((current) => { const next = { ...current }; delete next[source.id]; return next; });
    try { const data = await requestJson(`/api/admin/sources/${source.id}/test`, { method: "POST" }); setTests((current) => ({ ...current, [source.id]: data })); }
    catch (reason) { setTests((current) => ({ ...current, [source.id]: { error: reason instanceof Error ? reason.message : "Falha ao testar." } })); }
    finally { setBusy(null); }
  }

  function beginEdit(source: AdminSource | null) {
    setEditing(source ? source.id : "new"); setForm(source ? formFromSource(source) : emptyForm); setMessage(null);
  }

  async function saveSource(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    setBusy(editing); setMessage(null);
    try {
      await requestJson(editing === "new" ? "/api/admin/sources" : `/api/admin/sources/${editing}`, { method: editing === "new" ? "POST" : "PATCH", body: JSON.stringify(form) });
      setMessage({ tone: "ok", text: editing === "new" ? "Fonte cadastrada." : "Fonte atualizada." });
      setEditing(null); await reload();
    } catch (reason) { setMessage({ tone: "error", text: reason instanceof Error ? reason.message : "Não foi possível salvar a fonte." }); }
    finally { setBusy(null); }
  }

  async function saveManual(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setManualMessage(null); setBusy("manual");
    try {
      await requestJson("/api/admin/news", { method: "POST", body: JSON.stringify({ ...manual, publishedAt: manual.publishedAt ? new Date(manual.publishedAt).toISOString() : "" }) });
      setManualMessage({ tone: "ok", text: "Notícia cadastrada e publicada." });
      setManual({ ...manual, title: "", summary: "", sourceUrl: "", publishedAt: "", imageUrl: "" });
      await reload();
    } catch (reason) { setManualMessage({ tone: "error", text: reason instanceof Error ? reason.message : "Não foi possível cadastrar." }); }
    finally { setBusy(null); }
  }

  const lastRun = runs[0];
  const failing = sources.filter((source) => source.enabled && (source.last_status === "error" || source.last_status === "blocked"));

  return <main className="admin-page">
    <header className="admin-top"><Link href="/" className="brand"><span className="brand-mark">AT</span><span className="brand-name">anselmo<span> tech notícias</span></span></Link><div className="admin-user"><span>{email}</span><form action={signOutAdmin}><button className="back-link" type="submit">Sair</button></form></div></header>
    <div className="admin-wrap">
      <Link className="back-link col-back" href="/admin">← Painel editorial</Link>
      <div className="admin-title-row"><div><div className="section-overline">ÁREA DE GESTÃO</div><h1>Fontes e coleta<span className="heading-dot">.</span></h1><p>Fontes consultadas automaticamente, frequência da pesquisa e histórico de execuções.</p></div></div>

      {loadError && <div className="col-alert col-alert-error" role="alert"><b>Não foi possível carregar a área de coleta.</b> {loadError} <button className="text-button" type="button" onClick={() => void reload()}>Tentar novamente</button></div>}
      {message && <p className={`col-alert ${message.tone === "error" ? "col-alert-error" : "col-alert-ok"}`} role="status">{message.text}</p>}
      {!loading && failing.length > 0 && <div className="col-alert col-alert-warn" role="status"><b>{failing.length} fonte(s) com falha na última consulta:</b> {failing.map((source) => source.name).join(", ")}. As demais continuam sendo coletadas normalmente.</div>}

      <section className="admin-card col-schedule" aria-labelledby="col-schedule-title">
        <div className="admin-card-heading"><div><div className="section-overline">AGENDAMENTO</div><h2 id="col-schedule-title">Pesquisa recorrente</h2></div>
          <button className="dark-button" type="button" onClick={() => void runNow()} disabled={running}>{running ? "Pesquisando nas fontes…" : "Pesquisar agora"}<span aria-hidden="true">↻</span></button></div>
        <form className="editor-form" onSubmit={saveSettings}>
          <div className="form-two">
            <div><label htmlFor="col-frequency">Frequência</label><select id="col-frequency" value={settings.frequency_minutes} onChange={(event) => setSettings({ ...settings, frequency_minutes: Number(event.target.value) })}>{Object.entries(frequencyLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
            <div><label htmlFor="col-age">Considerar notícias publicadas nas últimas</label><select id="col-age" value={settings.max_age_hours} onChange={(event) => setSettings({ ...settings, max_age_hours: Number(event.target.value) })}>{ageOptions.map((hours) => <option key={hours} value={hours}>{hours < 48 ? `${hours} horas` : `${hours / 24} dias`}</option>)}</select></div>
          </div>
          <div className="col-checks"><label><input type="checkbox" checked={settings.enabled} onChange={(event) => setSettings({ ...settings, enabled: event.target.checked })} /> Coleta automática ligada</label></div>
          <div className="admin-form-actions"><button className="dark-button" type="submit" disabled={savingSettings}>{savingSettings ? "Salvando…" : "Salvar agendamento"}</button></div>
        </form>
        <p className="col-hint">O agendador do GitHub Actions verifica a cada hora e só pesquisa quando a frequência escolhida já passou. “Pesquisar agora” ignora a frequência.</p>
        {lastRun && <p className="col-hint"><b>Última execução:</b> {formatDate(lastRun.started_at)} · {runStatusLabels[lastRun.status]} · {lastRun.message ?? `${lastRun.articles_added} notícia(s) nova(s)`}</p>}
      </section>

      <section className="admin-card col-sources" aria-labelledby="col-sources-title">
        <div className="admin-card-heading"><div><div className="section-overline">ORIGEM DAS NOTÍCIAS</div><h2 id="col-sources-title">Fontes <span className="list-count">{sources.length}</span></h2></div>
          <button className="text-button col-add" type="button" onClick={() => beginEdit(null)}>+ Adicionar fonte</button></div>
        {editing === "new" && <form className="editor-form col-edit" onSubmit={saveSource}><SourceFields form={form} setForm={setForm} idPrefix="new" /><div className="admin-form-actions"><button className="dark-button" type="submit" disabled={busy === "new"}>Cadastrar fonte</button><button className="text-button" type="button" onClick={() => setEditing(null)}>Cancelar</button></div></form>}
        {loading ? <p className="col-empty">Carregando fontes…</p> : !sources.length ? <p className="col-empty">Nenhuma fonte cadastrada. Rode <code>npm run db:migrate</code> para criar as fontes iniciais.</p> : <ul className="col-source-list">{sources.map((source) => {
          const test = tests[source.id];
          const state = !source.enabled ? "off" : source.kind === "manual" ? "manual" : source.last_status ?? "new";
          return <li key={source.id} className="col-source">
            <div className="col-source-main">
              <span className={`col-dot col-dot-${state}`} aria-hidden="true" />
              <div className="col-source-text">
                <b>{source.name}</b>
                <span className="col-tags">
                  <span className={source.source_type === "official" ? "col-tag col-tag-official" : "col-tag"}>{source.source_type === "official" ? "Anúncio oficial" : "Reportagem"}</span>
                  <span className="col-tag">{source.language === "en" ? "Inglês" : "Português"}</span>
                  <span className="col-tag">{source.kind === "rss" ? "RSS" : source.kind === "sitemap" ? "Sitemap" : "Manual"}</span>
                  {!source.enabled && <span className="col-tag col-tag-off">Desativada</span>}
                </span>
                <small>{source.kind === "manual" ? "Sem coleta automática: cadastre as notícias manualmente abaixo." : <>Última consulta: {formatDate(source.last_run_at)}{source.last_status ? ` · ${statusLabels[source.last_status]}` : ""} · {source.articles} notícia(s) no acervo</>}</small>
                {source.last_message && source.kind !== "manual" && <small className={source.last_status === "error" || source.last_status === "blocked" ? "col-msg col-msg-error" : "col-msg"}>{source.last_message}{source.consecutive_failures > 1 ? ` (${source.consecutive_failures} falhas seguidas)` : ""}</small>}
                {source.notes && <small className="col-msg">{source.notes}</small>}
              </div>
            </div>
            <div className="row-actions col-actions">
              <button type="button" disabled={busy === source.id} onClick={() => void toggleSource(source)}>{source.enabled ? "Desativar" : "Ativar"}</button>
              {source.kind !== "manual" && <button type="button" disabled={busy === source.id} onClick={() => void testOne(source)}>{busy === source.id && !test ? "Testando…" : "Testar"}</button>}
              <button type="button" onClick={() => beginEdit(source)}>Editar</button>
              <a href={source.site_url} target="_blank" rel="noopener noreferrer">Abrir site</a>
            </div>
            {test && <div className={`col-test ${"error" in test || !test.ok ? "col-test-bad" : ""}`} role="status">
              {"error" in test ? test.error : <>{test.message}{test.newest && <> Mais recente: {formatDate(test.newest)}.</>}
                {test.samples.length > 0 && <ul>{test.samples.map((sample) => <li key={sample.url}><a href={sample.url} target="_blank" rel="noopener noreferrer">{sample.title}</a> <small>{formatDate(sample.publishedAt)}</small></li>)}</ul>}</>}
            </div>}
            {editing === source.id && <form className="editor-form col-edit" onSubmit={saveSource}><SourceFields form={form} setForm={setForm} idPrefix={`edit-${source.id}`} /><div className="admin-form-actions"><button className="dark-button" type="submit" disabled={busy === source.id}>Salvar fonte</button><button className="text-button" type="button" onClick={() => setEditing(null)}>Cancelar</button></div></form>}
          </li>;
        })}</ul>}
      </section>

      <section className="admin-card col-manual" aria-labelledby="col-manual-title">
        <div className="admin-card-heading"><div><div className="section-overline">ALTERNATIVA PERMITIDA</div><h2 id="col-manual-title">Cadastrar notícia manualmente</h2></div></div>
        <p className="col-hint">Use para fontes sem feed ou que não permitem coleta automática. Escreva um resumo curto com suas palavras; o leitor é levado à matéria original.</p>
        <form className="editor-form" onSubmit={saveManual}>
          <div className="form-two">
            <div><label htmlFor="manual-source">Fonte</label><select id="manual-source" value={manual.sourceId} onChange={(event) => setManual({ ...manual, sourceId: event.target.value })} required><option value="">Escolha…</option>{sources.map((source) => <option key={source.id} value={source.id}>{source.name}</option>)}</select></div>
            <div><label htmlFor="manual-url">Link da matéria original</label><input id="manual-url" type="url" value={manual.sourceUrl} onChange={(event) => setManual({ ...manual, sourceUrl: event.target.value })} required placeholder="https://…" /></div>
          </div>
          <label htmlFor="manual-title">Título</label><input id="manual-title" value={manual.title} onChange={(event) => setManual({ ...manual, title: event.target.value })} required minLength={5} maxLength={240} />
          <label htmlFor="manual-summary">Resumo próprio e breve</label><textarea id="manual-summary" rows={3} maxLength={320} value={manual.summary} onChange={(event) => setManual({ ...manual, summary: event.target.value })} required />
          <div className="form-two">
            <div><label htmlFor="manual-date">Data e hora da publicação original</label><input id="manual-date" type="datetime-local" value={manual.publishedAt} onChange={(event) => setManual({ ...manual, publishedAt: event.target.value })} required /></div>
            <div><label htmlFor="manual-category">Categoria</label><select id="manual-category" value={manual.category} onChange={(event) => setManual({ ...manual, category: event.target.value })}>{categories.map((item) => <option key={item.slug} value={item.name}>{item.name}</option>)}</select></div>
          </div>
          <label htmlFor="manual-image">Imagem (opcional, só com autorização da fonte)</label><input id="manual-image" type="url" value={manual.imageUrl} onChange={(event) => setManual({ ...manual, imageUrl: event.target.value })} placeholder="https://…" />
          <div className="admin-form-actions"><button className="dark-button" type="submit" disabled={busy === "manual"}>Cadastrar notícia</button></div>
          {manualMessage && <p className={`col-alert ${manualMessage.tone === "error" ? "col-alert-error" : "col-alert-ok"}`} role="status">{manualMessage.text}</p>}
        </form>
      </section>

      <section className="admin-card col-history" aria-labelledby="col-history-title">
        <div className="admin-card-heading"><div><div className="section-overline">ÚLTIMAS 30 EXECUÇÕES</div><h2 id="col-history-title">Histórico da coleta</h2></div></div>
        {loading ? <p className="col-empty">Carregando histórico…</p> : !runs.length ? <p className="col-empty">Nenhuma coleta registrada ainda.</p> : <ul className="col-run-list">{runs.map((run) => <li key={run.id} className="col-run">
          <details>
            <summary>
              <span className={`col-run-status col-run-${run.status}`}>{runStatusLabels[run.status]}</span>
              <span className="col-run-date">{formatDate(run.started_at)}</span>
              <span className="col-run-trigger">{triggerLabels[run.trigger] ?? run.trigger}</span>
              <span className="col-run-counts">{run.articles_added} nova(s) · {run.duplicates} repetida(s) · {run.skipped_old} antiga(s) · {run.feeds_checked} fonte(s)</span>
            </summary>
            <p className="col-run-message">{run.message ?? (run.articles_added ? `${run.articles_added} notícia(s) nova(s).` : "Sem notícias novas nesta execução.")}</p>
            {run.source_results?.length > 0 && <ul className="col-run-sources">{run.source_results.map((result) => <li key={result.name}><b>{result.name}</b> <span className={`col-pill col-pill-${result.status}`}>{statusLabels[result.status] ?? result.status}</span> <small>{result.found} lida(s), {result.added} nova(s). {result.message}</small></li>)}</ul>}
          </details>
        </li>)}</ul>}
      </section>
      <p className="admin-footnote">A coleta usa apenas RSS, sitemaps públicos e metadados permitidos pelo robots.txt de cada site. Não contorna bloqueios, logins ou paywalls e não copia o texto das matérias.</p>
    </div>
  </main>;
}
