FROM node:22

# Build argument for cache busting / layer cache reuse
ARG BUILDKIT_INLINE_CACHE=1

WORKDIR /app
COPY . .

#RUN npm i yarn
#RUN yarn global add @angular/cli@latest

RUN yarn && yarn add moment && yarn add vis-util && npm run build
#RUN ng build --prod --outputPath=dist/www/en --baseHref=/ --i18nLocale=en --verbose=true
RUN npm run compress:brotli
#RUN npm run compress:gzip

WORKDIR /app/dist
COPY  assets/CBP/client-assets/dist www/en/assets
RUN npm install --production
EXPOSE 3024

CMD [ "npm", "run", "serve:prod" ]
