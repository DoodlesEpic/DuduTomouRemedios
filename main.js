const MEDS_PADRAO = ["Mesacol MMX", "Duspatalin", "Revoc", "Doss"];

let meds = [...MEDS_PADRAO]; // lista que vale no dia visualizado
let medsPerm = [...MEDS_PADRAO]; // lista permanente (meds-lista)
let arquivados = []; // remédios que saíram da lista, mas cujo histórico continua salvo
let marcados = {}; // remédio -> horário em que foi marcado (ISO) ou true (registros antigos)
let editando = false;

const img = (nome) => `img/${nome}.png`;
const $ = (id) => document.getElementById(id);

function dataDe(d) {
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

const chaveDe = (d) => `dia:${dataDe(d)}`;
const chaveLista = (d) => `lista:${dataDe(d)}`;
const hojeChave = () => chaveDe(new Date());

let diaAtual = hojeChave();
let diaSelecionado = diaAtual;
const vendoPassado = () => diaSelecionado !== diaAtual;

function dataDeChave(chave) {
  const [a, m, d] = chave.slice(4).split("-").map(Number);
  return new Date(a, m - 1, d, 12, 0, 0);
}

const store = {
  async get(k) {
    if (typeof window.storage !== "undefined") {
      try {
        const r = await window.storage.get(k);
        return r ? r.value : null;
      } catch {
        return null;
      }
    }
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  async set(k, v) {
    if (typeof window.storage !== "undefined") {
      try {
        await window.storage.set(k, v);
      } catch {}
      return;
    }
    try {
      localStorage.setItem(k, v);
    } catch {}
  },
};

function lerJSON(raw, padrao) {
  if (!raw) return padrao;
  try {
    return JSON.parse(raw);
  } catch {
    return padrao;
  }
}

// ---------- tema (claro / escuro / sistema) ----------
const MODOS_TEMA = ["sistema", "claro", "escuro"];
const ICONES_TEMA = { sistema: "🖥️", claro: "☀️", escuro: "🌙" };
const ROTULOS_TEMA = {
  sistema: "Tema do sistema",
  claro: "Tema claro",
  escuro: "Tema escuro",
};
let modoTema = "sistema";
const midiaEscuro = window.matchMedia?.("(prefers-color-scheme: dark)");

function aplicarTema() {
  const escuro =
    modoTema === "escuro" || (modoTema === "sistema" && midiaEscuro?.matches);
  document.documentElement.dataset.tema = escuro ? "escuro" : "claro";
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", escuro ? "#1E1612" : "#F2A25C");
  const btn = $("btnTema");
  if (btn) {
    btn.textContent = ICONES_TEMA[modoTema];
    btn.title = ROTULOS_TEMA[modoTema];
    btn.setAttribute(
      "aria-label",
      `${ROTULOS_TEMA[modoTema]} (toque para trocar)`,
    );
  }
}

midiaEscuro?.addEventListener?.("change", () => {
  if (modoTema === "sistema") aplicarTema();
});

$("btnTema").addEventListener("click", async () => {
  modoTema = MODOS_TEMA[(MODOS_TEMA.indexOf(modoTema) + 1) % MODOS_TEMA.length];
  aplicarTema();
  await store.set("tema", modoTema);
  mostrarToast(`${ICONES_TEMA[modoTema]} ${ROTULOS_TEMA[modoTema]} ativado`);
});
aplicarTema();

async function carregar(chaveDia) {
  esconderToast();
  const t = await store.get("tema");
  if (MODOS_TEMA.includes(t)) {
    modoTema = t;
    aplicarTema();
  }
  diaAtual = hojeChave();
  diaSelecionado = chaveDia || diaAtual;
  medsPerm = lerJSON(await store.get("meds-lista"), [...MEDS_PADRAO]);
  arquivados = lerJSON(await store.get("meds-arquivados"), []);
  if (vendoPassado()) {
    const listaSalva = lerJSON(
      await store.get(`lista:${diaSelecionado.slice(4)}`),
      null,
    );
    meds = Array.isArray(listaSalva) ? [...listaSalva] : [...medsPerm];
  } else {
    meds = [...medsPerm];
    // guarda a lista do dia, para o histórico saber quantos remédios havia em cada dia
    await store.set(`lista:${diaAtual.slice(4)}`, JSON.stringify(meds));
  }
  marcados = lerJSON(await store.get(diaSelecionado), {});
  atualizarData();
  render();
  renderArquivados();
  renderHistorico();
  renderInfoBackup();
}

async function salvar() {
  await store.set("meds-lista", JSON.stringify(medsPerm));
  await store.set("meds-arquivados", JSON.stringify(arquivados));
  await store.set(diaSelecionado, JSON.stringify(marcados));
  await store.set(`lista:${diaSelecionado.slice(4)}`, JSON.stringify(meds));
}

function atualizarData() {
  const d = dataDeChave(diaSelecionado);
  $("dataHoje").textContent = d.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const passado = vendoPassado();
  $("avisoPassado").hidden = !passado;
  if (passado) {
    $("textoPassado").textContent = `📅 Vendo ${d.toLocaleDateString("pt-BR")}`;
  }
}

$("btnVoltarHoje").addEventListener("click", () => carregar());

// se o app ficar aberto e virar o dia, começa a checklist do novo dia
function conferirVirada() {
  if (hojeChave() !== diaAtual) carregar();
}
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) conferirVirada();
});
setInterval(conferirVirada, 60000);

