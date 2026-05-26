# Estágio 1: Build do Frontend (Vite/React)
FROM node:22-alpine AS build-frontend
WORKDIR /app

# Argumentos de build — passados via --build-arg ou variáveis de ambiente no EasyPanel
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY

# Expõe os ARGs como variáveis de ambiente para o processo de build do Vite
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

# Copia os arquivos de dependência do frontend
COPY package*.json ./
RUN npm install

# Copia o restante do código do frontend e faz o build
COPY . .
RUN npm run build

# Estágio 2: Setup do Backend (Node.js) e Imagem Final
FROM node:22-alpine
WORKDIR /app/server

# Copia os arquivos de dependência do backend
COPY server/package*.json ./
RUN npm install --omit=dev

# Copia o código do backend
COPY server/ ./

# Cria o diretório de uploads
RUN mkdir -p uploads

# Copia o build do frontend gerado no estágio anterior
# Vamos colocar o 'dist' dentro da pasta do servidor para facilitar
COPY --from=build-frontend /app/dist ./dist

# Expõe a porta que a aplicação vai rodar
EXPOSE 3001

# Comando para iniciar o backend
CMD ["node", "server.js"]
