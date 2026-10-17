// Acesso educado às fontes: identifica o robô, respeita o robots.txt, usa cache HTTP (ETag/Last-Modified),
// limita tempo e tamanho e tenta de novo uma única vez só em falhas temporárias. Nunca envia cookies ou login.

export const USER_AGENT = "AnselmoTechNoticias/1.1 (+https://noticias.anselmotech.com.br; leitor de RSS)";
const ROBOT_TOKEN = "anselmotechnoticias";
const TIMEOUT_MS = 10_000;
const MAX_BYTES = 3 * 1024 * 1024;

export type FetchFailureKind = "timeout" | "network" | "http" | "robots" | "too-large";

export class SourceFetchError extends Error {
  constructor(public kind: FetchFailureKind, public status: number | null, message: string) {
    super(message);
    this.name = "SourceFetchError";
  }
  /** Erros que podem sumir sozinhos: vale tentar de novo na próxima coleta (e uma vez agora). */
  get temporary() { return this.kind === "timeout" || this.kind === "network" || (this.kind === "http" && (this.status ?? 0) >= 500) || this.status === 429; }
}

export type FetchResult = { status: 200; body: string; etag: string | null; lastModified: string | null } | { status: 304 };

type RobotsRules = Array<{ allow: boolean; pattern: string }>;

/** Lê o robots.txt e devolve as regras do grupo deste robô ou, na falta dele, do grupo "*". */
export function parseRobots(text: string, token = ROBOT_TOKEN): RobotsRules {
  const groups: Array<{ agents: string[]; rules: RobotsRules }> = [];
  let current: { agents: string[]; rules: RobotsRules } | null = null;
  let lastWasAgent = false;
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, "").trim();
    const match = /^([a-z-]+)\s*:\s*(.*)$/i.exec(line);
    if (!match) continue;
    const field = match[1].toLowerCase();
    const value = match[2].trim();
    if (field === "user-agent") {
      if (!current || !lastWasAgent) { current = { agents: [], rules: [] }; groups.push(current); }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
    } else if ((field === "allow" || field === "disallow") && current) {
      if (value) current.rules.push({ allow: field === "allow", pattern: value });
      lastWasAgent = false;
    } else lastWasAgent = false;
  }
  const own = groups.filter((group) => group.agents.some((agent) => agent !== "*" && token.includes(agent)));
  const chosen = own.length ? own : groups.filter((group) => group.agents.includes("*"));
  return chosen.flatMap((group) => group.rules);
}

function patternToRegex(pattern: string) {
  const anchored = pattern.endsWith("$");
  const body = (anchored ? pattern.slice(0, -1) : pattern).split("*").map((part) => part.replace(/[.+?^${}()|[\]\\]/g, "\\$&")).join(".*");
  return new RegExp(`^${body}${anchored ? "$" : ""}`);
}

/** A regra mais longa que casa decide; empate favorece Allow (como o Google). Sem regra, está liberado. */
export function robotsAllows(rules: RobotsRules, pathAndQuery: string): boolean {
  let best: { allow: boolean; length: number } | null = null;
  for (const rule of rules) {
    if (!patternToRegex(rule.pattern).test(pathAndQuery)) continue;
    const length = rule.pattern.length;
    if (!best || length > best.length || (length === best.length && rule.allow)) best = { allow: rule.allow, length };
  }
  return best ? best.allow : true;
}

async function readLimited(response: Response): Promise<string> {
  const declared = Number(response.headers.get("content-length") ?? 0);
  if (declared > MAX_BYTES) throw new SourceFetchError("too-large", response.status, "O conteúdo da fonte é grande demais para um feed.");
  const buffer = await response.arrayBuffer();
  if (buffer.byteLength > MAX_BYTES) throw new SourceFetchError("too-large", response.status, "O conteúdo da fonte é grande demais para um feed.");
  return new TextDecoder("utf-8").decode(buffer);
}

