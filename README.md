````markdown
# API de Encurtador de URLs

## Demo ao vivo
- Backend API: [https://your-api.render.com](https://your-api.render.com)  
- Aplicação Frontend: [https://your-app.vercel.app](https://your-app.vercel.app)

## Sobre
Este é um serviço de API para encurtamento de URLs construído com Node.js e PostgreSQL usando Drizzle ORM. Permite que usuários criem versões encurtadas de URLs longas e redireciona os usuários para as URLs originais ao acessar os links encurtados.

## Funcionalidades
- Criar URLs encurtadas  
- Redirecionar para a URL original  
- Rastrear estatísticas de cliques  
- Limitação de taxa (rate limiting) na API  
- Banco de dados PostgreSQL com Drizzle ORM

## Configuração para desenvolvimento local

### Pré-requisitos
- Node.js 18+  
- PostgreSQL 14+  
- npm ou yarn

## Para iniciar

```bash
git clone https://github.com/Dudxxx/backend_encurtador
npm install  or  npm i
npm run dev
````

A API ficará disponível em [http://localhost:3000](http://localhost:3000)

### Endpoints da API

```
POST /api/links - Create a new shortened URL
GET /:shortId - Redirect to original URL
GET /api/links - Get all links
```

## Funcionalidade Extra

Analytics de cliques

A aplicação inclui rastreamento analítico de cliques para cada URL encurtada. Essa funcionalidade foi implementada para:

* Rastrear o número de vezes que cada link é acessado
* Armazenar o timestamp de cada acesso
* Fornecer insights sobre padrões de uso dos links

### Detalhes de implementação:

* Adicionada a tabela `clicks` no banco de dados para armazenar os dados de cliques
* Cada requisição de redirecionamento atualiza o contador de cliques
* Os dados de analytics estão disponíveis através da API

## Tech Stack

```
Node.js
Express.js
PostgreSQL
Drizzle ORM
```