function cena(bubu, shiba, clsShiba = "", clsBubu = "") {
  return (
    `<img class="bubu ${clsBubu}" src="${img(bubu)}" alt="Bubu">` +
    `<img class="shiba ${clsShiba}" src="${img(shiba)}" alt="Shiba">`
  );
}

function el(tag, cls, texto) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (texto !== undefined) e.textContent = texto;
  return e;
}

const fmtHora = (d) =>
  d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

// ---------- diálogo de confirmação ----------
function confirmar(titulo, texto, sim = "Sim", nao = "Cancelar") {
  const dlg = $("dialogo");
  if (typeof dlg.showModal !== "function") {
    if (!nao) {
      alert(`${titulo}\n\n${texto}`);
      return Promise.resolve(true);
    }
    return Promise.resolve(confirm(`${titulo}\n\n${texto}`));
  }
  $("dialogoTitulo").textContent = titulo;
  $("dialogoTexto").textContent = texto;
  $("dialogoSim").textContent = sim;
  const btnNao = $("dialogoNao");
  btnNao.textContent = nao || "";
  btnNao.hidden = !nao;
  dlg.returnValue = "";
  dlg.showModal();
  return new Promise((res) =>
    dlg.addEventListener("close", () => res(dlg.returnValue === "sim"), {
      once: true,
    }),
  );
}

const avisar = (titulo, texto) => confirmar(titulo, texto, "Ok", null);

function confirmarDiaPassado(acao) {
  const dataFmt = dataDeChave(diaSelecionado).toLocaleDateString("pt-BR");
  return confirmar(
    "Alterar dia anterior?",
    `Você está vendo o dia ${dataFmt}. Tem certeza que quer ${acao} neste dia?`,
    "Sim, alterar",
  );
}

// ---------- toast de aviso / desfazer ----------
let timerToast = null;
let timerSairToast = null;
let acaoDesfazer = null;

function esconderToast(imediato = false) {
  clearTimeout(timerToast);
  clearTimeout(timerSairToast);
  timerToast = null;
  timerSairToast = null;
  acaoDesfazer = null;
  const toast = $("toast");
  if (imediato || toast.hidden) {
    toast.classList.remove("saindo");
    toast.hidden = true;
    return;
  }
  toast.classList.add("saindo");
  timerSairToast = setTimeout(() => {
    toast.classList.remove("saindo");
    toast.hidden = true;
  }, 220);
}

