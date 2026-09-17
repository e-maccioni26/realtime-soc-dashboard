FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Les variables VITE_* sont figées dans le bundle au moment du build.
ARG VITE_API_URL=http://localhost:8000
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM nginx:1.29-alpine
# Le template est rendu au démarrage : ${CSP_CONNECT_SRC} est remplacé par sa valeur.
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
ENV CSP_CONNECT_SRC="http://localhost:8000 ws://localhost:8000"
EXPOSE 80
