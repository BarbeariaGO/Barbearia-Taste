# Barbearia Premium — SaaS de Agendamento

Sistema completo de agendamento online para barbearias, pronto para comercialização.

**Stack:** Node.js · Express 5 · SQLite (better-sqlite3) · JWT · HTML/CSS/JS puro (sem framework frontend).

---

## ✨ Recursos

### Cliente (público)
- Página inicial com hero, CTA, estatísticas e depoimentos
- Catálogo de serviços com preços, duração e ícones
- Vitrine da equipe com avatar e botão "Agendar com X"
- Agendamento online em 1 fluxo (nome → telefone → barbeiro → serviço → data → horário)
- Validação de data, hora, telefone e prevenção de agendamento no passado
- Slot livre calculado dinamicamente (considera duração do serviço e conflitos)
- "Meus Agendamentos" por telefone, com cancelamento self-service
- Botão flutuante de WhatsApp
- FAQ, footer completo, responsivo mobile-first
- SEO otimizado: meta description, Open Graph, theme-color

### Admin
- Login JWT (24h) com rate limit (10 tentativas / 15 min)
- KPIs do dia (agendamentos, pendentes, confirmados, receita)
- Tabela de agendamentos com filtro por data e status
- Mudança de status: pendente / confirmado / concluído / cancelado
- CRUD de barbeiros (soft delete)
- CRUD de serviços (soft delete)

### Backend
- Helmet (CSP, HSTS, XFO, XCTO, etc.)
- Rate limiting (200 req/15min geral, 10 tentativas login/15min)
- Compression
- Validação de inputs (nome, telefone, datas, IDs FK)
- JWT obrigatório com SECRET configurável
- Health check em `/api/health`
- Logs de erro centralizados
- SQLite WAL mode + foreign keys ON

---

## 🚀 Como rodar localmente

```bash
cd backend
npm install
cp .env.example .env  # ajuste as variáveis
npm start             # ou npm run dev (com auto-reload)
```

Acesse: http://localhost:3000

---

## 🔐 Credenciais iniciais

| Email | Senha | Role |
|---|---|---|
| `admin@barbearia.com` | `admin123` | admin (seed legado — remova em produção) |

> **IMPORTANTE em produção:** remova o admin seed `admin@barbearia.com` rodando:
> ```sh
> sqlite3 backend/barbearia.db "DELETE FROM usuarios WHERE email='admin@barbearia.com';"
> ```

---

## 📊 Dados de demonstração

Já populados no banco (`barbearia.db`):

- **5 barbeiros:** Carlos Silva, João Mendes, Rafael Costa, Marina Souza, Bruno Almeida
- **6 serviços:** Corte (R$35), Barba (R$25), Corte+Barba (R$55), Degradê (R$45), Hidratação (R$40), Sobrancelha (R$15)
- **30 janelas de horário** (5 barbeiros × 6 dias seg–sáb)
- **5 agendamentos** de exemplo

---

## 🌐 Deploy em produção

### 1. Variáveis obrigatórias (`.env`)

```env
NODE_ENV=production
PORT=3000
JWT_SECRET=<gere com: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))">
CORS_ORIGIN=https://seudominio.com.br
```

### 2. Processo recomendado: PM2 ou systemd

```bash
npm install -g pm2
pm2 start backend/server.js --name barbearia
pm2 save && pm2 startup
```

### 3. Reverse proxy (Nginx)

```nginx
server {
  listen 443 ssl http2;
  server_name barbearia.exemplo.com.br;
  ssl_certificate     /etc/letsencrypt/live/.../fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/.../privkey.pem;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

### 4. Backup do SQLite (cron diário)

```cron
0 3 * * * /usr/bin/sqlite3 /opt/barbearia/backend/barbearia.db ".backup '/var/backups/barbearia-$(date +\%F).db'"
```

---

## 🛡️ Checklist de segurança para produção

- [x] JWT_SECRET único e aleatório (64+ bytes)
- [x] Helmet ativado com CSP
- [x] Rate limiting em todas rotas API + extra no login
- [x] Validação de tipos e formatos no servidor
- [x] CORS restrito ao domínio próprio
- [x] HTTPS obrigatório (via reverse proxy)
- [x] HSTS habilitado
- [x] CSP impede injeção de scripts externos
- [ ] Backup automático do SQLite agendado
- [ ] Monitoramento de uptime (UptimeRobot, Better Uptime)
- [ ] Logs centralizados (Papertrail, Datadog, ou jornalctl)

---

## 🛠️ Estrutura

```
saas/
├── backend/
│   ├── server.js            ← Express + middlewares
│   ├── database.js          ← SQLite + seed
│   ├── auth.js              ← JWT helpers + middleware
│   ├── routes/
│   │   ├── auth.js
│   │   ├── barbeiros.js
│   │   ├── servicos.js
│   │   └── agendamentos.js
│   ├── .env.example
│   └── package.json
└── frontend/public/
    ├── index.html
    ├── style.css
    └── app.js
```

---

## 💼 Modelo comercial (sugestões)

- **Plano Starter (R$49/mês):** 1 barbearia, até 3 profissionais
- **Plano Pro (R$99/mês):** 1 barbearia, profissionais ilimitados, lembrete por WhatsApp
- **Plano Multi (R$249/mês):** múltiplas unidades, relatórios financeiros, integração com Google Calendar

Para multi-tenant, adicionar coluna `tenant_id` em todas as tabelas e middleware de isolamento por subdomínio.

---

## 📞 Suporte

contato@barbeariapremium.com
