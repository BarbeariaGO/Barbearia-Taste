const API = '/api';
let token = localStorage.getItem('token') || null;
let usuarioAtual = JSON.parse(localStorage.getItem('usuario') || 'null');
let barbeiros = [], servicos = [];
let horaSelecionada = null;

// ─── ÍCONES POR SERVIÇO ──────────────────────────────────────
const ICONES_SERVICO = {
  'corte': '✂️', 'cabelo': '✂️',
  'barba': '🧔', 'navalha': '🪒',
  'degradê': '💇‍♂️', 'degrade': '💇‍♂️',
  'hidrat': '💧',
  'sobranc': '👁️',
  'colora': '🎨', 'tinta': '🎨',
};
function iconePara(nome) {
  const lower = nome.toLowerCase();
  for (const k in ICONES_SERVICO) if (lower.includes(k)) return ICONES_SERVICO[k];
  return '💼';
}

// ─── INICIAIS PARA AVATAR ────────────────────────────────────
function iniciais(nome) {
  return nome.split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase();
}

// ─── MÁSCARA DE TELEFONE ─────────────────────────────────────
function mascaraTelefone(input) {
  input.addEventListener('input', e => {
    let v = e.target.value.replace(/\D/g, '').slice(0, 11);
    if (v.length > 6) v = `(${v.slice(0,2)}) ${v.slice(2,7)}-${v.slice(7)}`;
    else if (v.length > 2) v = `(${v.slice(0,2)}) ${v.slice(2)}`;
    else if (v.length > 0) v = `(${v}`;
    e.target.value = v;
  });
}