function mostrarToast(texto, desfazer = null) {
  clearTimeout(timerToast);
  clearTimeout(timerSairToast);
  acaoDesfazer = desfazer;
  const toast = $("toast");
  $("toastTexto").textContent = texto;
  $("btnDesfazer").hidden = !desfazer;
  toast.classList.remove("saindo");
  toast.hidden = false;
  toast.style.animation = "none";
  void toast.offsetWidth;
  toast.style.animation = "";
  timerToast = setTimeout(() => esconderToast(), 4500);
}

$("btnDesfazer").addEventListener("click", () => {
  const fn = acaoDesfazer;
  esconderToast(true);
  if (fn) fn();
});

// ---------- lista do dia ----------
let medAnimando = null;

function render() {
  const lista = $("lista");
  lista.innerHTML = "";
  lista.classList.toggle("editando", editando);
  $("dica").hidden = !editando;
  $("acoesEdicao").hidden = !editando;

  meds.forEach((m, i) => {
    const v = marcados[m];
    const ok = Boolean(v);
    const animando = medAnimando === m;
    const div = el(
      "div",
      `med${ok ? " ok" : ""}${animando ? " animando-ok" : ""}`,
    );
    div.dataset.med = m;
    div.tabIndex = 0;
    if (editando) {
      div.setAttribute("role", "listitem");
    } else {
      div.setAttribute("role", "checkbox");
      div.setAttribute("aria-checked", ok);
    }

    div.appendChild(el("div", "check", "✓"));
    const info = el("div", "info");
    info.appendChild(el("div", "nome", m));
    if (typeof v === "string") {
      const h = new Date(v);
      if (!isNaN(h)) {
        const madrugada = h.getHours() < 4;
        const hora = el(
          "div",
          `hora${madrugada ? " madrugada" : ""}`,
          `tomado às ${fmtHora(h)}${madrugada ? " 🌙" : ""}`,
        );
        if (madrugada)
          hora.title =
            "Marcado de madrugada. Era pra ter sido no dia anterior?";
        info.appendChild(hora);
      }
    }
    div.appendChild(info);

    if (editando) {
      const tirar = el("button", "tirar", "✕");
      tirar.setAttribute("aria-label", `Tirar ${m} da lista`);
      div.appendChild(tirar);
      const alca = el("div", "alca", "⠿");
      alca.setAttribute("aria-hidden", "true");
      div.appendChild(alca);
    } else {
      const mini = el("img", "mini");
      mini.src = img("shiba_sentado");
      mini.alt = "";
      div.appendChild(mini);
    }

    div.addEventListener("click", async (e) => {
      if (ignorarClique) {
        ignorarClique = false;
        return;
      }
      if (e.target.closest(".tirar")) {
        removerMed(m);
        return;
      }
      if (editando) return;
      const anterior = marcados[m];
      if (vendoPassado()) {
        const confirma = await confirmarDiaPassado(
          `${anterior ? "desmarcar" : "marcar"} "${m}"`,
        );
        if (!confirma) return;
      }
      if (anterior) {
        delete marcados[m];
        medAnimando = null;
      } else {
        marcados[m] = vendoPassado() ? true : new Date().toISOString();
        medAnimando = m;
      }
      salvar().then(renderHistorico);
      render();
      medAnimando = null;
      mostrarToast(anterior ? `${m} desmarcado` : `${m} marcado`, () => {
        if (anterior) {
          marcados[m] = anterior;
          medAnimando = m;
        } else {
          delete marcados[m];
          medAnimando = null;
        }
        salvar().then(renderHistorico);
        render();
        medAnimando = null;
      });
      const novo = document.querySelectorAll("#lista .med")[i];
      if (novo && document.activeElement === document.body)
        novo.focus({ preventScroll: true });
    });

    div.addEventListener("keydown", (e) => {
      if (e.target !== div) return;
      if (e.key === "Escape" && editando) {
        editando = false;
        render();
        return;
      }
      if (e.altKey && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
        e.preventDefault();
        moverMed(i, e.key === "ArrowUp" ? -1 : 1);
        return;
      }
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        div.click();
      }
    });

    div.addEventListener("pointerdown", (e) => {
      if (e.button !== 0 || e.target.closest("button")) return;
      prepararArrasto(div, e, Boolean(e.target.closest(".alca")));
    });

    div.addEventListener("contextmenu", (e) => e.preventDefault());
    lista.appendChild(div);
  });

  const total = meds.length;
  const feitos = meds.filter((m) => marcados[m]).length;
  $("barra").style.width = total ? `${(feitos / total) * 100}%` : "0%";

  const palco = $("palco");
  const desenho = $("desenho");
  const humor = $("humor");
  palco.classList.remove("completo");

  if (total > 0 && feitos === total) {
    palco.classList.add("completo");
    desenho.innerHTML = cena(
      "bubu_comemorando",
      "shiba_lingua",
      "pulando",
      "pulando",
    );
    humor.textContent = "Todos os remédios tomados! 🎉";
  } else if (feitos === 0) {
    desenho.innerHTML = cena("bubu_triste", "shiba_sentado_triste");
    humor.textContent = "A Bubu e o shiba estão esperando os remédios... 🥺";
  } else if (feitos === 1) {
    desenho.innerHTML = cena("bubu_neutra", "shiba_deitado");
    humor.textContent = `Boa, Dudu! ${feitos} de ${total}. O shiba levantou a orelha! 🐾`;
  } else {
    desenho.innerHTML = cena("bubu_feliz", "shiba_rindo", "", "balancando");
    humor.textContent = `Quase lá! ${feitos} de ${total}. A Bubu já tá sorrindo! 💪`;
  }
}

