FROM nginx

RUN rm /etc/nginx/conf.d/default.conf

COPY ./fullchain.pem /etc/letsencrypt/live/webrtc-chat-app-demo.site/
COPY ./privkey.pem /etc/letsencrypt/live/webrtc-chat-app-demo.site/
COPY nginx.conf /etc/nginx/conf.d/default.conf