// ─── NAVEGAÇÃO ───────────────────────────────────────────────
function mostrarPagina(nome) {
  document.querySelectorAll('.pagina').forEach(p => p.classList.remove('ativa'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

  const alvo = nome === 'admin-login' && token ? 'admin' : nome;
  const el = document.getElementById('pagina-' + alvo);
  if (el) {
    el.classList.add('ativa');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  document.querySelectorAll('.nav-btn').forEach(b => {
    if (b.dataset.pagina === nome) b.classList.add('active');
  });

  if (alvo === 'admin') {
    carregarAgendamentos();
    carregarKpis();
    if (usuarioAtual) document.getElementById('admin-bem-vindo').textContent = `Olá, ${usuarioAtual.nome}`;
  }
  if (nome === 'servicos') renderServicosPublicos();
  if (nome === 'equipe') renderEquipePublica();
}

// ─── MODAL ───────────────────────────────────────────────────
function mostrarModal(icone, titulo, msg) {
  document.getElementById('modal-icone').textContent = icone;
  document.getElementById('modal-titulo').textContent = titulo;
  document.getElementById('modal-msg').textContent = msg;
  document.getElementById('modal').style.display = 'flex';
}
function fecharModal() { document.getElementById('modal').style.display = 'none'; }

// ─── API HELPER ──────────────────────────────────────────────
async function req(metodo, url, body, auth) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth && token) headers['Authorization'] = 'Bearer ' + token;
  const r = await fetch(API + url, { method: metodo, headers, body: body ? JSON.stringify(body) : undefined });
  let data;
  try { data = await r.json(); } catch { data = {}; }
  if (!r.ok) {
    if (r.status === 401 && auth) {
      token = null;
      localStorage.removeItem('token');
      localStorage.removeItem('usuario');
    }
    throw data;
  }
  return data;
}

// ─── INICIALIZAÇÃO ───────────────────────────────────────────
async function init() {
  document.getElementById('ano-atual').textContent = new Date().getFullYear();

  mascaraTelefone(document.getElementById('ag-telefone'));
  mascaraTelefone(document.getElementById('busca-telefone'));

  try {
    [barbeiros, servicos] = await Promise.all([req('GET', '/barbeiros'), req('GET', '/servicos')]);

    const selBarbeiro = document.getElementById('ag-barbeiro');
    barbeiros.forEach(b => {
      selBarbeiro.innerHTML += `<option value="${b.id}">${b.nome}${b.especialidade ? ' — ' + b.especialidade : ''}</option>`;
    });

    const selServico = document.getElementById('ag-servico');
    servicos.forEach(s => {
      selServico.innerHTML += `<option value="${s.id}">${s.nome} — R$ ${s.preco.toFixed(2)} (${s.duracao_minutos}min)</option>`;
    });

    const hoje = new Date().toISOString().split('T')[0];
    document.getElementById('ag-data').value = hoje;
    document.getElementById('ag-data').min = hoje;
    document.getElementById('filtro-data').value = '';
  } catch (e) {
    console.error('Erro ao inicializar:', e);
  }
}

// ─── SERVIÇOS PÚBLICOS ───────────────────────────────────────
function renderServicosPublicos() {
  const el = document.getElementById('lista-servicos-publica');
  if (!servicos.length) { el.innerHTML = '<p class="vazio">Carregando serviços...</p>'; return; }
  el.innerHTML = servicos.map(s => `
    <div class="servico-card">
      <div class="servico-icone">${iconePara(s.nome)}</div>
      <h4>${s.nome}</h4>
      <p class="desc">${s.descricao || 'Serviço profissional realizado por especialista.'}</p>
      <div class="servico-meta">
        <span class="preco">R$ ${s.preco.toFixed(2)}</span>
        <span class="duracao">⏱ ${s.duracao_minutos} min</span>
      </div>
    </div>
  `).join('');
}

// ─── EQUIPE PÚBLICA ──────────────────────────────────────────
function renderEquipePublica() {
  const el = document.getElementById('lista-barbeiros-publica');
  if (!barbeiros.length) { el.innerHTML = '<p class="vazio">Carregando equipe...</p>'; return; }
  el.innerHTML = barbeiros.map(b => `
    <div class="barbeiro-card">
      <div class="avatar">${iniciais(b.nome)}</div>
      <h4>${b.nome}</h4>
      <p class="esp">${b.especialidade || 'Profissional certificado'}</p>
      <button class="btn-primary" onclick="agendarCom(${b.id})">Agendar com ${b.nome.split(' ')[0]}</button>
    </div>
  `).join('');
}

function agendarCom(barbeiroId) {
  mostrarPagina('agendar');
  setTimeout(() => {
    document.getElementById('ag-barbeiro').value = barbeiroId;
    atualizarHorarios();
    document.getElementById('ag-nome').focus();
  }, 100);
}

// ─── AGENDAMENTO ─────────────────────────────────────────────
async function atualizarHorarios() {
  const barbeiro = document.getElementById('ag-barbeiro').value;
  const servico = document.getElementById('ag-servico').value;
  const data = document.getElementById('ag-data').value;
  const grid = document.getElementById('horarios-grid');
  const resumo = document.getElementById('resumo-ag');

  horaSelecionada = null;
  document.getElementById('ag-hora').value = '';
  resumo.style.display = 'none';

  if (!barbeiro || !servico || !data) {
    grid.innerHTML = '<p class="hint">Selecione profissional, serviço e data para ver os horários</p>';
    return;
  }

  grid.innerHTML = '<p class="hint">Carregando horários disponíveis...</p>';

  try {
    const { horarios } = await req('GET', `/agendamentos/horarios-livres?barbeiro_id=${barbeiro}&servico_id=${servico}&data=${data}`);
    if (!horarios.length) {
      grid.innerHTML = '<p class="hint">😕 Nenhum horário disponível para esta data. Tente outro dia.</p>';
      return;
    }
    grid.innerHTML = horarios.map(h =>
      `<button type="button" class="hora-btn" onclick="selecionarHora('${h}', this)">${h}</button>`
    ).join('');
  } catch {
    grid.innerHTML = '<p class="hint" style="color:var(--danger)">Erro ao carregar horários. Tente novamente.</p>';
  }
}

function selecionarHora(hora, btn) {
  document.querySelectorAll('.hora-btn').forEach(b => b.classList.remove('selecionado'));
  btn.classList.add('selecionado');
  horaSelecionada = hora;
  document.getElementById('ag-hora').value = hora;

  const bId = document.getElementById('ag-barbeiro').value;
  const sId = document.getElementById('ag-servico').value;
  const data = document.getElementById('ag-data').value;
  const barb = barbeiros.find(b => b.id == bId);
  const serv = servicos.find(s => s.id == sId);

  const resumo = document.getElementById('resumo-ag');
  resumo.style.display = 'block';
  const dataFmt = new Date(data + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
  resumo.innerHTML = `
    <strong>📋 Resumo do Agendamento</strong>
    👤 Profissional: <b>${barb?.nome}</b><br>
    ${iconePara(serv?.nome || '')} Serviço: <b>${serv?.nome}</b><br>
    📅 Data: <b>${dataFmt}</b><br>
    🕐 Horário: <b>${hora}</b> · Duração: ${serv?.duracao_minutos}min<br>
    💰 Total: <span class="preco">R$ ${serv?.preco.toFixed(2)}</span>
  `;
}

document.getElementById('form-agendamento').addEventListener('submit', async e => {
  e.preventDefault();
  const nome = document.getElementById('ag-nome').value.trim();
  const tel = document.getElementById('ag-telefone').value.trim();
  const barbeiro_id = document.getElementById('ag-barbeiro').value;
  const servico_id = document.getElementById('ag-servico').value;
  const data = document.getElementById('ag-data').value;
  const hora = document.getElementById('ag-hora').value;
  const obs = document.getElementById('ag-obs').value.trim();

  if (!hora) { mostrarModal('⚠️', 'Atenção', 'Selecione um horário antes de confirmar.'); return; }
  if (tel.replace(/\D/g, '').length < 10) { mostrarModal('⚠️', 'Telefone inválido', 'Digite um telefone válido com DDD.'); return; }

  const btn = e.target.querySelector('button[type=submit]');
  btn.disabled = true;
  btn.innerHTML = '<span>Confirmando...</span>';

  try {
    const ag = await req('POST', '/agendamentos', { cliente_nome: nome, cliente_telefone: tel, barbeiro_id, servico_id, data, hora, observacoes: obs });
    const dataFmt = new Date(data + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
    mostrarModal('✅', 'Agendamento Confirmado!',
      `${ag.servico_nome} com ${ag.barbeiro_nome}\n${dataFmt} às ${hora}\n\nGuardamos seu telefone (${tel}) para você consultar em "Meus Agendamentos".`);
    document.getElementById('form-agendamento').reset();
    document.getElementById('horarios-grid').innerHTML = '<p class="hint">Selecione profissional, serviço e data para ver os horários</p>';
    document.getElementById('resumo-ag').style.display = 'none';
    horaSelecionada = null;
    document.getElementById('ag-data').value = new Date().toISOString().split('T')[0];
  } catch (err) {
    mostrarModal('❌', 'Erro', err.erro || 'Não foi possível criar o agendamento. Tente novamente.');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span>Confirmar Agendamento</span><span class="btn-arrow">→</span>';
  }
});

// ─── MEUS AGENDAMENTOS ───────────────────────────────────────
async function buscarMeus() {
  const tel = document.getElementById('busca-telefone').value.trim();
  if (!tel) { mostrarModal('⚠️', 'Atenção', 'Digite seu telefone para buscar.'); return; }

  const lista = document.getElementById('lista-meus');
  lista.innerHTML = '<p class="hint" style="background:var(--bg3);padding:1rem;border-radius:8px">Buscando...</p>';

  try {
    const ags = await req('GET', `/agendamentos/meus?telefone=${encodeURIComponent(tel)}`);
    if (!ags.length) { lista.innerHTML = '<p class="vazio">Nenhum agendamento encontrado para este telefone.</p>'; return; }

    lista.innerHTML = ags.map(a => {
      const dataFmt = new Date(a.data + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
      const podeCancelar = (a.status === 'pendente' || a.status === 'confirmado') && new Date(a.data + 'T' + a.hora) > new Date();
      return `
        <div class="ag-card">
          <div class="ag-card-info">
            <h4>${iconePara(a.servico_nome)} ${a.servico_nome} <span class="badge badge-${a.status}">${a.status}</span></h4>
            <p>👤 ${a.barbeiro_nome} &nbsp;·&nbsp; 📅 ${dataFmt} às <b>${a.hora}</b></p>
            <p class="preco">💰 R$ ${a.preco.toFixed(2)}</p>
            ${a.observacoes ? `<p style="color:var(--text3)">💬 ${a.observacoes}</p>` : ''}
          </div>
          ${podeCancelar ? `<button class="btn-sm" style="background:rgba(231,76,60,.2);color:var(--danger);border:1px solid rgba(231,76,60,.4)" onclick="cancelarMeu(${a.id}, '${tel}')">Cancelar</button>` : ''}
        </div>`;
    }).join('');
  } catch {
    lista.innerHTML = '<p class="vazio" style="color:var(--danger)">Erro ao buscar agendamentos.</p>';
  }
}

async function cancelarMeu(id, tel) {
  if (!confirm('Tem certeza que deseja cancelar este agendamento?')) return;
  try {
    await req('PATCH', `/agendamentos/${id}/cancelar`, { telefone: tel });
    mostrarModal('✅', 'Cancelado', 'Agendamento cancelado com sucesso.');
    buscarMeus();
  } catch (err) {
    mostrarModal('❌', 'Erro', err.erro || 'Não foi possível cancelar.');
  }
}

// ─── AUTH ADMIN ──────────────────────────────────────────────
async function fazerLogin() {
  const email = document.getElementById('login-email').value.trim();
  const senha = document.getElementById('login-senha').value;
  const erro = document.getElementById('login-erro');
  erro.style.display = 'none';

  if (!email || !senha) { erro.textContent = 'Preencha email e senha.'; erro.style.display = 'block'; return; }

  try {
    const { token: t, usuario } = await req('POST', '/auth/login', { email, senha });
    token = t;
    usuarioAtual = usuario;
    localStorage.setItem('token', t);
    localStorage.setItem('usuario', JSON.stringify(usuario));
    document.getElementById('login-senha').value = '';
    mostrarPagina('admin');
  } catch (err) {
    erro.textContent = err.erro || 'Email ou senha incorretos.';
    erro.style.display = 'block';
  }
}

function logout() {
  token = null;
  usuarioAtual = null;
  localStorage.removeItem('token');
  localStorage.removeItem('usuario');
  mostrarPagina('admin-login');
}

// ─── ADMIN: ABAS ─────────────────────────────────────────────
function abaAdmin(nome, btnEl) {
  document.querySelectorAll('.aba-conteudo').forEach(a => a.style.display = 'none');
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.getElementById('aba-' + nome).style.display = 'block';
  if (btnEl) btnEl.classList.add('active');

  if (nome === 'agendamentos') carregarAgendamentos();
  if (nome === 'barbeiros') carregarBarbeirosAdmin();
  if (nome === 'servicos') carregarServicosAdmin();
}

// ─── ADMIN: KPIs ─────────────────────────────────────────────
async function carregarKpis() {
  try {
    const todos = await req('GET', '/agendamentos', null, true);
    const hoje = new Date().toISOString().split('T')[0];
    const hojeAgs = todos.filter(a => a.data === hoje);
    const pendentes = todos.filter(a => a.status === 'pendente').length;
    const confirmados = todos.filter(a => a.status === 'confirmado').length;
    const receitaHoje = hojeAgs.filter(a => a.status !== 'cancelado').reduce((s, a) => s + a.preco, 0);

    document.getElementById('kpis').innerHTML = `
      <div class="kpi"><div class="kpi-valor">${hojeAgs.length}</div><div class="kpi-label">Hoje</div></div>
      <div class="kpi"><div class="kpi-valor">${pendentes}</div><div class="kpi-label">Pendentes</div></div>
      <div class="kpi"><div class="kpi-valor">${confirmados}</div><div class="kpi-label">Confirmados</div></div>
      <div class="kpi"><div class="kpi-valor">R$ ${receitaHoje.toFixed(0)}</div><div class="kpi-label">Receita Hoje</div></div>
    `;
  } catch { /* ignora se sem permissão */ }
}

// ─── ADMIN: AGENDAMENTOS ─────────────────────────────────────
function limparFiltrosAg() {
  document.getElementById('filtro-data').value = '';
  document.getElementById('filtro-status').value = '';
  carregarAgendamentos();
}

async function carregarAgendamentos() {
  const data = document.getElementById('filtro-data').value;
  const status = document.getElementById('filtro-status').value;
  const params = new URLSearchParams();
  if (data) params.append('data', data);
  if (status) params.append('status', status);
  const url = '/agendamentos' + (params.toString() ? '?' + params.toString() : '');

  try {
    const ags = await req('GET', url, null, true);
    const el = document.getElementById('tabela-agendamentos');

    if (!ags.length) { el.innerHTML = '<p class="vazio">Nenhum agendamento encontrado com os filtros aplicados.</p>'; return; }

    el.innerHTML = `
      <div style="overflow-x:auto">
      <table>
        <thead><tr>
          <th>Cliente</th><th>Telefone</th><th>Profissional</th><th>Serviço</th>
          <th>Data</th><th>Hora</th><th>Valor</th><th>Status</th><th>Ações</th>
        </tr></thead>
        <tbody>
          ${ags.map(a => {
            const dataFmt = new Date(a.data + 'T00:00:00').toLocaleDateString('pt-BR');
            return `<tr>
              <td><b>${a.cliente_nome}</b></td>
              <td>${a.cliente_telefone}</td>
              <td>${a.barbeiro_nome}</td>
              <td>${a.servico_nome}</td>
              <td>${dataFmt}</td>
              <td><b>${a.hora}</b></td>
              <td><span style="color:var(--gold)">R$ ${a.preco.toFixed(2)}</span></td>
              <td><span class="badge badge-${a.status}">${a.status}</span></td>
              <td>
                <select class="btn-sm" style="background:var(--bg3);color:var(--text);border:1px solid rgba(255,255,255,.1);padding:.35rem .5rem" onchange="mudarStatus(${a.id}, this.value)">
                  <option value="">Alterar</option>
                  <option value="pendente">Pendente</option>
                  <option value="confirmado">Confirmar</option>
                  <option value="concluido">Concluir</option>
                  <option value="cancelado">Cancelar</option>
                </select>
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
      </div>`;
  } catch {
    document.getElementById('tabela-agendamentos').innerHTML = '<p class="vazio" style="color:var(--danger)">Sessão expirada. Faça login novamente.</p>';
    setTimeout(() => mostrarPagina('admin-login'), 1500);
  }
}

async function mudarStatus(id, status) {
  if (!status) return;
  try {
    await req('PATCH', `/agendamentos/${id}/status`, { status }, true);
    carregarAgendamentos();
    carregarKpis();
  } catch { mostrarModal('❌', 'Erro', 'Não foi possível alterar o status.'); }
}

// ─── ADMIN: BARBEIROS ────────────────────────────────────────
async function carregarBarbeirosAdmin() {
  try {
    const bs = await req('GET', '/barbeiros');
    barbeiros = bs;
    const el = document.getElementById('lista-barbeiros-admin');
    el.innerHTML = bs.map(b => `
      <div class="ag-card">
        <div class="ag-card-info" style="display:flex;align-items:center;gap:1rem">
          <div class="avatar" style="width:50px;height:50px;font-size:1.1rem;margin:0">${iniciais(b.nome)}</div>
          <div>
            <h4>${b.nome}</h4>
            <p>${b.especialidade || 'Sem especialidade'}</p>
          </div>
        </div>
        <button class="btn-sm" style="background:rgba(231,76,60,.2);color:var(--danger);border:1px solid rgba(231,76,60,.4)" onclick="removerBarbeiro(${b.id})">Remover</button>
      </div>`).join('') || '<p class="vazio">Nenhum barbeiro cadastrado.</p>';
  } catch { }
}

async function adicionarBarbeiro() {
  const nome = document.getElementById('novo-barbeiro-nome').value.trim();
  const esp = document.getElementById('novo-barbeiro-esp').value.trim();
  if (!nome) { mostrarModal('⚠️', 'Atenção', 'Digite o nome do barbeiro.'); return; }
  try {
    await req('POST', '/barbeiros', { nome, especialidade: esp }, true);
    document.getElementById('novo-barbeiro-nome').value = '';
    document.getElementById('novo-barbeiro-esp').value = '';
    mostrarModal('✅', 'Adicionado', `${nome} foi adicionado à equipe.`);
    carregarBarbeirosAdmin();
  } catch (err) { mostrarModal('❌', 'Erro', err.erro || 'Erro ao adicionar barbeiro'); }
}

async function removerBarbeiro(id) {
  if (!confirm('Remover este barbeiro? Ele não aparecerá mais para novos agendamentos.')) return;
  try {
    await req('DELETE', `/barbeiros/${id}`, null, true);
    carregarBarbeirosAdmin();
  } catch { }
}

// ─── ADMIN: SERVIÇOS ─────────────────────────────────────────
async function carregarServicosAdmin() {
  try {
    const ss = await req('GET', '/servicos');
    servicos = ss;
    const el = document.getElementById('lista-servicos-admin');
    el.innerHTML = ss.map(s => `
      <div class="ag-card">
        <div class="ag-card-info">
          <h4>${iconePara(s.nome)} ${s.nome}</h4>
          <p>${s.descricao || 'Sem descrição'} &nbsp;·&nbsp; ⏱ ${s.duracao_minutos}min &nbsp;·&nbsp; <span class="preco">R$ ${s.preco.toFixed(2)}</span></p>
        </div>
        <button class="btn-sm" style="background:rgba(231,76,60,.2);color:var(--danger);border:1px solid rgba(231,76,60,.4)" onclick="removerServico(${s.id})">Remover</button>
      </div>`).join('') || '<p class="vazio">Nenhum serviço cadastrado.</p>';
  } catch { }
}

async function adicionarServico() {
  const nome = document.getElementById('novo-s-nome').value.trim();
  const preco = parseFloat(document.getElementById('novo-s-preco').value);
  const dur = parseInt(document.getElementById('novo-s-dur').value);
  if (!nome || isNaN(preco) || isNaN(dur) || preco <= 0 || dur <= 0) {
    mostrarModal('⚠️', 'Atenção', 'Preencha nome, preço e duração corretamente.');
    return;
  }
  try {
    await req('POST', '/servicos', { nome, preco, duracao_minutos: dur }, true);
    ['novo-s-nome','novo-s-preco','novo-s-dur'].forEach(id => document.getElementById(id).value = '');
    mostrarModal('✅', 'Adicionado', `Serviço "${nome}" criado.`);
    carregarServicosAdmin();
  } catch (err) { mostrarModal('❌', 'Erro', err.erro || 'Erro ao adicionar serviço'); }
}

async function removerServico(id) {
  if (!confirm('Remover este serviço? Ele não aparecerá mais para novos agendamentos.')) return;
  try {
    await req('DELETE', `/servicos/${id}`, null, true);
    carregarServicosAdmin();
  } catch { }
}

// ─── BOOT ────────────────────────────────────────────────────
init();
if (token && usuarioAtual) {
  document.querySelector('.nav-admin').textContent = 'Admin ✓';
}