// ---------- editar a lista permanente ----------
async function removerMed(m) {
  const textoAviso = vendoPassado()
    ? `Você está vendo o dia ${dataDeChave(diaSelecionado).toLocaleDateString("pt-BR")}. "${m}" vai sair deste dia e também da lista permanente para "Remédios guardados" (com histórico salvo).`
    : 'Ele vai para "Remédios guardados". O histórico continua salvo e dá pra trazer de volta quando quiser.';
  const ok = await confirmar(`Tirar "${m}" da lista?`, textoAviso, "Tirar");
  if (!ok) return;
  meds = meds.filter((x) => x !== m);
  medsPerm = medsPerm.filter((x) => x !== m);
  if (!arquivados.includes(m)) arquivados.push(m);
  await salvar();
  render();
  renderArquivados();
  renderHistorico();
}

async function restaurarMed(m) {
  if (vendoPassado()) {
    const ok = await confirmarDiaPassado(`voltar "${m}" para a lista`);
    if (!ok) return;
  }
  arquivados = arquivados.filter((x) => x !== m);
  if (!meds.includes(m)) meds.push(m);
  if (!medsPerm.includes(m)) medsPerm.push(m);
  await salvar();
  render();
  renderArquivados();
  renderHistorico();
}

function renderArquivados() {
  const cont = $("listaArquivados");
  cont.innerHTML = "";
  arquivados.forEach((m) => {
    const linha = el("div", "guardado");
    linha.appendChild(el("span", "", m));
    const b = el("button", "botao-sec", "↩ Voltar pra lista");
    b.setAttribute("aria-label", `Voltar ${m} pra lista`);
    b.addEventListener("click", () => restaurarMed(m));
    linha.appendChild(b);
    cont.appendChild(linha);
  });
  $("arquivados").hidden = arquivados.length === 0;
}

function sincronizarOrdemPerm() {
  if (!vendoPassado()) {
    medsPerm = [...meds];
    return;
  }
  const setDia = new Set(meds);
  const presentes = meds.filter((m) => medsPerm.includes(m));
  let idx = 0;
  medsPerm = medsPerm.map((m) => (setDia.has(m) ? presentes[idx++] : m));
}