async function rawFetch(url: string, headers: Record<string, string>): Promise<Response> {
  try {
    return await fetch(url, { headers: { "User-Agent": USER_AGENT, ...headers }, redirect: "follow", signal: AbortSignal.timeout(TIMEOUT_MS), credentials: "omit" });
  } catch (error) {
    if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
      throw new SourceFetchError("timeout", null, `A fonte não respondeu em ${TIMEOUT_MS / 1000} segundos.`);
    }
    throw new SourceFetchError("network", null, "Não foi possível conectar à fonte.");
  }
}

export class PoliteFetcher {
  private robots = new Map<string, Promise<RobotsRules | { unavailable: string }>>();

  private loadRobots(origin: string) {
    let cached = this.robots.get(origin);
    if (!cached) {
      cached = (async () => {
        // Sem robots.txt (4xx) está liberado; erro de servidor ou de rede fica para a próxima coleta, após uma nova tentativa.
        let reason = "";
        for (let attempt = 0; attempt < 2; attempt += 1) {
          try {
            const response = await rawFetch(`${origin}/robots.txt`, {});
            if (response.status >= 500) { reason = `HTTP ${response.status}`; await response.body?.cancel(); }
            else if (!response.ok) { await response.body?.cancel(); return []; }
            else return parseRobots(await readLimited(response));
          } catch (error) { reason = error instanceof SourceFetchError ? error.kind : "erro de rede"; }
          if (attempt === 0) await new Promise((resolve) => setTimeout(resolve, 1_000));
        }
        return { unavailable: reason };
      })();
      this.robots.set(origin, cached);
    }
    return cached;
  }

  async assertAllowed(url: string) {
    const target = new URL(url);
    const rules = await this.loadRobots(target.origin);
    if (!Array.isArray(rules)) throw new SourceFetchError("network", null, `O robots.txt da fonte está indisponível (${rules.unavailable}); a consulta fica para a próxima coleta.`);
    if (!robotsAllows(rules, `${target.pathname}${target.search}`)) {
      throw new SourceFetchError("robots", null, "O robots.txt do site não permite a leitura automática deste endereço.");
    }
  }

  async get(url: string, options: { etag?: string | null; lastModified?: string | null; accept?: string } = {}): Promise<FetchResult> {
    if (new URL(url).protocol !== "https:") throw new SourceFetchError("http", null, "A fonte precisa usar HTTPS.");
    await this.assertAllowed(url);
    const headers: Record<string, string> = { Accept: options.accept ?? "application/rss+xml, application/atom+xml, application/xml;q=0.9, text/xml;q=0.9, */*;q=0.5" };
    if (options.etag) headers["If-None-Match"] = options.etag;
    if (options.lastModified) headers["If-Modified-Since"] = options.lastModified;
    for (let attempt = 0; ; attempt += 1) {
      try {
        const response = await rawFetch(url, headers);
        if (response.status === 304) return { status: 304 };
        if (!response.ok) throw new SourceFetchError("http", response.status, httpMessage(response.status));
        // Redirecionamentos para outro site seguem, mas o robots.txt do destino também precisa permitir.
        if (response.url && new URL(response.url).origin !== new URL(url).origin) await this.assertAllowed(response.url);
        return { status: 200, body: await readLimited(response), etag: response.headers.get("etag"), lastModified: response.headers.get("last-modified") };
      } catch (error) {
        if (attempt === 0 && error instanceof SourceFetchError && error.temporary) {
          await new Promise((resolve) => setTimeout(resolve, 1_500));
          continue;
        }
        throw error;
      }
    }
  }
}

export function httpMessage(status: number) {
  if (status === 401 || status === 403) return `A fonte recusou o acesso automático (HTTP ${status}). Não tentamos contornar o bloqueio.`;
  if (status === 404 || status === 410) return `Endereço do feed não encontrado (HTTP ${status}). Confira a URL da fonte.`;
  if (status === 429) return "A fonte pediu para reduzir a frequência (HTTP 429). Tentaremos de novo na próxima coleta.";
  if (status >= 500) return `Erro temporário na fonte (HTTP ${status}). Tentaremos de novo na próxima coleta.`;
  return `Resposta inesperada da fonte (HTTP ${status}).`;
}