async function moverMed(i, dir) {
  const j = i + dir;
  if (j < 0 || j >= meds.length) return;
  if (vendoPassado()) {
    const ok = await confirmarDiaPassado("reordenar a lista");
    if (!ok) return;
  }
  [meds[i], meds[j]] = [meds[j], meds[i]];
  sincronizarOrdemPerm();
  await salvar();
  render();
  document.querySelectorAll("#lista .med")[j]?.focus();
}

// ---------- segurar e arrastar para reordenar ----------
let pre = null;
let drag = null;
let ignorarClique = false;

function cancelarPre() {
  if (pre) {
    clearTimeout(pre.timer);
    pre = null;
  }
}

function prepararArrasto(div, e, imediato) {
  cancelarPre();
  if (drag) return;
  pre = { el: div, id: e.pointerId, x: e.clientX, y: e.clientY, timer: null };
  if (imediato) iniciarArrasto();
  else pre.timer = setTimeout(iniciarArrasto, 450);
}

function iniciarArrasto() {
  if (!pre) return;
  const { el: div, id, y } = pre;
  pre = null;
  if (!editando) {
    editando = true;
    $("lista").classList.add("editando");
    $("dica").hidden = false;
    $("acoesEdicao").hidden = false;
  }
  drag = { el: div, id, inicioY: y, mudou: false };
  div.classList.add("arrastando");
  document.body.classList.add("arrastando");
  try {
    div.setPointerCapture(id);
  } catch {}
  try {
    navigator.vibrate?.(25);
  } catch {}
  div.style.transform = "scale(1.03)";
}

function moverArrasto(y) {
  const div = drag.el;
  const lista = div.parentNode;
  for (let n = 0; n < meds.length; n++) {
    const prev = div.previousElementSibling;
    const next = div.nextElementSibling;
    let antes = null;
    if (prev) {
      const r = prev.getBoundingClientRect();
      if (y < r.top + r.height / 2) antes = prev;
    }
    if (!antes && next) {
      const r = next.getBoundingClientRect();
      if (y > r.top + r.height / 2) antes = next.nextElementSibling || "fim";
    }
    if (!antes) break;
    const topoAntes = div.offsetTop;
    lista.insertBefore(div, antes === "fim" ? null : antes);
    drag.inicioY += div.offsetTop - topoAntes;
    drag.mudou = true;
  }
  div.style.transform = `translateY(${y - drag.inicioY}px) scale(1.03)`;
}

async function terminarArrasto(e) {
  if (pre && e.pointerId === pre.id) cancelarPre();
  if (!drag || e.pointerId !== drag.id) return;
  const div = drag.el;
  drag = null;
  div.classList.remove("arrastando");
  document.body.classList.remove("arrastando");
  div.style.transform = "";
  // o "clique" que vem logo depois de soltar não deve marcar o remédio
  ignorarClique = true;
  setTimeout(() => {
    ignorarClique = false;
  }, 350);
  const nova = [...document.querySelectorAll("#lista .med")].map(
    (d) => d.dataset.med,
  );
  if (nova.join("\n") !== meds.join("\n")) {
    if (vendoPassado()) {
      const ok = await confirmarDiaPassado("reordenar a lista");
      if (!ok) {
        render();
        return;
      }
    }
    meds = nova;
    sincronizarOrdemPerm();
    await salvar();
  }
  render();
}

document.addEventListener("pointermove", (e) => {
  if (pre && e.pointerId === pre.id) {
    if (Math.hypot(e.clientX - pre.x, e.clientY - pre.y) > 8) cancelarPre(); // é rolagem, não arrasto
    return;
  }
  if (drag && e.pointerId === drag.id) {
    e.preventDefault();
    moverArrasto(e.clientY);
  }
});
document.addEventListener("pointerup", terminarArrasto);
document.addEventListener("pointercancel", terminarArrasto);
document.addEventListener(
  "touchmove",
  (e) => {
    if (drag) e.preventDefault();
  },
  { passive: false },
);

// ---------- histórico ----------
async function renderHistorico() {
  const cont = $("dias");
  const hoje = new Date();
  const fmt = new Intl.DateTimeFormat("pt-BR", { weekday: "short" });
  cont.innerHTML = "";
  for (let i = 6; i >= 0; i--) {
    const d = new Date(hoje);
    d.setDate(hoje.getDate() - i);
    const ch = chaveDe(d);
    const dados =
      ch === diaSelecionado ? marcados : lerJSON(await store.get(ch), {});
    // lista de remédios que valia naquele dia (dias antigos sem registro usam a lista permanente)
    const listaDia =
      ch === diaSelecionado
        ? meds
        : i === 0
          ? medsPerm
          : lerJSON(await store.get(chaveLista(d)), null);
    let total, feitos;
    if (Array.isArray(listaDia)) {
      total = listaDia.length;
      feitos = listaDia.filter((m) => dados[m]).length;
    } else {
      total = medsPerm.length;
      feitos = Math.min(
        total,
        Object.keys(dados).filter((k) => dados[k]).length,
      );
    }
    let cls, iconeSrc;
    if (total > 0 && feitos >= total) {
      cls = "completo";
      iconeSrc = img("bubu_comemorando");
    } else if (feitos > 0) {
      cls = "parcial";
      iconeSrc = img("bubu_feliz");
    } else {
      cls = "vazio";
      iconeSrc = img("shiba_sentado");
    }
    if (i === 0) cls += " hoje";
    if (ch === diaSelecionado) cls += " selecionado";
    const rot = i === 0 ? "hoje" : fmt.format(d).replace(".", "");
    const dataCurta = d.toLocaleDateString("pt-BR");
    const item = el("div", `dia ${cls}`);
    item.title = dataCurta;
    item.tabIndex = 0;
    item.setAttribute("role", "button");
    item.setAttribute(
      "aria-label",
      `${rot} (${dataCurta}): ${feitos} de ${total} tomados`,
    );
    if (ch === diaSelecionado) item.setAttribute("aria-current", "date");
    const carinha = el("div", "carinha");
    const icone = el("img");
    icone.src = iconeSrc;
    icone.alt = "";
    carinha.appendChild(icone);
    item.appendChild(carinha);
    item.appendChild(el("div", "rotulo", rot));
    item.appendChild(el("div", "placar", `${feitos}/${total}`));
    item.addEventListener("click", () => {
      if (ch !== diaSelecionado) carregar(ch);
    });
    item.addEventListener("keydown", (e) => {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        item.click();
      }
    });
    cont.appendChild(item);
  }
}

// ---------- backup ----------
const CHAVE_DADO = /^(dia:|lista:|meds-lista$|meds-arquivados$)/;

async function coletarDados() {
  const dados = {};
  if (typeof window.storage === "undefined") {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (CHAVE_DADO.test(k)) dados[k] = localStorage.getItem(k);
      }
    } catch {}
    return dados;
  }
  for (const k of ["meds-lista", "meds-arquivados"]) {
    const v = await store.get(k);
    if (v !== null) dados[k] = v;
  }
  const d = new Date();
  for (let i = 0; i < 730; i++) {
    for (const k of [chaveDe(d), chaveLista(d)]) {
      const v = await store.get(k);
      if (v !== null) dados[k] = v;
    }
    d.setDate(d.getDate() - 1);
  }
  return dados;
}

async function exportarBackup() {
  const dados = await coletarDados();
  const conteudo = JSON.stringify(
    {
      app: "dudu-remedios",
      versao: 1,
      exportadoEm: new Date().toISOString(),
      dados,
    },
    null,
    1,
  );
  const nomeArquivo = `remedios-do-dudu-${dataDe(new Date())}.json`;
  const tauri = window.__TAURI__;
  if (tauri?.dialog && tauri?.fs) {
    // no aplicativo (Tauri), o WebView não faz downloads: pergunta onde salvar e grava o arquivo
    let destino = null;
    try {
      destino = await tauri.dialog.save({
        defaultPath: nomeArquivo,
        filters: [{ name: "Backup", extensions: ["json"] }],
      });
    } catch {
      destino = null; // no Android, cancelar o diálogo cai aqui
    }
    if (!destino) return;
    try {
      await tauri.fs.writeTextFile(destino, conteudo);
    } catch (e) {
      await avisar("Não deu pra salvar 🥺", String(e));
      return;
    }
  } else {
    const blob = new Blob([conteudo], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = nomeArquivo;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
  await store.set("backup-ultimo", new Date().toISOString());
  renderInfoBackup();
}

async function importarBackup(arquivo) {
  let obj = null;
  try {
    obj = JSON.parse(await arquivo.text());
  } catch {}
  if (
    !obj ||
    obj.app !== "dudu-remedios" ||
    !obj.dados ||
    typeof obj.dados !== "object"
  ) {
    await avisar(
      "Arquivo inválido 🥺",
      'Esse arquivo não parece ser um backup do "Dudu já tomou seus remédios?".',
    );
    return;
  }
  const quando = obj.exportadoEm
    ? new Date(obj.exportadoEm).toLocaleDateString("pt-BR")
    : "data desconhecida";
  const ok = await confirmar(
    "Restaurar backup?",
    `Backup de ${quando}. A lista de remédios e os dias que estão no backup vão substituir os deste aparelho.`,
    "Restaurar",
  );
  if (!ok) return;
  for (const [k, v] of Object.entries(obj.dados)) {
    if (CHAVE_DADO.test(k) && typeof v === "string") await store.set(k, v);
  }
  await carregar();
  await avisar(
    "Backup restaurado! 🎉",
    "A Bubu e o shiba já recuperaram tudo.",
  );
}

async function renderInfoBackup() {
  const ultimo = await store.get("backup-ultimo");
  $("infoBackup").textContent = ultimo
    ? `Último backup salvo em ${new Date(ultimo).toLocaleDateString("pt-BR")}`
    : "Nenhum backup salvo ainda neste aparelho.";
}

$("btnExportar").addEventListener("click", exportarBackup);
$("arqBackup").addEventListener("change", async (e) => {
  const arq = e.target.files?.[0];
  e.target.value = "";
  if (arq) await importarBackup(arq);
});
$("lblImportar").addEventListener("keydown", (e) => {
  if (e.key === " " || e.key === "Enter") {
    e.preventDefault();
    $("arqBackup").click();
  }
});

// ---------- adicionar / editar ----------
$("btnAdd").addEventListener("click", async () => {
  const inp = $("novoMed");
  const nome = inp.value.trim();
  if (!nome) return;
  inp.value = "";
  if (meds.some((m) => m.toLowerCase() === nome.toLowerCase())) return;
  // se o remédio estava guardado, traz de volta com o mesmo nome (e o mesmo histórico)
  const guardado = arquivados.find(
    (m) => m.toLowerCase() === nome.toLowerCase(),
  );
  if (guardado) {
    await restaurarMed(guardado);
    return;
  }
  if (vendoPassado()) {
    const ok = await confirmarDiaPassado(`adicionar "${nome}" na lista`);
    if (!ok) return;
  }
  meds.push(nome);
  if (!medsPerm.some((m) => m.toLowerCase() === nome.toLowerCase()))
    medsPerm.push(nome);
  await salvar();
  renderHistorico();
  render();
});

$("novoMed").addEventListener("keydown", (e) => {
  if (e.key === "Enter") $("btnAdd").click();
});
$("btnPronto").addEventListener("click", () => {
  editando = false;
  render();
});
document.addEventListener("pointerdown", (e) => {
  if (!editando || drag || pre) return;
  if (e.target.closest("#lista, #acoesEdicao, .add, #arquivados, dialog"))
    return;
  editando = false;
  render();
});

navigator.storage?.persist?.().catch(() => {});
if ("serviceWorker" in navigator && location.protocol === "https:") {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
carregar();
